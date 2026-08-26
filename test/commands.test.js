'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { installCommand } = require('../lib/install.js');
const { updateCommand } = require('../lib/update.js');
const { uninstallCommand } = require('../lib/uninstall.js');
const { checkCommand } = require('../lib/check.js');
const { readLock, writeLock } = require('../lib/lockfile.js');
const { findBlock } = require('../lib/marker-merge.js');
const { tmpDir, captureIO, flags, exists, ensureDist } = require('./helpers.js');

test.before(ensureDist);

const SKILL = path.join('.claude', 'skills', 'dopod-design', 'SKILL.md');
const TOKENS_RULE = path.join('.cursor', 'rules', 'dopod-design-tokens.mdc');
const COPILOT = path.join('.github', 'copilot-instructions.md');

test('install writes each tool to its own location', async () => {
  const cwd = await tmpDir('install');
  const io = captureIO();
  assert.equal(await installCommand(flags({ cwd }), io), 0);

  assert.ok(await exists(path.join(cwd, SKILL)));
  assert.ok(await exists(path.join(cwd, '.claude', 'skills', 'dopod-design', 'references', 'tokens.md')));
  assert.ok(await exists(path.join(cwd, TOKENS_RULE)));
  assert.ok(await exists(path.join(cwd, COPILOT)));
  assert.ok(await exists(path.join(cwd, 'AGENTS.md')));
  assert.ok(await exists(path.join(cwd, '.dopod-design', 'references', 'tokens.md')));
  assert.match(io.out, /installed dopod-design@/);
});

test('install records what it wrote in a lockfile', async () => {
  const cwd = await tmpDir('install-lock');
  await installCommand(flags({ cwd }), captureIO());

  const lock = await readLock(cwd);
  assert.equal(lock.package, 'dopod-design');
  assert.equal(lock.scope, 'project');
  assert.deepEqual(lock.tools, ['claude-code', 'cursor', 'copilot', 'codex']);
  assert.ok(lock.files_written.length > 20);
  assert.deepEqual(
    lock.marker_blocks.map((b) => b.file).sort(),
    ['AGENTS.md', COPILOT].sort()
  );
});

test('--tools installs only what was asked for', async () => {
  const cwd = await tmpDir('install-subset');
  await installCommand(flags({ cwd, tools: ['cursor'] }), captureIO());

  assert.ok(await exists(path.join(cwd, TOKENS_RULE)));
  assert.equal(await exists(path.join(cwd, SKILL)), false);
  assert.equal(await exists(path.join(cwd, COPILOT)), false);
  // AGENTS.md *is* expected: it is Cursor's always-on layer (#32), the same
  // file claude-code and codex use. Before that, a Cursor install had no
  // unconditional layer at all — its slim rule was description-triggered.
  assert.ok(await exists(path.join(cwd, 'AGENTS.md')));
});

test('--dry-run writes nothing at all', async () => {
  const cwd = await tmpDir('install-dry');
  const io = captureIO();
  assert.equal(await installCommand(flags({ cwd, dryRun: true }), io), 0);

  assert.match(io.out, /would write/);
  assert.match(io.out, /would merge/);
  assert.equal(await exists(path.join(cwd, SKILL)), false);
  assert.equal(await readLock(cwd), null);
});

test('install preserves an AGENTS.md the user already had', async () => {
  const cwd = await tmpDir('install-agents');
  const mine = '# House rules\n\nAlways run the linter.\n';
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), mine);

  await installCommand(flags({ cwd }), captureIO());

  const merged = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(merged.includes('Always run the linter.'));
  assert.ok(merged.includes('Carbon rules that matter most'));
  assert.ok(findBlock(merged));
});

test('installing twice does not duplicate the managed block', async () => {
  const cwd = await tmpDir('install-twice');
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), '# Mine\n');
  await installCommand(flags({ cwd }), captureIO());
  const once = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');

  const io = captureIO();
  await installCommand(flags({ cwd }), io);
  const twice = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');

  assert.equal(once, twice);
  assert.equal((twice.match(/:start v/g) || []).length, 1);
  assert.match(io.out, /updated dopod-design@/);
});

test('installing claude-code and codex together writes one AGENTS.md block', async () => {
  const cwd = await tmpDir('install-agents-dedupe');
  await installCommand(flags({ cwd, tools: ['claude-code', 'codex'] }), captureIO());

  const agents = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.equal((agents.match(/dopod-design:start/g) || []).length, 1,
    'both tools target AGENTS.md; the block must be written once');
  assert.equal((agents.match(/dopod-design:end/g) || []).length, 1);

  // And the lockfile must not claim the same file twice, or uninstall would
  // try to strip an already-stripped block.
  const lock = await readLock(cwd);
  const agentsEntries = lock.marker_blocks.filter((b) => b.file === 'AGENTS.md');
  assert.equal(agentsEntries.length, 1, 'one lockfile entry per target file');
});

test('claude-code alone still writes the always-on AGENTS.md', async () => {
  const cwd = await tmpDir('install-claude-only');
  await installCommand(flags({ cwd, tools: ['claude-code'] }), captureIO());

  assert.ok(await exists(path.join(cwd, 'AGENTS.md')), 'always-on file present');
  assert.ok(await exists(path.join(cwd, SKILL)), 'skill bundle also present');
  const agents = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Never write a raw color/);
});

test('uninstall returns a pre-existing AGENTS.md byte-identical with both tools', async () => {
  const cwd = await tmpDir('uninstall-agents-both');
  const mine = '# Team AGENTS\n\nRun `make lint` before committing.\n';
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), mine);

  await installCommand(flags({ cwd, tools: ['claude-code', 'codex'] }), captureIO());
  await uninstallCommand(flags({ cwd, tools: ['claude-code', 'codex'] }), captureIO());

  assert.equal(await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), mine);
});

test('check stays in sync when both AGENTS.md tools are installed', async () => {
  const cwd = await tmpDir('check-agents-both');
  await installCommand(flags({ cwd, tools: ['claude-code', 'codex'] }), captureIO());
  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd, tools: ['claude-code', 'codex'] }), io), 0, io.err);
});

test('a CRLF AGENTS.md survives install and check without line-ending drift', async () => {
  const cwd = await tmpDir('crlf-install');
  const mine = '# Team AGENTS\r\n\r\nRun `make lint` before committing.\r\n';
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), mine);

  await installCommand(flags({ cwd, tools: ['codex'] }), captureIO());

  const merged = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(!/(?<!\r)\n/.test(merged),
    'a CRLF file must not gain bare LF lines — that is the mixed-ending diff');

  // The whole point: check must not see line endings as drift.
  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd, tools: ['codex'] }), io), 0, io.err);
});

test('a CRLF AGENTS.md comes back byte-identical after uninstall', async () => {
  const cwd = await tmpDir('crlf-uninstall');
  const mine = '# Team AGENTS\r\n\r\nRun `make lint` before committing.\r\n';
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), mine);

  await installCommand(flags({ cwd, tools: ['codex'] }), captureIO());
  await uninstallCommand(flags({ cwd, tools: ['codex'] }), captureIO());

  assert.equal(await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), mine);
});

test('check reports "not installed" with exit code 2 before any install', async () => {
  const cwd = await tmpDir('check-fresh');
  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 2);
  assert.match(io.out, /not installed/);
});

test('check reports in sync straight after install', async () => {
  const cwd = await tmpDir('check-sync');
  await installCommand(flags({ cwd }), captureIO());
  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 0);
  assert.match(io.out, /in sync/);
});

test('check flags a dedicated file that was edited', async () => {
  const cwd = await tmpDir('check-edited');
  await installCommand(flags({ cwd }), captureIO());
  await fs.appendFile(path.join(cwd, TOKENS_RULE), '\nlocal tweak\n');

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /edited: /);
});

test('check flags a dedicated file that was deleted', async () => {
  const cwd = await tmpDir('check-deleted');
  await installCommand(flags({ cwd }), captureIO());
  await fs.unlink(path.join(cwd, TOKENS_RULE));

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /missing: /);
});

test('check ignores user edits outside the managed block', async () => {
  const cwd = await tmpDir('check-user-edit');
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), '# Mine\n');
  await installCommand(flags({ cwd }), captureIO());

  const agentsPath = path.join(cwd, 'AGENTS.md');
  const current = await fs.readFile(agentsPath, 'utf8');
  await fs.writeFile(agentsPath, `${current}\n## A section I added later\n`);

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 0, io.err);
});

test('check flags edits made inside the managed block', async () => {
  const cwd = await tmpDir('check-block-edit');
  await installCommand(flags({ cwd }), captureIO());

  const agentsPath = path.join(cwd, 'AGENTS.md');
  const current = await fs.readFile(agentsPath, 'utf8');
  await fs.writeFile(agentsPath, current.replace('Never write a raw color', 'Write whatever color'));

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /managed block edited/);
});

test('check flags a managed block that was removed entirely', async () => {
  const cwd = await tmpDir('check-block-gone');
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), '# Mine\n');
  await installCommand(flags({ cwd }), captureIO());
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), '# Mine only now\n');

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /managed block removed/);
});

test('check flags a version mismatch against the lockfile', async () => {
  const cwd = await tmpDir('check-version');
  await installCommand(flags({ cwd }), captureIO());
  const lock = await readLock(cwd);
  await writeLock(cwd, { ...lock, version: '0.0.1-old' });

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /version: installed 0\.0\.1-old/);
});

test('update restores files that drifted', async () => {
  const cwd = await tmpDir('update-restore');
  await installCommand(flags({ cwd }), captureIO());
  await fs.unlink(path.join(cwd, TOKENS_RULE));

  assert.equal(await updateCommand(flags({ cwd }), captureIO()), 0);
  assert.ok(await exists(path.join(cwd, TOKENS_RULE)));
  assert.equal(await checkCommand(flags({ cwd }), captureIO()), 0);
});

test('update removes files a previous version left behind', async () => {
  const cwd = await tmpDir('update-orphan');
  await installCommand(flags({ cwd }), captureIO());

  const orphanRel = path.join('.cursor', 'rules', 'dopod-design-removed-in-this-version.mdc');
  const orphanAbs = path.join(cwd, orphanRel);
  await fs.writeFile(orphanAbs, 'stale guidance');
  const lock = await readLock(cwd);
  await writeLock(cwd, {
    ...lock,
    files_written: [...lock.files_written, { path: orphanRel, sha256: 'x' }],
  });

  const io = captureIO();
  assert.equal(await updateCommand(flags({ cwd }), io), 0);
  assert.equal(await exists(orphanAbs), false);
  assert.match(io.out, /removed  .*dopod-design-removed-in-this-version/);
});

test('update on a clean directory falls back to a fresh install', async () => {
  const cwd = await tmpDir('update-fresh');
  const io = captureIO();
  assert.equal(await updateCommand(flags({ cwd }), io), 0);
  assert.match(io.err, /nothing installed here yet/);
  assert.ok(await exists(path.join(cwd, SKILL)));
});

test('uninstall removes our files and the lockfile', async () => {
  const cwd = await tmpDir('uninstall');
  await installCommand(flags({ cwd }), captureIO());

  const io = captureIO();
  assert.equal(await uninstallCommand(flags({ cwd }), io), 0);

  assert.equal(await exists(path.join(cwd, SKILL)), false);
  assert.equal(await exists(path.join(cwd, TOKENS_RULE)), false);
  assert.equal(await exists(path.join(cwd, '.dopod-design')), false);
  assert.equal(await readLock(cwd), null);
  assert.match(io.out, /uninstalled dopod-design@/);
});

test('uninstall prunes the directories it emptied but not the project root', async () => {
  const cwd = await tmpDir('uninstall-dirs');
  await installCommand(flags({ cwd }), captureIO());
  await uninstallCommand(flags({ cwd }), captureIO());

  assert.equal(await exists(path.join(cwd, '.claude')), false);
  assert.equal(await exists(path.join(cwd, '.cursor')), false);
  assert.ok(await exists(cwd));
});

test('uninstall leaves directories that hold the user’s own files', async () => {
  const cwd = await tmpDir('uninstall-keep');
  await installCommand(flags({ cwd }), captureIO());
  const mine = path.join(cwd, '.cursor', 'rules', 'my-own-rule.mdc');
  await fs.writeFile(mine, 'mine');

  await uninstallCommand(flags({ cwd }), captureIO());
  assert.ok(await exists(mine));
});

test('uninstall gives back an AGENTS.md the user had written', async () => {
  const cwd = await tmpDir('uninstall-agents');
  const mine = '# House rules\n\nAlways run the linter.\n';
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), mine);

  await installCommand(flags({ cwd }), captureIO());
  await uninstallCommand(flags({ cwd }), captureIO());

  const after = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  // Byte-identical, not merely "contains the original text" — the loose form of
  // this assertion hid a stray trailing newline for the whole of v0.1.0.
  assert.equal(after, mine);
});

test('uninstall deletes an AGENTS.md that only ever held our block', async () => {
  const cwd = await tmpDir('uninstall-agents-ours');
  await installCommand(flags({ cwd }), captureIO());
  await uninstallCommand(flags({ cwd }), captureIO());
  assert.equal(await exists(path.join(cwd, 'AGENTS.md')), false);
});

test('uninstall with nothing installed explains what to do', async () => {
  const cwd = await tmpDir('uninstall-none');
  await assert.rejects(
    uninstallCommand(flags({ cwd }), captureIO()),
    (err) => err.exitCode === 50 && typeof err.recovery === 'string'
  );
});

test('uninstall --dry-run leaves everything in place', async () => {
  const cwd = await tmpDir('uninstall-dry');
  await installCommand(flags({ cwd }), captureIO());

  const io = captureIO();
  assert.equal(await uninstallCommand(flags({ cwd, dryRun: true }), io), 0);
  assert.match(io.out, /would remove/);
  assert.ok(await exists(path.join(cwd, SKILL)));
  assert.ok(await readLock(cwd));
});

test('install → check → uninstall → check completes the round trip', async () => {
  const cwd = await tmpDir('roundtrip');
  await installCommand(flags({ cwd }), captureIO());
  assert.equal(await checkCommand(flags({ cwd }), captureIO()), 0);
  await uninstallCommand(flags({ cwd }), captureIO());
  assert.equal(await checkCommand(flags({ cwd }), captureIO()), 2);
});

// --- build identity in the lockfile (#17) -----------------------------------
//
// `check` used to report every difference as "edited", so a file a different
// build had written read identically to one the user had changed by hand. The
// two need opposite advice: one is safe to overwrite, the other is not.

test('the lockfile records which build wrote the files', async () => {
  const cwd = await tmpDir('payload-recorded');
  assert.equal(await installCommand(flags({ cwd, tools: ['cursor'] }), captureIO()), 0);

  const lock = await readLock(cwd);
  const { manifest } = await require('../lib/resolve-dist.js').resolveDist();
  assert.match(lock.payload_sha256, /^[0-9a-f]{64}$/);
  assert.equal(lock.payload_sha256, manifest.payload_sha256);
  // Distinct from canonical_sha256, which covers SKILL.md alone and so cannot
  // see a reference file change at all.
  assert.notEqual(manifest.payload_sha256, manifest.canonical_sha256);
});

test('check calls a hand-edited file edited, and warns before update eats it', async () => {
  const cwd = await tmpDir('drift-edited');
  assert.equal(await installCommand(flags({ cwd, tools: ['cursor'] }), captureIO()), 0);

  await fs.appendFile(path.join(cwd, TOKENS_RULE), '\nmy own note\n');

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /edited: .*dopod-design-tokens\.mdc/);
  assert.doesNotMatch(io.err, /rewritten:/);
  assert.match(io.err, /will overwrite the edited files/);
});

test('check calls a different build\'s content rewritten, not edited', async () => {
  const cwd = await tmpDir('drift-rewritten');
  assert.equal(await installCommand(flags({ cwd, tools: ['cursor'] }), captureIO()), 0);

  // The file on disk is untouched and matches what the package ships. Only the
  // lockfile disagrees — which is what a different build having written it
  // looks like from here.
  const lock = await readLock(cwd);
  for (const entry of lock.files_written) {
    if (entry.path.includes('tokens')) entry.sha256 = '0'.repeat(64);
  }
  lock.payload_sha256 = 'f'.repeat(64);
  await writeLock(cwd, lock);

  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /rewritten: .*dopod-design-tokens\.mdc/);
  assert.doesNotMatch(io.err, /edited: .*dopod-design-tokens\.mdc/);
  // No edit means nothing of the user's is at risk, so no overwrite warning.
  assert.doesNotMatch(io.err, /will overwrite the edited files/);
  assert.match(io.err, /Installed from a different build/);
});

test('a lockfile from before build tracking still works, and says what it cannot tell', async () => {
  const cwd = await tmpDir('drift-legacy-lock');
  assert.equal(await installCommand(flags({ cwd, tools: ['cursor'] }), captureIO()), 0);

  const lock = await readLock(cwd);
  delete lock.payload_sha256;          // exactly what v0.1.0 wrote
  await writeLock(cwd, lock);

  // Still in sync — the missing field must not read as drift.
  assert.equal(await checkCommand(flags({ cwd }), captureIO()), 0);

  await fs.appendFile(path.join(cwd, TOKENS_RULE), '\nmy own note\n');
  const io = captureIO();
  assert.equal(await checkCommand(flags({ cwd }), io), 1);
  assert.match(io.err, /predates build tracking/);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { build, extractSlim, REFERENCES, SLIM_START, SLIM_END } = require('../lib/build.js');
const { parseFrontmatter } = require('../lib/frontmatter.js');
const { sha256 } = require('../lib/fsx.js');
const { tmpDir, PACKAGE_ROOT, exists } = require('./helpers.js');

async function buildIntoTmp() {
  const distDir = path.join(await tmpDir('build'), 'dist');
  const manifest = await build({ sourceDir: PACKAGE_ROOT, distDir });
  return { distDir, manifest };
}

test('every reference named by the build exists in the repository', async () => {
  for (const ref of REFERENCES) {
    assert.ok(
      await exists(path.join(PACKAGE_ROOT, 'references', ref.file)),
      `references/${ref.file} is declared by the build but missing on disk`
    );
  }
});

test('the canonical SKILL.md carries the frontmatter every tool depends on', async () => {
  const raw = await fs.readFile(path.join(PACKAGE_ROOT, 'SKILL.md'), 'utf8');
  const { data } = parseFrontmatter(raw);
  assert.equal(data.name, 'dopod-design');
  assert.ok(data.description && data.description.length > 80, 'description drives skill triggering');
});

test('the build emits one output per tool for the skill and each reference', async () => {
  const { distDir } = await buildIntoTmp();

  assert.ok(await exists(path.join(distDir, 'claude-code', 'SKILL.md')));
  assert.ok(await exists(path.join(distDir, 'cursor', 'dopod-design.mdc')));
  assert.ok(await exists(path.join(distDir, 'copilot', '.github', 'copilot-instructions.md')));
  assert.ok(await exists(path.join(distDir, 'codex', 'AGENTS.md')));

  for (const ref of REFERENCES) {
    assert.ok(await exists(path.join(distDir, 'claude-code', 'references', ref.file)));
    assert.ok(await exists(path.join(distDir, 'cursor', `dopod-design-${ref.slug}.mdc`)));
    assert.ok(
      await exists(path.join(distDir, 'copilot', '.github', 'instructions', `dopod-design-${ref.slug}.instructions.md`))
    );
    assert.ok(await exists(path.join(distDir, 'shared', '.dopod-design', 'references', ref.file)));
  }
});

test('README lists every reference, and its stated count is right', async () => {
  // The README said "ten reference files" while listing twelve, and omitted
  // ibm-products entirely. Prose counts drift the moment a reference is added
  // and nothing complains, so let something complain.
  const readme = await fs.readFile(path.join(PACKAGE_ROOT, 'README.md'), 'utf8');

  for (const ref of REFERENCES) {
    assert.ok(readme.includes(`\`${ref.file}\``),
      `README does not list references/${ref.file}`);
  }

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const claimed = readme.match(/routes to ([a-z]+) reference files/);
  assert.ok(claimed, 'README should state how many references there are');
  assert.strictEqual(WORDS.indexOf(claimed[1]), REFERENCES.length,
    `README claims "${claimed[1]}" reference files but there are ${REFERENCES.length}`);
});

test('react.md does not sell @carbon/test-utils as React test helpers', async () => {
  // It is a Sass renderer, last published 2019 at 10.3.0, with no v11 release.
  // The file used to describe it as providing "helpers for a11y assertions and
  // event simulation" — wrong on both counts, and it sent people to add a
  // seven-year-old v10 package to their test setup.
  const md = await fs.readFile(path.join(PACKAGE_ROOT, 'references/react.md'), 'utf8');
  assert.doesNotMatch(md, /helpers for a11y assertions/i);
  assert.match(md, /Sass renderer/i,
    'react.md should say what @carbon/test-utils actually is');
});

test('the worked example is registered and scoped to component files', () => {
  const ref = REFERENCES.find((r) => r.slug === 'example');
  assert.ok(ref, 'example reference is registered');
  // It is a React build. Attaching it to .scss or .md would put a 15k-char
  // example in front of tasks it cannot help with.
  assert.match(ref.globs, /tsx|jsx/);
  assert.ok(!ref.globs.includes('scss'));
});

test('the example only uses v11 type token names', async () => {
  // productive-heading-04 nearly shipped here. The v10 aliases still resolve in
  // v11, so nothing upstream can catch this — the rename table in tokens.md is
  // the authority, and it is checked against by hand.
  const md = await fs.readFile(path.join(PACKAGE_ROOT, 'references/example.md'), 'utf8');
  const V10 = /type-style\('(productive-heading|expressive-heading|body-short|body-long)-\d+'\)/;
  assert.doesNotMatch(md, V10,
    'example.md uses a v10 type token name; see tokens.md §12 for the v11 equivalent');
});

test('the ibm-products reference is registered and glob-scoped', () => {
  const ref = REFERENCES.find((r) => r.slug === 'ibm-products');
  assert.ok(ref, 'ibm-products reference is registered');
  assert.ok(ref.globs, 'it should attach to source files, not be manual-only');
  assert.ok(!ref.globs.includes('scss'), 'it is component guidance, not styling');
});

test('components.md has no dangling pointer to a missing reference', async () => {
  // components.md used to say Tearsheet "lives in @carbon/ibm-products" with
  // nowhere to send the reader.
  const md = await fs.readFile(path.join(PACKAGE_ROOT, 'references/components.md'), 'utf8');
  for (const m of md.matchAll(/`references\/([a-z-]+\.md)`/g)) {
    assert.ok(REFERENCES.some((r) => r.file === m[1]),
      `components.md points at references/${m[1]}, which is not a registered reference`);
  }
});

test('windsurf rules respect the 12,000-character cap', async () => {
  const { distDir } = await buildIntoTmp();
  const dir = path.join(distDir, 'windsurf', 'rules');
  for (const name of await fs.readdir(dir)) {
    const body = await fs.readFile(path.join(dir, name), 'utf8');
    assert.ok(body.length <= 12000,
      `${name} is ${body.length} chars; Windsurf caps a workspace rule at 12000`);
  }
});

test('references too large for windsurf are still reachable via the pointer', async () => {
  const { distDir } = await buildIntoTmp();
  const rules = await fs.readdir(path.join(distDir, 'windsurf', 'rules'));
  const shipped = rules.filter((n) => n !== 'dopod-design.md').length;
  assert.ok(shipped < REFERENCES.length, 'some references exceed the cap');
  // Every reference, including the oversized ones, ships in the shared payload.
  for (const ref of REFERENCES) {
    assert.ok(await exists(
      path.join(distDir, 'shared', '.dopod-design', 'references', ref.file)));
  }
});

test('cline gets one always-on rule, not the whole reference set', async () => {
  const { distDir } = await buildIntoTmp();
  const top = (await fs.readdir(path.join(distDir, 'cline')))
    .filter((n) => n.endsWith('.md'));
  // Cline merges every file in .clinerules/ into one always-on rule set, so
  // shipping twelve references would put the whole skill in every prompt.
  assert.deepEqual(top, ['10-dopod-design.md']);
});

test('intake is manual — it must not attach to file types', () => {
  // Intake happens before code exists. A glob would surface it when the
  // decisions it asks about have already been made.
  const intake = REFERENCES.find((r) => r.slug === 'intake');
  assert.ok(intake, 'intake reference is registered');
  assert.equal(intake.globs, undefined);
  assert.equal(intake.manual, true);
});

test('motion guidance labels which patterns are ours rather than Carbon', async () => {
  // Presenting a house choice as Carbon makes it "what Carbon says" to the next
  // reader, and the distinction is unrecoverable afterwards.
  const motion = await fs.readFile(path.join(PACKAGE_ROOT, 'references/motion.md'), 'utf8');
  assert.ok((motion.match(/\[house\]/g) || []).length >= 4,
    'house-layer patterns must be labelled at the point of use');
  assert.match(motion, /Carbon canon/);
  assert.match(motion, /prefers-reduced-motion/, 'reduced motion is non-negotiable');
});

test('every animated pattern reference documents reduced motion', async () => {
  const motion = await fs.readFile(path.join(PACKAGE_ROOT, 'references/motion.md'), 'utf8');
  assert.match(motion, /## 9\. Reduced motion/);
  // Chart animation is JS-driven, so the blanket CSS rule cannot reach it.
  assert.match(motion, /animations: !reduce/);
});

test('claude-code receives an always-on file alongside the on-demand skill', async () => {
  const { distDir } = await buildIntoTmp();
  const agents = await fs.readFile(path.join(distDir, 'claude-code', 'AGENTS.md'), 'utf8');
  const full = await fs.readFile(path.join(distDir, 'claude-code', 'SKILL.md'), 'utf8');

  assert.match(agents, /Never write a raw color/, 'carries the slim rules');
  assert.ok(agents.length < full.length, 'always-on payload must stay a subset');
  // It competes for context on every turn, so keep it short.
  assert.ok(agents.split('\n').length < 200, 'always-on file should stay under ~200 lines');
});

test('the always-on file points at the installed skill references', async () => {
  const { distDir } = await buildIntoTmp();
  const agents = await fs.readFile(path.join(distDir, 'claude-code', 'AGENTS.md'), 'utf8');
  assert.match(agents, /`\.claude\/skills\/dopod-design\/references\/tokens\.md`/);
  assert.doesNotMatch(agents, /`references\/tokens\.md`/, 'citations must be relocated');
});

test('claude-code receives the canonical skill byte for byte', async () => {
  const { distDir } = await buildIntoTmp();
  const canonical = await fs.readFile(path.join(PACKAGE_ROOT, 'SKILL.md'), 'utf8');
  const emitted = await fs.readFile(path.join(distDir, 'claude-code', 'SKILL.md'), 'utf8');
  assert.equal(emitted, canonical);
});

test('cursor rules carry a description, and globbed rules carry globs', async () => {
  const { distDir } = await buildIntoTmp();

  const main = parseFrontmatter(
    await fs.readFile(path.join(distDir, 'cursor', 'dopod-design.mdc'), 'utf8')
  );
  assert.ok(main.data.description.length > 0);
  assert.equal(main.data.alwaysApply, 'false');

  for (const ref of REFERENCES) {
    const { data } = parseFrontmatter(
      await fs.readFile(path.join(distDir, 'cursor', `dopod-design-${ref.slug}.mdc`), 'utf8')
    );
    assert.ok(data.description, `dopod-design-${ref.slug}.mdc needs a description`);
    if (ref.manual) {
      assert.equal(data.globs, undefined, 'manual references should not auto-attach');
    } else {
      assert.equal(data.globs, ref.globs);
    }
  }
});

test('copilot instruction files declare applyTo except for manual references', async () => {
  const { distDir } = await buildIntoTmp();
  for (const ref of REFERENCES) {
    const file = path.join(distDir, 'copilot', '.github', 'instructions', `dopod-design-${ref.slug}.instructions.md`);
    const { data } = parseFrontmatter(await fs.readFile(file, 'utf8'));
    if (ref.manual) assert.equal(data.applyTo, undefined);
    else assert.equal(data.applyTo, ref.globs);
  }
});

test('the always-on files stay far smaller than the full skill', async () => {
  const { distDir } = await buildIntoTmp();
  const full = await fs.readFile(path.join(distDir, 'claude-code', 'SKILL.md'), 'utf8');
  const agents = await fs.readFile(path.join(distDir, 'codex', 'AGENTS.md'), 'utf8');
  assert.ok(
    agents.length < full.length,
    'AGENTS.md is loaded on every turn, so it must be a subset'
  );
  assert.match(agents, /Never write a raw color/);
});

test('reference citations are rewritten to each tool’s actual layout', async () => {
  const { distDir } = await buildIntoTmp();

  const agents = await fs.readFile(path.join(distDir, 'codex', 'AGENTS.md'), 'utf8');
  assert.match(agents, /`\.dopod-design\/references\/tokens\.md`/);
  assert.doesNotMatch(agents, /`references\/tokens\.md`/);

  const copilot = await fs.readFile(
    path.join(distDir, 'copilot', '.github', 'copilot-instructions.md'),
    'utf8'
  );
  assert.match(copilot, /`\.github\/instructions\/dopod-design-tokens\.instructions\.md`/);
  assert.doesNotMatch(copilot, /`references\/tokens\.md`/);
});

test('the manifest hashes match the files actually written', async () => {
  const { distDir, manifest } = await buildIntoTmp();
  assert.equal(manifest.package, 'dopod-design');
  assert.ok(manifest.files.length > 0);
  for (const entry of manifest.files) {
    const content = await fs.readFile(path.join(distDir, entry.path));
    assert.equal(sha256(content), entry.sha256, `${entry.path} hash mismatch`);
  }
});

test('the manifest excludes itself and lists files in a stable order', async () => {
  const { manifest } = await buildIntoTmp();
  assert.ok(!manifest.files.some((f) => f.path === 'manifest.json'));
  const paths = manifest.files.map((f) => f.path);
  assert.deepEqual(paths, [...paths].sort());
});

test('rebuilding produces identical output', async () => {
  const first = await buildIntoTmp();
  const second = await buildIntoTmp();
  assert.deepEqual(
    first.manifest.files.map((f) => `${f.path}:${f.sha256}`),
    second.manifest.files.map((f) => `${f.path}:${f.sha256}`)
  );
});

test('the build clears stale files from a previous run', async () => {
  const distDir = path.join(await tmpDir('build-stale'), 'dist');
  await fs.mkdir(distDir, { recursive: true });
  const stale = path.join(distDir, 'leftover.md');
  await fs.writeFile(stale, 'from an older version');
  await build({ sourceDir: PACKAGE_ROOT, distDir });
  assert.equal(await exists(stale), false);
});

test('extractSlim returns only the marked region', () => {
  const body = `intro\n${SLIM_START}\nkeep me\n${SLIM_END}\noutro\n`;
  assert.equal(extractSlim(body), 'keep me');
});

test('a SKILL.md without slim markers fails the build loudly', () => {
  assert.throws(
    () => extractSlim('no markers here'),
    (err) => err.exitCode === 13 && /slim:start/.test(err.message)
  );
});

test('inverted slim markers fail the build', () => {
  assert.throws(
    () => extractSlim(`${SLIM_END}\nbody\n${SLIM_START}`),
    (err) => err.exitCode === 13
  );
});

test('a missing reference file fails the build instead of shipping a gap', async () => {
  const source = await tmpDir('build-missing');
  await fs.writeFile(
    path.join(source, 'SKILL.md'),
    `---\nname: dopod-design\ndescription: test\n---\n${SLIM_START}\nrules\n${SLIM_END}\n`
  );
  await assert.rejects(
    build({ sourceDir: source, distDir: path.join(source, 'dist') }),
    (err) => err.exitCode === 10 && /Missing canonical reference file/.test(err.message)
  );
});

test('frontmatter without a description fails the build', async () => {
  const source = await tmpDir('build-nodesc');
  await fs.writeFile(path.join(source, 'SKILL.md'), '---\nname: dopod-design\n---\nbody\n');
  await assert.rejects(
    build({ sourceDir: source, distDir: path.join(source, 'dist') }),
    (err) => err.exitCode === 11
  );
});

'use strict';
const path = require('node:path');
const { readLock } = require('./lockfile.js');
const { resolveDist } = require('./resolve-dist.js');
const { findBlock, normalizeForHash } = require('./marker-merge.js');
const { sha256, readFileOrNull } = require('./fsx.js');
const { PKG_NAME, scopeDir, resolveTargetPath } = require('./paths.js');

// Exit codes are the point of this command: 0 in sync, 1 drift, 2 not
// installed. That lets CI gate on `dopod-design check` without parsing output.
async function checkCommand(flags, io = process) {
  const base = scopeDir({ global: flags.global, cwd: flags.cwd || process.cwd() });
  const lock = await readLock(base);

  if (!lock) {
    io.stdout.write(`not installed (no lockfile at ${base})\n`);
    return 2;
  }

  const { manifest } = await resolveDist();
  const drift = [];

  if (lock.version !== manifest.version) {
    drift.push(`version: installed ${lock.version}, package ships ${manifest.version}`);
  }

  // What the package would write to each of those same paths today. Lockfile
  // paths are install targets, not dist paths, so the mapping has to be
  // recomputed through the same resolver install used — including its
  // first-one-wins rule, since four pointer tools resolve one shared target.
  const shipsNow = new Map();
  for (const entry of manifest.files) {
    const target = resolveTargetPath(base, entry.path, { global: lock.scope === 'global' });
    if (!target) continue;
    const rel = path.relative(base, target);
    if (!shipsNow.has(rel)) shipsNow.set(rel, entry.sha256);
  }

  // A lockfile written before payload_sha256 existed cannot support the
  // comparison. Say so rather than guessing — an unexplained downgrade in
  // detail is worse than the old behaviour.
  const knowsPayload = typeof lock.payload_sha256 === 'string';
  const samePayload = knowsPayload && lock.payload_sha256 === manifest.payload_sha256;

  for (const entry of lock.files_written) {
    const content = await readFileOrNull(path.join(base, entry.path));
    if (content === null) {
      drift.push(`missing: ${entry.path}`);
      continue;
    }
    if (sha256(content) === entry.sha256) continue;

    // The distinction the whole change exists for, and it is fully decidable.
    // The file differs from what we recorded writing. If it matches what the
    // package ships *now*, a different build wrote it and the lockfile is what
    // is stale — nothing of the user's is at risk. If it matches neither, a
    // human changed it, and `update` will overwrite that.
    const shipped = shipsNow.get(entry.path);
    if (shipped !== undefined && sha256(content) === shipped) {
      drift.push(`rewritten: ${entry.path} — matches a different build, not an edit`);
    } else {
      drift.push(`edited: ${entry.path}`);
    }
  }

  for (const entry of lock.marker_blocks) {
    const content = await readFileOrNull(path.join(base, entry.file), 'utf8');
    if (content === null) {
      drift.push(`missing: ${entry.file}`);
      continue;
    }
    let found;
    try {
      found = findBlock(content);
    } catch (err) {
      drift.push(`malformed markers: ${entry.file} — ${err.message}`);
      continue;
    }
    if (!found) {
      drift.push(`managed block removed from: ${entry.file}`);
      continue;
    }
    // Compare only the fenced body, so edits the user makes elsewhere in their
    // own AGENTS.md never register as our drift.
    const body = found.block
      .replace(/^<!-- .*?:start v\S+ -->\r?\n/, '')
      .replace(/\r?\n<!-- .*?:end -->$/, '');
    if (sha256(normalizeForHash(body)) !== entry.block_sha256) {
      drift.push(`managed block edited in: ${entry.file}`);
    }
  }

  if (drift.length === 0) {
    io.stdout.write(`in sync — ${PKG_NAME}@${lock.version} at ${base}\n`);
    return 0;
  }

  io.stderr.write(`drift detected at ${base}:\n`);
  for (const line of drift) io.stderr.write(`  - ${line}\n`);

  if (!knowsPayload) {
    io.stderr.write(
      `\nnote: this lockfile predates build tracking, so "edited" above may in\n` +
        `      fact be a newer build's content. Re-running install records it.\n`
    );
  } else if (!samePayload) {
    io.stderr.write(
      `\nInstalled from a different build (${lock.payload_sha256.slice(0, 12)} → ` +
        `${manifest.payload_sha256.slice(0, 12)}).\n`
    );
  }

  // Worth saying plainly: update is non-destructive for everything except a
  // genuine edit, and that is exactly the case we can now name.
  if (drift.some((d) => d.startsWith('edited:'))) {
    io.stderr.write(
      `\n\`update\` will overwrite the edited files above. Copy anything you\n` +
        `want to keep out first — the rest restores cleanly.\n`
    );
  }

  io.stderr.write(`\nRun \`npx ${PKG_NAME} update\` to restore.\n`);
  return 1;
}

exports.checkCommand = checkCommand;

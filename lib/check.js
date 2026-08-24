'use strict';
const path = require('node:path');
const { readLock } = require('./lockfile.js');
const { resolveDist } = require('./resolve-dist.js');
const { findBlock, normalizeForHash } = require('./marker-merge.js');
const { sha256, readFileOrNull } = require('./fsx.js');
const { PKG_NAME, scopeDir } = require('./paths.js');

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

  for (const entry of lock.files_written) {
    const content = await readFileOrNull(path.join(base, entry.path));
    if (content === null) {
      drift.push(`missing: ${entry.path}`);
    } else if (sha256(content) !== entry.sha256) {
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
  io.stderr.write(`\nRun \`npx ${PKG_NAME} update\` to restore.\n`);
  return 1;
}

exports.checkCommand = checkCommand;

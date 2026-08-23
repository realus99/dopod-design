'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { readLock } = require('./lockfile.js');
const { installCommand } = require('./install.js');
const { stripBlock } = require('./marker-merge.js');
const { atomicWrite, readFileOrNull, pruneEmptyDirs } = require('./fsx.js');
const { scopeDir } = require('./paths.js');

// Update is install plus cleanup. Install alone would leave orphans behind when
// a new version renames or drops a file, and those orphans keep being loaded by
// the tool — stale guidance is worse than none.
async function updateCommand(flags, io = process) {
  const base = scopeDir({ global: flags.global, cwd: flags.cwd || process.cwd() });
  const before = await readLock(base);

  if (!before) {
    io.stderr.write('nothing installed here yet — running a fresh install.\n');
  }

  const code = await installCommand(flags, io);
  if (code !== 0 || flags.dryRun || !before) return code;

  const after = await readLock(base);
  const stillWritten = new Set(after.files_written.map((f) => f.path));
  const stillMerged = new Set(after.marker_blocks.map((b) => b.file));
  const vacatedDirs = [];

  for (const old of before.files_written) {
    if (stillWritten.has(old.path)) continue;
    const full = path.join(base, old.path);
    try {
      await fs.unlink(full);
      vacatedDirs.push(path.dirname(full));
      io.stdout.write(`  removed  ${old.path}\n`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  for (const old of before.marker_blocks) {
    if (stillMerged.has(old.file)) continue;
    const full = path.join(base, old.file);
    const existing = await readFileOrNull(full, 'utf8');
    if (existing === null) continue;
    const stripped = stripBlock(existing);
    if (stripped.trim() === '') {
      await fs.unlink(full);
      vacatedDirs.push(path.dirname(full));
      io.stdout.write(`  removed  ${old.file} (empty after unmerge)\n`);
    } else {
      await atomicWrite(full, stripped);
      io.stdout.write(`  unmerged ${old.file}\n`);
    }
  }

  await pruneEmptyDirs(vacatedDirs, base);

  if (before.version !== after.version) {
    io.stdout.write(`  version  ${before.version} → ${after.version}\n`);
  }
  return 0;
}

exports.updateCommand = updateCommand;

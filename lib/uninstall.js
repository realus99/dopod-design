'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { readLock, deleteLock } = require('./lockfile.js');
const { stripBlock } = require('./marker-merge.js');
const { atomicWrite, readFileOrNull, pruneEmptyDirs } = require('./fsx.js');
const { PKG_NAME, scopeDir } = require('./paths.js');

async function uninstallCommand(flags, io = process) {
  const base = scopeDir({ global: flags.global, cwd: flags.cwd || process.cwd() });
  const lock = await readLock(base);

  if (!lock) {
    const err = new Error(`No dopod-design install found at ${base}.`);
    err.exitCode = 50;
    err.recovery = flags.global
      ? 'Drop --global to uninstall a project-scoped install instead.'
      : 'Run from the directory where you installed, or add --global for a user-scoped install.';
    throw err;
  }

  if (flags.dryRun) {
    for (const f of lock.files_written) io.stdout.write(`would remove  ${path.join(base, f.path)}\n`);
    for (const b of lock.marker_blocks) io.stdout.write(`would unmerge ${path.join(base, b.file)}\n`);
    io.stdout.write(`would remove  ${path.join(base, '.dopod-design.lock.json')}\n`);
    return 0;
  }

  const vacatedDirs = [];

  for (const entry of lock.files_written) {
    const full = path.join(base, entry.path);
    try {
      await fs.unlink(full);
      vacatedDirs.push(path.dirname(full));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // Shared files get our block cut out and the rest handed back. We only delete
  // the file outright when nothing of the user's remains.
  for (const entry of lock.marker_blocks) {
    const full = path.join(base, entry.file);
    const existing = await readFileOrNull(full, 'utf8');
    if (existing === null) continue;
    const stripped = stripBlock(existing);
    if (stripped.trim() === '') {
      await fs.unlink(full);
      vacatedDirs.push(path.dirname(full));
    } else {
      await atomicWrite(full, stripped);
    }
  }

  // Walk every ancestor up to the install root so nested skill/reference
  // directories disappear too — but only if they are genuinely empty.
  const allDirs = [];
  for (const dir of vacatedDirs) {
    let cursor = dir;
    while (cursor.startsWith(base) && cursor !== base) {
      allDirs.push(cursor);
      cursor = path.dirname(cursor);
    }
  }
  await pruneEmptyDirs(allDirs, base);

  await deleteLock(base);
  io.stdout.write(`uninstalled ${PKG_NAME}@${lock.version} from ${base}\n`);
  return 0;
}

exports.uninstallCommand = uninstallCommand;

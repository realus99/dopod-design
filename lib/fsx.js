'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Write via temp file + rename so an interrupted run can never leave a
// half-written instruction file that a tool would then load as truth.
async function atomicWrite(targetPath, contents) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const suffix = crypto.randomBytes(6).toString('hex');
  const tmp = path.join(dir, `.${path.basename(targetPath)}.${suffix}.tmp`);
  try {
    await fs.writeFile(tmp, contents);
    await fs.rename(tmp, targetPath);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      const e = new Error(`Permission denied writing ${targetPath}.`);
      e.exitCode = 30;
      e.recovery = 'Check file ownership, or run in a directory you can write to.';
      throw e;
    }
    throw err;
  }
}

async function readFileOrNull(p, encoding) {
  try {
    return await fs.readFile(p, encoding);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(dir, prefix = '') {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(full, rel)));
    } else if (entry.isFile()) {
      out.push({ full, rel });
    }
  }
  return out;
}

// Deepest-first removal of directories that our own files vacated. rmdir fails
// on non-empty directories, which is exactly the guard we want — anything the
// user put there survives.
async function pruneEmptyDirs(dirs, stopAt) {
  const sorted = [...new Set(dirs)].sort((a, b) => b.length - a.length);
  for (const dir of sorted) {
    if (!dir.startsWith(stopAt) || dir === stopAt) continue;
    try {
      await fs.rmdir(dir);
    } catch (err) {
      if (err.code !== 'ENOTEMPTY' && err.code !== 'ENOENT') throw err;
    }
  }
}

exports.sha256 = sha256;
exports.atomicWrite = atomicWrite;
exports.readFileOrNull = readFileOrNull;
exports.pathExists = pathExists;
exports.listFilesRecursive = listFilesRecursive;
exports.pruneEmptyDirs = pruneEmptyDirs;

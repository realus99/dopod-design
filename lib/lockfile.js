'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { atomicWrite } = require('./fsx.js');
const { LOCK_FILENAME } = require('./paths.js');

// The lockfile records exactly which files this package wrote and what they
// hashed to. Every other command reads it to know what it owns — without it,
// uninstall would have to guess, and guessing means deleting someone's AGENTS.md.

async function readLock(dir) {
  const file = path.join(dir, LOCK_FILENAME);
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    const e = new Error(`Lockfile at ${file} is not valid JSON: ${err.message}`);
    e.exitCode = 51;
    e.recovery = 'Delete the lockfile and run install again.';
    throw e;
  }
}

async function writeLock(dir, data) {
  await atomicWrite(path.join(dir, LOCK_FILENAME), `${JSON.stringify(data, null, 2)}\n`);
}

async function deleteLock(dir) {
  try {
    await fs.unlink(path.join(dir, LOCK_FILENAME));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

exports.readLock = readLock;
exports.writeLock = writeLock;
exports.deleteLock = deleteLock;

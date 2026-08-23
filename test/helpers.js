'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

async function tmpDir(label = 'dopod-design-test') {
  return fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
}

// Captures stdout/stderr so command tests can assert on output without the
// suite printing it. Commands take an `io` object for exactly this reason.
function captureIO() {
  const out = [];
  const err = [];
  return {
    stdout: { write: (s) => out.push(s) },
    stderr: { write: (s) => err.push(s) },
    get out() { return out.join(''); },
    get err() { return err.join(''); },
  };
}

function flags(overrides = {}) {
  return {
    global: false,
    dryRun: false,
    verbose: false,
    tools: ['claude-code', 'cursor', 'copilot', 'codex'],
    ...overrides,
  };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDist() {
  const distDir = path.join(PACKAGE_ROOT, 'dist');
  if (!(await exists(path.join(distDir, 'manifest.json')))) {
    const { build } = require('../lib/build.js');
    await build({ sourceDir: PACKAGE_ROOT, distDir });
  }
  return distDir;
}

exports.PACKAGE_ROOT = PACKAGE_ROOT;
exports.tmpDir = tmpDir;
exports.captureIO = captureIO;
exports.flags = flags;
exports.exists = exists;
exports.ensureDist = ensureDist;

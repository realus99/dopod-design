#!/usr/bin/env node
'use strict';

// Runs the test suite portably.
//
// `node --test test/*.test.js` depends on the *shell* expanding the glob, which
// PowerShell does not do — Windows saw the literal pattern and failed. The
// obvious alternative, `node --test test/`, works on Node 18-22 but breaks on
// Node 26, which treats a bare directory as a module path.
//
// Discovering the files here and passing them explicitly works on every
// platform and every supported Node version, with no dependency.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DIR = path.resolve(__dirname, '..', 'test');

const files = fs
  .readdirSync(TEST_DIR)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join(TEST_DIR, name));

if (files.length === 0) {
  console.error(`No *.test.js files found in ${TEST_DIR}`);
  process.exit(1);
}

const args = ['--test', ...process.argv.slice(2), ...files];
spawn(process.execPath, args, { stdio: 'inherit' }).on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

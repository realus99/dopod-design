#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { build } = require('../lib/build.js');

const sourceDir = path.resolve(__dirname, '..');

build({ sourceDir, distDir: path.join(sourceDir, 'dist') })
  .then((manifest) => {
    process.stdout.write(
      `built dist/ — ${manifest.files.length} files, dopod-design@${manifest.version}\n`
    );
  })
  .catch((err) => {
    process.stderr.write(`build failed: ${err.message}\n`);
    if (err.recovery) process.stderr.write(`${err.recovery}\n`);
    process.exitCode = err.exitCode || 10;
  });

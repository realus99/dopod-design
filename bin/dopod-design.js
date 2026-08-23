#!/usr/bin/env node
'use strict';

const { main } = require('../lib/cli.js');

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    process.stderr.write(`unexpected error: ${err && err.stack ? err.stack : err}\n`);
    process.exitCode = 70;
  });

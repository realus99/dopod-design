#!/usr/bin/env node
'use strict';

// Renders the "Package versions to install" block in SKILL.md from
// versions.json, which is the single source of truth.
//
// SKILL.md stays a readable, hand-edited document — the build does not rewrite
// it silently. This script updates the block on demand, and `--check` asserts
// the two agree, which the build and CI use to fail on divergence.
//
//   npm run sync:versions          rewrite the block
//   npm run sync:versions -- --check   verify only, exit 1 on divergence

const fs = require('node:fs');
const path = require('node:path');
const { detectEol } = require('../lib/marker-merge.js');

const ROOT = path.resolve(__dirname, '..');
const SKILL = path.join(ROOT, 'SKILL.md');
const HEADING = '## Package versions to install';

function renderBlock(packages) {
  // Only the packages a consumer installs for the flagship paths. The v10 ports
  // carry caveats documented in other-frameworks.md, and @carbon/ibm-products is
  // a separate layer — listing either here as "install this" would mislead.
  const install = packages.filter((p) => p.core);
  const width = Math.max(...install.map((p) => p.name.length)) + 2;
  const rangeWidth = Math.max(...install.map((p) => p.range.length)) + 2;
  const lines = install.map(
    (p) => `${p.name.padEnd(width)}${p.range.padEnd(rangeWidth)}${p.note}`.trimEnd()
  );
  return ['```', ...lines, '```'].join('\n');
}

function currentBlock(md) {
  const start = md.indexOf(HEADING);
  if (start === -1) throw new Error(`"${HEADING}" not found in SKILL.md`);
  const open = md.indexOf('```', start);
  if (open === -1) throw new Error('no fenced block after the versions heading');
  const close = md.indexOf('```', open + 3);
  if (close === -1) throw new Error('unterminated fenced block after the versions heading');
  return { start: open, end: close + 3, text: md.slice(open, close + 3) };
}

function main() {
  const check = process.argv.includes('--check');
  const { packages } = JSON.parse(fs.readFileSync(path.join(ROOT, 'versions.json'), 'utf8'));
  const md = fs.readFileSync(SKILL, 'utf8');
  const found = currentBlock(md);
  // Windows git checks out CRLF, so compare on content and write in the file's
  // own ending. Comparing raw strings made this fail on Windows alone — the
  // same line-ending trap as #12, in my own tooling this time.
  const eol = detectEol(md);
  const rendered = renderBlock(packages).replace(/\n/g, eol);
  const same = (a, b) => a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');

  if (same(found.text, rendered)) {
    console.log(`✓ SKILL.md versions match versions.json (${packages.length} packages tracked)`);
    return;
  }

  if (check) {
    console.error('✗ SKILL.md version block is out of sync with versions.json\n');
    console.error('  in SKILL.md:');
    for (const l of found.text.split('\n')) console.error(`    ${l}`);
    console.error('\n  from versions.json:');
    for (const l of rendered.split('\n')) console.error(`    ${l}`);
    console.error('\n  Run `npm run sync:versions` to update SKILL.md.');
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(SKILL, md.slice(0, found.start) + rendered + md.slice(found.end));
  console.log('✓ SKILL.md version block regenerated from versions.json');
}

main();

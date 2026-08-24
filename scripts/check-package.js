#!/usr/bin/env node
'use strict';

// Asserts what the published tarball actually contains.
//
// The `files` array in package.json and the `.gitignore` interact in a way that
// is easy to get wrong: `dist/` is gitignored but must ship, while `evals/`,
// `docs/`, and `admin-docs/` must not. A mis-scoped `files` array either omits
// the payload — leaving consumers with a CLI and nothing to install — or leaks
// internal material. Neither fails any unit test, so it is checked here.

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { REFERENCES } = require('../lib/build.js');
const { ALL_TOOLS } = require('../lib/paths.js');

const ROOT = path.resolve(__dirname, '..');

// Present in every published tarball.
const REQUIRED = [
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'SKILL.md',
  'bin/dopod-design.js',
  'lib/cli.js',
  'lib/build.js',
  'dist/manifest.json',
];

// Never published: development material, internal measurement, operator docs.
const FORBIDDEN_PREFIXES = [
  'test/',
  'evals/',
  'docs/',
  'admin-docs/',
  '.github/',
  'node_modules/',
];
const FORBIDDEN_PATTERNS = [/\.log$/, /\.tgz$/, /\.lock\.json$/, /^\.env/];

// A drastic change in either direction means something was added or dropped
// without anyone noticing.
const MIN_FILES = 60;
const MAX_FILES = 120;
const MAX_BYTES = 2 * 1024 * 1024;

function listTarball() {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const [meta] = JSON.parse(raw);
  return {
    files: meta.files.map((f) => f.path),
    size: meta.size,
    unpacked: meta.unpackedSize,
    count: meta.entryCount,
  };
}

function main() {
  const { files, size, unpacked, count } = listTarball();
  const set = new Set(files);
  const problems = [];

  for (const required of REQUIRED) {
    if (!set.has(required)) problems.push(`missing from tarball: ${required}`);
  }

  for (const file of files) {
    for (const prefix of FORBIDDEN_PREFIXES) {
      if (file.startsWith(prefix)) problems.push(`must not publish: ${file}`);
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(file)) problems.push(`must not publish: ${file}`);
    }
  }

  // The payload is what consumers actually install — verify every tool got
  // every reference, not just that dist/ exists.
  for (const tool of ALL_TOOLS) {
    if (!files.some((f) => f.startsWith(`dist/${tool}/`))) {
      problems.push(`dist/ has no output for tool: ${tool}`);
    }
  }
  for (const ref of REFERENCES) {
    if (!set.has(`references/${ref.file}`)) {
      problems.push(`canonical reference not published: references/${ref.file}`);
    }
    if (!set.has(`dist/claude-code/references/${ref.file}`)) {
      problems.push(`reference missing from claude-code payload: ${ref.file}`);
    }
    if (!set.has(`dist/cursor/dopod-design-${ref.slug}.mdc`)) {
      problems.push(`reference missing from cursor payload: ${ref.slug}`);
    }
  }

  // The always-on layers — the thing that makes plain-language asks work.
  for (const alwaysOn of ['dist/claude-code/AGENTS.md', 'dist/codex/AGENTS.md',
                          'dist/copilot/.github/copilot-instructions.md']) {
    if (!set.has(alwaysOn)) problems.push(`always-on file missing: ${alwaysOn}`);
  }

  if (count < MIN_FILES || count > MAX_FILES) {
    problems.push(`file count ${count} outside expected ${MIN_FILES}-${MAX_FILES}`);
  }
  if (unpacked > MAX_BYTES) {
    problems.push(`unpacked size ${unpacked} exceeds ${MAX_BYTES}`);
  }

  const kb = (n) => `${Math.round(n / 1024)} kB`;
  if (problems.length) {
    console.error(`✗ package contents check failed (${problems.length} problem(s)):\n`);
    for (const p of problems) console.error(`   ${p}`);
    console.error(`\n  ${count} files, ${kb(size)} packed, ${kb(unpacked)} unpacked`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ package contents OK — ${count} files, ${kb(size)} packed, ${kb(unpacked)} unpacked`);
  console.log(`  payload present for: ${ALL_TOOLS.join(', ')}`);
  console.log(`  ${REFERENCES.length} references published to every tool`);
}

main();

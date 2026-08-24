#!/usr/bin/env node
'use strict';

// Installs the packed tarball into a scratch project and exercises the full
// lifecycle: install, check, update, uninstall.
//
// Unit tests call the command functions directly. This runs the actual
// published artifact the way a consumer gets it, which catches a different
// class of problem: a mis-scoped `files` array, a missing `dist/`, a bin script
// that does not resolve, a lockfile the CLI cannot read back.
//
// Two invariants matter more than the rest and are asserted explicitly:
//   - a pre-existing AGENTS.md comes back byte-identical after uninstall
//   - a sibling package's .cursor/rules/dopod-*.mdc files are never touched
//
// `npm install <tarball>` is used rather than extracting by hand, because it
// works identically on Windows and also exercises the dependency-install path.

const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IS_WIN = process.platform === 'win32';

// Node refuses to spawn a .cmd shim without shell:true (the CVE-2024-27980
// hardening), and npm on Windows *is* a .cmd shim. Enabling the shell means
// arguments get re-parsed, so anything that could contain a space is quoted —
// temp paths on Windows runners routinely do.
function runNpm(args, opts = {}) {
  const quoted = IS_WIN ? args.map((a) => (/[\s"]/.test(a) ? `"${a}"` : a)) : args;
  return execFileSync(IS_WIN ? 'npm.cmd' : 'npm', quoted, { ...opts, shell: IS_WIN });
}

let scratch;
const checks = [];

function step(name, fn) {
  try {
    fn();
    checks.push(`✓ ${name}`);
  } catch (err) {
    checks.push(`✗ ${name}\n     ${err.message.split('\n')[0]}`);
    throw err;
  }
}

function cli(cwd, args, { expectExit = 0 } = {}) {
  const bin = path.join(cwd, 'node_modules', 'dopod-design', 'bin', 'dopod-design.js');
  try {
    const out = execFileSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
    assert.equal(0, expectExit, `expected exit ${expectExit}, got 0`);
    return out;
  } catch (err) {
    if (err.status === undefined) throw err;
    assert.equal(err.status, expectExit,
      `expected exit ${expectExit}, got ${err.status}\n${err.stdout || ''}${err.stderr || ''}`);
    return `${err.stdout || ''}${err.stderr || ''}`;
  }
}

const listFiles = (dir) => {
  const out = [];
  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else out.push(r);
    }
  };
  walk(dir);
  return out.sort();
};

function main() {
  console.log('packing…');
  const packed = JSON.parse(
    runNpm(['pack', '--json', '--pack-destination', os.tmpdir()],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  )[0].filename;
  const tarball = path.join(os.tmpdir(), packed);

  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dopod-smoke-'));
  fs.writeFileSync(path.join(scratch, 'package.json'),
    JSON.stringify({ name: 'smoke', version: '1.0.0', private: true }, null, 2));

  // A project that already has its own AGENTS.md and a sibling package's cursor
  // rules — the situation the marker merge and file naming exist to survive.
  const originalAgents = '# Team AGENTS\r\n\r\nRun `make lint` before committing.\r\n';
  fs.writeFileSync(path.join(scratch, 'AGENTS.md'), originalAgents);
  fs.mkdirSync(path.join(scratch, '.cursor', 'rules'), { recursive: true });
  const sibling = path.join(scratch, '.cursor', 'rules', 'dopod-tokens.mdc');
  fs.writeFileSync(sibling, 'sibling package rule, must not be touched\n');
  const siblingBefore = fs.readFileSync(sibling, 'utf8');

  console.log(`installing ${packed} into a scratch project…`);
  runNpm(['install', tarball, '--no-audit', '--no-fund', '--silent'],
    { cwd: scratch, stdio: ['ignore', 'ignore', 'inherit'] });

  step('bin resolves and --version matches the package', () => {
    const expected = require(path.join(ROOT, 'package.json')).version;
    assert.equal(cli(scratch, ['--version']).trim(), expected);
  });

  step('install writes every tool', () => {
    const out = cli(scratch, ['install']);
    assert.match(out, /installed dopod-design@/);
    for (const p of [
      '.claude/skills/dopod-design/SKILL.md',
      '.claude/skills/dopod-design/references/tokens.md',
      '.cursor/rules/dopod-design-tokens.mdc',
      '.github/copilot-instructions.md',
      '.github/instructions/dopod-design-tokens.instructions.md',
      'AGENTS.md',
      '.dopod-design/references/tokens.md',
    ]) {
      assert.ok(fs.existsSync(path.join(scratch, p)), `missing after install: ${p}`);
    }
  });

  step('the sibling package rule is untouched', () => {
    assert.equal(fs.readFileSync(sibling, 'utf8'), siblingBefore);
  });

  step('AGENTS.md gained exactly one managed block, keeping user content', () => {
    const agents = fs.readFileSync(path.join(scratch, 'AGENTS.md'), 'utf8');
    assert.equal((agents.match(/dopod-design:start/g) || []).length, 1);
    assert.match(agents, /make lint/);
    assert.ok(!/(?<!\r)\n/.test(agents), 'a CRLF file must not gain bare LF lines');
  });

  step('check reports in sync', () => {
    assert.match(cli(scratch, ['check']), /in sync/);
  });

  step('check reports drift after an edit, and update repairs it', () => {
    const rule = path.join(scratch, '.cursor', 'rules', 'dopod-design-tokens.mdc');
    fs.appendFileSync(rule, '\nlocal edit\n');
    cli(scratch, ['check'], { expectExit: 1 });
    cli(scratch, ['update']);
    assert.match(cli(scratch, ['check']), /in sync/);
  });

  step('uninstall removes everything it wrote', () => {
    cli(scratch, ['uninstall']);
    const remaining = listFiles(scratch).filter((f) => f !== 'package.json' && f !== 'package-lock.json');
    assert.deepEqual(remaining, ['.cursor/rules/dopod-tokens.mdc', 'AGENTS.md'],
      `unexpected leftovers: ${remaining.join(', ')}`);
  });

  step('a pre-existing AGENTS.md comes back byte-identical', () => {
    assert.equal(fs.readFileSync(path.join(scratch, 'AGENTS.md'), 'utf8'), originalAgents);
  });

  step('the sibling rule survived the whole lifecycle', () => {
    assert.equal(fs.readFileSync(sibling, 'utf8'), siblingBefore);
  });

  step('a subset install writes only that tool', () => {
    cli(scratch, ['install', '--tools=cursor']);
    assert.ok(fs.existsSync(path.join(scratch, '.cursor/rules/dopod-design-tokens.mdc')));
    assert.ok(!fs.existsSync(path.join(scratch, '.claude')), 'claude-code must not be written');
    cli(scratch, ['uninstall']);
  });

  step('check on a clean tree reports not-installed (exit 2)', () => {
    cli(scratch, ['check'], { expectExit: 2 });
  });

  fs.rmSync(tarball, { force: true });
}

try {
  main();
  console.log(`\n${checks.join('\n')}`);
  console.log(`\n✓ install smoke test passed — ${checks.length} checks`);
} catch (err) {
  console.error(`\n${checks.join('\n')}`);
  console.error(`\n✗ install smoke test FAILED\n${err.stack}`);
  process.exitCode = 1;
} finally {
  if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
}

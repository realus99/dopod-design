'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, renderHelp, main, packageVersion } = require('../lib/cli.js');
const { ALL_TOOLS } = require('../lib/paths.js');
const { captureIO } = require('./helpers.js');

test('no arguments shows help rather than doing anything', () => {
  assert.equal(parseArgs([]).command, 'help');
  assert.equal(parseArgs(['--help']).command, 'help');
  assert.equal(parseArgs(['-h']).command, 'help');
  assert.equal(parseArgs(['help']).command, 'help');
});

test('version is reachable by flag or subcommand', () => {
  assert.equal(parseArgs(['--version']).command, 'version');
  assert.equal(parseArgs(['-v']).command, 'version');
  assert.equal(parseArgs(['version']).command, 'version');
});

test('install defaults to every tool, project scope, writing for real', () => {
  const { command, flags } = parseArgs(['install']);
  assert.equal(command, 'install');
  assert.deepEqual(flags.tools, ALL_TOOLS);
  assert.equal(flags.global, false);
  assert.equal(flags.dryRun, false);
});

test('boolean flags are recognised in any order', () => {
  const { flags } = parseArgs(['install', '--dry-run', '--global', '--verbose']);
  assert.equal(flags.global, true);
  assert.equal(flags.dryRun, true);
  assert.equal(flags.verbose, true);
});

test('--tools accepts both = and space forms', () => {
  assert.deepEqual(parseArgs(['install', '--tools=cursor,codex']).flags.tools, ['cursor', 'codex']);
  assert.deepEqual(parseArgs(['install', '--tools', 'copilot']).flags.tools, ['copilot']);
});

test('--tools=all expands to every tool', () => {
  assert.deepEqual(parseArgs(['install', '--tools=all']).flags.tools, ALL_TOOLS);
});

test('an unknown tool is rejected and the valid ones are listed', () => {
  // Deliberately not a real editor name — this test used 'windsurf' until
  // windsurf became a supported target.
  assert.throws(
    () => parseArgs(['install', '--tools=notatool']),
    (err) => err.exitCode === 64 && ALL_TOOLS.every((t) => err.message.includes(t))
  );
});

test('--tools with no value is a usage error', () => {
  assert.throws(() => parseArgs(['install', '--tools']), (err) => err.exitCode === 64);
  assert.throws(() => parseArgs(['install', '--tools=']), (err) => err.exitCode === 64);
});

test('unknown commands and flags are usage errors', () => {
  assert.throws(() => parseArgs(['frobnicate']), (err) => err.exitCode === 64);
  assert.throws(() => parseArgs(['install', '--force']), (err) => err.exitCode === 64);
});

test('a boolean flag given a value is rejected instead of silently ignored', () => {
  assert.throws(() => parseArgs(['install', '--global=true']), (err) => err.exitCode === 64);
});

test('--help wins even after a command', () => {
  assert.equal(parseArgs(['install', '--help']).command, 'help');
});

test('help output names every command and target directory', async () => {
  const help = renderHelp();
  for (const needle of ['install', 'update', 'uninstall', 'check', '--global', '--tools']) {
    assert.ok(help.includes(needle), `help should mention ${needle}`);
  }
  assert.match(help, /\.claude\/skills\/dopod-design/);
  assert.match(help, /AGENTS\.md/);
});

test('main returns 0 for help and prints to stdout', async () => {
  const io = captureIO();
  assert.equal(await main([], io), 0);
  assert.match(io.out, /Usage/);
  assert.equal(io.err, '');
});

test('main prints the package version', async () => {
  const io = captureIO();
  assert.equal(await main(['--version'], io), 0);
  assert.equal(io.out.trim(), packageVersion());
});

test('main returns 64 and writes to stderr on bad usage', async () => {
  const io = captureIO();
  assert.equal(await main(['nope'], io), 64);
  assert.match(io.err, /Unknown command/);
  assert.equal(io.out, '');
});

// --- help text must track actual behaviour (#13) -----------------------------
//
// The --help text named copilot as global-unsupported for a full commit after
// it stopped being true, because the string was edited in the wrong file and
// nothing noticed. Prose and behaviour drift silently; assert they agree.

test('--help names exactly the tools that are actually global-unsupported', () => {
  const { unsupportedInGlobal } = require('../lib/paths.js');
  const help = renderHelp();

  const skipped = unsupportedInGlobal(ALL_TOOLS);
  const clause = help.match(/--global is unsupported for ([^:]+):/);
  assert.ok(clause, '--help should say which tools --global skips');

  for (const tool of ALL_TOOLS) {
    const named = new RegExp(`\\b${tool}\\b`).test(clause[1]);
    assert.equal(named, skipped.includes(tool),
      `--help ${named ? 'names' : 'omits'} ${tool} as global-unsupported, but ` +
      `unsupportedInGlobal ${skipped.includes(tool) ? 'includes' : 'excludes'} it`);
  }
});

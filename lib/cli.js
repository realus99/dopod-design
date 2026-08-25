'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { ALL_TOOLS, PKG_NAME } = require('./paths.js');

const COMMANDS = ['install', 'update', 'uninstall', 'check', 'build'];
const BOOLEAN_FLAGS = new Set(['--global', '--dry-run', '--verbose']);

function usageError(message) {
  const err = new Error(message);
  err.exitCode = 64;
  return err;
}

function parseTools(spec) {
  const tools = spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (tools.length === 0) throw usageError('--tools was given no values.');
  if (tools.length === 1 && tools[0] === 'all') return [...ALL_TOOLS];
  for (const tool of tools) {
    if (!ALL_TOOLS.includes(tool)) {
      throw usageError(`Unknown tool "${tool}". Valid tools: ${ALL_TOOLS.join(', ')}.`);
    }
  }
  return tools;
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    return { command: 'help', flags: {} };
  }
  if (argv[0] === '--version' || argv[0] === '-v' || argv[0] === 'version') {
    return { command: 'version', flags: {} };
  }

  const command = argv[0];
  if (!COMMANDS.includes(command)) {
    throw usageError(`Unknown command "${command}". Run \`${PKG_NAME} --help\`.`);
  }

  const flags = { global: false, dryRun: false, verbose: false, tools: [...ALL_TOOLS] };

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--global') { flags.global = true; continue; }
    if (arg === '--dry-run') { flags.dryRun = true; continue; }
    if (arg === '--verbose') { flags.verbose = true; continue; }
    if (arg === '-h' || arg === '--help') return { command: 'help', flags: {} };
    if (arg.startsWith('--tools=')) { flags.tools = parseTools(arg.slice(8)); continue; }
    if (arg === '--tools') {
      const value = argv[++i];
      if (value === undefined) throw usageError('--tools requires a value.');
      flags.tools = parseTools(value);
      continue;
    }
    const name = arg.split('=')[0];
    if (BOOLEAN_FLAGS.has(name)) throw usageError(`${name} does not take a value.`);
    throw usageError(`Unknown flag "${arg}". Run \`${PKG_NAME} --help\`.`);
  }

  return { command, flags };
}

function renderHelp() {
  return `${PKG_NAME} — install the Carbon Design System skill into your AI coding tools

Usage
  npx ${PKG_NAME} <command> [flags]

Commands
  install      Write Carbon guidance into this project for each target tool.
  update       Re-install and clean up files a previous version left behind.
  uninstall    Remove everything this package wrote; leave your own content intact.
  check        Compare what is installed against this package. CI-friendly.
  build        Regenerate dist/ from SKILL.md + references/ (development only).

Flags
  --tools=<list>   Comma-separated targets, or "all" (default).
                   Available: ${ALL_TOOLS.join(', ')}
  --global         Install at user scope (~/) instead of this project.
                   Copilot is repository-scoped only and is skipped here.
  --dry-run        Print what would happen without writing anything.
  --verbose        Include stack traces on failure.
  -h, --help       Show this message.
  -v, --version    Print the package version.

Where files land (project scope)
  claude-code   .claude/skills/${PKG_NAME}/ + AGENTS.md
  cursor        .cursor/rules/dopod-design-*.mdc
  copilot       .github/copilot-instructions.md + .github/instructions/
  codex         AGENTS.md + .dopod-design/references/
  windsurf      .windsurf/rules/*.md + .dopod-design/references/
  gemini        GEMINI.md + .dopod-design/references/
  cline         .clinerules/ + .dopod-design/references/

  --global is unsupported for copilot, windsurf and cline: their global
  locations are repository-scoped, size-capped, or outside the home dotfile
  convention. Those tools are skipped, with a note, rather than silently.

  Zed needs no target — it reads AGENTS.md, which claude-code and codex write.

AGENTS.md and copilot-instructions.md are merged inside a marked block, so
anything you already wrote in them is preserved.

Exit codes
  0   success, or "in sync" for check
  1   drift detected (check only)
  2   not installed (check only)
  10-13  build errors      20-24  package resolution errors
  30     write errors      40     marker merge errors
  50-51  lockfile errors   64     invalid usage        70  unexpected error
`;
}

function packageVersion() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

async function main(argv = process.argv.slice(2), io = process) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    io.stderr.write(`${err.message}\n`);
    return err.exitCode || 64;
  }

  if (parsed.command === 'help') {
    io.stdout.write(renderHelp());
    return 0;
  }
  if (parsed.command === 'version') {
    io.stdout.write(`${packageVersion()}\n`);
    return 0;
  }

  try {
    switch (parsed.command) {
      case 'install':
        return await require('./install.js').installCommand(parsed.flags, io);
      case 'update':
        return await require('./update.js').updateCommand(parsed.flags, io);
      case 'uninstall':
        return await require('./uninstall.js').uninstallCommand(parsed.flags, io);
      case 'check':
        return await require('./check.js').checkCommand(parsed.flags, io);
      case 'build': {
        const { PACKAGE_ROOT } = require('./resolve-dist.js');
        const manifest = await require('./build.js').build({
          sourceDir: PACKAGE_ROOT,
          distDir: path.join(PACKAGE_ROOT, 'dist'),
        });
        io.stdout.write(`built ${manifest.files.length} files for ${PKG_NAME}@${manifest.version}\n`);
        return 0;
      }
      default:
        throw usageError(`Unhandled command "${parsed.command}".`);
    }
  } catch (err) {
    if (parsed.flags.verbose) {
      io.stderr.write(`${err.stack}\n`);
    } else {
      io.stderr.write(`${err.message}\n`);
      if (err.recovery) io.stderr.write(`\n${err.recovery}\n`);
    }
    return err.exitCode || 70;
  }
}

exports.parseArgs = parseArgs;
exports.renderHelp = renderHelp;
exports.packageVersion = packageVersion;
exports.main = main;
exports.COMMANDS = COMMANDS;

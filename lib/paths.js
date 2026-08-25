'use strict';
const path = require('node:path');
const os = require('node:os');

const PKG_NAME = 'dopod-design';
const LOCK_FILENAME = '.dopod-design.lock.json';

const ALL_TOOLS = ['claude-code', 'cursor', 'copilot', 'codex', 'windsurf', 'gemini', 'cline'];

// Tools whose always-on file points at .dopod-design/references/ rather than
// carrying the references itself. The payload is emitted once under shared/ and
// pulled in when any of these is selected — emitting it per tool duplicated
// twelve files four times in the tarball.
const POINTER_TOOLS = ['codex', 'windsurf', 'cline', 'gemini'];

// Zed is deliberately absent. Its rules lookup is first-match-wins over
// .rules, .cursorrules, .windsurfrules, .clinerules,
// .github/copilot-instructions.md, AGENT.md, AGENTS.md, CLAUDE.md, GEMINI.md —
// and we already write several of those. Adding a .rules file would take
// *higher* priority and displace the richer ones. Zed users are covered by the
// AGENTS.md and Copilot targets already.

// Tools that have no user-level instruction location. Copilot's instruction
// files are repository-scoped by design, so --global silently doing nothing
// would be worse than saying so.
// Copilot instructions are repository-scoped by design. Windsurf's global file
// is a single 6,000-char global_rules.md — too small for the slim body plus a
// pointer, and merging into it risks clobbering unrelated user rules. Cline's
// global rules live outside the home dotfile convention entirely.
const GLOBAL_UNSUPPORTED = new Set(['windsurf', 'cline']);

// Files whose target may already exist and belong to the user. These are merged
// with a marker block instead of overwritten.
const SHARED_FILES = new Set([
  'claude-code/AGENTS.md',
  'codex/AGENTS.md',
  'copilot/.github/copilot-instructions.md',
  'gemini/GEMINI.md',
]);

function scopeDir({ global: isGlobal, cwd }) {
  return isGlobal ? os.homedir() : path.resolve(cwd);
}

function isSharedFile(distRelPath) {
  return SHARED_FILES.has(distRelPath);
}

function toolOf(distRelPath) {
  return distRelPath.split('/')[0];
}

/**
 * Map a path inside dist/ to where it belongs on disk.
 *
 * Project scope mirrors each tool's repository convention. User scope has to
 * differ: Claude Code and Cursor both read from a dotdir under $HOME, and Codex
 * reads ~/.codex/AGENTS.md rather than ~/AGENTS.md — dropping an AGENTS.md in
 * the home directory would leak Carbon guidance into every unrelated project.
 */
function resolveTargetPath(base, distRelPath, { global: isGlobal = false } = {}) {
  const parts = distRelPath.split('/');
  const tool = parts[0];
  const rest = parts.slice(1).join('/');

  switch (tool) {
    case 'shared':
      // rest is '.dopod-design/references/<file>.md'
      if (isGlobal) return null;   // pointer tools have no shared user scope
      return path.join(base, rest);

    case 'claude-code':
      // The always-on file is not part of the skill bundle. In a project it is
      // AGENTS.md, which Claude Code reads every turn — the same file Codex
      // uses, so install dedupes when both tools are selected. At user scope
      // Claude Code reads ~/.claude/CLAUDE.md instead, which does not collide
      // with Codex's ~/.codex/AGENTS.md.
      if (rest === 'AGENTS.md') {
        return isGlobal
          ? path.join(base, '.claude', 'CLAUDE.md')
          : path.join(base, 'AGENTS.md');
      }
      return path.join(base, '.claude', 'skills', PKG_NAME, rest);

    case 'cursor':
      return path.join(base, '.cursor', 'rules', rest);

    case 'copilot': {
      // VS Code reads user-level instructions from ~/.copilot/instructions, and
      // only files ending .instructions.md — copilot-instructions.md has no
      // user-scope equivalent and is deliberately skipped there rather than
      // written somewhere it would be ignored.
      const USER_DIR = ['.copilot', 'instructions'];
      if (rest.startsWith('user/')) {
        return isGlobal ? path.join(base, ...USER_DIR, path.basename(rest)) : null;
      }
      if (isGlobal) {
        return rest.startsWith('.github/instructions/')
          ? path.join(base, ...USER_DIR, path.basename(rest))
          : null;
      }
      return path.join(base, rest);
    }

    case 'codex':
      if (isGlobal) {
        // rest is 'AGENTS.md' or '.dopod-design/references/<file>.md'
        const withoutDot = rest.replace(/^\.dopod-design\//, `${PKG_NAME}/`);
        return path.join(base, '.codex', withoutDot);
      }
      return path.join(base, rest);

    case 'windsurf':
      if (isGlobal) return null;
      // rest is 'rules/<file>.md' or '.dopod-design/references/<file>.md'
      return path.join(base, rest.startsWith('.dopod-design/') ? '' : '.windsurf', rest);

    case 'cline':
      if (isGlobal) return null;
      return path.join(base, rest.startsWith('.dopod-design/') ? '' : '.clinerules', rest);

    case 'gemini':
      if (rest.startsWith('.dopod-design/')) {
        return isGlobal ? path.join(base, '.gemini', rest.replace(/^\.dopod-design\//, `${PKG_NAME}/`)) : path.join(base, rest);
      }
      return isGlobal ? path.join(base, '.gemini', rest) : path.join(base, rest);

    default: {
      const err = new Error(`Unknown tool in dist path: ${distRelPath}`);
      err.exitCode = 12;
      throw err;
    }
  }
}

function unsupportedInGlobal(tools) {
  return tools.filter((t) => GLOBAL_UNSUPPORTED.has(t));
}

exports.PKG_NAME = PKG_NAME;
exports.LOCK_FILENAME = LOCK_FILENAME;
exports.ALL_TOOLS = ALL_TOOLS;
exports.POINTER_TOOLS = POINTER_TOOLS;
exports.SHARED_FILES = SHARED_FILES;
exports.scopeDir = scopeDir;
exports.isSharedFile = isSharedFile;
exports.toolOf = toolOf;
exports.resolveTargetPath = resolveTargetPath;
exports.unsupportedInGlobal = unsupportedInGlobal;

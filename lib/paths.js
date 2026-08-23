'use strict';
const path = require('node:path');
const os = require('node:os');

const PKG_NAME = 'dopod-design';
const LOCK_FILENAME = '.dopod-design.lock.json';

const ALL_TOOLS = ['claude-code', 'cursor', 'copilot', 'codex'];

// Tools that have no user-level instruction location. Copilot's instruction
// files are repository-scoped by design, so --global silently doing nothing
// would be worse than saying so.
const GLOBAL_UNSUPPORTED = new Set(['copilot']);

// Files whose target may already exist and belong to the user. These are merged
// with a marker block instead of overwritten.
const SHARED_FILES = new Set([
  'codex/AGENTS.md',
  'copilot/.github/copilot-instructions.md',
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
    case 'claude-code':
      return path.join(base, '.claude', 'skills', PKG_NAME, rest);

    case 'cursor':
      return path.join(base, '.cursor', 'rules', rest);

    case 'copilot':
      if (isGlobal) return null;
      return path.join(base, rest);

    case 'codex':
      if (isGlobal) {
        // rest is 'AGENTS.md' or '.dopod-design/references/<file>.md'
        const withoutDot = rest.replace(/^\.dopod-design\//, `${PKG_NAME}/`);
        return path.join(base, '.codex', withoutDot);
      }
      return path.join(base, rest);

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
exports.SHARED_FILES = SHARED_FILES;
exports.scopeDir = scopeDir;
exports.isSharedFile = isSharedFile;
exports.toolOf = toolOf;
exports.resolveTargetPath = resolveTargetPath;
exports.unsupportedInGlobal = unsupportedInGlobal;

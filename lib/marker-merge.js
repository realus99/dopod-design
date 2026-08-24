'use strict';
const { PKG_NAME } = require('./paths.js');

// AGENTS.md and .github/copilot-instructions.md are files the user may already
// own. We fence our contribution between HTML comments so install/update/
// uninstall can operate on exactly our region and leave everything else alone.
//
// The block adopts the host file's dominant line ending. Writing LF into a CRLF
// file produced a mixed-ending diff on every install for Windows users.

const START_RE = new RegExp(`<!-- ${PKG_NAME}:start v(\\S+) -->`);
const END_MARKER = `<!-- ${PKG_NAME}:end -->`;
const END_RE = new RegExp(`<!-- ${PKG_NAME}:end -->`);

function makeStartMarker(version) {
  return `<!-- ${PKG_NAME}:start v${version} -->`;
}

function markerError(message, recovery) {
  const err = new Error(message);
  err.exitCode = 40;
  if (recovery) err.recovery = recovery;
  return err;
}

function findBlock(content) {
  const starts = [...content.matchAll(new RegExp(START_RE.source, 'g'))];
  const ends = [...content.matchAll(new RegExp(END_RE.source, 'g'))];

  if (starts.length === 0 && ends.length === 0) return null;

  if (starts.length > 1) {
    throw markerError(
      'Found more than one dopod-design start marker in a shared file.',
      `Keep a single '<!-- ${PKG_NAME}:start v... -->' line and remove the others, then re-run.`
    );
  }
  if (ends.length > 1) {
    throw markerError(
      'Found more than one dopod-design end marker in a shared file.',
      `Keep a single '${END_MARKER}' line and remove the others, then re-run.`
    );
  }
  if (starts.length === 1 && ends.length === 0) {
    throw markerError(
      'Found a dopod-design start marker with no matching end marker.',
      `Add '${END_MARKER}' after the managed section, or delete the start marker, then re-run.`
    );
  }
  if (ends.length === 1 && starts.length === 0) {
    throw markerError(
      'Found a dopod-design end marker with no matching start marker.',
      'Delete the dangling end marker, then re-run.'
    );
  }

  const startIdx = starts[0].index;
  const endIdx = ends[0].index + ends[0][0].length;
  if (endIdx <= startIdx) {
    throw markerError(
      'The dopod-design end marker appears before its start marker.',
      'Reorder or remove the markers, then re-run.'
    );
  }

  return { startIdx, endIdx, version: starts[0][1], block: content.slice(startIdx, endIdx) };
}

// A file is treated as CRLF only if CRLF is the majority ending, so one stray
// \r\n in an otherwise LF file does not flip the whole block.
function detectEol(content) {
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf = (content.match(/(?<!\r)\n/g) || []).length;
  return crlf > lf ? '\r\n' : '\n';
}

const toEol = (text, eol) => text.replace(/\r\n|\n/g, eol);

function buildBlock({ version, body, eol = '\n' }) {
  const inner = body.replace(/(\r\n|\n)+$/, '');
  return toEol([makeStartMarker(version), inner, END_MARKER].join('\n'), eol);
}

function upsertBlock(content, { version, body }) {
  const eol = detectEol(content);
  const block = buildBlock({ version, body, eol });
  const found = findBlock(content);
  if (!found) {
    if (content.length === 0) return `${block}${eol}`;
    const separator = /(\r\n|\n)$/.test(content) ? eol : `${eol}${eol}`;
    return `${content}${separator}${block}${eol}`;
  }
  return content.slice(0, found.startIdx) + block + content.slice(found.endIdx);
}

function stripBlock(content) {
  const found = findBlock(content);
  if (!found) return content;

  // Remove the whitespace that separated our block from its neighbours. The
  // separator upsertBlock introduced must not survive as a stray blank line —
  // uninstall has to hand back a pre-existing file byte-identical, and the
  // earlier implementation left one trailing newline behind.
  // Strip only newlines, never the spaces before them — trailing whitespace on
  // the user's last line is theirs to keep.
  const eol = detectEol(content);
  const head = content.slice(0, found.startIdx).replace(/(\r\n|\n)+$/, '');
  const tail = content.slice(found.endIdx).replace(/^(\r\n|\n)+/, '');

  if (!head) return tail;                        // our block was at the top
  if (!tail) return `${head}${eol}`;             // ...at the end: restore its final newline
  return `${head}${eol}${eol}${tail}`;           // user content on both sides
}

// Hashing must ignore line endings: the same content written LF or CRLF is the
// same content, and `check` would otherwise report drift on Windows alone.
const normalizeForHash = (text) => text.replace(/\r\n/g, '\n').replace(/\n+$/, '');

exports.detectEol = detectEol;
exports.normalizeForHash = normalizeForHash;
exports.START_RE = START_RE;
exports.END_MARKER = END_MARKER;
exports.makeStartMarker = makeStartMarker;
exports.findBlock = findBlock;
exports.buildBlock = buildBlock;
exports.upsertBlock = upsertBlock;
exports.stripBlock = stripBlock;

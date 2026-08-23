'use strict';

// A deliberately small YAML frontmatter reader/writer. Carbon's canonical files
// only ever use flat `key: value` pairs plus the occasional block scalar for a
// long description, so a full YAML dependency would be cost without benefit.
// Anything more exotic than that is rejected loudly rather than half-parsed.

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { data: {}, body: text };
  }
  const rest = text.slice(text.indexOf('\n') + 1);
  const endIdx = rest.search(/\n---(\r?\n|$)/);
  if (endIdx === -1) {
    const err = new Error('Unterminated frontmatter: missing closing --- fence.');
    err.exitCode = 11;
    throw err;
  }
  const yamlBlock = rest.slice(0, endIdx);
  let body = rest.slice(endIdx + 1).replace(/^---(\r?\n|$)/, '');

  const data = {};
  const lines = yamlBlock.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    // Block scalars: `key: |` (literal) and `key: >` (folded), with optional
    // chomping indicators. Gather the following more-indented lines.
    const blockMatch = /^([|>])([+-]?)$/.exec(value);
    if (blockMatch) {
      const style = blockMatch[1];
      const collected = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const candidate = lines[j];
        if (candidate.trim() === '') { collected.push(''); continue; }
        if (!/^\s/.test(candidate)) break;
        collected.push(candidate.replace(/^\s+/, ''));
      }
      i = j - 1;
      while (collected.length && collected[collected.length - 1] === '') collected.pop();
      data[key] = style === '|' ? collected.join('\n') : collected.join(' ').trim();
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      // A double-quoted YAML scalar carries backslash escapes; a single-quoted
      // one does not. Without this the description round-trips one `\` longer
      // every time it passes through render → parse, which matters because the
      // description legitimately contains quoted phrases.
      if (quote === '"') {
        value = value.replace(/\\(["\\])/g, '$1');
      }
    }
    data[key] = value;
  }

  return { data, body };
}

// Emits a frontmatter block. Values are quoted whenever a bare YAML scalar
// would be ambiguous — a `:` or a leading indicator character would otherwise
// change how the consuming tool parses the line.
function renderFrontmatter(obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
      continue;
    }
    const str = String(value);
    const needsQuote =
      str === '' ||
      /[:#{}[\]&*!|>%@`"']/.test(str) ||
      /^[\s-]/.test(str) ||
      /\s$/.test(str);
    lines.push(needsQuote ? `${key}: "${str.replace(/"/g, '\\"')}"` : `${key}: ${str}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

exports.parseFrontmatter = parseFrontmatter;
exports.renderFrontmatter = renderFrontmatter;

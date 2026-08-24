'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  upsertBlock,
  stripBlock,
  findBlock,
  makeStartMarker,
  END_MARKER,
} = require('../lib/marker-merge.js');

const BODY = '## Carbon rules\n\nUse tokens.';

test('writes the block into an empty file', () => {
  const out = upsertBlock('', { version: '1.0.0', body: BODY });
  assert.equal(out, `${makeStartMarker('1.0.0')}\n${BODY}\n${END_MARKER}\n`);
});

test('appends after existing user content without disturbing it', () => {
  const existing = '# My project\n\nOur own house rules.\n';
  const out = upsertBlock(existing, { version: '1.0.0', body: BODY });
  assert.ok(out.startsWith(existing));
  assert.ok(out.includes(BODY));
});

test('replaces an existing block in place and leaves surrounding text alone', () => {
  const first = upsertBlock('# Mine\n\nBefore.\n', { version: '1.0.0', body: 'old body' });
  const withTrailer = `${first}\nAfter the block.\n`;
  const second = upsertBlock(withTrailer, { version: '2.0.0', body: 'new body' });

  assert.ok(second.includes('new body'));
  assert.ok(!second.includes('old body'));
  assert.ok(second.includes('# Mine'));
  assert.ok(second.includes('After the block.'));
  assert.equal(findBlock(second).version, '2.0.0');
  assert.equal((second.match(/:start v/g) || []).length, 1);
});

test('strip is the exact inverse of upsert for newline-terminated content', () => {
  // The byte-identical guarantee uninstall depends on. Scoped to files ending
  // in a newline, which is every file git produces — see the next test for the
  // one documented exception.
  for (const original of [
    '# Mine\n',
    '# Mine\n\nSome rules.\n',
    '# Mine\n\n\nextra blank lines above\n',
    'a\nb\nc\n',
    '  indented and trailing spaces kept   \n',
  ]) {
    const merged = upsertBlock(original, { version: '1.0.0', body: BODY });
    assert.equal(stripBlock(merged), original,
      `round-trip must be lossless for ${JSON.stringify(original)}`);
  }
});

test('a file with no trailing newline gains one — the single documented exception', () => {
  // upsertBlock normalises the separator, so stripBlock cannot know the newline
  // was absent. Adding one is POSIX-correct and the least surprising outcome.
  const merged = upsertBlock('no trailing newline', { version: '1.0.0', body: BODY });
  assert.equal(stripBlock(merged), 'no trailing newline\n');
});

test('is idempotent across repeated installs of the same version', () => {
  const once = upsertBlock('# Mine\n', { version: '1.0.0', body: BODY });
  const twice = upsertBlock(once, { version: '1.0.0', body: BODY });
  assert.equal(once, twice);
});

test('strips the block and returns the user content', () => {
  const existing = '# Mine\n\nBefore.\n';
  const merged = upsertBlock(existing, { version: '1.0.0', body: BODY });
  const stripped = stripBlock(merged);
  assert.ok(!stripped.includes('Carbon rules'));
  assert.ok(stripped.includes('# Mine'));
  assert.ok(stripped.includes('Before.'));
});

test('stripping a file that only ever held our block leaves nothing meaningful', () => {
  const merged = upsertBlock('', { version: '1.0.0', body: BODY });
  assert.equal(stripBlock(merged).trim(), '');
});

test('stripping content that has no block is a no-op', () => {
  const text = '# Just mine\n\nNothing managed here.\n';
  assert.equal(stripBlock(text), text);
});

test('preserves text on both sides without collapsing it together', () => {
  const merged = `above\n\n${makeStartMarker('1.0.0')}\nmanaged\n${END_MARKER}\n\nbelow\n`;
  const stripped = stripBlock(merged);
  assert.match(stripped, /above/);
  assert.match(stripped, /below/);
  assert.ok(!/managed/.test(stripped));
  assert.ok(!/\n{3,}/.test(stripped));
});

test('finds nothing when neither marker is present', () => {
  assert.equal(findBlock('plain text'), null);
});

test('refuses to guess when there are duplicate start markers', () => {
  const content = `${makeStartMarker('1.0.0')}\na\n${END_MARKER}\n${makeStartMarker('1.0.0')}\nb\n${END_MARKER}\n`;
  assert.throws(
    () => findBlock(content),
    (err) => err.exitCode === 40 && /more than one dopod-design start marker/.test(err.message)
  );
});

test('reports an orphan start marker with a recovery hint', () => {
  assert.throws(
    () => findBlock(`${makeStartMarker('1.0.0')}\nbody\n`),
    (err) => err.exitCode === 40 && typeof err.recovery === 'string'
  );
});

test('reports an orphan end marker', () => {
  assert.throws(
    () => findBlock(`body\n${END_MARKER}\n`),
    (err) => err.exitCode === 40 && /no matching start/.test(err.message)
  );
});

test('reports markers that appear in the wrong order', () => {
  assert.throws(
    () => findBlock(`${END_MARKER}\nbody\n${makeStartMarker('1.0.0')}\n`),
    (err) => err.exitCode === 40
  );
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter, renderFrontmatter } = require('../lib/frontmatter.js');

test('returns the whole text as body when there is no frontmatter', () => {
  const { data, body } = parseFrontmatter('# Hello\n\nno fence here\n');
  assert.deepEqual(data, {});
  assert.equal(body, '# Hello\n\nno fence here\n');
});

test('parses flat key/value pairs and strips quotes', () => {
  const { data, body } = parseFrontmatter(
    '---\nname: dopod-design\ndescription: "Use when: styling"\nsingle: \'quoted\'\n---\n# Body\n'
  );
  assert.equal(data.name, 'dopod-design');
  assert.equal(data.description, 'Use when: styling');
  assert.equal(data.single, 'quoted');
  assert.equal(body, '# Body\n');
});

test('ignores comments and blank lines', () => {
  const { data } = parseFrontmatter('---\n# a comment\n\nname: x\n---\nbody\n');
  assert.deepEqual(data, { name: 'x' });
});

test('parses a literal block scalar, preserving newlines', () => {
  const { data } = parseFrontmatter(
    '---\nname: x\ndescription: |\n  first line\n  second line\nother: y\n---\nbody\n'
  );
  assert.equal(data.description, 'first line\nsecond line');
  assert.equal(data.other, 'y');
});

test('parses a folded block scalar, joining lines with spaces', () => {
  const { data } = parseFrontmatter(
    '---\ndescription: >\n  folded across\n  two lines\nname: x\n---\nbody\n'
  );
  assert.equal(data.description, 'folded across two lines');
  assert.equal(data.name, 'x');
});

test('supports chomping indicators on block scalars', () => {
  const { data } = parseFrontmatter('---\ndescription: |-\n  one\n  two\n---\nbody\n');
  assert.equal(data.description, 'one\ntwo');
});

test('throws with a build exit code when the fence is never closed', () => {
  assert.throws(
    () => parseFrontmatter('---\nname: x\nstill going\n'),
    (err) => err.exitCode === 11 && /Unterminated frontmatter/.test(err.message)
  );
});

test('renders bare scalars unquoted and ambiguous ones quoted', () => {
  const out = renderFrontmatter({ alwaysApply: false, description: 'Has: a colon', slug: 'plain' });
  assert.match(out, /^---\n/);
  assert.match(out, /alwaysApply: false\n/);
  assert.match(out, /description: "Has: a colon"\n/);
  assert.match(out, /slug: plain\n/);
  assert.match(out, /---\n$/);
});

test('quotes glob values so leading indicators do not change meaning', () => {
  const out = renderFrontmatter({ globs: '**/*.{ts,tsx}' });
  assert.match(out, /globs: "\*\*\/\*\.\{ts,tsx\}"/);
});

test('round-trips a rendered block back through the parser', () => {
  const original = { description: 'Use this when: building UI', alwaysApply: false };
  const { data } = parseFrontmatter(`${renderFrontmatter(original)}body\n`);
  assert.equal(data.description, original.description);
  assert.equal(data.alwaysApply, 'false');
});

test('round-trips a description containing quoted phrases without growing', () => {
  // The real description quotes the phrases users actually say, so escaping
  // has to survive render → parse unchanged.
  const description =
    'Trigger on "our design system", "the company standard", or the word "Carbon".';
  const rendered = renderFrontmatter({ description });
  const { data } = parseFrontmatter(`${rendered}body\n`);
  assert.equal(data.description, description);

  // And again, to catch escapes accumulating across repeated builds.
  const { data: twice } = parseFrontmatter(
    `${renderFrontmatter({ description: data.description })}body\n`
  );
  assert.equal(twice.description, description);
});

test('leaves backslashes alone inside a single-quoted scalar', () => {
  const { data } = parseFrontmatter("---\npattern: '**/*.{ts,tsx}'\n---\nbody\n");
  assert.equal(data.pattern, '**/*.{ts,tsx}');
});

test('skips undefined and null values when rendering', () => {
  const out = renderFrontmatter({ a: 'x', b: undefined, c: null });
  assert.match(out, /a: x/);
  assert.doesNotMatch(out, /\bb:/);
  assert.doesNotMatch(out, /\bc:/);
});

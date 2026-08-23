'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  resolveTargetPath,
  isSharedFile,
  toolOf,
  unsupportedInGlobal,
  ALL_TOOLS,
} = require('../lib/paths.js');

const BASE = path.join(path.sep, 'tmp', 'project');
const rel = (p) => path.relative(BASE, p);

test('claude-code files land in the skills directory', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'claude-code/SKILL.md')),
    path.join('.claude', 'skills', 'dopod-design', 'SKILL.md')
  );
  assert.equal(
    rel(resolveTargetPath(BASE, 'claude-code/references/tokens.md')),
    path.join('.claude', 'skills', 'dopod-design', 'references', 'tokens.md')
  );
});

test('cursor rules land in .cursor/rules', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'cursor/dopod-design-tokens.mdc')),
    path.join('.cursor', 'rules', 'dopod-design-tokens.mdc')
  );
});

test('copilot paths keep their .github structure', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'copilot/.github/copilot-instructions.md')),
    path.join('.github', 'copilot-instructions.md')
  );
  assert.equal(
    rel(resolveTargetPath(BASE, 'copilot/.github/instructions/dopod-design-ai.instructions.md')),
    path.join('.github', 'instructions', 'dopod-design-ai.instructions.md')
  );
});

test('codex writes AGENTS.md at the project root', () => {
  assert.equal(rel(resolveTargetPath(BASE, 'codex/AGENTS.md')), 'AGENTS.md');
});

test('codex references live in a tool-neutral directory', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'codex/.dopod-design/references/tokens.md')),
    path.join('.dopod-design', 'references', 'tokens.md')
  );
});

test('global scope moves codex under ~/.codex rather than the home root', () => {
  const target = resolveTargetPath(BASE, 'codex/AGENTS.md', { global: true });
  assert.equal(rel(target), path.join('.codex', 'AGENTS.md'));
});

test('global scope keeps codex references beside its AGENTS.md', () => {
  const target = resolveTargetPath(BASE, 'codex/.dopod-design/references/ai.md', { global: true });
  assert.equal(rel(target), path.join('.codex', 'dopod-design', 'references', 'ai.md'));
});

test('copilot has no user-scope target', () => {
  assert.equal(resolveTargetPath(BASE, 'copilot/.github/copilot-instructions.md', { global: true }), null);
  assert.deepEqual(unsupportedInGlobal(ALL_TOOLS), ['copilot']);
});

test('claude-code and cursor global targets stay in their dotdirs', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'claude-code/SKILL.md', { global: true })),
    path.join('.claude', 'skills', 'dopod-design', 'SKILL.md')
  );
  assert.equal(
    rel(resolveTargetPath(BASE, 'cursor/dopod-design-tokens.mdc', { global: true })),
    path.join('.cursor', 'rules', 'dopod-design-tokens.mdc')
  );
});

test('an unrecognised tool prefix is a build error, not a silent write', () => {
  assert.throws(
    () => resolveTargetPath(BASE, 'windsurf/rules.md'),
    (err) => err.exitCode === 12
  );
});

test('only the two always-on files are treated as shared', () => {
  assert.equal(isSharedFile('codex/AGENTS.md'), true);
  assert.equal(isSharedFile('copilot/.github/copilot-instructions.md'), true);
  assert.equal(isSharedFile('claude-code/SKILL.md'), false);
  assert.equal(isSharedFile('copilot/.github/instructions/dopod-design-ai.instructions.md'), false);
});

test('toolOf reads the first path segment', () => {
  assert.equal(toolOf('codex/.dopod-design/references/ai.md'), 'codex');
});

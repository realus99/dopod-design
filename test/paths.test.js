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
  POINTER_TOOLS,
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

test('the claude-code always-on file lands at AGENTS.md in a project', () => {
  assert.equal(rel(resolveTargetPath(BASE, 'claude-code/AGENTS.md')), 'AGENTS.md');
});

test('claude-code and codex resolve their always-on file to the same project path', () => {
  // Both merge into AGENTS.md; install must write the block once, not twice.
  assert.equal(
    resolveTargetPath(BASE, 'claude-code/AGENTS.md'),
    resolveTargetPath(BASE, 'codex/AGENTS.md')
  );
});

test('at user scope the two always-on files do not collide', () => {
  const claude = resolveTargetPath(BASE, 'claude-code/AGENTS.md', { global: true });
  const codex = resolveTargetPath(BASE, 'codex/AGENTS.md', { global: true });
  assert.equal(rel(claude), path.join('.claude', 'CLAUDE.md'));
  assert.equal(rel(codex), path.join('.codex', 'AGENTS.md'));
  assert.notEqual(claude, codex);
});

test('the always-on file is treated as shared, the skill bundle is not', () => {
  assert.equal(isSharedFile('claude-code/AGENTS.md'), true);
  assert.equal(isSharedFile('claude-code/SKILL.md'), false);
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
  assert.ok(unsupportedInGlobal(ALL_TOOLS).includes('copilot'));
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

test('windsurf rules land in .windsurf/rules', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'windsurf/rules/dopod-design-tokens.md')),
    path.join('.windsurf', 'rules', 'dopod-design-tokens.md')
  );
});

test('cline rules land in .clinerules', () => {
  assert.equal(
    rel(resolveTargetPath(BASE, 'cline/10-dopod-design.md')),
    path.join('.clinerules', '10-dopod-design.md')
  );
});

test('gemini writes GEMINI.md at the project root and ~/.gemini at user scope', () => {
  assert.equal(rel(resolveTargetPath(BASE, 'gemini/GEMINI.md')), 'GEMINI.md');
  assert.equal(
    rel(resolveTargetPath(BASE, 'gemini/GEMINI.md', { global: true })),
    path.join('.gemini', 'GEMINI.md')
  );
});

test('the shared reference payload lands where the pointers cite it', () => {
  // Codex, Windsurf, Cline and Gemini all cite .dopod-design/references/. The
  // payload is emitted once under shared/ rather than duplicated per tool.
  assert.equal(
    rel(resolveTargetPath(BASE, 'shared/.dopod-design/references/tokens.md')),
    path.join('.dopod-design', 'references', 'tokens.md')
  );
  assert.deepEqual(POINTER_TOOLS.sort(), ['cline', 'codex', 'gemini', 'windsurf']);
});

test('windsurf and cline have no user-scope target', () => {
  assert.equal(resolveTargetPath(BASE, 'windsurf/rules/x.md', { global: true }), null);
  assert.equal(resolveTargetPath(BASE, 'cline/10-dopod-design.md', { global: true }), null);
  assert.deepEqual(unsupportedInGlobal(ALL_TOOLS).sort(), ['cline', 'copilot', 'windsurf']);
});

test('Zed is deliberately not a target', () => {
  // Zed reads AGENTS.md, which claude-code and codex already write. A .rules
  // file would take higher priority in Zed's lookup and displace it.
  assert.ok(!ALL_TOOLS.includes('zed'));
});

test('an unrecognised tool prefix is a build error, not a silent write', () => {
  assert.throws(
    // Not a real editor name; this used 'windsurf' until it became supported.
    () => resolveTargetPath(BASE, 'notatool/rules.md'),
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

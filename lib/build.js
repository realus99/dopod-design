'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseFrontmatter, renderFrontmatter } = require('./frontmatter.js');
const { atomicWrite, sha256, listFilesRecursive } = require('./fsx.js');
const { PKG_NAME } = require('./paths.js');

// One canonical source (SKILL.md + references/) fans out to four tool formats.
// Each tool loads instructions differently, so the same content is reshaped
// rather than copied: Claude Code takes the skill whole, Cursor and Copilot
// want per-file frontmatter with globs so rules attach to the right files, and
// Codex reads a single always-on AGENTS.md that must stay short.

const REFERENCES = [
  {
    file: 'intake.md',
    slug: 'intake',
    description: 'What to ask the user before generating UI: stack, theme, density, navigation, charts, icons, overlays, motion.',
    // Deliberately no globs: intake happens before code exists, so attaching it
    // to file types would surface it exactly when it is too late to matter.
    manual: true,
  },
  {
    file: 'motion.md',
    slug: 'motion',
    description: 'Carbon motion surfaces, durations and easings, plus expand/collapse, navigation, overlay and chart animation techniques.',
    globs: '**/*.{scss,sass,css,tsx,jsx,ts,js}',
  },
  {
    file: 'tokens.md',
    slug: 'tokens',
    description: 'Carbon design tokens: color, spacing, type, motion, size, breakpoints.',
    globs: '**/*.{scss,sass,css,ts,tsx,js,jsx,vue,svelte}',
  },
  {
    file: 'layout.md',
    slug: 'layout',
    description: 'Carbon 2x Grid, breakpoints, layering, and the UI Shell.',
    globs: '**/*.{tsx,jsx,vue,svelte,html,scss,css}',
  },
  {
    file: 'components.md',
    slug: 'components',
    description: 'Carbon component inventory and how to choose between similar components.',
    globs: '**/*.{tsx,jsx,vue,svelte,html}',
  },
  {
    file: 'react.md',
    slug: 'react',
    description: 'Setting up and using @carbon/react: SCSS config, theming, patterns.',
    globs: '**/*.{tsx,jsx,ts,js,scss}',
  },
  {
    file: 'web-components.md',
    slug: 'web-components',
    description: 'Using @carbon/web-components (cds-* custom elements).',
    globs: '**/*.{html,ts,js,mjs}',
  },
  {
    file: 'other-frameworks.md',
    slug: 'frameworks',
    description: 'Carbon for Angular, Vue, and Svelte, including which Carbon version each targets.',
    globs: '**/*.{vue,svelte,ts,html}',
  },
  {
    file: 'charts.md',
    slug: 'charts',
    description: 'Data visualization with @carbon/charts: chart choice, palettes, options.',
    globs: '**/*{chart,Chart,graph,Graph,viz,Viz,dashboard,Dashboard}*.{tsx,jsx,ts,js,vue,svelte}',
  },
  {
    file: 'ai.md',
    slug: 'ai',
    description: 'Carbon for AI: AILabel, the decorator prop, ai-* and chat-* tokens.',
    globs: '**/*{ai,Ai,AI,chat,Chat,assistant,Assistant}*.{tsx,jsx,ts,js,vue,svelte,scss}',
  },
  {
    file: 'accessibility.md',
    slug: 'accessibility',
    description: 'Carbon accessibility requirements, focus, keyboard, labelling, and the review checklist.',
    globs: '**/*.{tsx,jsx,vue,svelte,html}',
  },
  {
    file: 'audit.md',
    slug: 'audit',
    description: 'Auditing a frontend against Carbon and migrating v10 to v11 or non-Carbon to Carbon.',
    // Deliberately no globs: auditing is a task the user asks for, not
    // something that should attach to every file they happen to open.
    manual: true,
  },
];

const SLIM_START = '<!-- slim:start -->';
const SLIM_END = '<!-- slim:end -->';

function buildError(message, exitCode, recovery) {
  const err = new Error(message);
  err.exitCode = exitCode;
  if (recovery) err.recovery = recovery;
  return err;
}

/**
 * The slim body is what goes into the two always-on files (AGENTS.md and
 * copilot-instructions.md). Those compete for context with everything else in
 * the repo, so they get the rules that change output most, not the whole skill.
 *
 * The canonical SKILL.md marks that region explicitly rather than the build
 * guessing from headings — an author moving a section should not silently
 * change what four tools load.
 */
function extractSlim(body) {
  const start = body.indexOf(SLIM_START);
  const end = body.indexOf(SLIM_END);
  if (start === -1 || end === -1) {
    throw buildError(
      `SKILL.md is missing the ${SLIM_START} / ${SLIM_END} markers.`,
      13,
      'Wrap the section that should reach Copilot and Codex in those two comments.'
    );
  }
  if (end < start) {
    throw buildError(`${SLIM_END} appears before ${SLIM_START} in SKILL.md.`, 13);
  }
  return body.slice(start + SLIM_START.length, end).trim();
}

async function readCanonical(sourceDir) {
  const skillPath = path.join(sourceDir, 'SKILL.md');
  let raw;
  try {
    raw = await fs.readFile(skillPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw buildError(`Canonical SKILL.md not found at ${skillPath}.`, 10);
    }
    throw err;
  }

  const { data, body } = parseFrontmatter(raw);
  if (!data.name || !data.description) {
    throw buildError(
      'SKILL.md frontmatter must define both `name` and `description`.',
      11,
      'The description is what every tool uses to decide whether to load the skill.'
    );
  }

  const references = [];
  for (const ref of REFERENCES) {
    const refPath = path.join(sourceDir, 'references', ref.file);
    try {
      references.push({ ...ref, content: await fs.readFile(refPath, 'utf8') });
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw buildError(`Missing canonical reference file: references/${ref.file}.`, 10);
      }
      throw err;
    }
  }

  return { raw, data, body, references };
}

async function resolveVersion(sourceDir, frontmatter) {
  try {
    const pkgRaw = await fs.readFile(path.join(sourceDir, 'package.json'), 'utf8');
    const version = JSON.parse(pkgRaw).version;
    if (version) return version;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return frontmatter.version || '0.0.0';
}

// The slim body cites siblings as `references/<file>.md`, which is the path
// Claude Code sees. Copilot and Codex put those files somewhere else, so rewrite
// the citations rather than leaving the agent to guess where to look.
function relocateReferenceLinks(text, location) {
  return text.replace(/`references\/([a-z-]+\.md)`/g, (_m, file) => `\`${location}${file}\``);
}

function referencePointer(location) {
  return [
    '',
    '### Full Carbon references',
    '',
    'These rules are a summary. When a task needs detail — an exact token, a',
    'component API, chart palettes, an accessibility check, or a migration —',
    `read the matching file from \`${location}\`:`,
    '',
    ...REFERENCES.map((r) => `- \`${r.file}\` — ${r.description}`),
    '',
  ].join('\n');
}

async function emitClaudeCode({ raw, body, references }, distDir) {
  const target = path.join(distDir, 'claude-code');
  await atomicWrite(path.join(target, 'SKILL.md'), raw);
  for (const ref of references) {
    await atomicWrite(path.join(target, 'references', ref.file), ref.content);
  }

  // A skill is only consulted when the model decides it needs help, so an
  // ordinary-sounding request ("add paging to the audit log list") never
  // reaches it. Measured: 6 of 40 trigger-eval queries fail under every
  // description we could write, all sharing that shape. Codex and Copilot
  // already get an always-on file; this gives Claude Code the same, so the
  // rules apply without a triggering decision. The skill remains for depth.
  const location = '.claude/skills/dopod-design/references/';
  const slim = relocateReferenceLinks(extractSlim(body), location);
  await atomicWrite(
    path.join(target, 'AGENTS.md'),
    [slim, referencePointer(location)].join('\n')
  );
}

async function emitCursor({ data, body, references }, distDir) {
  const target = path.join(distDir, 'cursor');

  await atomicWrite(
    path.join(target, `${PKG_NAME}.mdc`),
    renderFrontmatter({ description: data.description, alwaysApply: false }) + body
  );

  for (const ref of references) {
    const fm = ref.manual
      ? { description: ref.description, alwaysApply: false }
      : { description: ref.description, globs: ref.globs, alwaysApply: false };
    await atomicWrite(
      path.join(target, `dopod-design-${ref.slug}.mdc`),
      renderFrontmatter(fm) + ref.content
    );
  }
}

async function emitCopilot({ body, references }, distDir) {
  const ghDir = path.join(distDir, 'copilot', '.github');
  // Copilot renames the reference files on the way out, so the citations have
  // to follow that renaming too.
  const location = '.github/instructions/dopod-design-';
  let slim = extractSlim(body);
  for (const ref of references) {
    slim = slim.replaceAll(`\`references/${ref.file}\``, `\`${location}${ref.slug}.instructions.md\``);
  }

  await atomicWrite(
    path.join(ghDir, 'copilot-instructions.md'),
    [slim, referencePointer('.github/instructions/')].join('\n')
  );

  for (const ref of references) {
    const fm = ref.manual ? {} : { applyTo: ref.globs };
    const header = Object.keys(fm).length ? renderFrontmatter(fm) : '';
    await atomicWrite(
      path.join(ghDir, 'instructions', `dopod-design-${ref.slug}.instructions.md`),
      header + ref.content
    );
  }
}

async function emitCodex({ body, references }, distDir) {
  const target = path.join(distDir, 'codex');
  const location = '.dopod-design/references/';
  const slim = relocateReferenceLinks(extractSlim(body), location);

  // Codex reads AGENTS.md on every turn, so only the slim body lives there.
  // The references go to a tool-neutral directory the pointer can name
  // unambiguously regardless of which other tools are installed.
  await atomicWrite(
    path.join(target, 'AGENTS.md'),
    [slim, referencePointer(location)].join('\n')
  );

  for (const ref of references) {
    await atomicWrite(
      path.join(target, '.dopod-design', 'references', ref.file),
      ref.content
    );
  }
}

async function build({ sourceDir, distDir }) {
  const canonical = await readCanonical(sourceDir);
  const version = await resolveVersion(sourceDir, canonical.data);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await emitClaudeCode(canonical, distDir);
  await emitCursor(canonical, distDir);
  await emitCopilot(canonical, distDir);
  await emitCodex(canonical, distDir);

  const files = [];
  for (const { full, rel } of await listFilesRecursive(distDir)) {
    if (rel === 'manifest.json') continue;
    files.push({ path: rel, sha256: sha256(await fs.readFile(full)) });
  }
  // Plain code-unit ordering, not localeCompare: the manifest has to hash the
  // same on every machine, and locale-aware collation is not portable.
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest = {
    package: PKG_NAME,
    version,
    canonical_sha256: sha256(canonical.raw),
    files,
  };
  await atomicWrite(
    path.join(distDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  return manifest;
}

exports.build = build;
exports.extractSlim = extractSlim;
exports.REFERENCES = REFERENCES;
exports.SLIM_START = SLIM_START;
exports.SLIM_END = SLIM_END;

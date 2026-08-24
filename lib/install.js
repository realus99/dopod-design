'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveDist } = require('./resolve-dist.js');
const { readLock, writeLock } = require('./lockfile.js');
const { upsertBlock, normalizeForHash } = require('./marker-merge.js');
const { atomicWrite, sha256, readFileOrNull } = require('./fsx.js');
const {
  PKG_NAME,
  scopeDir,
  isSharedFile,
  toolOf,
  resolveTargetPath,
  unsupportedInGlobal,
} = require('./paths.js');

async function installCommand(flags, io = process) {
  const base = scopeDir({ global: flags.global, cwd: flags.cwd || process.cwd() });
  const { distDir, manifest, built } = await resolveDist();

  let tools = [...flags.tools];
  if (flags.global) {
    const skipped = unsupportedInGlobal(tools);
    if (skipped.length) {
      io.stderr.write(
        `note: ${skipped.join(', ')} has no user-level instruction location; skipping in --global mode.\n`
      );
      tools = tools.filter((t) => !skipped.includes(t));
    }
  }
  if (tools.length === 0) {
    const err = new Error('No target tools left to install.');
    err.exitCode = 64;
    err.recovery = 'Drop --global, or pass --tools with a tool that supports user scope.';
    throw err;
  }

  if (built && flags.verbose) io.stdout.write('built dist/ from canonical sources\n');

  const selected = manifest.files.filter((entry) => tools.includes(toolOf(entry.path)));
  const dedicated = selected.filter((e) => !isSharedFile(e.path));
  const shared = selected.filter((e) => isSharedFile(e.path));

  const filesWritten = [];
  const markerBlocks = [];

  for (const entry of dedicated) {
    const target = resolveTargetPath(base, entry.path, { global: flags.global });
    if (!target) continue;
    if (flags.dryRun) {
      io.stdout.write(`would write  ${target}\n`);
      continue;
    }
    const content = await fs.readFile(path.join(distDir, entry.path));
    await atomicWrite(target, content);
    filesWritten.push({ path: path.relative(base, target), sha256: sha256(content) });
  }

  // Claude Code and Codex both merge into AGENTS.md in a project. The block is
  // identical, so writing it twice would be harmless but would leave two
  // lockfile entries for one file — and uninstall would then try to strip an
  // already-stripped block. Merge each target path once.
  const mergedTargets = new Set();

  for (const entry of shared) {
    const target = resolveTargetPath(base, entry.path, { global: flags.global });
    if (!target) continue;
    if (mergedTargets.has(target)) {
      if (flags.verbose) {
        io.stdout.write(`already merged, skipping duplicate: ${entry.path}\n`);
      }
      continue;
    }
    if (flags.dryRun) {
      if (!mergedTargets.has(target)) io.stdout.write(`would merge  ${target}\n`);
      mergedTargets.add(target);
      continue;
    }
    mergedTargets.add(target);
    const body = await fs.readFile(path.join(distDir, entry.path), 'utf8');
    const existing = (await readFileOrNull(target, 'utf8')) ?? '';
    const merged = upsertBlock(existing, { version: manifest.version, body });
    await atomicWrite(target, merged);
    markerBlocks.push({
      file: path.relative(base, target),
      // Hash only our own fenced region. Hashing the whole file would report
      // drift every time the user edits their own part of AGENTS.md, which is
      // both expected and none of our business. Normalised so the same content
      // hashes identically whether it was written LF or CRLF.
      block_sha256: sha256(normalizeForHash(body)),
    });
  }

  if (flags.dryRun) {
    io.stdout.write(`\ndry run — nothing written. Target: ${base}\n`);
    return 0;
  }

  const previous = await readLock(base);
  await writeLock(base, {
    package: PKG_NAME,
    version: manifest.version,
    installed_at: new Date().toISOString(),
    scope: flags.global ? 'global' : 'project',
    tools,
    files_written: filesWritten,
    marker_blocks: markerBlocks,
  });

  const verb = previous ? 'updated' : 'installed';
  io.stdout.write(
    `${verb} ${PKG_NAME}@${manifest.version} → ${base}\n` +
      `  tools: ${tools.join(', ')}\n` +
      `  files: ${filesWritten.length} written, ${markerBlocks.length} merged\n`
  );
  return 0;
}

exports.installCommand = installCommand;

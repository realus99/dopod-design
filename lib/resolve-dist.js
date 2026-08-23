'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathExists } = require('./fsx.js');
const { PKG_NAME } = require('./paths.js');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

/**
 * Find the built dist/ that this CLI should install from.
 *
 * The npx case is the one that has to work without ceremony: `npx dopod-design
 * install` runs the CLI straight out of npm's cache, where dist/ sits next to
 * lib/ and there is no node_modules entry to look up. So we always look beside
 * ourselves first.
 *
 * The second case is a git checkout of this repo, where dist/ is gitignored and
 * has not been generated yet. Building on the fly there beats failing with
 * "run npm run build" — the canonical sources are right there.
 */
async function resolveDist({ allowBuild = true } = {}) {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (Number.isNaN(major) || major < 18) {
    const err = new Error(`Node 18 or newer is required (running ${process.versions.node}).`);
    err.exitCode = 24;
    err.recovery = 'Upgrade Node, or run via `npx --node-options=... ` on a newer runtime.';
    throw err;
  }

  const distDir = path.join(PACKAGE_ROOT, 'dist');
  const manifestPath = path.join(distDir, 'manifest.json');

  if (!(await pathExists(manifestPath))) {
    const canonicalPresent = await pathExists(path.join(PACKAGE_ROOT, 'SKILL.md'));
    if (allowBuild && canonicalPresent) {
      const { build } = require('./build.js');
      const manifest = await build({ sourceDir: PACKAGE_ROOT, distDir });
      return { distDir, manifest, built: true };
    }
    const err = new Error(`Built output missing: ${manifestPath} not found.`);
    err.exitCode = 21;
    err.recovery = canonicalPresent
      ? 'Run `npm run build` in the package directory first.'
      : `Reinstall ${PKG_NAME} from the registry — the published package looks incomplete.`;
    throw err;
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (err) {
    const e = new Error(`Could not read ${manifestPath}: ${err.message}`);
    e.exitCode = 22;
    e.recovery = `Reinstall ${PKG_NAME}, or run \`npm run build\` if working from a checkout.`;
    throw e;
  }

  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    const err = new Error('manifest.json lists no files.');
    err.exitCode = 22;
    err.recovery = 'Rebuild with `npm run build`.';
    throw err;
  }

  return { distDir, manifest, built: false };
}

exports.PACKAGE_ROOT = PACKAGE_ROOT;
exports.resolveDist = resolveDist;

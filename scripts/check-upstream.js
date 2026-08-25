#!/usr/bin/env node
'use strict';

// Detects when this package's claims about Carbon stop being true.
//
// Every token list, component inventory, and version number in references/ was
// verified against the Carbon repository by hand on one day. Carbon ships
// minors weekly. Nothing else notices when a claim goes stale, and stale
// design-system guidance is worse than none — it is confidently wrong, which is
// exactly the failure this package exists to prevent.
//
// Direction matters. A claim we make that upstream no longer has is an ERROR:
// we would be teaching a token that resolves to nothing. Something upstream has
// that we do not mention is a GAP: worth knowing, not worth failing over.
//
//   npm run check:upstream            report and exit non-zero on drift
//   npm run check:upstream -- --json  machine-readable, for the CI issue body
//
// Public endpoints only, no auth. Uses raw.githubusercontent rather than the
// GitHub API so unauthenticated rate limits do not apply.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RAW = 'https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages';
const REGISTRY = 'https://registry.npmjs.org';
const TIMEOUT_MS = 45_000;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}
const fetchJson = async (url) => JSON.parse(await fetchText(url));

// ── upstream truth ─────────────────────────────────────────────────────────

async function upstreamTokens() {
  const tokens = new Set();

  // Token groups appear as bare strings, {name: '...'} objects, and single-line
  // arrays. Taking every kebab-case quoted literal also pulls in state names
  // like 'hover'; extra entries only make the check more permissive, never
  // produce a false alarm.
  const groups = await fetchText(`${RAW}/themes/src/tokens/v11TokenGroup.ts`);
  for (const m of groups.matchAll(/'([a-z][a-z0-9]*(?:-[a-z0-9]+)*)'/g)) tokens.add(m[1]);

  for (const file of ['button', 'tag', 'notification', 'status', 'content-switcher']) {
    const json = await fetchJson(`${RAW}/themes/src/dtcg/components/${file}.json`);
    const root = Object.keys(json).find((k) => !k.startsWith('$'));
    for (const key of Object.keys(json[root])) {
      if (!key.startsWith('$')) tokens.add(`${root}-${key}`);
    }
  }

  const layout = await fetchText(`${RAW}/layout/src/index.ts`);
  for (const m of layout.matchAll(/export const ([a-zA-Z0-9]+) =/g)) {
    tokens.add(m[1].replace(/([a-z])([0-9A-Z])/g, '$1-$2').toLowerCase());
  }

  const type = await fetchText(`${RAW}/styles/scss/type/_index.scss`);
  for (const m of type.matchAll(/\$([a-z0-9-]+),?$/gm)) tokens.add(m[1]);

  // Raw palettes are legitimately citable for dataviz and custom themes.
  const colors = await fetchText(`${RAW}/colors/src/colors.ts`);
  for (const m of colors.matchAll(/export const ([a-zA-Z]+?)(\d+)(Hover)? =/g)) {
    const family = m[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    tokens.add(`${family}-${m[2]}${m[3] ? '-hover' : ''}`);
  }

  const motion = await fetchJson(`${RAW}/motion/src/dtcg/motion.json`);
  const durations = {};
  for (const speed of Object.keys(motion.duration)) {
    for (const step of Object.keys(motion.duration[speed])) {
      tokens.add(`duration-${speed}-${step}`);
      durations[`${speed}-${step}`] = motion.duration[speed][step].$value.value;
    }
  }

  return { tokens, durations };
}

async function upstreamReact() {
  const index = await fetchText(`${RAW}/react/src/index.ts`);

  const unstable = new Set();
  for (const m of index.matchAll(/\b(unstable_{1,2}[A-Za-z][A-Za-z0-9_]*)\b/g)) unstable.add(m[1]);

  // index.ts re-exports with `export * from './components/X'`, so it names the
  // module but never its sub-exports — AccordionSkeleton lives inside the
  // Accordion module and appears nowhere. Component *directories* are therefore
  // the only cheap authoritative list, and they only verify top-level names.
  // A claim that matches no directory is reported as unverified, never failed:
  // failing on it would flag every skeleton and sub-component forever.
  const modules = new Set();

  // Module directories cover top-level components.
  const tree = await fetchJson(
    'https://api.github.com/repos/carbon-design-system/carbon/contents/packages/react/src/components'
  );
  for (const entry of tree) if (entry.type === 'dir') modules.add(entry.name);

  // Sub-exports (ClickableTile, InlineNotification, AccordionSkeleton) never
  // appear in index.ts, but the published type declarations name each one as
  // `<Component>Props`. Stripping that suffix recovers the real export list, so
  // a typo like `TreeViewer` no longer passes as a sub-export of TreeView.
  const dts = await fetchText('https://unpkg.com/@carbon/react/lib/index.d.ts');
  for (const m of dts.matchAll(/\b([A-Z][A-Za-z0-9]+)Props\b/g)) modules.add(m[1]);
  for (const m of dts.matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)) modules.add(m[1]);

  return { unstable, modules };
}

/**
 * Which Carbon major does each implementation actually target?
 *
 * This is the sharpest thing the skill knows — writing v11 token names into a
 * v10 project silently resolves to nothing — and the claim most likely to go
 * quietly false when a port upgrades. Each is derived from published metadata
 * rather than trusted.
 */
async function upstreamCarbonMajors(packages) {
  const found = {};
  await Promise.all(packages.map(async (pkg) => {
    if (pkg.check === 'none') return;
    let meta;
    try {
      meta = await fetchJson(`${REGISTRY}/${encodeURIComponent(pkg.name)}/latest`);
    } catch {
      found[pkg.name] = { major: null, why: 'not resolvable on the registry' };
      return;
    }
    const deps = { ...(meta.dependencies || {}), ...(meta.peerDependencies || {}) };

    // Depending on carbon-components@^10 is definitive: that is the v10 CSS.
    const legacy = deps['carbon-components'];
    if (legacy && /\^?1?0[.\d]*/.test(legacy) && /(^|[^\d])10\./.test(legacy.replace('^', ' 1'))) {
      found[pkg.name] = { major: 10, why: `depends on carbon-components ${legacy}` };
      return;
    }
    if (legacy && legacy.includes('10')) {
      found[pkg.name] = { major: 10, why: `depends on carbon-components ${legacy}` };
      return;
    }
    // Depending on @carbon/styles v1.x means the v11 token set.
    if (deps['@carbon/styles']) {
      found[pkg.name] = { major: 11, why: `depends on @carbon/styles ${deps['@carbon/styles']}` };
      return;
    }
    // First-party v11 packages carry no Carbon dependency of their own.
    if (pkg.name.startsWith('@carbon/')) {
      found[pkg.name] = { major: 11, why: 'first-party @carbon package' };
      return;
    }
    // Svelte ships its own CSS. g80 was deleted in v11, so still serving it is
    // proof the styling generation has not moved.
    const g80 = await fetch(`https://unpkg.com/${pkg.name}/css/g80.css`,
      { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
    if (g80 && g80.ok) {
      found[pkg.name] = { major: '10-era', why: 'still ships css/g80.css, a theme v11 deleted' };
      return;
    }
    found[pkg.name] = { major: null, why: 'no Carbon dependency and no g80 theme — inconclusive' };
  }));
  return found;
}

async function upstreamVersions(names) {
  const out = {};
  await Promise.all(names.map(async (name) => {
    const meta = await fetchJson(`${REGISTRY}/${encodeURIComponent(name)}/latest`);
    out[name] = meta.version;
  }));
  return out;
}

// ── our claims ─────────────────────────────────────────────────────────────

function claimedTokens() {
  const md = read('references/tokens.md');
  // §12 is the v10 → v11 rename table. Its left column is v10 names that
  // legitimately no longer exist; checking them would fail forever.
  const renames = md.indexOf('## 12. v10 → v11 token renames');
  const body = renames < 0 ? md : md.slice(0, renames);

  return new Set(
    [...body.matchAll(/\$([a-z][a-z0-9-]*)/g)]
      .map((m) => m[1])
      // `$tag-background-<color>` and friends are documented as patterns.
      .filter((t) => !t.endsWith('-'))
      // `$theme` is the SCSS module config variable, not a design token.
      .filter((t) => t !== 'theme')
  );
}

function claimedComponents() {
  const md = read('references/components.md');
  const named = new Set();
  // Component names appear as `Name` in the inventory tables.
  for (const m of md.matchAll(/`([A-Z][A-Za-z0-9]{2,})`/g)) named.add(m[1]);
  // Backticked capitalised words that are deliberately not current core
  // exports. Each needs a reason — if one stops being true, deleting it here
  // makes the check flag it again rather than hiding it forever.
  const notCoreExports = new Map([
    ['API', 'prose'], ['APIs', 'prose'], ['ARIA', 'prose'], ['WCAG', 'prose'],
    ['Carbon', 'prose'], ['React', 'prose'], ['Vue', 'prose'], ['Angular', 'prose'],
    ['Svelte', 'prose'], ['SCSS', 'prose'], ['CSS', 'prose'], ['DOM', 'prose'],
    ['JSX', 'prose'], ['IBM', 'prose'], ['Plex', 'prose'],
    ['Delete', 'button label in a Modal example, not a component'],
    ['Slug', 'documented as the former name of AILabel; correctly removed upstream'],
    ['Tearsheet', 'documented as NOT in core Carbon — lives in @carbon/ibm-products'],
    ['ProductiveCard', 'documented as NOT in core Carbon — lives in @carbon/ibm-products'],
    ['ExpressiveCard', 'documented as NOT in core Carbon — lives in @carbon/ibm-products'],
    // Real sub-exports the published .d.ts does not name, because it exports no
    // Props type for them. Verified by hand 2026-08-24.
    ['ModalBody', 'ComposedModal sub-export; no Props type in the published .d.ts'],
    ['ModalHeader', 'ComposedModal sub-export; no Props type in the published .d.ts'],
    ['ModalFooter', 'ComposedModal sub-export; no Props type in the published .d.ts'],
    ['Table', 'DataTable sub-export; no Props type in the published .d.ts'],
    ['TableContainer', 'DataTable sub-export'], ['TableHead', 'DataTable sub-export'],
    ['TableBody', 'DataTable sub-export'], ['TableRow', 'DataTable sub-export'],
    ['TableCell', 'DataTable sub-export'], ['TableHeader', 'DataTable sub-export'],
    ['AILabelContent', 'AILabel sub-export'], ['AILabelActions', 'AILabel sub-export'],
  ]);
  for (const n of notCoreExports.keys()) named.delete(n);
  return named;
}

function claimedUnstable() {
  const md = read('references/components.md');
  const section = md.slice(md.indexOf('## 13. Stability'));
  return new Set([...section.matchAll(/`(unstable_{1,2}[A-Za-z][A-Za-z0-9_]*)`/g)].map((m) => m[1]));
}

function trackedPackages() {
  // versions.json is the single source; SKILL.md's block is rendered from it
  // and the build fails if they diverge, so there is no prose to parse.
  return JSON.parse(read('versions.json')).packages;
}

function claimedVersions() {
  const out = {};
  for (const pkg of trackedPackages()) {
    if (pkg.check !== 'version') continue;
    const m = /^\^?(\d+\.\d+\.\d+)$/.exec(pkg.range);
    if (m) out[pkg.name] = m[1];
  }
  return out;
}

function claimedDurations() {
  const md = read('references/tokens.md');
  const out = {};
  for (const m of md.matchAll(/\$duration-(fast|moderate|slow)-(\d+)`?\s*\|\s*(\d+)/g)) {
    out[`${m[1]}-${m[2]}`] = Number(m[3]);
  }
  return out;
}

// ── comparison ─────────────────────────────────────────────────────────────

/**
 * Which @carbon/ibm-products components are released, and which are canary?
 *
 * This is the claim in the package most likely to go quietly false: components
 * graduate between minors, and the file lists 47 of them by name. A stale list
 * fails in the expensive direction — naming something as released when it is
 * still canary sends someone to design around a component that will not render,
 * which is the exact failure ibm-products.md exists to prevent.
 *
 * Derived from the published package's own flag defaults rather than from a
 * second hand-written list here, which would drift in step with the file it is
 * meant to guard. `true` means released; `false` means behind a canary flag.
 */
async function upstreamIbmProducts() {
  // This is the only surface reading from unpkg rather than the Carbon repo or
  // the npm registry. An outage there must not take the other six down with
  // it — a drift check that fails open on one source is still useful; one that
  // dies entirely gets muted.
  let src;
  try {
    src = await fetchText(
      'https://unpkg.com/@carbon/ibm-products/es/global/js/package-settings.js'
    );
  } catch {
    return null;
  }
  const block = src.match(/component:\s*\{([\s\S]*?)\n\t\}/);
  if (!block) return null;   // shape changed; reported as a gap, never a pass

  const released = new Set();
  const canary = new Set();
  for (const m of block[1].matchAll(/(\w+):\s*(true|false)/g)) {
    (m[2] === 'true' ? released : canary).add(m[1]);
  }
  if (released.size === 0) return null;
  return { released, canary };
}

/**
 * What ibm-products.md §3 claims. The released list is exhaustive and checked
 * both ways. The canary list is explicitly illustrative — "and others" — so
 * names there are checked for being canary, but absence is never an error.
 */
function claimedIbmProducts() {
  const md = read('references/ibm-products.md');
  const section = md.slice(
    md.indexOf('## 3. What is released'),
    md.indexOf('## 4.') === -1 ? undefined : md.indexOf('## 4.')
  );
  const split = section.indexOf('Behind canary flags');
  const names = (text) => {
    const out = new Set();
    for (const m of text.matchAll(/`([A-Z][A-Za-z0-9]*)\*?`/g)) out.add(m[1]);
    return out;
  };
  // Trailing `*` marks a family (Coachmark*), which names no single export.
  const wildcards = new Set();
  for (const m of section.matchAll(/`([A-Z][A-Za-z0-9]*)\*`/g)) wildcards.add(m[1]);

  const counts = read('references/ibm-products.md').match(
    /\*\*(\d+) released, (\d+) behind canary flags\.\*\*/
  );
  return {
    released: names(split === -1 ? section : section.slice(0, split)),
    canary: split === -1 ? new Set() : names(section.slice(split)),
    wildcards,
    statedReleased: counts ? Number(counts[1]) : null,
    statedCanary: counts ? Number(counts[2]) : null,
  };
}

async function main() {
  const json = process.argv.includes('--json');
  const errors = [];
  const gaps = [];

  const [{ tokens, durations }, react] = await Promise.all([upstreamTokens(), upstreamReact()]);

  // 1. tokens we name that upstream no longer has
  const ourTokens = claimedTokens();
  for (const t of [...ourTokens].sort()) {
    if (!tokens.has(t)) errors.push({ surface: 'token', claim: `$${t}`, detail: 'not found upstream' });
  }

  // 2. components we name that upstream removed. Only top-level modules can be
  //    verified this way, so a claim that matches no module is a sub-export we
  //    cannot check rather than a failure.
  const ourComponents = claimedComponents();
  const unverifiable = 0;
  for (const c of [...ourComponents].sort()) {
    if (react.modules.has(c)) continue;
    errors.push({ surface: 'component', claim: c, detail: 'not found in @carbon/react exports' });
  }

  // 3. stability claims
  const ourUnstable = claimedUnstable();
  for (const u of [...ourUnstable].sort()) {
    if (!react.unstable.has(u)) {
      errors.push({ surface: 'stability', claim: u, detail: 'no longer an unstable export — may have stabilised' });
    }
  }
  // The reverse direction is deliberately not checked: components.md describes
  // unstable exports in categories ("all Fluid* inputs") rather than
  // individually, so listing every one upstream would be permanent noise.

  // 4. versions
  const ourVersions = claimedVersions();
  const names = Object.keys(ourVersions);
  if (names.length === 0) {
    errors.push({ surface: 'version', claim: 'SKILL.md', detail: 'no version block found to check' });
  } else {
    const live = await upstreamVersions(names);
    for (const [name, ours] of Object.entries(ourVersions)) {
      if (live[name] !== ours) {
        gaps.push({ surface: 'version', detail: `${name}: documented ${ours}, published ${live[name]}` });
      }
    }
  }

  // 5. which Carbon major each implementation targets
  const packages = trackedPackages();
  const majors = await upstreamCarbonMajors(packages);
  for (const pkg of packages) {
    const actual = majors[pkg.name];
    if (!actual) continue;
    if (actual.major === null) {
      gaps.push({ surface: 'port', detail: `${pkg.name}: could not determine Carbon major — ${actual.why}` });
    } else if (String(actual.major) !== String(pkg.carbonMajor)) {
      errors.push({
        surface: 'port',
        claim: pkg.name,
        detail: `documented Carbon v${pkg.carbonMajor}, upstream looks like v${actual.major} (${actual.why})`,
      });
    }
  }

  // 6. numeric motion values
  for (const [key, ms] of Object.entries(claimedDurations())) {
    if (durations[key] !== ms) {
      errors.push({ surface: 'motion', claim: `duration-${key}`, detail: `documented ${ms}ms, upstream ${durations[key]}ms` });
    }
  }

  // 7. the @carbon/ibm-products released/canary split
  const ourProducts = claimedIbmProducts();
  const products = await upstreamIbmProducts();
  let productsChecked = 0;
  if (!products) {
    gaps.push({
      surface: 'ibm-products',
      detail: 'could not read the published flag defaults — package layout may have changed',
    });
  } else {
    productsChecked = ourProducts.released.size;

    // The direction that costs someone real time: we call it released, it is
    // not, so an agent designs around a component that refuses to render.
    for (const c of [...ourProducts.released].sort()) {
      if (ourProducts.wildcards.has(c)) continue;
      if (products.released.has(c)) continue;
      const detail = products.canary.has(c)
        ? 'documented as released but is behind a canary flag upstream'
        : 'not found in @carbon/ibm-products at all';
      errors.push({ surface: 'ibm-products', claim: c, detail });
    }

    // A component that graduated. Not dangerous, but the list claims to be
    // exhaustive, so silence would make it quietly untrue.
    for (const c of [...products.released].sort()) {
      if (!ourProducts.released.has(c)) {
        gaps.push({ surface: 'ibm-products', detail: `${c}: released upstream but not listed in §3` });
      }
    }

    // Canary names are illustrative, so only the claim itself is checked.
    for (const c of [...ourProducts.canary].sort()) {
      if (ourProducts.wildcards.has(c)) continue;
      if (products.released.has(c)) {
        errors.push({ surface: 'ibm-products', claim: c, detail: 'documented as canary but has been released' });
      }
    }

    if (ourProducts.statedReleased !== products.released.size ||
        ourProducts.statedCanary !== products.canary.size) {
      errors.push({
        surface: 'ibm-products',
        claim: 'the released/canary counts',
        detail: `documented ${ourProducts.statedReleased}/${ourProducts.statedCanary}, ` +
                `upstream ${products.released.size}/${products.canary.size}`,
      });
    }
  }

  if (json) {
    console.log(JSON.stringify({ ok: errors.length === 0, errors, gaps }, null, 2));
  } else {
    const checked = `${ourTokens.size} tokens · ${ourComponents.size - unverifiable} components · ${names.length} versions · ${Object.keys(majors).length} ports · ${productsChecked} ibm-products`;
    if (errors.length) {
      console.error(`✗ upstream drift — ${errors.length} claim(s) no longer true\n`);
      for (const e of errors) console.error(`   [${e.surface}] ${e.claim} — ${e.detail}`);
      console.error('');
    } else {
      console.log(`✓ no drift — every claim still holds upstream (${checked})`);
    }
    if (unverifiable && !json) {
      console.log(`\nℹ ${unverifiable} component claim(s) are sub-exports (ClickableTile, `
        + `InlineNotification, …) and cannot be verified from module names alone.`);
    }
  if (gaps.length) {
      console.log(`\nℹ ${gaps.length} upstream change(s) we do not mention (not failures):`);
      for (const g of gaps.slice(0, 15)) console.log(`   [${g.surface}] ${g.detail}`);
      if (gaps.length > 15) console.log(`   …and ${gaps.length - 15} more`);
    }
  }

  process.exitCode = errors.length ? 1 : 0;
}

main().catch((err) => {
  console.error(`check-upstream failed: ${err.message}`);
  process.exitCode = 2;
});

# Backlog toward v1.0.0

Everything here traces to something observed while building and measuring
v0.1.0 — an eval result, a harness failure, a limitation written into the
CHANGELOG, or a scope call deliberately deferred. Speculative "would be nice"
items are excluded; if an item is here, there is evidence behind it.

**The v1.0.0 bar:** the content refreshes itself against upstream Carbon instead
of drifting, the skill reliably loads when it should, and a release is
reproducible by someone who is not the author.

Priorities: **P0** blocks 1.0 · **P1** should make 1.0 · **P2** wanted, can slip.
Effort: **S** ≲half a day · **M** ≲two days · **L** more than that.

---

## 1. Content freshness

The single biggest long-term risk. Every token list, component inventory, and
version number in `references/` was hand-verified against the Carbon repo on
2026-08-23. Carbon ships minors weekly. Nothing currently detects when this
package's claims stop being true, and stale design-system guidance is worse than
none because it is confidently wrong.

### 1.1 — Upstream drift check `P0` `M`
Script that diffs the package's claims against the Carbon repo and fails loudly:

- theme token names vs `packages/themes/src/tokens/v11TokenGroup.ts`
- component inventory vs `packages/react/src/components/`
- spacing/motion/type values vs the DTCG JSON under `packages/*/src/dtcg/`
- version numbers in `SKILL.md` "Package versions to install" vs the registry
- `unstable__`/`unstable_` export list vs `packages/react/src/index.ts`

Run it in CI weekly, open an issue on drift. This is what makes 1.0 maintainable
rather than a snapshot.

### 1.2 — Move version numbers out of prose `P1` `S`
`SKILL.md` hard-codes `@carbon/react ^1.114.0` and friends. Generate that block
at build time from a single `versions.json` so 1.1 can update one file.

### 1.3 — Re-verify the v10/v11 port table `P1` `S`
The claim that `@carbon/vue` and `carbon-components-svelte` are still v10 is
load-bearing — it is the skill's sharpest insight and the thing most likely to
silently become false. Cover it in 1.1.

---

## 2. Triggering

Measured 16/20, recall 6/10, zero false positives. Precision is not the problem;
recall on *implicit* requests is. All four misses were prompts where Carbon is
the house style but the word never appears.

### 2.1 — Recover the recall lost to the rename `P0` `M`
Renaming `carbon-design` → `dopod-design` cost 18/20 → 16/20. A front-loaded
description rewrite did not recover it, so the lever is not wording. Options,
cheapest first:

- Re-run the optimizer *under the current name* (the previous run optimized
  against `carbon-design`, so its winner is tuned for a signal that no longer
  exists). Not yet tried — most likely to pay off.
- Test whether the `SKILL.md` body's first lines affect loading, not just the
  description.
- Accept 16/20 and document it as the cost of the branding decision.

### 2.2 — Harder trigger eval set `P1` `M`
The current 20-query set is saturated: the held-out half scored 8/8 in **every**
optimizer iteration, so it had no power to discriminate and the "best by test
score" rule silently kept the incumbent. Need ~40 queries with genuinely harder
negatives and a stratified split that puts implicit-trigger cases on both sides.

### 2.3 — Document the competing-skill interaction `P2` `S`
`superpowers:brainstorming` intercepts "I need to build X" before any domain
skill; in a real installed-skill test the ops-console prompt never reached
`dopod-design` at all. Not fixable from inside this package, but users hitting
it deserve a README note.

---

## 3. Content gaps

### 3.1 — `@carbon/ibm-products` reference `P1` `M`
Explicitly scoped out of v0.1.0. It is where `Tearsheet`, `Datagrid`,
`AboutModal`, `PageHeader`, and the side-panel patterns live — the components
enterprise teams reach for immediately after the core set. `components.md`
already tells readers Tearsheet "is not in core Carbon", which is a gap that
announces itself.

### 3.2 — Testing guidance `P2` `S`
`react.md` §9 is thin. Worth expanding: `@carbon/test-utils`, testing themed
components, portal-rendered component queries, and the `IdPrefix` snapshot trap.

### 3.3 — Figma / design-token pipeline `P2` `M`
How Carbon's Figma kits map to code tokens, and what to do when a designer hands
over values that are not on the scale. Came up as a plausible near-miss in the
trigger set and has no home today.

### 3.4 — Worked end-to-end example `P2` `M`
Every reference is explanatory. One complete annotated build — shell, grid,
themed dashboard, data table, form — would give the model a concrete target to
pattern-match, which the eval-0 result suggests matters more than more prose.

---

## 4. Tool coverage

v0.1.0 ships four targets. The original ask was "all popular agents"; four was a
deliberate narrowing to match the proven `dopod-design-carbon` architecture.

### 4.1 — Windsurf, Gemini CLI, Cline, Zed `P1` `M`
`.windsurf/rules/`, `GEMINI.md` (marker-merged), `.clinerules/`, `.rules`.
The fan-out architecture already supports adding targets — `paths.js` plus an
emitter per tool. Each needs its own path handling and a global-scope decision.

### 4.2 — Windows support `P0` `S`
Marker blocks are written LF-only regardless of surrounding line endings, so a
CRLF `AGENTS.md` gets a mixed-ending diff on every install. Detect the dominant
line ending and match it. Currently a documented limitation; it should not be
one at 1.0.

### 4.3 — Copilot user scope `P2` `S`
Skipped under `--global` because Copilot instructions are repository-scoped.
VS Code now supports user-level prompt files; worth re-checking whether a real
target exists.

---

## 5. Release engineering

### 5.1 — CI `P0` `M`
No CI exists. Needed: `npm test` on Node 18/20/22 across macOS and Linux, plus
`npm pack --dry-run` content assertions so a mis-scoped `files` array cannot
ship. This is what makes a release reproducible by someone other than the
author.

### 5.2 — Publish on tag `P1` `S`
`v*` tag triggers `npm publish` via the granular token. Removes the manual OTP
dance and keeps tag, npm version, and release page in lockstep.

### 5.3 — Install smoke test in CI `P1` `S`
Install into a scratch project from the packed tarball, assert file counts,
run `check`, uninstall, assert the tree is clean and a pre-existing `AGENTS.md`
came back byte-identical. This ran manually for 0.1.0 and caught real issues;
it should not depend on someone remembering.

### 5.4 — Version and integrity in the lockfile `P2` `S`
`.dopod-design.lock.json` records file hashes but not the tarball integrity hash.
Recording it would let `check` distinguish "user edited a file" from "a different
package version wrote this".

---

## 6. Output quality

From the five head-to-head evals. The skill won decisively on the one prompt
that never said "Carbon" (11/11 vs 1/11) and was **at parity elsewhere** — base
Opus already knows Carbon well when the prompt names it. Two findings worth
acting on:

### 6.1 — Close the audit gap `P1` `M`
On the audit eval the *baseline* found two runtime crash bugs and a missing
entry point that the skill run missed — the skill's rubric focused attention on
design-system conformance and away from "is this code correct". `audit.md`
should tell the reader to report correctness and accessibility defects they
trip over, not just Carbon deviations.

### 6.2 — Iteration-2 of the output evals `P1` `M`
Only one iteration ran. The loop is meant to repeat: revise, re-run, compare
against `iteration-1`. Worth doing once 3.x content lands, with the graders
already written (`carbon-design-workspace/grade.py`).

---

## 7. Upstream contributions

Two real bugs were found in skill-creator's trigger harness while optimizing
this skill. Both silently produce **recall 0–17% with precision 100%** — a
vacuous result that reads as success. A patched copy lives in
`carbon-design-workspace/harness/`.

### 7.1 — Report the parallel UUID collision `P2` `S`
`run_eval.py` plants `.claude/commands/<name>-skill-<uuid>.md` per query and
matches the caller's exact uuid. With N workers, N identically-described files
coexist and Claude invokes one at random, so each worker matches ~1/N of real
triggers. Fix: match the shared `<name>-skill-` prefix.

### 7.2 — Report the missing `--strict-mcp-config` `P2` `S`
Each subprocess boots the user's MCP servers (Playwright launches a browser),
blowing the 30s default timeout. A single query measured 85s wall.

---

## Suggested v1.0.0 cut

Everything **P0**, plus **P1** from §1, §5, and §6:

- 1.1 upstream drift check + 1.2 generated versions + 1.3 port-table re-verify
- 2.1 recover trigger recall + 2.2 harder eval set
- 4.2 Windows line endings
- 5.1 CI + 5.2 publish-on-tag + 5.3 install smoke test
- 6.1 audit correctness gap + 6.2 iteration-2 evals

That is a maintainable, verifiable 1.0. §3 content gaps and §4.1 extra tools are
the natural 1.1 — both are additive and neither blocks calling the foundation
stable.

#!/usr/bin/env bash
# Create the v1.0.0 backlog as GitHub issues. Idempotent: skips any issue whose
# exact title already exists, so it is safe to re-run after adding items.
set -o pipefail

REPO=realus99/dopod-design
BACKLOG=https://github.com/$REPO/blob/main/docs/BACKLOG.md

existing=$(gh issue list --repo "$REPO" --state all --limit 200 --json title --jq '.[].title')

mk () {  # mk <ref> <title> <labels> <milestone|-> <body>
  local ref="$1" title="$2" labels="$3" milestone="$4" body="$5"
  local full="$ref — $title"
  if grep -Fxq "$full" <<<"$existing"; then
    echo "  skip (exists): $full"; return
  fi
  local args=(--repo "$REPO" --title "$full" --label "$labels")
  [ "$milestone" != "-" ] && args+=(--milestone "$milestone")
  local url
  url=$(gh issue create "${args[@]}" --body "$body

---
From the v1.0.0 backlog, item $ref. Context: $BACKLOG" 2>&1 | tail -1)
  echo "  $ref -> $url"
}

# ---------------------------------------------------------- content freshness

mk "1.1" "Detect upstream Carbon drift in CI" \
  "P0,effort:M,area:content-freshness" "v1.0.0" \
'Every token list, component inventory, and version number in `references/` was hand-verified against the Carbon repo on 2026-08-23. Carbon ships minors weekly, and nothing detects when these claims stop being true. Stale design-system guidance is worse than none, because it is confidently wrong.

This is the single biggest long-term risk to the package and the item that makes v1.0.0 maintainable rather than a snapshot.

**Build a script that diffs our claims against upstream and fails loudly on divergence:**

- theme token names vs `packages/themes/src/tokens/v11TokenGroup.ts`
- component inventory vs `packages/react/src/components/`
- spacing / motion / type values vs the DTCG JSON under `packages/*/src/dtcg/`
- version numbers vs the npm registry
- the `unstable__` / `unstable_` export list vs `packages/react/src/index.ts`

**Acceptance**
- [ ] Runs as `npm run check:upstream`
- [ ] Non-zero exit with a readable diff when upstream has moved
- [ ] Scheduled weekly in CI, opening an issue on drift
- [ ] Passes against Carbon as of the current release'

mk "1.2" "Generate package versions from a single source instead of prose" \
  "P1,effort:S,area:content-freshness" "v1.0.0" \
'`SKILL.md` hard-codes `@carbon/react ^1.114.0`, `@carbon/styles ^1.113.0`, `@carbon/web-components ^2.61.0`, `@carbon/charts ^1.27.18`, `carbon-components-angular ^5.72.2` in its "Package versions to install" section. Updating them means editing prose in more than one place and hoping nothing was missed.

Move them to a `versions.json` and have `scripts/build.js` render that block, so #1.1 has exactly one file to update.

**Acceptance**
- [ ] Versions live in one machine-readable file
- [ ] The `SKILL.md` block is generated at build time
- [ ] Build fails if the file and the rendered block disagree'

mk "1.3" "Re-verify the v10/v11 port table" \
  "P1,effort:S,area:content-freshness" "v1.0.0" \
'`references/other-frameworks.md` claims `@carbon/vue` (depends on `carbon-components@^10`) and `carbon-components-svelte` (ships a `g80` theme, which v11 deleted) are still Carbon v10, while `carbon-components-angular` is v11-aligned.

This is the sharpest insight in the whole skill — writing v11 token names into a v10 project silently resolves to nothing — and it is also the claim most likely to quietly become false when those ports upgrade.

Fold this check into #1.1 rather than trusting a periodic manual read.

**Acceptance**
- [ ] The drift check asserts each port'"'"'s Carbon major from its dependency tree
- [ ] Failure message names which port moved and in which direction'

# ----------------------------------------------------------------- triggering

mk "2.1" "Recover the trigger recall lost to the rename" \
  "P0,effort:M,area:triggering" "v1.0.0" \
'Renaming `carbon-design` to `dopod-design` cost measured trigger accuracy: **18/20 to 16/20, recall 8/10 to 6/10**, zero false positives throughout. The old name was itself a signal to the model; the new one is opaque, so the description now carries all the weight.

A front-loaded description rewrite leading with "IBM Carbon Design System (v11)" was tested and did **not** recover it — same 16/20, same four misses. The lever is not wording.

**Options, cheapest first:**

1. **Re-run the description optimizer under the current name.** The previous run optimized against `carbon-design`, so its winner is tuned for a signal that no longer exists. Untried and most likely to pay off. Use the patched harness (see #7.1, #7.2), not the stock one.
2. Test whether the opening lines of the `SKILL.md` **body** affect loading, not just the frontmatter description.
3. Accept 16/20 and document it as the cost of the branding decision.

All four misses are prompts where Carbon is the house style but the word never appears — the exact case the skill exists to catch.

**Acceptance**
- [ ] Re-measured under the current name on the full eval set
- [ ] Either recall improves, or the ceiling is documented with evidence'

mk "2.2" "Build a harder, non-saturated trigger eval set" \
  "P1,effort:M,area:triggering" "v1.0.0" \
'The current 20-query set is saturated. The held-out half scored **8/8 in every single optimizer iteration**, so it had no power to discriminate between candidates, and the "best by test score" selection rule silently kept the incumbent even though later iterations were strictly better on train.

**Needed:**
- ~40 queries
- genuinely harder negatives (the current ones — carbon emissions, carbon fibre, MUI, Tailwind, shadcn, Db2, Vuetify, Storybook, Figma tokens — are never triggered, so they no longer inform anything)
- a stratified split placing implicit-trigger cases on **both** sides, so the holdout can actually discriminate

**Acceptance**
- [ ] Holdout is not saturated: at least one candidate separates from another on test
- [ ] Existing 20 queries retained as a regression floor'

mk "2.3" "Document the competing-skill interaction in the README" \
  "P2,effort:S,area:triggering" "-" \
'In a real installed-skill test (not the harness proxy), the prompt *"I need to build an internal ops console for our SRE team..."* invoked `superpowers:brainstorming` and **never reached this skill at all**. Carbon only surfaced because a stray lockfile in the directory tipped the model off.

That is superpowers'"'"' documented "process skills come first" priority rule working as designed. It is not fixable from inside this package, but users who hit it will think the skill is broken.

**Acceptance**
- [ ] README notes the interaction and how to force the skill explicitly'

# --------------------------------------------------------------- content gaps

mk "3.1" "Add a @carbon/ibm-products reference" \
  "P1,effort:M,area:content-gap" "-" \
'Deliberately scoped out of v0.1.0. It is where `Tearsheet`, `Datagrid`, `AboutModal`, `PageHeader`, and the side-panel patterns live — the components enterprise teams reach for immediately after exhausting the core set.

`references/components.md` already tells readers that Tearsheet "is not in core Carbon — lives in `@carbon/ibm-products`", which is a gap that announces itself to anyone reading.

**Acceptance**
- [ ] `references/ibm-products.md` with install, versioning relationship to core, and the component inventory
- [ ] Wired into the `SKILL.md` routing table and the build'"'"'s `REFERENCES` list
- [ ] Cursor/Copilot globs chosen so it does not attach to every file'

mk "3.2" "Expand testing guidance" \
  "P2,effort:S,area:content-gap" "-" \
'`references/react.md` §9 is thin relative to the rest of the file. Worth covering: `@carbon/test-utils`, testing themed components, querying portal-rendered components (`Modal`, `OverflowMenu`, `Tooltip` mount outside the container), and the `IdPrefix` snapshot-stability trap.

Querying by accessible name doubles as a free accessibility regression check, which ties back to `references/accessibility.md`.'

mk "3.3" "Add a Figma / design-token pipeline reference" \
  "P2,effort:M,area:content-gap" "-" \
'How Carbon'"'"'s Figma kits map to code tokens, and what to do when a designer hands over values that are not on the spacing or type scale — currently the skill says "the scale is right and the value is wrong" without saying how to have that conversation or automate the check.

Appeared as a plausible near-miss in the trigger eval set ("exporting design tokens out of figma with the tokens studio plugin") and has no home in the current references.'

mk "3.4" "Add one worked end-to-end example" \
  "P2,effort:M,area:content-gap" "-" \
'Every reference is explanatory prose plus fragments. There is no single complete, annotated build.

The eval-0 result suggests a concrete target to pattern-match may matter more than additional prose: the with-skill run produced a correct 11-file Carbon app, while the baseline hand-rolled 25 files of bespoke design system.

**Scope:** UI Shell, 2x Grid page, themed dashboard with metric tiles, a `DataTable`, and a validated form — annotated with why each token and component was chosen.'

# -------------------------------------------------------------- tool coverage

mk "4.1" "Add Windsurf, Gemini CLI, Cline, and Zed targets" \
  "P1,effort:M,area:tool-coverage" "-" \
'v0.1.0 ships four targets (Claude Code, Cursor, Copilot, Codex). The original ask was "all popular agents"; four was a deliberate narrowing to match the already-proven `dopod-design-carbon` architecture.

**Targets:** `.windsurf/rules/`, `GEMINI.md` (marker-merged), `.clinerules/`, `.rules`

The fan-out architecture already supports this — add an emitter in `lib/build.js` and path handling in `lib/paths.js`. Each needs a global-scope decision (as Copilot has none) and its own frontmatter conventions.

**Acceptance**
- [ ] Each target installs, updates, checks, and uninstalls cleanly
- [ ] `--tools` accepts the new names
- [ ] Marker-merged targets preserve pre-existing user content'

mk "4.2" "Preserve CRLF line endings in marker blocks" \
  "P0,effort:S,area:tool-coverage" "v1.0.0" \
'Marker blocks are written LF-only regardless of the surrounding file, so a CRLF `AGENTS.md` on Windows gets a mixed-ending diff on every install. Currently a documented limitation in `CHANGELOG.md`; it should not be one at 1.0.

Detect the dominant line ending in the existing file and match it when emitting the block.

**Acceptance**
- [ ] `upsertBlock` and `stripBlock` preserve the host file'"'"'s dominant line ending
- [ ] Tests cover LF, CRLF, and a file with no existing content
- [ ] `check` does not report drift purely from line-ending differences'

mk "4.3" "Re-check whether Copilot has a user-scope target" \
  "P2,effort:S,area:tool-coverage" "-" \
'Copilot is skipped under `--global` because its instruction files are repository-scoped by design, and the CLI says so rather than silently doing nothing.

VS Code has since added user-level prompt and instruction files. Worth re-checking whether a real user-scope path now exists, and wiring it up if so.'

# ----------------------------------------------------------- release engineering

mk "5.1" "Add CI" \
  "P0,effort:M,area:release-eng" "v1.0.0" \
'No CI exists. v0.1.0 was validated by running `npm test` locally and remembering to do so.

**Needed:**
- `npm test` on Node 18, 20, and 22
- macOS and Linux (and Windows once #4.2 lands)
- `npm pack --dry-run` content assertions, so a mis-scoped `files` array cannot ship

This is what makes a release reproducible by someone who is not the author — the stated bar for v1.0.0.

**Acceptance**
- [ ] Runs on push and PR to `main`
- [ ] Required before merge'

mk "5.2" "Publish to npm on tag" \
  "P1,effort:S,area:release-eng" "v1.0.0" \
'A `v*` tag should trigger `npm publish` using the granular access token, keeping the git tag, the npm version, and the GitHub release in lockstep.

Note for whoever implements: the npm account has account-level 2FA **disabled**, so `--otp` cannot work — publishing requires a granular access token with **bypass 2FA** enabled, stored as an Actions secret.

**Acceptance**
- [ ] Tag push publishes and creates the release
- [ ] Refuses to publish if `package.json` version and tag disagree'

mk "5.3" "Add an install smoke test to CI" \
  "P1,effort:S,area:release-eng" "v1.0.0" \
'Install into a scratch project from the packed tarball, then assert the full lifecycle:

- expected file count per tool
- `check` exits 0
- `uninstall` leaves the tree clean
- a pre-existing `AGENTS.md` comes back **byte-identical**
- a sibling package'"'"'s `.cursor/rules/dopod-*.mdc` files are untouched

All of this was run manually before releasing 0.1.0 and caught real problems. It should not depend on anyone remembering.

**Acceptance**
- [ ] Runs in CI on every PR'

mk "5.4" "Record tarball integrity in the lockfile" \
  "P2,effort:S,area:release-eng" "-" \
'`.dopod-design.lock.json` records per-file hashes but not the published tarball integrity hash. Recording it would let `check` distinguish "the user edited a file" from "a different package version wrote this", which is a more useful diagnostic than the current combined drift report.'

# -------------------------------------------------------------- output quality

mk "6.1" "Close the audit correctness gap the evals exposed" \
  "P1,effort:M,area:output-quality" "v1.0.0" \
'In the head-to-head audit eval, the **baseline** (no skill) found two runtime crash bugs and a missing entry point that the with-skill run missed. The skill'"'"'s rubric focused attention on design-system conformance and away from "is this code actually correct".

That is a content bug, and it took a baseline comparison to see it — the skill scored 10/10 on its own assertions while being less useful than no skill on a dimension the user cares about.

`references/audit.md` should tell the reader to report correctness and accessibility defects they trip over during the audit, not only Carbon deviations. The gap-analysis report template needs a place to put them.

**Acceptance**
- [ ] `audit.md` instructs reporting non-Carbon defects encountered
- [ ] Report template has a section for them
- [ ] Re-run the audit eval; the skill run should now match or beat the baseline on bug-finding'

mk "6.2" "Run iteration-2 of the output evals" \
  "P1,effort:M,area:output-quality" "v1.0.0" \
'Only one iteration ran for v0.1.0. The skill-creator loop is meant to repeat: revise the skill, re-run the same evals, and compare against `iteration-1` with `--previous-workspace`.

Worth doing once the content items land, especially #6.1. The graders are already written (`carbon-design-workspace/grade.py`), as is the runner and the post-processing.

Note three assertions were rewritten as judgment items in iteration-1 because regexes fired on correct text — check those still behave.

**Acceptance**
- [ ] `iteration-2/` complete with both arms
- [ ] Compared against iteration-1 in the viewer
- [ ] No regressions on evals that already passed'

# ------------------------------------------------------------------- upstream

mk "7.1" "Report the parallel UUID collision in the skill-creator trigger harness" \
  "P2,effort:S,area:upstream" "-" \
'`scripts/run_eval.py` proxies a skill by planting `.claude/commands/<name>-skill-<uuid>.md` per query and watching for a `Skill` call matching that exact uuid.

With N parallel workers, N identically-described files coexist. Claude invokes whichever one it sees, so each worker matches its own uuid roughly 1/N of the time. Every should-trigger query reads as a miss.

**Symptom:** recall 0–17% with precision 100% — a vacuous result that reads like a pass if you only look at precision.

**Fix:** match the shared `<name>-skill-` prefix instead of the caller'"'"'s uuid. Every coexisting file describes the same skill, so a prefix match is the correct signal.

A patched copy is in `carbon-design-workspace/harness/`. Verified: 6/6 correct at 5 workers after the fix, versus near-total failure before.'

mk "7.2" "Report the missing --strict-mcp-config in the skill-creator trigger harness" \
  "P2,effort:S,area:upstream" "-" \
'`scripts/run_eval.py` invokes `claude -p` without `--strict-mcp-config`, so every parallel subprocess boots the user'"'"'s full MCP server set. With Playwright configured, that launches a browser per subprocess.

Startup then exceeds the 30s default per-query timeout and queries read as "did not trigger". A single measured query took **85s wall**, of which the actual model work was ~10s.

**Fix:** add `--strict-mcp-config` to the subprocess command. Compounds with #7.1 — together they made the harness report a completely inverted result.

Patched copy in `carbon-design-workspace/harness/`.'

echo
echo "done."

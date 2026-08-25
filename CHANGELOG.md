# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **The weekly drift check now verifies the `@carbon/ibm-products`
  released/canary split.** `ibm-products.md` names 47 components as usable
  without a flag, and components graduate between minors — so that list was the
  claim in the package most likely to go quietly false.

  It matters in one direction especially: naming something as released when it
  is still canary sends you to design around a component that refuses to
  render, which is the exact failure the reference exists to prevent. The check
  derives the split from the published package's own flag defaults, so it
  cannot drift in step with the file it guards, and reports both directions
  plus the stated counts.

### Fixed

- `ibm-products.md` §3 listed 44 of the 47 released components — the new check
  found `CreateTearsheetDivider`, `WebTerminalProvider` and
  `WebTerminalContentWrapper` missing on its first run. §3 now also states
  plainly that the released list is complete and verified while the canary list
  is a sample, so neither is mistaken for the other.

## [1.1.0] — 2026-08-25

### Added

- **`check` now tells a hand-edit from a different build.** Every difference
  used to report as `edited:`, so a file some other build had written looked
  exactly like one you had changed by hand — and the two want opposite
  responses. The lockfile records a `payload_sha256` identifying the build that
  wrote it, and `check` reports:

  - `edited:` — matches neither what we wrote nor what the package ships, so a
    person changed it. `update` overwrites it, and `check` now warns before you
    run it.
  - `rewritten:` — matches what the package ships now, just not the lockfile.
    A different build wrote it; nothing of yours is at risk.

  Backward compatible: a lockfile written before this still works, and `check`
  states which part it cannot determine rather than guessing.

- **README: "If it doesn't seem to fire".** The commonest report is that the
  skill is installed and the agent built something anyway. Usually it did load
  and you cannot tell, because a skill leaves no visible trace.

  The section names the observed case — [superpowers](https://github.com/obra/superpowers)'
  `brainstorming` claiming an *"I need to build an internal ops console"* prompt
  before this skill ever loaded, which is its documented *process skills come
  first* rule working as designed — and gives three things that reliably work
  instead. It also covers what happens when a second design-system skill is
  installed, and explains what the always-on `AGENTS.md` block is for.

### Fixed

- The README claimed **ten** reference files while listing twelve, and omitted
  `ibm-products.md` from the table. A test now fails the build if the table
  misses a registered reference or the stated count is wrong — prose counts go
  stale the moment a reference is added, and nothing was complaining.

## [1.0.0] — 2026-08-25

**1.0.0 is a stability commitment, not a feature release.** Install paths and
emitted filenames are now fixed: renaming `dopod-design-*.md`, moving where a
tool's files land, or changing the lockfile's location would break existing
installs' ability to update or uninstall cleanly, so those are breaking changes
from here. The content will keep moving; the contract with your repo will not.

What that rests on: 129 tests, CI across Linux/macOS/Windows and Node 18/20/22,
a weekly drift check that verifies every token, component, version and port
Carbon major against the upstream repository, publishing with SLSA provenance,
and an uninstall that returns a pre-existing file byte-identical.

### Added

- **`references/ibm-products.md`** — Carbon for IBM Products, the layer above
  core Carbon: `Tearsheet`, `Datagrid`, `PageHeader`, `SidePanel`, create
  flows, and the `EmptyState`/`HTTPError*` family.

  The operational fact worth having is the **flag system**: of 117 components,
  **47 are released and 70 sit behind canary flags**. Import a canary component
  without setting `pkg.component.<Name> = true` at app entry and it declines to
  render, with a console warning as the only clue. That is the failure this
  reference exists to prevent.

  `@carbon/ibm-products` is now version-tracked by the weekly drift check, but
  marked `core: false` in `versions.json` so it stays out of `SKILL.md`'s
  install block — it is a deliberate extra layer, not part of a Carbon setup.

### Fixed

- **`motion.md` recommended the wrong technique first.** Animating a
  disclosure to an unknown height now leads with the grid approach —
  `grid-template-rows` between `0fr` and `1fr`, which needs no JavaScript
  because `fr` resolves against the content's own height. The measured-height
  technique is still documented, but as the fallback for when you need the
  height as a real value.

  This came out of measurement rather than review: a baseline model with no
  skill installed reached for the grid technique unprompted, on a file that did
  not mention it. Guidance a capable model beats is worse than no guidance.

- `components.md` said `Tearsheet` "lives in `@carbon/ibm-products`" with
  nowhere to send the reader. Those pointers now resolve, and a test fails the
  build if any reference link in `components.md` points at a file that is not
  registered.

## [0.4.0] — 2026-08-25

### Added

- **Windsurf, Gemini CLI, and Cline targets.** `--tools` now accepts
  `windsurf`, `gemini`, and `cline`; `install`, `update`, `check`, and
  `uninstall` handle all seven.

  Each got the shape it actually loads, which differs more than expected:
  Windsurf caps a workspace rule at **12,000 characters**, so the four
  references that exceed it ship only through the shared pointer; Cline merges
  *every* file in `.clinerules/` into one always-on rule set, so it gets one
  slim rule rather than twelve references flooding each prompt; `GEMINI.md` is
  concatenated hierarchically into every prompt and may already belong to the
  user, so it is marker-merged like `AGENTS.md`.

  `--global` is unsupported for Windsurf and Cline — their global locations are
  size-capped or outside the home dotfile convention — and the CLI says so
  rather than skipping silently.

- **Zed is deliberately not a target.** Its rules lookup is first-match-wins and
  already includes `AGENTS.md` and `.github/copilot-instructions.md`, both of
  which this package writes. A `.rules` file would take higher priority and
  displace them.

### Changed

- The shared reference payload is emitted once under `shared/` instead of being
  duplicated per pointing tool. Four copies of twelve references had grown the
  unpacked tarball to 1.28 MB; it is now 890 kB with three more tools supported.

## [0.3.0] — 2026-08-25

### Added

- **`references/intake.md` — ask before generating UI.** For anything larger
  than a single component the skill now runs a structured intake: stack, theme,
  density, navigation, how data is displayed, what question a chart answers,
  icons, overlays, motion. It answers what it can from `package.json` and the
  surrounding code first, then asks only about the gaps, batched into one
  message with defaults offered.

  Measured: a screen-sized ask ("build the deployments page…") produced an
  intake and **zero** files; "give me a danger button that says Delete" produced
  the button and no questions.

- **`references/motion.md` — motion and animation.** Documents Carbon's five
  named motion *surfaces* (`disclosure`, `contextual`, `stretch`, `expand`,
  `invoke`), which bind a duration to an easing per interaction and were
  previously undocumented here. On top of that: expand/collapse against an
  unknown height, side-nav collapse, origin-aware overlay reveals, trendline
  draw-on and pie sweep for `@carbon/charts` (which exposes only an on/off
  boolean), and `data-state` transitions.

  Every animated pattern carries its `prefers-reduced-motion` form, including
  chart animation, which is JS-driven and out of reach of the blanket CSS rule.

### Changed

- **Positioning: this is a Carbon-derived house system, not Carbon itself.**
  Nearly all of it is Carbon as IBM documents it. Guidance that goes beyond what
  Carbon specifies — chiefly motion implementation, which Carbon leaves
  undefined — is labelled `[house]` at the point of use. A house choice
  presented as Carbon becomes "what Carbon says" to the next reader.

## [0.2.1] — 2026-08-25

### Changed

- **`references/audit.md` now rates severity by consequence to the user, not by
  whether a finding is a Carbon issue.** A head-to-head eval caught the skill
  filing a production Rollback button that throws `ReferenceError` on click as
  **Low**, framed "Not a Carbon issue, but worth knowing" — while a no-skill
  baseline led its report with the same defect. The severity scale was defined
  in Carbon terms, so a real crash ranked below a missing `<h1>`.

  The report template now has a `## Correctness and accessibility` section
  ahead of the design-system findings, and the reference names both burying
  phrasings explicitly. Re-running the eval, the crash bugs are now rated
  **Critical** in their own section, and the run scores 14/14 against the
  extended assertions — up from 11/14, and above the baseline's 13/14.

- `versions.json` is now the single source for recommended package versions and
  for which Carbon major each implementation targets. `SKILL.md`'s version block
  is rendered from it by `npm run sync:versions`, and the build fails if the two
  diverge — previously the numbers lived in prose in several files and had to be
  updated by hand in each.
- The drift check verifies each framework port's Carbon major from published
  metadata rather than trusting the documented value. A dependency on
  `carbon-components@^10` proves v10; `@carbon/styles` proves v11; for
  `carbon-components-svelte`, which ships its own CSS, the check asks whether
  `css/g80.css` is still served — v11 deleted that theme.

## [0.2.0] — 2026-08-24

### Added

- **Claude Code now receives an always-on `AGENTS.md` block** alongside the
  on-demand skill. A skill is only consulted when the model decides it needs
  help, so an ordinary-sounding request never reached it — measured, 6 of 40
  trigger-eval queries failed under *every* description wording tried, all
  sharing that shape ("add paging to the audit log list", "need a loading state
  for the metrics panel"). Codex and Copilot already had an always-on file;
  Claude Code did not.

  Measured on three of those queries with the skill tool explicitly denied:
  with the always-on layer, all three produced Carbon components and tokens and
  **zero** raw hex codes. Without it, none used Carbon and each wrote 18–21 raw
  hex values.

  In a project both Claude Code and Codex target `AGENTS.md`; the block is
  written once. At user scope Claude Code uses `~/.claude/CLAUDE.md`, which does
  not collide with Codex's `~/.codex/AGENTS.md`.

  Upgrading from 0.1.0 adds the file cleanly — `update` merges it into an
  existing `AGENTS.md` and `uninstall` still returns that file byte-identical.

- **`npm run check:upstream`** — detects when this package's claims about Carbon
  stop being true. Compares token names, `@carbon/react` exports, motion
  durations, and published versions against the Carbon repository and npm. A
  claim we make that upstream no longer has is an error; something upstream has
  that we omit is a reported gap. Runs weekly in CI, opening one rolling
  tracking issue rather than a new one each week.

- **`npm run check:package`** — asserts what the published tarball contains.
  `dist/` is gitignored but must ship, while `docs/`, `evals/`, and
  `admin-docs/` must not; no unit test covered that interaction.

- **CI** on Node 18/20/22 across Linux, macOS, and Windows, including a
  reproducible-build check — `dist/` ships in the tarball, so a nondeterministic
  build would mean two publishes of one source producing different payloads.

### Fixed

- `uninstall` left a stray trailing newline in a pre-existing shared file, so
  the documented byte-identical guarantee was not actually true. The old test
  asserted only that the original text was still *present*, which hid it. Now
  tested as a round-trip inverse property, with the one unavoidable exception
  documented: a file that did not end in a newline gains one.
- `stripBlock` also consumed trailing whitespace on the user's final line.
- **Marker blocks now adopt the host file's line endings.** Writing LF into a
  CRLF `AGENTS.md` gave Windows users a mixed-ending diff on every install, and
  made `check` report drift that was purely cosmetic. Block hashes are now
  compared with line endings normalised, so identical content hashes identically
  on every platform. CI runs the suite on Windows.

## [0.1.0] — 2026-08-23

First release.

### Added

- Canonical Carbon Design System skill (`SKILL.md`) covering Carbon v11, with
  ten reference files: tokens, layout, components, React, Web Components, other
  frameworks, charts, AI, accessibility, and audit/migration.
- `dopod-design` CLI with `install`, `update`, `uninstall`, `check`, and
  `build` commands.
- Fan-out build that reshapes one canonical source into four tool formats:
  Claude Code skill, Cursor `.mdc` rules with globs, Copilot
  `.instructions.md` files with `applyTo`, and a slim Codex `AGENTS.md`.
- Marker-block merging for `AGENTS.md` and `.github/copilot-instructions.md`,
  so existing user content survives install, update, and uninstall.
- Lockfile (`.dopod-design.lock.json`) recording every written file and the
  hash of each managed block.
- `--global` user-scope install, with per-tool path handling
  (`~/.claude/skills/`, `~/.cursor/rules/`, `~/.codex/AGENTS.md`).
- CI-friendly `check` exit codes: `0` in sync, `1` drift, `2` not installed.

### Trigger tuning

- The skill `description` was tuned against a 20-query trigger set (3 runs per
  query). It names both the explicit path and the *assumed* path ("our design
  system", "the company standard", a repo that already depends on Carbon),
  because the common failure is a plain-sounding UI request in a Carbon
  codebase never reaching the skill at all.
- Measured **31/40 correct, recall 13/20, precision 13/15** on a 40-query
  trigger set, with competing skills isolated during measurement.
- Five iterations of automated optimization produced nothing better than this
  wording. The residual misses share one shape: an ordinary UI task phrased with
  no design-system vocabulary at all ("add paging to the audit log list",
  "need a loading state for the metrics panel"). Those read as plain React work
  the model can handle unaided, so no description reliably pulls the skill in.
  Closing that gap needs an always-on instruction layer, not better wording.

### Notes

- Runs from `npx` without the package being present in `node_modules` — the CLI
  resolves `dist/` relative to itself, and builds from canonical sources when
  run out of a checkout.
- Zero runtime and zero development dependencies; tests use `node --test`.
- Carbon versions documented against `@carbon/react` 1.114.0,
  `@carbon/styles` 1.113.0, `@carbon/web-components` 2.61.0, and
  `@carbon/charts` 1.27.18.

### Known limitations

- Copilot has no user-level instruction location, so `--global` skips it.
- The frontmatter parser handles flat scalars and block scalars only; nested
  YAML in `SKILL.md` frontmatter is not supported.

# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

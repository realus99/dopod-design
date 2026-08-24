# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Fixed

- `uninstall` left a stray trailing newline in a pre-existing shared file, so
  the documented byte-identical guarantee was not actually true. The old test
  asserted only that the original text was still *present*, which hid it. Now
  tested as a round-trip inverse property, with the one unavoidable exception
  documented: a file that did not end in a newline gains one.
- `stripBlock` also consumed trailing whitespace on the user's final line.

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

- Marker blocks are written with LF line endings regardless of the surrounding
  file. Windows CRLF files will show a mixed-ending diff.
- Copilot has no user-level instruction location, so `--global` skips it.
- The frontmatter parser handles flat scalars and block scalars only; nested
  YAML in `SKILL.md` frontmatter is not supported.

# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Measured 16/20 with zero false positives. The same description measured 18/20
  when the package was named `carbon-design`; the name itself was carrying
  triggering signal, and an opaque name costs ~2 queries of recall that
  rewording does not recover. Precision is unaffected — no negative query
  (carbon emissions, carbon fibre, MUI, Tailwind, shadcn, Db2, Vuetify,
  Storybook, Figma tokens) ever triggers it.

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

# Architecture

Why this package is built the way it is. Read this before changing how content
is emitted or where it lands — most of these decisions have a failure mode
behind them.

**Contents**

1. [The problem](#1-the-problem)
2. [One canonical source, four shapes](#2-one-canonical-source-four-shapes)
3. [Why files are named the way they are](#3-why-files-are-named-the-way-they-are)
4. [Shared files and the marker block](#4-shared-files-and-the-marker-block)
5. [The lockfile](#5-the-lockfile)
6. [Resolving `dist/` — the npx case](#6-resolving-dist--the-npx-case)
7. [The slim extract](#7-the-slim-extract)
8. [Module map](#8-module-map)
9. [Invariants](#9-invariants)

---

## 1. The problem

Four AI coding tools each read project instructions from a different place, in a
different format, with different loading semantics. Maintaining four copies of
the same Carbon guidance guarantees they drift.

So: one canonical source, reshaped at build time into each tool's native format.
Not copied — *reshaped*, because the tools differ in ways that matter.

| Tool | Loads | Consequence for us |
|---|---|---|
| Claude Code | A skill dir, on demand | Can take the whole thing; references load lazily |
| Cursor | `.mdc` rules with `globs` | Wants per-topic files that attach to matching source files |
| Copilot | `.instructions.md` with `applyTo` | Same, plus one always-on repo-wide file |
| Codex | `AGENTS.md`, every turn | Must be short — it competes with everything else in context |

---

## 2. One canonical source, four shapes

```
SKILL.md  +  references/*.md          ← the only files a human edits
        │
        └── scripts/build.js → lib/build.js
                    │
                    ├── dist/claude-code/   SKILL.md verbatim + references/
                    ├── dist/cursor/        .mdc, frontmatter with globs
                    ├── dist/copilot/       .instructions.md with applyTo
                    │                       + slim copilot-instructions.md
                    └── dist/codex/         slim AGENTS.md
                                            + .dopod-design/references/
                    └── manifest.json       every emitted file + sha256
```

`dist/` is generated, gitignored, and rebuilt by `prepublishOnly`. It is listed
in `files` in `package.json` because it is the payload — consumers never build.
That combination is deliberate and looks wrong at a glance.

Adding a reference file means adding an entry to `REFERENCES` in `lib/build.js`
with a slug, description, and glob. The build fails if the file is missing, so a
half-added reference cannot ship.

---

## 3. Why files are named the way they are

Emitted files are prefixed **`dopod-design-`**, not `dopod-`.

The sibling package `@urmindra/dopod-design-carbon` already writes
`.cursor/rules/dopod-tokens.mdc` and `dopod-components.mdc`. Both packages can
be installed in the same project. A `dopod-` prefix here would silently
overwrite that package's files, and its lockfile would then report drift it did
not cause.

Verified: both install side by side, with both marker blocks coexisting in one
`AGENTS.md`.

**Changing an emitted filename is a breaking change**, even though it feels
cosmetic — a previously installed copy can no longer be cleanly updated or
removed, because `update` and `uninstall` work from the lockfile's record of
what was written.

---

## 4. Shared files and the marker block

`AGENTS.md` and `.github/copilot-instructions.md` may already exist and belong to
the user. We never overwrite them. Our contribution is fenced:

```markdown
<!-- dopod-design:start v0.1.0 -->
…managed content…
<!-- dopod-design:end -->
```

`install` upserts the block, `uninstall` strips it, and a file that held nothing
else is deleted rather than left empty.

Malformed markers — duplicated, orphaned, or inverted — raise exit code 40 with
a recovery hint rather than guessing. Guessing here means destroying someone's
`AGENTS.md`.

`check` hashes **only the fenced body**, not the whole file. Hashing the whole
file would report drift every time the user edits their own part of `AGENTS.md`,
which is both expected and none of our business.

**Known limitation:** the block is written LF-only regardless of the surrounding
file, so a CRLF host produces a mixed-ending diff on Windows. Tracked as
[#12](https://github.com/realus99/dopod-design/issues/12).

---

## 5. The lockfile

`.dopod-design.lock.json` at the install root records every file written with its
sha256, and every marker block with the hash of its body.

Every other command reads it. Without it `uninstall` would have to infer what it
owns, and inferring means deleting files it did not write.

`update` is install plus reconciliation: anything in the old lockfile but not the
new manifest is removed, so a renamed or dropped file cannot linger. Stale
guidance still being loaded by a tool is worse than none.

---

## 6. Resolving `dist/` — the npx case

`npx dopod-design install` runs the CLI straight out of npm's cache, where there
is no `node_modules` entry to look up. So `lib/resolve-dist.js` looks **beside
itself** first (`__dirname/../dist`).

Second case: a git checkout, where `dist/` is gitignored and may not exist yet.
There the canonical sources are present, so it builds on the fly rather than
failing with "run npm run build".

This is why the CLI works with a bare `npx` and no prior install.

---

## 7. The slim extract

The two always-on files — `AGENTS.md` and `copilot-instructions.md` — get only
the region of `SKILL.md` fenced by `<!-- slim:start -->` / `<!-- slim:end -->`.

The author controls that boundary explicitly. An earlier design sliced from a
named heading, which meant renaming or moving a section silently changed what
four tools loaded.

Citations inside the slim body are rewritten per tool, because each puts the
references somewhere different — `references/x.md` for Claude Code becomes
`.dopod-design/references/x.md` for Codex and
`.github/instructions/dopod-design-x.instructions.md` for Copilot. Leaving the
agent to guess the path is a reliable way to have it not read them.

---

## 8. Module map

| File | Responsibility |
|---|---|
| `bin/dopod-design.js` | Entry point; sets exit code |
| `lib/cli.js` | Arg parsing, help, command dispatch (lazy-required) |
| `lib/build.js` | The fan-out. `REFERENCES` list, per-tool emitters, manifest |
| `lib/paths.js` | `PKG_NAME`, tool list, target path resolution, shared-file set |
| `lib/resolve-dist.js` | Find or build `dist/` (§6) |
| `lib/install.js` | Write dedicated files, merge shared ones, write lockfile |
| `lib/update.js` | Install, then remove what the previous version left behind |
| `lib/uninstall.js` | Remove files, strip blocks, prune emptied dirs, delete lockfile |
| `lib/check.js` | Compare install to package; CI exit codes |
| `lib/marker-merge.js` | Upsert/strip/find the fenced block |
| `lib/lockfile.js` | Read/write/delete the lockfile |
| `lib/frontmatter.js` | Minimal YAML frontmatter reader/writer |
| `lib/fsx.js` | Atomic writes, hashing, recursive listing, empty-dir pruning |

Commands take an `io` object (defaulting to `process`) so tests capture output
without the suite printing it.

**Zero dependencies, runtime and dev.** Tests use `node --test`. Keep it that
way — this package writes files into other people's repos, and a small
dependency surface is part of why that is acceptable. CI asserts it: a build
fails if `dependencies` or `devDependencies` is non-empty.

---

## 10. CI

`.github/workflows/ci.yml` runs on push and PR to `main`.

- **test matrix** — Node 18/20/22 on ubuntu and macos. Windows waits on
  [#12](https://github.com/realus99/dopod-design/issues/12), since the marker
  block still forces LF.
- **reproducible build** — builds twice and compares manifest hashes. `dist/`
  ships in the tarball, so a nondeterministic build would mean two publishes of
  one source produce different payloads.
- **package contents** — `npm run check:package` asserts what actually ships.
  The `files` array and `.gitignore` interact in a way no unit test covers:
  `dist/` is gitignored but must ship, while `docs/`, `evals/`, and
  `admin-docs/` must not. Verified against both failure modes.

A second workflow, `upstream-drift.yml`, runs weekly (`npm run check:upstream`).
It compares what `references/` claims against the Carbon repository and npm, and
fails when a claim stops being true.

The direction matters. A claim we make that upstream no longer has is an
**error** — we would be teaching a token that resolves to nothing. Something
upstream has that we do not mention is a **gap**: reported, never fatal.

Four surfaces are checked: theme/component/layout/type token names, `@carbon/react`
exports, motion durations, and published package versions. Component sub-exports
are resolved from the published `.d.ts` via their `<Name>Props` types, since
`index.ts` only re-exports modules. A short allowlist in the script covers names
we mention deliberately that are *not* current exports — `Slug` (documented as
AILabel's former name), `Tearsheet` (documented as living in `@carbon/ibm-products`)
— each with a reason, so removing the reason makes the check flag it again.

On drift the scheduled run opens **one** rolling tracking issue and comments on
it thereafter, rather than filing a new issue every Monday.

`main` requires all seven CI checks. Admins are exempt (`enforce_admins: false`),
so a maintainer can still push directly; everyone else goes through a PR. Run
the whole thing locally with `npm run ci`.

---

## 9. Invariants

Break these and something downstream breaks quietly.

- **Never overwrite a file we did not write.** Shared files are merged, never
  replaced.
- **`uninstall` returns a pre-existing `AGENTS.md` byte-identical.** Tested as a
  round-trip inverse property. One documented exception: a file that did not end
  in a newline gains one, because `upsertBlock` normalises the separator and
  `stripBlock` cannot know it was absent.
- **Writes are atomic** — temp file plus rename. An interrupted run must not
  leave a half-written instruction file that a tool then loads as truth.
- **The manifest sorts by code unit, not `localeCompare`.** Locale-aware
  collation is not portable, and the manifest must hash identically everywhere.
- **A rebuild produces identical hashes.** Tested.
- **`check` exit codes are the API:** `0` in sync, `1` drift, `2` not installed.
  CI depends on them.
- **The build fails loudly on a missing reference or absent slim markers.** A
  silently incomplete bundle is worse than a failed build.

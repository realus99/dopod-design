# dopod-design

IBM's [Carbon Design System](https://carbondesignsystem.com) as an installable
skill for AI coding tools. One command writes the same Carbon guidance into
Claude Code, Cursor, GitHub Copilot, and OpenAI Codex — each in that tool's own
native format.

```bash
npx dopod-design install
```

---

## Why

Agents produce Carbon-*flavored* UI by default: they import `Button` from
`@carbon/react` and then style it with `#0f62fe` and `padding: 14px`. It renders,
and it breaks the moment the theme switches to `g100`.

Carbon's correctness lives in its tokens, its component APIs, and its grid — not
in visual approximation. This package puts that knowledge where your tools will
actually read it.

Covers Carbon **v11**: `@carbon/react`, `@carbon/web-components`,
`@carbon/styles`, `@carbon/charts`, Carbon for AI, and the Angular, Vue, and
Svelte ports — including which Carbon version each of those ports actually
targets, which is the detail that most often goes wrong.

---

## Install

```bash
# into the current project (recommended)
npx dopod-design install

# only some tools
npx dopod-design install --tools=claude-code,cursor

# at user scope, for every project on this machine
npx dopod-design install --global

# see what would happen first
npx dopod-design install --dry-run
```

Or add it as a dev dependency so the version is pinned with everything else:

```bash
npm install --save-dev dopod-design
npx dopod-design install
```

Requires Node 18 or newer. No runtime dependencies.

---

## What gets written

| Tool | Location |
|---|---|
| Claude Code | `.claude/skills/dopod-design/SKILL.md` + `references/`, **plus an always-on `AGENTS.md` block** |
| Cursor | `.cursor/rules/carbon-*.mdc` (glob-scoped rules) |
| GitHub Copilot | `.github/copilot-instructions.md` + `.github/instructions/carbon-*.instructions.md` |
| OpenAI Codex | `AGENTS.md` + `.dopod-design/references/` |

Claude Code gets both layers deliberately. A skill is consulted only when the
model decides it needs one, so a plain-sounding request — "add paging to the
audit log list" — never reaches it. The always-on block carries the core rules
regardless; the skill carries the depth.

Each tool gets the shape it actually loads. Claude Code takes the skill whole and
reads references on demand. Cursor and Copilot get per-topic files with globs, so
the token rules attach to your SCSS and the chart rules attach to your chart
components. Codex gets a slim always-on `AGENTS.md` plus references it can open
when a task needs detail.

**`AGENTS.md` and `.github/copilot-instructions.md` are merged, not
overwritten.** Anything you already wrote there is preserved; this package only
owns the region between its own markers:

```markdown
<!-- dopod-design:start v0.1.0 -->
…managed content…
<!-- dopod-design:end -->
```

`--global` writes to `~/.claude/skills/`, `~/.cursor/rules/`, and
`~/.codex/AGENTS.md`. Copilot instruction files are repository-scoped by design,
so Copilot is skipped in `--global` mode and the CLI says so.

---

## Commands

| Command | What it does |
|---|---|
| `install` | Write the files. Re-running is safe and idempotent. |
| `update` | Re-install, and remove anything a previous version left behind. |
| `uninstall` | Remove what this package wrote; unmerge the shared files. |
| `check` | Compare what's installed to what this package ships. |

`check` is built for CI:

```bash
npx dopod-design check    # 0 = in sync, 1 = drift, 2 = not installed
```

It hashes only the managed block inside shared files, so editing your own part
of `AGENTS.md` never reports as drift.

Flags: `--tools=<list>`, `--global`, `--dry-run`, `--verbose`, `--help`,
`--version`.

---

## What's covered

The skill routes to ten reference files, loaded only when a task needs them:

| Reference | Contents |
|---|---|
| `tokens.md` | Every theme token by role, the spacing scale, the v11 type tokens, motion, sizes, radius, breakpoints, and the v10→v11 rename table |
| `layout.md` | The 2x Grid, grid modes, subgrids, the layering model, the UI Shell |
| `components.md` | ~150 components by category, plus how to choose between the confusable ones |
| `react.md` | `@carbon/react` setup, SCSS config, IBM Plex, theming, Next/Vite notes, patterns |
| `web-components.md` | `cds-*` custom elements, attributes vs. properties, shadow-DOM theming |
| `other-frameworks.md` | Angular, Vue, Svelte — and which Carbon version each actually targets |
| `charts.md` | `@carbon/charts`, chart selection, the ordered categorical palettes |
| `ai.md` | Carbon for AI: `AILabel`, the `decorator` prop, `ai-*` and `chat-*` tokens |
| `accessibility.md` | WCAG AA requirements, focus, keyboard, labelling, a review checklist |
| `audit.md` | Scoring an existing frontend against Carbon; v10→v11 and non-Carbon migrations |

---

## Keeping it accurate

Carbon ships minors weekly, so the guidance here can go stale silently. A weekly
job checks it:

```bash
npm run check:upstream        # 0 = every claim still holds, 1 = drift
```

It verifies token names, `@carbon/react` exports, motion durations, package
versions, and which Carbon major each framework port targets — against the
Carbon repository and npm. When a claim stops being true,
CI opens a single rolling tracking issue.

Versions and Carbon majors live in `versions.json`; `npm run sync:versions`
regenerates the block in `SKILL.md` from it, and the build fails if they
diverge.

**To accept a legitimate upstream change**, update `versions.json` or the
affected file in `references/` and re-run until green — the check is the definition of correct,
not a suggestion.

## Editing the content

One canonical source fans out to all four tools. Edit `SKILL.md` and
`references/*.md`, then rebuild:

```bash
npm run build   # regenerates dist/
npm test
```

`dist/` is generated and gitignored; it is built automatically before publish.
The region of `SKILL.md` fenced by `<!-- slim:start -->` / `<!-- slim:end -->` is
what reaches the always-on files, so keep it to the rules that change output
most.

---

## Contributing

[`CLAUDE.md`](CLAUDE.md) is the fastest orientation, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains why the package is built
the way it is — read it before changing how content is emitted or where it
lands. Edit only `SKILL.md` and `references/*.md`; everything in `dist/` is
generated.

## Roadmap

Planned work toward v1.0.0 — with the evidence behind each item — is in
[`docs/BACKLOG.md`](docs/BACKLOG.md). The headline goals are content that
refreshes itself against upstream Carbon rather than drifting, CI, and better
skill-trigger recall.

## License and attribution

This package is licensed Apache-2.0.

Carbon is developed by IBM and licensed under Apache-2.0. This is a **community
project**: it packages publicly documented guidance from
[carbondesignsystem.com](https://carbondesignsystem.com) and the
[carbon-design-system/carbon](https://github.com/carbon-design-system/carbon)
repository. It is not affiliated with or endorsed by IBM. "IBM", "Carbon", and
"IBM Plex" are trademarks of International Business Machines Corporation.

Where this package and the Carbon repository disagree, the repository is right.

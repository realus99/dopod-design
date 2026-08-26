# dopod-design

IBM's [Carbon Design System](https://carbondesignsystem.com) as an installable
skill for AI coding tools — plus a thin house layer where Carbon leaves a gap,
always labelled as such. One command writes the same Carbon guidance into
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

Every tool gets **two layers**: something its host loads on every request, and
per-topic detail loaded on demand.

| Tool | Always-on | On demand |
|---|---|---|
| Claude Code | `AGENTS.md` block | `.claude/skills/dopod-design/SKILL.md` + `references/` |
| Cursor | `AGENTS.md` block | `.cursor/rules/dopod-design-*.mdc` (glob-scoped) |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/instructions/dopod-design-*.instructions.md` |
| OpenAI Codex | `AGENTS.md` block | `.dopod-design/references/` |
| Windsurf | `.windsurf/rules/dopod-design.md` | `.windsurf/rules/dopod-design-*.md` + `.dopod-design/references/` |
| Gemini CLI | `GEMINI.md` block | `.dopod-design/references/` |
| Cline | `.clinerules/10-dopod-design.md` | `.dopod-design/references/` |

Claude Code, Cursor and Codex share one `AGENTS.md`; installing all three writes
a single merged block, not three copies.

The always-on layer is the point, not a convenience. A skill or a
description-matched rule is consulted only when the model decides it needs one,
so a plain-sounding request — "add paging to the audit log list" — never reaches
it. Measured: 6 of 40 trigger queries fail under every description we could
write, all sharing that shape. The always-on layer carries the core rules
regardless; the on-demand layer carries the depth.

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

`--global` writes to `~/.claude/skills/`, `~/.cursor/rules/` (including an
`alwaysApply: true` rule, since a home `AGENTS.md` is not read at user scope),
`~/.copilot/instructions/`, and `~/.codex/`. Windsurf and Cline have no usable
user-level location, so they are skipped in `--global` mode and the CLI says so.

Copilot's user scope loads only `*.instructions.md` files, so
`copilot-instructions.md` — which is workspace-only — ships as
`dopod-design.instructions.md` there instead. If your VS Code sets
`chat.instructionsFilesLocations`, make sure it has not disabled the user
location, or the files install correctly and are never read.

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

When something has changed, `check` distinguishes two cases that need opposite
responses:

- **`edited:`** — the file matches neither what we wrote nor what the package
  ships now, so a person changed it. `update` will overwrite it, and `check`
  says so.
- **`rewritten:`** — the file matches what the package ships now, just not what
  the lockfile recorded. A different build wrote it; nothing of yours is at
  risk.

Lockfiles written by an older version cannot support that distinction. `check` still
works on them and says which part it cannot tell; re-running `install` records
what it needs.

Flags: `--tools=<list>`, `--global`, `--dry-run`, `--verbose`, `--help`,
`--version`.

---

## If it doesn't seem to fire

The commonest report is that the skill is installed and the agent built
something anyway, without Carbon. Usually it did load and you cannot tell,
because a skill leaves no visible trace. Two things are worth checking.

**Another skill got there first.** Observed with
[superpowers](https://github.com/obra/superpowers): the prompt *"I need to build
an internal ops console for our SRE team"* invoked `superpowers:brainstorming`
and this skill never loaded at all. That is superpowers' documented
*process skills come first* priority working exactly as designed — brainstorming
claims "let's build X" prompts before implementation skills get a look.

Nothing in this package can override another skill's priority rules, and it
should not try. What helps:

- **Name the system.** "Build it with Carbon" reliably pulls the skill in. So
  does a repo that already depends on `@carbon/react` — stack detection runs
  from `package.json`.
- **Invoke it directly** — `/dopod-design`, or ask for it by name.
- **Let the process skill finish.** Brainstorming ends by writing a plan; the
  skill loads normally on the implementation turn that follows.

**Claude Code and Codex have a fallback for this.** Both get an always-on block
in `AGENTS.md` alongside the skill, carrying the rules that matter most — theme
tokens over raw hex, the spacing scale, component APIs. It is deliberately short
and always in context, so even a turn where no skill loads gets the rules that
prevent Carbon-flavored output. Cursor, Copilot, Windsurf, Gemini and Cline get
their own equivalent through their native always-on file.

That fallback is not a full substitute for the references, and it is the reason
it exists: measured against prompts where the skill reliably failed to trigger,
adding it took 0/3 to 3/3 producing Carbon with zero raw hex.

**Another design-system skill is installed.** If you have a second skill that
claims frontend work broadly — many describe themselves as "consult before
writing any frontend code" — the two compete, and which one wins is not
predictable from either description. Check what is installed before concluding
this one is broken. Emitted filenames here are all prefixed `dopod-design-`
specifically so both can coexist on disk without overwriting each other.

---

## What's covered

The skill routes to fifteen reference files, loaded only when a task needs them:

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
| `figma.md` | Carbon's Figma variables and DTCG tokens, mapping a design value to a code token, off-scale values, and automating the check |
| `example.md` | A complete annotated build — UI Shell, 2x Grid, metric tiles, `DataTable`, validated form, with the reasoning attached |
| `ibm-products.md` | `@carbon/ibm-products`: Tearsheet, Datagrid, PageHeader, create flows, and the canary flag system |
| `intake.md` | What to ask before generating UI — stack, theme, density, navigation, charts, icons, overlays |
| `motion.md` | Carbon's named motion surfaces, plus expand/collapse, nav, overlay and chart animation |
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

**This is a Carbon-derived house system, not Carbon itself.** Nearly all of it
is Carbon as IBM documents it; guidance that goes beyond what Carbon specifies —
chiefly motion implementation — is labelled `[house]` at the point of use.

Carbon is developed by IBM and licensed under Apache-2.0. This is a **community
project**: it packages publicly documented guidance from
[carbondesignsystem.com](https://carbondesignsystem.com) and the
[carbon-design-system/carbon](https://github.com/carbon-design-system/carbon)
repository. It is not affiliated with or endorsed by IBM. "IBM", "Carbon", and
"IBM Plex" are trademarks of International Business Machines Corporation.

Where this package and the Carbon repository disagree, the repository is right.

# Auditing and migrating to Carbon

Two jobs live here: scoring how Carbon-compliant an existing frontend is, and
moving a codebase toward Carbon. Both start the same way — by measuring before
changing anything, so the work can be prioritized instead of guessed at.

**Contents**

1. [Gap analysis](#1-gap-analysis)
2. [Detection commands](#2-detection-commands)
3. [Scoring rubric](#3-scoring-rubric)
4. [Report format](#4-report-format)
5. [Prioritizing the work](#5-prioritizing-the-work)
6. [Migration: v10 → v11](#6-migration-v10--v11)
7. [Migration: non-Carbon → Carbon](#7-migration-non-carbon--carbon)
8. [The `@carbon/upgrade` CLI](#8-the-carbonupgrade-cli)

---

## 1. Gap analysis

Run this when the user says "audit our UI", "how far off Carbon are we", "bring
this in line with our design system", or asks for a migration plan.

**Do not start editing.** An audit's value is the prioritized picture. Measure
first, report, then let the user choose what to fix.

**Report what you find, not only what you were asked about.** Reading a codebase
closely surfaces things that are not design-system issues — a handler calling an
undefined function, a destructive control unreachable by keyboard, a missing
entry point, dependencies installed and never imported. Those belong in the
report as first-class findings, rated on their own consequence.

Two phrasings to avoid, because both bury a real defect:

- *"Not a Carbon issue, but worth knowing"* — if it breaks for a user, it is
  worth more than knowing.
- Filing it as **Low** because it falls outside the design-system rubric.

The person commissioning a Carbon audit still owns the product. Telling them
their Rollback button throws on click is more valuable than anything else you
will find that day, and they cannot act on what you footnote.

Work through six dimensions:

1. **Foundation** — is Carbon installed at all, which version, is the SCSS entry
   point wired, is IBM Plex loading?
2. **Tokens** — how much raw color / raw spacing / raw font-size is in the
   codebase versus token usage?
3. **Components** — how much is hand-built that Carbon already ships?
4. **Layout** — is the 2x Grid used, or is it ad-hoc flexbox?
5. **Theming** — does the app theme correctly, including runtime switching?
6. **Accessibility** — the checklist in `accessibility.md`.

---

## 2. Detection commands

Cheap, high-signal greps. Run them, count, and report counts — not vibes.

**What's installed**

```bash
grep -E '"(@carbon/[a-z-]+|carbon-components[a-z-]*)"' package.json
grep -E '"(tailwindcss|@mui/material|bootstrap|antd|@chakra-ui/react)"' package.json
```

Presence of `carbon-components` or `carbon-components-react` → v10.
Presence of both Carbon and a utility framework → flag it (see `react.md` §7).

**Raw colors that should be tokens**

```bash
grep -rInE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/ --include='*.{css,scss,ts,tsx,js,jsx}' | wc -l
grep -rInE '#[0-9a-fA-F]{3,8}\b' src/ --include='*.{css,scss}' | head -40
```

**Raw pixel spacing**

```bash
grep -rInE '(margin|padding|gap|top|right|bottom|left)[^:]*:\s*-?[0-9]+px' src/ --include='*.{css,scss}' | wc -l
```

**Raw font sizing**

```bash
grep -rInE 'font-size\s*:|font-family\s*:|line-height\s*:\s*[0-9]' src/ --include='*.{css,scss}' | wc -l
```

**Token usage (the positive signal)**

```bash
grep -rInE '\$(spacing|layer|text|border|field|support|link|icon|focus)-' src/ | wc -l
grep -rInE 'var\(--cds-' src/ | wc -l
grep -rInE '@include type-style\(' src/ | wc -l
```

**Carbon component adoption vs. hand-rolled**

```bash
grep -rIn "from '@carbon/react'" src/ | wc -l
grep -rInE '<(button|input|select|textarea|table|dialog)\b' src/ --include='*.{tsx,jsx}' | wc -l
```

**Grid usage**

```bash
grep -rInE '<(Grid|Column)\b|cds--css-grid' src/ | wc -l
grep -rInE 'display:\s*(flex|grid)' src/ --include='*.{css,scss}' | wc -l
```

**Internal-class overrides and escape hatches**

```bash
grep -rInE '\.cds--' src/ --include='*.{css,scss}' | wc -l
grep -rIn '!important' src/ --include='*.{css,scss}' | wc -l
```

**Accessibility red flags**

```bash
grep -rInE 'outline\s*:\s*(none|0)' src/ | wc -l
grep -rInE 'tabIndex=\{?["\x27]?[1-9]' src/ | wc -l
grep -rInE '<(div|span)[^>]*onClick' src/ --include='*.{tsx,jsx}' | wc -l
grep -rInE '<img(?![^>]*alt=)' src/ --include='*.{tsx,jsx}' | wc -l
```

**Deprecated Carbon API**

```bash
grep -rInE "from 'carbon-components-react'|from 'carbon-components'" src/ | wc -l
grep -rInE '\blight\s*=|\bslug=|<Slug\b' src/ --include='*.{tsx,jsx}' | wc -l
grep -rInE '\$(ui-0[1-5]|text-0[1-5]|interactive-0[1-4]|hover-ui|active-ui|field-0[1-3])\b' src/ | wc -l
```

Adjust paths and extensions to the repo. If `src/` doesn't exist, find the real
source root first.

---

## 3. Scoring rubric

Score each dimension 0–5. Anchor the numbers in the counts you measured so the
score is defensible.

| Score | Meaning |
|---|---|
| 0 | Absent. Carbon not used in this dimension at all. |
| 1 | Token gestures only; overwhelmingly non-Carbon. |
| 2 | Carbon present but inconsistently; raw values common. |
| 3 | Carbon is the default; meaningful exceptions remain. |
| 4 | Consistent Carbon; isolated, documented deviations. |
| 5 | Fully compliant; deviations are intentional and justified. |

Per-dimension anchors:

- **Foundation** — 5: v11 installed, granular SCSS imports, Plex loading, no v10
  packages. 2: Carbon installed but styles half-wired or fonts missing. 0: not
  installed.
- **Tokens** — anchor on the ratio of raw color/px hits to token hits. Under 5%
  raw → 5. Over 50% raw → 1.
- **Components** — ratio of Carbon imports to raw interactive elements. Note
  specifically anything hand-built that Carbon ships (tables, dropdowns,
  modals) — each is a finding on its own.
- **Layout** — 5: `Grid`/`Column` throughout with correct breakpoint props.
  2: grid in some places, ad-hoc flex elsewhere. 0: no grid.
- **Theming** — 5: `GlobalTheme` + custom properties, runtime switch works,
  `<Layer>` used for nesting. 2: single hard-coded theme. 0: no theming.
- **Accessibility** — run the `accessibility.md` checklist; score on how many
  items pass.

Report an overall score as the **mean, not the max**, and say which dimension
drags it down.

---

## 4. Report format

Use this structure. It puts the decision in front of the user before the detail.

```markdown
# Carbon gap analysis — <project>

## Summary
Overall: X.X / 5. <One or two sentences: the single biggest gap and the
single highest-leverage fix.>

## Scores
| Dimension | Score | Evidence |
|---|---|---|
| Foundation | X/5 | <counts / package versions> |
| Tokens | X/5 | <N raw colors, M raw px, K token uses> |
| Components | X/5 | <N Carbon imports vs M raw elements> |
| Layout | X/5 | <grid usage> |
| Theming | X/5 | <what exists> |
| Accessibility | X/5 | <failed checklist items> |

## Correctness and accessibility
<Defects that are not design-system issues but were found on the way. Omit the
section only if there genuinely are none — say so explicitly.>

### <Severity>: <Finding>
**Where:** `path/to/file.tsx:42`
**Why it matters:** <consequence to a user, in plain terms>
**Fix:** <concrete change>
**Effort:** S / M / L

## Design system findings
### <Severity>: <Finding>
**Where:** `path/to/file.tsx:42` (+N more)
**Why it matters:** <user-visible or maintenance consequence>
**Fix:** <concrete change>
**Effort:** S / M / L

## Recommended sequence
1. …
2. …

## Out of scope / accepted deviations
- …
```

**Rate severity by consequence to the user, never by whether it is a Carbon
issue.** This is the easiest thing to get wrong: a Carbon-shaped rubric quietly
ranks a real defect below a cosmetic one because the defect is "off-topic".

| Severity | Means |
|---|---|
| **Critical** | Breaks for someone: a crash, a destructive action that silently fails, a control no keyboard can reach, an app that cannot be shipped to an accessibility review |
| **High** | Systematic and expensive to unpick later — token violations throughout, hand-rolled components with a11y implications, deprecated packages |
| **Medium** | Inconsistency, grid gaps, drift between screens |
| **Low** | Polish |

A production Rollback button that throws `ReferenceError` on click is
**Critical**, not Low, and not "worth knowing". It does not become less broken
because the audit was commissioned about a design system.

Cite real file paths and line numbers. An audit without locations is an opinion.

---

## 5. Prioritizing the work

Order by leverage, not by score:

1. **Foundation first.** Migrating tokens is wasted work if the SCSS entry point
   is wrong or the font never loads. Fix install, imports, and Plex.
2. **Deprecated packages next.** `carbon-components-react` blocks everything
   downstream and has a codemod.
3. **Tokens before components.** Token replacement is mechanical, low-risk, and
   immediately makes theming work. It also shrinks the diff of later component
   swaps.
4. **Highest-traffic components next.** Buttons, inputs, and tables — the ones
   on every screen. One `DataTable` swap usually removes more custom code than
   ten small ones.
5. **Layout after components.** Retrofitting the grid is easier once the
   contents are Carbon components with predictable sizing.
6. **Accessibility throughout, not at the end.** Most of it comes free with
   step 4; audit what remains.

Sequence the work so the app is shippable after every step. A migration that
requires a big-bang cutover will not finish.

---

## 6. Migration: v10 → v11

**1. Swap the packages.**

```bash
npm uninstall carbon-components carbon-components-react @carbon/icons-react@10
npm install @carbon/react sass
```

**2. Run the codemods** (see §8) for the mechanical parts.

**3. Rename tokens.** The table in `tokens.md` §12 covers the high-traffic
renames. The `$carbon--` namespace prefix is gone: `$carbon--spacing-05` →
`$spacing-05`.

**4. Handle the `light` prop.** v11 removed it. `<TextInput light />` becomes a
`<Layer>` wrapper — that is what `refactor-light-to-layer` does.

**5. `g80` is gone.** Map it to `g90`, the nearest v11 theme.

**6. Grid.** CSS Grid is the v11 default. Either migrate `FlexGrid`/`Row` to
`Grid`/`Column`, or set `$use-flexbox-grid: true` to keep the old grid working
while you migrate incrementally. The second option is the right one for a large
codebase — do not try to convert every layout in one pass.

**7. Import paths.** `import { Button } from 'carbon-components-react'` becomes
`import { Button } from '@carbon/react'`. SCSS moves from
`carbon-components/scss/globals/scss/…` to `@carbon/react/scss/…`.

**8. `Slug` → `AILabel`, `slug` prop → `decorator` prop.** Codemod:
`slug-prop-to-decorator-prop`.

**9. Verify visually per route.** Token renames compile fine when wrong — a
missing SCSS variable in some setups resolves to empty rather than erroring.
Walk the app in all four themes.

---

## 7. Migration: non-Carbon → Carbon

Coming from Tailwind, MUI, Bootstrap, Chakra, or bespoke CSS.

**Do it in slices, not all at once.** Pick one route or one feature area,
convert it fully, and use it as the reference implementation. A half-converted
component is worse than either end state.

**Order:**

1. **Install and wire Carbon**, load Plex, set up `GlobalTheme`. Nothing visible
   changes yet.
2. **Map the old palette to Carbon tokens** by role — not by nearest color.
   "Our gray-100 is Carbon's `$text-primary`", not "our gray-100 is `#161616`".
   Write the mapping down; it is the spec for the token pass.
3. **Replace primitives**: buttons, inputs, links, tags. Highest frequency,
   lowest risk, immediately visible.
4. **Replace composites**: modals, dropdowns, tables. This is where you delete
   the most custom code, and where accessibility improves most.
5. **Convert layout to the 2x Grid.** Do this per route.
6. **Remove the old framework** once nothing imports it. Until then, keep a hard
   boundary — the old framework must not style anything inside a Carbon
   component.

**Tailwind specifically.** Do not run Tailwind's preflight alongside Carbon's
reset; pick one (Carbon's). Disable Tailwind's color and spacing scales, or
overwrite them with Carbon's values, so the two systems cannot disagree. And
accept that Tailwind's static colors will not participate in theme switching —
anything that must theme has to move to Carbon tokens.

**Expect the visual language to change.** Carbon is square, dense, and blue.
If stakeholders expect rounded corners and their brand color, surface that
early: `border-radius` and brand color are custom-theme decisions
(`react.md` §4), and they should be made deliberately rather than discovered in
review.

---

## 8. The `@carbon/upgrade` CLI

Carbon ships codemods. Use them before hand-editing — they are far more
thorough than a find-and-replace.

```bash
npx @carbon/upgrade                        # interactive upgrade
npx @carbon/upgrade migrate list           # see available migrations
npx @carbon/upgrade migrate <name> <paths> # dry run (prints changes)
npx @carbon/upgrade migrate <name> <paths> --write   # apply
```

Available migrations include:

- `refactor-light-to-layer` — the v11 `light` prop removal
- `slug-prop-to-decorator-prop` — `slug` → `decorator`
- `featureflag-deprecate-flags-prop`
- `enable-v12-release` and the `enable-v12-*` family — opt into v12 behavior
  ahead of the major (tile default icons, overflow menu, tile radio icons,
  structured list visible icons)

Flags: `-w, --write` to apply, `-v, --verbose` for logs, `--force` to bypass
safety checks, `--decoratorsBeforeExport` for that parser variation.

**Always run without `--write` first** and read the diff. Commit before
applying. Codemods handle the mechanical 80%; the remaining 20% is where the
interesting bugs are, and you want a clean diff to find them in.

---
name: dopod-design
description: "Use whenever you write or restyle product UI in a codebase whose house style is IBM Carbon — @carbon/react, @carbon/web-components, @carbon/styles, @carbon/charts, or the Angular/Vue/Svelte ports. The trigger is often not the word \"Carbon\". Named path: Carbon, IBM design, cds-* elements, Carbon tokens, IBM Plex, 2x Grid, g10/g90/g100 themes, Carbon for AI. Assumed path: the user says \"our design system\", \"the company standard\", \"our IBM-styled app\", or \"match the rest of our product\", or the repo already depends on Carbon — they have already chosen Carbon and will not say it again, so any UI ask that follows is a Carbon ask however plain it sounds: a dashboard of tiles, side nav, a sortable table, a modal, a form, dark mode, a chart, or an AI-generated block needing a label and its sources. Also use to audit an existing frontend against Carbon or to plan a migration to it. Load it before the first line of Carbon markup or SCSS — correctness lives in tokens and component APIs, not in eyeballed styling."
license: Apache-2.0
---

# Carbon Design System

Carbon is IBM's open-source design system. Its defining property: **almost every
visual decision is already made and encoded as a token.** A Carbon interface
looks right not because someone eyeballed it, but because it never spends a raw
hex code, a raw pixel, or a hand-rolled font stack.

That is also where agents fail at Carbon. It is easy to import `Button` from
`@carbon/react` and then wrap it in Tailwind classes and `#0f62fe`, producing
something that *renders* but breaks the moment the theme flips to `g100`. The
whole point of this skill is to keep you on the token layer.

---

## Step 1 — Orient before you write

Carbon has several implementations at very different maturity levels, and they
are **not** interchangeable. Determine which one you are in before writing code.

Read the project's `package.json`:

| You find | You are on | Read |
|---|---|---|
| `@carbon/react` | Carbon v11, React — the flagship | `references/react.md` |
| `@carbon/web-components` | Carbon v11, framework-agnostic | `references/web-components.md` |
| `carbon-components-angular` | Carbon v11, Angular | `references/other-frameworks.md` |
| `@carbon/vue` or `carbon-components-vue` | **Carbon v10** — see warning below | `references/other-frameworks.md` |
| `carbon-components-svelte` | **Carbon v10 styling** — see warning below | `references/other-frameworks.md` |
| `carbon-components` / `carbon-components-react` | **Carbon v10, deprecated** | `references/audit.md` (migrate) |
| `@carbon/styles` alone, no component lib | v11 tokens, custom markup | `references/tokens.md` |
| nothing Carbon yet | greenfield — default to `@carbon/react` | `references/react.md` |

**The version trap.** Carbon v10 and v11 renamed most tokens. `$ui-01` (v10) is
`$layer-01` (v11); `$text-01` is `$text-primary`; `$interactive-01` is
`$button-primary`. v10 also had a `g80` theme that v11 deleted. If you write v11
token names into a v10 project they silently resolve to nothing. Check which
side of the line you are on and stay there — or run the migration in
`references/audit.md` deliberately.

---

## Step 2 — Route to the reference you need

Load only what the task calls for. Each file is self-contained.

| Task | Reference |
|---|---|
| Any color, spacing, type, motion, radius, or size decision | `references/tokens.md` |
| Page structure, 2x Grid, breakpoints, layering, UI Shell | `references/layout.md` |
| Choosing/using a component, its props, sizes, states | `references/components.md` |
| React setup, SCSS config, theming, forms, DataTable | `references/react.md` |
| Web Components (`cds-*`) setup and usage | `references/web-components.md` |
| Angular, Vue, or Svelte | `references/other-frameworks.md` |
| Charts, graphs, dashboards, any data visualization | `references/charts.md` |
| AI surfaces: AI label, chat, generated content, `ai-*` tokens | `references/ai.md` |
| Contrast, focus, keyboard, screen readers, labelling | `references/accessibility.md` |
| Auditing an existing UI, gap analysis, v10→v11 migration | `references/audit.md` |

---

<!-- slim:start -->

## Carbon rules that matter most

These are the ones that separate real Carbon from a Carbon-flavored
approximation. Everything here has a "why" — Carbon's constraints exist so that
themes, densities, and accessibility all keep working when someone changes one
variable.

### 1. Never write a raw color. Use a theme token.

Carbon ships four themes — `white`, `g10`, `g90`, `g100` — and every component
reads its color from the *same* token names in all four. A hex code is a hole in
that system: it looks fine in `white` and becomes unreadable in `g100`.

```scss
// wrong — breaks on dark themes, breaks on rebrand
.card { background: #f4f4f4; color: #161616; border: 1px solid #e0e0e0; }

// right — resolves correctly in all four themes
@use '@carbon/react/scss/theme' as *;
.card { background: $layer-01; color: $text-primary; border: 1px solid $border-subtle-01; }
```

Reach for `$background`, `$layer-01/02/03`, `$field-01`, `$text-primary`,
`$text-secondary`, `$border-subtle-01`, `$support-error`, `$link-primary`,
`$focus`. Full inventory with usage rules: `references/tokens.md`.

The one legitimate exception is data visualization categorical series, which use
`@carbon/colors` palettes rather than theme tokens — see `references/charts.md`.

### 2. Never write a raw pixel value for spacing. Use the spacing scale.

Carbon's spacing scale is built on an 8px mini-unit with deliberate fine steps
at the small end. `$spacing-01` … `$spacing-13` map to 2, 4, 8, 12, 16, 24, 32,
40, 48, 64, 80, 96, 160 px. Using `padding: 14px` puts your element permanently
out of rhythm with every Carbon component next to it.

```scss
padding: $spacing-05 $spacing-06;   // 16px 24px
gap: $spacing-03;                   // 8px
```

If a value you want is not on the scale, the scale is right and the value is
wrong — pick the neighboring step.

### 3. Type is a token too, and it carries line-height and letter-spacing.

Setting only `font-size` throws away the tuned `line-height` and
`letter-spacing` that make Plex readable at that size. Always apply the whole
style.

```scss
@use '@carbon/react/scss/type' as *;
.heading { @include type-style('heading-03'); }
.body    { @include type-style('body-01'); }
```

The v11 families are `body-01/02`, `body-compact-01/02` (tight, for dense UI
like table cells), `heading-01`…`heading-07`, `heading-compact-01/02`,
`label-01/02`, `helper-text-01/02`, `caption-01/02`, `legal-01/02`,
`code-01/02`, and the fluid `fluid-heading-*` / `fluid-display-*` set for
marketing-scale type. Details: `references/tokens.md`.

The typeface is **IBM Plex** (Sans, Mono, Serif) — it is not optional, it is
part of the brand. Carbon does not bundle the font files; load them from
`@ibm/plex` or a CDN, or Carbon falls back to system sans and the whole thing
looks wrong.

### 4. Use the component, don't rebuild it.

Carbon components carry keyboard handling, ARIA wiring, focus management, and
theme awareness that take real effort to reproduce. A `<div onClick>` styled to
look like a button is not a button. Before building anything custom, check
`references/components.md` for what already exists — the inventory is large
(150+ components) and includes things people commonly hand-roll: `DataTable`,
`ComboBox`, `MultiSelect`, `Toggletip`, `ContainedList`, `ProgressIndicator`,
`InlineLoading`, `FileUploader`, `TreeView`, `Pagination`.

When something genuinely doesn't exist, compose it from Carbon primitives
(`Layer`, `Stack`, `Grid`, `Tile`, `IconButton`) and Carbon tokens rather than
starting from scratch.

### 5. Layering is structural, not decorative.

Carbon's `$layer-01/02/03` tokens express *depth of nesting*, not "light gray /
medium gray". The `<Layer>` component (React) or `cds-layer` (WC) increments the
layer context so that nested surfaces automatically pick the next token — which
is what keeps a modal-inside-a-tile-inside-a-page readable in every theme.

```jsx
<Layer>                 {/* contents now resolve to layer-02 */}
  <Tile>…</Tile>
</Layer>
```

Do not hand-pick `$layer-02` because it "looks better". Wrap in `<Layer>` and
let the context decide. See `references/layout.md`.

### 6. Sizes come from a fixed ladder.

Interactive elements are `xs` (24px), `sm` (32px), `md` (40px, the default),
`lg` (48px), `xl` (64px), `2xl` (80px). Carbon components take a `size` prop
that snaps to this ladder. Keep sizes consistent *within* a form or toolbar —
mixing `sm` inputs with `lg` buttons is the most common visual tell of a
non-Carbon build.

### 7. Motion has two personalities; pick the right one.

`productive` easing is for UI that must feel instant and stay out of the way.
`expressive` is for moments that deserve attention. Durations are fixed:
`fast-01` 70ms, `fast-02` 110ms, `moderate-01` 150ms, `moderate-02` 240ms,
`slow-01` 400ms, `slow-02` 700ms. Use the `motion()` helper rather than typing
cubic-beziers.

```scss
@use '@carbon/react/scss/motion' as *;
transition: background-color $duration-fast-02 motion(standard, productive);
```

### 8. Accessibility is a hard requirement, not a polish pass.

Carbon targets WCAG 2.1 AA. Text needs 4.5:1, large text and UI boundaries need
3:1 — the theme tokens already satisfy this *if you use them in their intended
role*. Never remove the focus indicator; `$focus` is a token for a reason. Every
icon-only control needs an accessible label. Full checklist:
`references/accessibility.md`.

<!-- slim:end -->

---

## Workflows

### Building new UI

1. Confirm the implementation and Carbon version (Step 1 above).
2. Read `references/layout.md` and lay the page out on the 2x Grid first —
   structure before styling. Carbon layouts fail when the grid is retrofitted.
3. Pick components from `references/components.md`. Prefer an existing component
   over composition, and composition over custom.
4. Apply tokens from `references/tokens.md`. If you catch yourself typing a hex
   code or a pixel value, stop and find the token.
5. Run the accessibility checklist in `references/accessibility.md`.

### Reviewing or auditing an existing frontend

Follow the graded gap analysis in `references/audit.md`. It scores a codebase
across token usage, component usage, grid adherence, typography, theming, and
accessibility, and produces a prioritized remediation list. Use it when the user
says "bring this in line with Carbon", "audit our UI", or "how far off are we".

### Migrating

`references/audit.md` covers both directions people actually need: v10 → v11
(the token rename plus `carbon-components-react` → `@carbon/react`), and
"non-Carbon → Carbon" (Tailwind/MUI/Bootstrap → Carbon), including what to
migrate first for the largest visible win.

---

## Common failure modes

These are the mistakes that show up over and over. Recognizing them is most of
the job.

**Mixing a utility CSS framework into Carbon.** Tailwind's reset and Carbon's
reset fight; Tailwind's spacing scale and Carbon's spacing scale disagree; and
theme switching stops working because Tailwind colors are static. If a project
has both, put a boundary between them and never style a Carbon component with
utility classes.

**Importing from `carbon-components-react`.** That package is deprecated. In
v11 everything is in `@carbon/react` — components, styles, and icons — as a
single consolidated dependency.

**Styling by overriding `.cds--*` classes.** The `cds--` prefix is Carbon's
internal API and changes between minors. Use the component's props first, then
`className` on the component's own element, then a wrapping element. Reaching
into internals guarantees breakage on upgrade.

**Forgetting the SCSS entry point.** `@carbon/react` styles must be pulled in
with `@use '@carbon/react'` (or the granular `@carbon/react/scss/*` modules).
Importing only the JS gives you unstyled components.

**Setting the theme with a CSS class only.** Carbon's React tree needs the
`<Theme>` component (or `GlobalTheme`) so components that read theme in JS —
notifications, charts, tooltips — stay in sync with the CSS.

**Treating `unstable__` and `unstable_` exports as stable.** They are prefixed
that way because their API can change in a minor release. Fine to use
deliberately; not fine to use without noting it.

**Reproducing Carbon by hand.** If your output contains hand-written CSS for
something Carbon ships — a modal, a data table, a dropdown — you have almost
certainly gotten a11y or theming wrong. Go back to the component.

---

## Package versions to install

Current as of the latest verification against the Carbon repository:

```
@carbon/react           ^1.114.0   React (includes styles + icons)
@carbon/styles          ^1.113.0   SCSS/tokens only, no components
@carbon/icons-react     ^11.86.0   icons for React
@carbon/web-components  ^2.61.0    framework-agnostic custom elements
@carbon/charts          ^1.27.18   data visualization (+ @carbon/charts-react)
@carbon/colors          ^11.x      raw palettes, mainly for dataviz
carbon-components-angular ^5.72.2  Angular (v11-aligned)
```

`@carbon/react` requires `sass ^1.33.0` as a peer and supports React 16.8+
through 19. Prefer pinning to a caret range on a recent minor: Carbon ships
minors frequently and they are additive.

---

## Attribution

Carbon is developed by IBM and licensed under Apache-2.0. This skill packages
publicly documented guidance from `carbondesignsystem.com` and the
`carbon-design-system/carbon` repository. It is a community aid and is not an
official IBM product. "Carbon" and "IBM" are trademarks of IBM. When in doubt
about a detail, the repository is the source of truth — the documentation site
occasionally lags it.

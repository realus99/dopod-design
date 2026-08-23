# Carbon tokens — color, spacing, type, motion, size

Every visual decision in Carbon resolves to a token. This file is the inventory
and, more importantly, the rules for *choosing* between tokens that look similar.

**Contents**

1. [How to import tokens](#1-how-to-import-tokens)
2. [Themes](#2-themes)
3. [Color tokens by role](#3-color-tokens-by-role) (including component tokens)
4. [Choosing between confusable color tokens](#4-choosing-between-confusable-color-tokens)
5. [The raw color palettes](#5-the-raw-color-palettes)
6. [Spacing](#6-spacing)
7. [Typography](#7-typography)
8. [Sizes and containers](#8-sizes-and-containers)
9. [Border radius](#9-border-radius)
10. [Motion](#10-motion)
11. [Breakpoints](#11-breakpoints)
12. [v10 → v11 token renames](#12-v10--v11-token-renames)

---

## 1. How to import tokens

**SCSS (preferred).** Import the module you need rather than the whole of Carbon
— it keeps compile times sane and makes the dependency explicit.

```scss
@use '@carbon/react/scss/theme' as *;    // color tokens: $layer-01, $text-primary…
@use '@carbon/react/scss/spacing' as *;  // $spacing-01 … $spacing-13
@use '@carbon/react/scss/type' as *;     // type-style(), $body-01, font-family()
@use '@carbon/react/scss/motion' as *;   // motion(), $duration-fast-01…
@use '@carbon/react/scss/breakpoint' as *; // breakpoint(), breakpoint-up/down/between
@use '@carbon/react/scss/colors' as *;   // raw palette: $blue-60, $gray-10…
```

If the project uses `@carbon/styles` without React, swap the prefix:
`@use '@carbon/styles/scss/theme' as *;`.

**CSS custom properties.** Carbon emits every theme token as a custom property
under the `--cds-` prefix, which is what you want in CSS-in-JS, inline styles,
or a non-SCSS pipeline:

```css
.card { background: var(--cds-layer-01); color: var(--cds-text-primary); }
```

The custom properties are what make runtime theme switching work — a token
consumed as `var(--cds-…)` updates when the `<Theme>` boundary changes. A token
consumed as a compiled SCSS value does not. Use custom properties for anything
that must react to a theme change at runtime.

**JavaScript.** `import { g100 } from '@carbon/themes'` gives the resolved token
map — useful for feeding charts or a canvas renderer, rarely needed otherwise.

---

## 2. Themes

Carbon v11 ships exactly four themes:

| Theme | Character | `$background` |
|---|---|---|
| `white` | Lightest. Default for most product UI. | White |
| `g10` | Light with a gray-10 ground. Slightly softer; common for dense apps. | Gray 10 |
| `g90` | Dark. | Gray 90 |
| `g100` | Darkest. Common for dashboards and monitoring. | Gray 100 |

`g80` existed in v10 and was **removed in v11**. If you see `g80` in a codebase,
it is v10.

Themes are applied with the `<Theme>` component in React, `cds-theme` /
a `[data-carbon-theme]` attribute in Web Components, or the `theme.$theme` SCSS
mixin for a static build. See `react.md` / `web-components.md`.

An inverse theme region is idiomatic Carbon: put a `g100` `<Theme>` around a
sidebar inside a `white` page and every token flips correctly with zero extra
CSS. That is the payoff for never writing a hex code.

---

## 3. Color tokens by role

Tokens are grouped by *what the color is for*. Pick by role first, then by
number.

### Background — the page ground

`$background` · `$background-hover` · `$background-active` · `$background-selected`
· `$background-selected-hover` · `$background-brand` · `$background-inverse`
· `$background-inverse-hover`

`$background` is the page itself. `$background-inverse` is for elements that
deliberately contrast the page — tooltips, for instance.

### Layer — nested surfaces

`$layer-01` `$layer-02` `$layer-03` and for each: `-hover-`, `-active-`,
`-selected-`, `-selected-hover-`, `-background-`, `-accent-`, `-accent-hover-`,
`-accent-active-` variants (e.g. `$layer-hover-01`, `$layer-accent-02`).

Plus `$layer-selected-inverse`, `$layer-selected-disabled`.

**Do not choose the number by eye.** The number is the nesting depth. Use the
contextual token `$layer` inside a `<Layer>` boundary and Carbon picks the right
one. See `layout.md` §layering.

`$layer-accent-*` is for a surface that needs to separate from its own layer —
a sub-header inside a tile, a selected row.

### Field — form input backgrounds

`$field-01` `$field-02` `$field-03` and `$field-hover-01/02/03`, plus the
contextual `$field` / `$field-hover`.

Inputs get `$field-*`, not `$layer-*`. They read as recessed, not raised, and
the tokens differ per theme to preserve that.

### Border

`$border-subtle-00/01/02/03` · `$border-subtle-selected-01/02/03`
· `$border-strong-01/02/03` · `$border-tile-01/02/03` · `$border-inverse`
· `$border-interactive` · `$border-disabled`

- **subtle** — dividers and container edges. The default.
- **strong** — input outlines and anything that must meet 3:1 as a UI boundary.
- **tile** — specifically for `Tile` borders, which have their own contrast needs.
- **interactive** — the blue outline on focused/active form elements.

Contextual: `$border-subtle`, `$border-subtle-selected`, `$border-strong`,
`$border-tile`.

### Text

`$text-primary` · `$text-secondary` · `$text-placeholder` · `$text-helper`
· `$text-error` · `$text-inverse` · `$text-on-color` · `$text-on-color-disabled`
· `$text-disabled`

`$text-on-color` is for text sitting on a *colored* fill (a primary button, a
tag) — it is not the same as `$text-inverse`, which is for text on an inverse
*surface*. Getting these backwards is a very common bug that only shows on one
theme.

### Link

`$link-primary` · `$link-primary-hover` · `$link-secondary` · `$link-visited`
· `$link-inverse` · `$link-inverse-hover` · `$link-inverse-active`
· `$link-inverse-visited`

`$link-secondary` is for links inside body copy where the primary blue would be
too loud against `$text-primary`.

### Icon

`$icon-primary` · `$icon-secondary` · `$icon-inverse` · `$icon-on-color`
· `$icon-on-color-disabled` · `$icon-disabled` · `$icon-interactive`

Icons have their own tokens because an icon at 16px needs more weight than text
at the same size to read as equally present.

### Support — status and semantics

`$support-error` · `$support-success` · `$support-warning` · `$support-info`
and the `-inverse` variant of each, plus `$support-caution-minor`,
`$support-caution-major`, `$support-caution-undefined`.

Use the `-inverse` variants when the status sits on an inverse surface (an
inline notification inside a `g100` region while the page is `white`).

### Interaction

`$interactive` (the brand blue for interactive affordances) · `$highlight`
· `$focus` · `$focus-inset` · `$focus-inverse` · `$overlay` · `$toggle-off`
· `$shadow`

`$focus-inset` is the inner ring drawn *inside* the outer `$focus` ring on
elements whose own fill would swallow a single ring — that two-ring treatment is
how Carbon keeps focus visible on both light and dark buttons.

### Skeleton

`$skeleton-background` · `$skeleton-element`

### AI and chat

`ai-*` and `chat-*` tokens exist for AI-attributed surfaces (aura gradients,
borders, popovers, chat bubbles and avatars). Covered in `ai.md` — do not use
them for non-AI UI, because their whole job is to signal AI provenance.

### Syntax highlighting

An extensive `$syntax-*` set (comment, keyword, string, number, tag, type,
operator, punctuation, inserted, deleted, heading-1…6, …). Use these for code
rendering instead of shipping a third-party highlighter theme, so code blocks
follow the app's theme.

### Component tokens

A handful of components own their own token namespace, because their colors do
not derive cleanly from the general roles. You need these when authoring a
custom theme or building something that must sit visually flush with a Carbon
component.

**Button** — `$button-primary` · `$button-primary-hover` · `$button-primary-active`
· `$button-secondary` (+ `-hover`, `-active`) · `$button-tertiary` (+ `-hover`,
`-active`) · `$button-danger-primary` · `$button-danger-secondary`
· `$button-danger-hover` · `$button-danger-active` · `$button-disabled`
· `$button-separator`

**Tag** — for each of blue, cool-gray, cyan, gray, green, magenta, purple, red,
teal, warm-gray: `$tag-background-<color>`, `$tag-color-<color>`,
`$tag-border-<color>`, `$tag-hover-<color>`.

**Notification** — `$notification-background-error` / `-info` / `-success` /
`-warning` · `$notification-action-hover`
· `$notification-action-tertiary-inverse` (+ `-hover`, `-active`, `-text`,
`-text-on-color-disabled`)

**Status** — `$status-red` · `$status-orange` · `$status-orange-outline`
· `$status-yellow` · `$status-yellow-outline` · `$status-green` · `$status-blue`
· `$status-purple` · `$status-gray` · `$status-accessibility-background`

**Content switcher** — `$content-switcher-background`
· `$content-switcher-background-hover` · `$content-switcher-selected`

These are the tokens to override when a brand color needs to reach the buttons —
changing `$interactive` alone leaves the primary button blue.

---

## 4. Choosing between confusable color tokens

The most common source of wrong-but-plausible Carbon.

| Situation | Use | Not |
|---|---|---|
| Page ground | `$background` | `$layer-01` |
| A card/tile sitting on the page | `$layer-01` (or `$layer` in context) | `$background` |
| Text inside a primary button | `$text-on-color` | `$text-inverse` |
| Text on a dark sidebar in a light app | `$text-inverse` (inside an inverse `<Theme>`, just `$text-primary`) | `$text-on-color` |
| Divider between list rows | `$border-subtle-01` | `$border-strong-01` |
| Outline of a text input | `$border-strong-01` | `$border-subtle-01` |
| Border of a `Tile` | `$border-tile-01` | `$border-subtle-01` |
| Input background | `$field-01` | `$layer-01` |
| Secondary/caption copy | `$text-secondary` | `$text-primary` at lower opacity |
| Helper text under a field | `$text-helper` | `$text-secondary` |
| Error message text | `$text-error` | `$support-error` |
| The error *icon* or status dot | `$support-error` | `$text-error` |
| Chart series colors | `@carbon/colors` palettes | theme tokens |

Never fake a token with `opacity` or `color-mix()`. Carbon's disabled and
secondary states are separate tokens precisely so they stay legible per theme.

---

## 5. The raw color palettes

Each family runs 10 (lightest) → 100 (darkest). Reach for these **only** for
data visualization, brand illustration, or when authoring a custom theme. In
product UI, a raw palette value is a bug.

```
gray      10 #f4f4f4  20 #e0e0e0  30 #c6c6c6  40 #a8a8a8  50 #8d8d8d
          60 #6f6f6f  70 #525252  80 #393939  90 #262626  100 #161616
coolGray  10 #f2f4f8  20 #dde1e6  30 #c1c7cd  40 #a2a9b0  50 #878d96
          60 #697077  70 #4d5358  80 #343a3f  90 #21272a  100 #121619
warmGray  10 #f7f3f2  20 #e5e0df  30 #cac5c4  40 #ada8a8  50 #8f8b8b
          60 #726e6e  70 #565151  80 #3c3838  90 #272525  100 #171414
blue      10 #edf5ff  20 #d0e2ff  30 #a6c8ff  40 #78a9ff  50 #4589ff
          60 #0f62fe  70 #0043ce  80 #002d9c  90 #001d6c  100 #001141
cyan      10 #e5f6ff  20 #bae6ff  30 #82cfff  40 #33b1ff  50 #1192e8
          60 #0072c3  70 #00539a  80 #003a6d  90 #012749  100 #061727
teal      10 #d9fbfb  20 #9ef0f0  30 #3ddbd9  40 #08bdba  50 #009d9a
          60 #007d79  70 #005d5d  80 #004144  90 #022b30  100 #081a1c
green     10 #defbe6  20 #a7f0ba  30 #6fdc8c  40 #42be65  50 #24a148
          60 #198038  70 #0e6027  80 #044317  90 #022d0d  100 #071908
yellow    10 #fcf4d6  20 #fddc69  30 #f1c21b  40 #d2a106  50 #b28600
          60 #8e6a00  70 #684e00  80 #483700  90 #302400  100 #1c1500
orange    10 #fff2e8  20 #ffd9be  30 #ffb784  40 #ff832b  50 #eb6200
          60 #ba4e00  70 #8a3800  80 #5e2900  90 #3e1a00  100 #231000
red       10 #fff1f1  20 #ffd7d9  30 #ffb3b8  40 #ff8389  50 #fa4d56
          60 #da1e28  70 #a2191f  80 #750e13  90 #520408  100 #2d0709
magenta   10 #fff0f7  20 #ffd6e8  30 #ffafd2  40 #ff7eb6  50 #ee5396
          60 #d02670  70 #9f1853  80 #740937  90 #510224  100 #2a0a18
purple    10 #f6f2ff  20 #e8daff  30 #d4bbff  40 #be95ff  50 #a56eff
          60 #8a3ffc  70 #6929c4  80 #491d8b  90 #31135e  100 #1c0f30
black #000000    white #ffffff
```

`blue-60` (#0f62fe) is IBM's interactive blue — the color people mean when they
say "Carbon blue". In `white`/`g10` it backs `$interactive`, `$link-primary`,
`$focus`, and `$border-interactive`. In dark themes those roles shift to lighter
steps, which is exactly why you use the token and not the hex.

Every step also has a `Hover` variant (`$blue-60-hover`, `$gray-10-hover`, …)
used by the theme tokens' hover states.

---

## 6. Spacing

Built on an 8px **mini-unit**, with sub-unit steps at the small end where UI
density actually needs them.

| Token | rem | px | Typical use |
|---|---|---|---|
| `$spacing-01` | 0.125 | 2 | Hairline offsets, icon nudges |
| `$spacing-02` | 0.25 | 4 | Tight inline gaps, tag padding |
| `$spacing-03` | 0.5 | 8 | Gap between label and field; icon↔text |
| `$spacing-04` | 0.75 | 12 | Compact component padding |
| `$spacing-05` | 1 | 16 | **The workhorse.** Default padding and gutters |
| `$spacing-06` | 1.5 | 24 | Padding inside tiles/cards; group separation |
| `$spacing-07` | 2 | 32 | Section spacing |
| `$spacing-08` | 2.5 | 40 | Section spacing (looser) |
| `$spacing-09` | 3 | 48 | Major section breaks |
| `$spacing-10` | 4 | 64 | Page-level rhythm |
| `$spacing-11` | 5 | 80 | Page-level rhythm |
| `$spacing-12` | 6 | 96 | Large editorial spacing |
| `$spacing-13` | 10 | 160 | Hero-scale spacing |

There are also four fluid spacing tokens (`$fluid-spacing-01`…`04`) that scale
with the viewport — for expressive/marketing layouts only.

**Practical guidance.** In product UI you will spend almost all of your time in
`$spacing-03` through `$spacing-07`. If a design calls for something between two
steps, snap to a step. Consistency across a page beats a locally perfect gap.

In React, prefer the `<Stack gap={5}>` component over hand-written margins — the
number is the spacing step, and it prevents margin collapse surprises.

---

## 7. Typography

### Font

**IBM Plex** — `IBM Plex Sans` for UI, `IBM Plex Mono` for code, `IBM Plex
Serif` for editorial. Carbon does not ship the font binaries. Install
`@ibm/plex` (or load from a CDN) or the fallback to system sans will quietly
undo the design.

Weights in use: `light` 300, `regular` 400, `semibold` 600. Carbon does not use
bold (700) in product UI.

### Type style tokens (v11)

Apply with the mixin so you get size, weight, line-height and letter-spacing
together:

```scss
@use '@carbon/react/scss/type' as *;
.thing { @include type-style('body-compact-01'); }
```

| Family | Tokens | Use for |
|---|---|---|
| Body | `body-01`, `body-02` | Prose. Comfortable line-height. |
| Body compact | `body-compact-01`, `body-compact-02` | Dense UI: table cells, list rows, buttons. |
| Heading | `heading-01` … `heading-07` | Section and page headings, ascending. |
| Heading compact | `heading-compact-01`, `heading-compact-02` | Headings in dense contexts. |
| Label | `label-01`, `label-02` | Form labels, table column headers. |
| Helper text | `helper-text-01`, `helper-text-02` | Field helper/validation copy. |
| Caption | `caption-01`, `caption-02` | Timestamps, metadata, chart axis labels. |
| Legal | `legal-01`, `legal-02` | Fine print. |
| Code | `code-01`, `code-02` | Inline code and snippets (Plex Mono). |
| Fluid heading | `fluid-heading-03` … `fluid-heading-06` | Headings that scale with viewport. |
| Fluid display | `fluid-display-01` … `fluid-display-04` | Hero type. |
| Fluid paragraph | `fluid-paragraph-01` | Large intro paragraphs. |
| Fluid quotation | `fluid-quotation-01`, `fluid-quotation-02` | Pull quotes. |

**Compact vs. regular is the decision people get wrong.** The `-compact`
variants have a tighter line-height for single-line content in dense UI. Use
`body-compact-01` in a table cell and `body-01` in a paragraph. Using `body-01`
in a table makes rows feel unexpectedly tall; using `body-compact-01` in prose
makes it cramped.

The fluid tokens are for expressive, marketing-scale layouts. Product UI uses
the fixed scale.

In React, `<Heading>` inside `<Section>` gives you correct semantic heading
levels (`h1`…`h6`) automatically as you nest — use it rather than hard-coding
`<h3>`.

---

## 8. Sizes and containers

Interactive element heights — the ladder every Carbon component's `size` prop
snaps to:

| Name | px | Where |
|---|---|---|
| `xs` | 24 | Very dense tables, tags |
| `sm` | 32 | Compact toolbars, dense forms |
| `md` | 40 | **Default** for most product UI |
| `lg` | 48 | Comfortable forms, primary page actions |
| `xl` | 64 | Expressive / marketing CTAs |
| `2xl` | 80 | Hero actions |

Layout containers `$container-01`…`$container-05` = 24, 32, 40, 48, 64 px.

Icon sizes: `$icon-size-01` = 16px (the default in UI), `$icon-size-02` = 20px.
`@carbon/icons-react` also ships 24 and 32 for larger contexts. Import the size
you need: `import { Add } from '@carbon/icons-react'` then `<Add size={16} />`.

**Keep sizes consistent within a region.** A toolbar of `sm` controls next to an
`md` button reads as broken even though both are valid tokens.

---

## 9. Border radius

Carbon was famously square, and product UI still defaults to 0. The radius
tokens exist for the cases where roundness is meaningful (AI surfaces, chat
bubbles, avatars, tags):

`$border-radius-02` 2px · `$border-radius-04` 4px · `$border-radius-08` 8px
· `$border-radius-16` 16px · `$border-radius-24` 24px

Do not round Carbon components globally. Square corners are load-bearing brand.

---

## 10. Motion

### Durations

| Token | ms | Use |
|---|---|---|
| `$duration-fast-01` | 70 | Micro-interactions: button, toggle, checkbox |
| `$duration-fast-02` | 110 | Small fades |
| `$duration-moderate-01` | 150 | **Default.** Small expansion, short movement |
| `$duration-moderate-02` | 240 | Expansion, toasts, system communication |
| `$duration-slow-01` | 400 | Large expansion, important notifications |
| `$duration-slow-02` | 700 | Background dimming, hero transitions |

### Easing

Two modes. `productive` for work UI that should feel immediate; `expressive` for
moments that carry emotional weight (an onboarding reveal, a hero animation).
Three curves per mode:

| Curve | productive | expressive | Use |
|---|---|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `cubic-bezier(0.4, 0.14, 0.3, 1)` | Movement within the viewport |
| `entrance` | `cubic-bezier(0, 0, 0.38, 0.9)` | `cubic-bezier(0, 0, 0.3, 1)` | Element appearing |
| `exit` | `cubic-bezier(0.2, 0, 1, 0.9)` | `cubic-bezier(0.4, 0.14, 1, 1)` | Element leaving |

```scss
@use '@carbon/react/scss/motion' as *;
.panel {
  transition: transform $duration-moderate-02 motion(entrance, expressive);
}
```

**The rule of thumb:** the larger the element and the further it travels, the
longer the duration. Something entering should use `entrance` and something
leaving should use `exit` — asymmetric timing is what makes Carbon motion feel
considered rather than mechanical.

Always respect `prefers-reduced-motion`.

---

## 11. Breakpoints

The 2x Grid's five breakpoints:

| Name | Min width | Columns | Margin |
|---|---|---|---|
| `sm` | 320px (20rem) | 4 | 0 |
| `md` | 672px (42rem) | 8 | 16px |
| `lg` | 1056px (66rem) | 16 | 16px |
| `xlg` | 1312px (82rem) | 16 | 16px |
| `max` | 1584px (99rem) | 16 | 24px |

```scss
@use '@carbon/react/scss/breakpoint' as *;
.thing {
  padding: $spacing-05;
  @include breakpoint('lg') { padding: $spacing-07; }
}
```

Carbon is mobile-first: base styles are `sm`, and `breakpoint()` emits
`min-width`. Full grid usage in `layout.md`.

---

## 12. v10 → v11 token renames

The high-traffic ones. Full list lives in the Carbon repo's migration docs; this
covers what you will actually hit.

| v10 | v11 |
|---|---|
| `$ui-background` | `$background` |
| `$ui-01` | `$layer-01` |
| `$ui-02` | `$layer-02` |
| `$ui-03` | `$border-subtle-01` |
| `$ui-04` | `$border-strong-01` |
| `$ui-05` | `$border-inverse` |
| `$text-01` | `$text-primary` |
| `$text-02` | `$text-secondary` |
| `$text-03` | `$text-placeholder` |
| `$text-04` | `$text-on-color` |
| `$text-05` | `$text-helper` |
| `$icon-01` | `$icon-primary` |
| `$icon-02` | `$icon-secondary` |
| `$icon-03` | `$icon-on-color` |
| `$field-01` | `$field-01` (unchanged) |
| `$interactive-01` | `$button-primary` |
| `$interactive-02` | `$button-secondary` |
| `$interactive-03` | `$button-tertiary` |
| `$interactive-04` | `$interactive` |
| `$danger` | `$button-danger-primary` |
| `$link-01` | `$link-primary` |
| `$inverse-01` | `$text-inverse` |
| `$inverse-02` | `$background-inverse` |
| `$support-01` | `$support-error` |
| `$support-02` | `$support-success` |
| `$support-03` | `$support-warning` |
| `$support-04` | `$support-info` |
| `$hover-ui` | `$layer-hover-01` |
| `$active-ui` | `$layer-active-01` |
| `$selected-ui` | `$layer-selected-01` |
| `$disabled-01/02/03` | role-specific `*-disabled` tokens |
| `$productive-heading-01` | `$heading-compact-01` |
| `$productive-heading-02` | `$heading-compact-02` |
| `$productive-heading-03` … `07` | `$heading-03` … `$heading-07` |
| `$body-short-01/02` | `$body-compact-01/02` |
| `$body-long-01/02` | `$body-01/02` |
| `$carbon--spacing-05` | `$spacing-05` (namespace dropped) |

Carbon ships a codemod for most of this — see `audit.md`.

# Intake — ask before you build

Generating UI without asking means guessing, and the guesses are systematic: the
default stack, the default theme, a table when a list was wanted, a modal when
the user needed the page behind it. Those guesses get built on before anyone
notices.

So for anything beyond a single component, **ask first**.

**Contents**

1. [When to run intake](#1-when-to-run-intake)
2. [Answer it from the repo before asking](#2-answer-it-from-the-repo-before-asking)
3. [What to ask](#3-what-to-ask)
4. [How to ask](#4-how-to-ask)
5. [Record the answers](#5-record-the-answers)

---

## 1. When to run intake

**Run it for:** a new screen or page · a dashboard · a feature area · a
greenfield app · "build me the X UI" · anything where you would otherwise pick
a navigation pattern, a chart type, or a theme on the user's behalf.

**Skip it for:** a single component ("give me a danger button") · a specific
question ("which token for a divider?") · a bug fix · a refactor with the shape
already decided · anything where the answer changes nothing you would write.

The test is simple: **would a different answer change the code?** If not, do not
ask. An agent that interrogates someone who wanted one button is worse than one
that guesses.

---

## 2. Answer it from the repo before asking

Reading beats asking. Most of the intake is already on disk, and asking about
something the codebase plainly answers reads as not having looked.

| Question | Where the repo answers it |
|---|---|
| Stack, Carbon implementation | `package.json` — see `SKILL.md` §1 |
| Carbon major | Which packages are present; `other-frameworks.md` |
| Theme, dark mode | `<Theme>`/`GlobalTheme` usage, SCSS `theme.theme()` |
| Density | `size` props on existing components |
| Navigation | Existing UI Shell usage |
| Icon set | `@carbon/icons-react` imports |
| Chart library | `@carbon/charts` present or not |
| Existing conventions | Neighbouring components — match them |

Say what you found, then ask only about the gaps:

> Your `package.json` has `@carbon/react` and `@carbon/charts`, and the shell
> uses `g100`. So I will match that. Three things I cannot tell from the code:

That is shorter, more accurate, and demonstrates the work.

---

## 3. What to ask

Ask only what applies. A dashboard needs the chart question; a settings form
does not.

### Stack and foundation
- Carbon implementation, if greenfield — React, Web Components, or a port
  (`SKILL.md` §1 — and the v10/v11 trap matters here)
- Theme: `white` / `g10` / `g90` / `g100`, and whether dark mode must be
  switchable at runtime
- Density: `sm` for data-dense, `md` default, `lg` for comfortable forms

### Navigation and layout
- Shell: top header only, header + side nav, collapsible rail, or none
- Depth: does the user move between sections, or is this one screen?
- Breadcrumbs, tabs, or a content switcher for the level below
- Grid: standard, or `condensed` for a dashboard (see `layout.md` §3)

### Data display
- Table, list, or tiles — precise lookup wants a table, comparison wants tiles
- Row count, which decides pagination vs infinite scroll vs virtualisation
- Sorting, filtering: inline toolbar, a filter panel, or faceted
- Selection: single, multi, batch actions
- Empty, loading, and error states — ask, because they are the ones that get
  skipped and then bolted on badly

### Charts
Ask **what question the chart answers**, not what chart they want. The question
determines the type (`charts.md` §3), and users routinely ask for a pie chart
when they mean a ranked comparison.
- Comparison, trend over time, part-to-whole, distribution, or correlation?
- How many series? Past ~5, part-to-whole stops working
- Do any series carry semantic meaning — errors, success — that should use
  status tokens rather than the categorical palette?

### Icons and glyphs
- Icon size: 16 for UI, 20 for header actions, 24+ for empty states
- Icons or pictograms — pictograms are illustrative and larger
- Status: colour alone is never enough. `ShapeIndicator`/`IconIndicator`, or
  icon plus label? (`accessibility.md` §3)

### Overlays and confirmation
- Modal, side panel, popover, or toggletip — a modal blocks, a side panel keeps
  the page visible (`components.md` §8)
- Are any actions destructive, and do they need a confirmation step?

### Motion
- How expressive: productive (work UI, instant) or expressive (moments that
  deserve attention)?
- Is reduced motion a hard requirement? Assume yes unless told otherwise
- Anything specific — animated disclosure, chart entrance, nav collapse
  (`motion.md`)

### Accessibility
- Is there a compliance bar — WCAG 2.1 AA, procurement review, VPAT?
- Keyboard-only or screen-reader users to design for specifically?

---

## 4. How to ask

**Batch the questions.** One message with the open decisions, not a
back-and-forth. Someone answering five questions at once is doing one task;
answering them one at a time is doing five.

**Give defaults and let them say "defaults are fine."** Most users have an
opinion about two things and no preference on the rest. Make that cheap:

> **Theme** — `g100` dark, matching your shell? *(default: yes)*
> **Density** — `sm` rows; you have ~12k audit entries. *(default: `sm`)*
> **Deploy list** — `DataTable` with sortable columns and pagination, or
> `ContainedList` with per-row actions? *(no default — this one changes the
> layout)*
> **Failed deploys** — status via `IconIndicator` + label, not colour alone.
> *(default: yes, it is an a11y requirement)*

**Mark which questions actually matter.** If one answer changes the whole
layout and the rest are preferences, say so. That is the difference between a
questionnaire and a conversation.

**Never block on intake.** If the user does not answer, proceed on the stated
defaults and say which you assumed — clearly enough that they can correct one
without redoing everything:

> Building with `g100`, `sm` density, and a `DataTable`. Say the word if the
> deploy list should be a `ContainedList` instead — that is the one that changes
> the layout.

---

## 5. Record the answers

Write the decisions down once — a short block at the top of the work, or a
comment in the entry component. Then:

- **Do not re-ask** later in the same session. Re-asking a settled question
  reads as not having listened.
- **Later tasks inherit them.** A second screen in the same app uses the same
  theme, density, and navigation without another round.
- **Say when you deviate.** If a screen genuinely needs a different density,
  name it and why, rather than quietly breaking the pattern.

A decision the user made and then sees respected across three screens is what
makes the difference between a tool and a collaborator.

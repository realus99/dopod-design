# Carbon for IBM Products

`@carbon/ibm-products` is the layer above core Carbon: complete, opinionated
patterns rather than primitives. Where `@carbon/react` gives you `Modal` and
`Tile`, this gives you `Tearsheet`, `Datagrid`, `AboutModal`, `CreateFullPage` —
the things enterprise teams otherwise rebuild badly.

It is a **separate package with its own release cadence**, not part of core
Carbon. Everything in `tokens.md` and `layout.md` still applies; this only adds
components.

**Contents**

1. [Install](#1-install)
2. [The flag system — read this first](#2-the-flag-system--read-this-first)
3. [What is released](#3-what-is-released)
4. [When to reach for it](#4-when-to-reach-for-it)
5. [The components worth knowing](#5-the-components-worth-knowing)
6. [Pitfalls](#6-pitfalls)

---

## 1. Install

```bash
npm install @carbon/ibm-products
```

`@carbon/ibm-products-styles` comes as a dependency — you do not install it
separately. Core Carbon is a **peer**, so it must already be present:

```
@carbon/react   ^1.111.1   (peer — this layer sits on top of it)
@carbon/themes  ^11.76.1
@carbon/grid    ^11.57.0
```

Styles:

```scss
@use '@carbon/react';               // core first
@use '@carbon/ibm-products-styles'; // then this layer
```

Order matters. This layer's styles expect core Carbon's to be defined.

The CSS prefix is **`c4p`**, not `cds` — so `.c4p--tearsheet`, not
`.cds--tearsheet`. Worth knowing when debugging, though the usual rule holds:
do not style through internal classes (`react.md` §7).

---

## 2. The flag system — read this first

**Most components in this package are switched off by default.** As of 2.97.0:
**47 released, 70 behind canary flags.** Import a canary component without
enabling it and you get a console warning and a component that refuses to
render — with no obvious cause.

This is the single thing that wastes time here.

```js
// setup, before any component renders
import { pkg } from '@carbon/ibm-products';

pkg.component.Toolbar = true;
pkg.component.DataSpreadsheet = true;
```

Set flags at application entry, before React renders. Setting one inside a
component that has already mounted does nothing.

**A canary flag is a real warning, not a formality.** Those components have
unstable APIs and can change in a minor release. Enabling one is a deliberate
choice to accept churn — fine when you need it, worth saying out loud in a PR.

---

## 3. What is released

Usable with no flag:

**Modals and panels** — `AboutModal` · `APIKeyModal` · `ExportModal` ·
`ImportModal` · `RemoveModal` · `SidePanel` · `CreateSidePanel` · `Tearsheet` ·
`TearsheetNarrow` · `CreateTearsheet` · `CreateTearsheetNarrow`

**Full-page flows** — `CreateFullPage` · `CreateFullPageStep` ·
`CreateTearsheetStep` · `CreateModal` · `InterstitialScreen`

**Data** — `Datagrid` · `TagSet` · `MultiAddSelect` · `SingleAddSelect` ·
`Cascade` · `Checklist` · `OptionsTile`

**Page furniture** — `PageHeader` · `NotificationsPanel` · `WebTerminal` ·
`Saving` · `EditInPlace` · `UserAvatar` · `UserProfileImage` · `StatusIcon`

**Cards** — `ProductiveCard` · `ExpressiveCard`

**Empty and error states** — `EmptyState` and its variants (`NoDataEmptyState`,
`NoTagsEmptyState`, `NotFoundEmptyState`, `NotificationsEmptyState`,
`ErrorEmptyState`, `UnauthorizedEmptyState`) · `FullPageError` ·
`HTTPError403` · `HTTPError404` · `HTTPErrorOther`

Behind canary flags at present: `Toolbar`, `DataSpreadsheet`, `EditTearsheet`,
`EditSidePanel`, `EditFullPage`, `Nav`, `ConditionBuilder`, `FilterPanel`,
`Coachmark*`, `Guidebanner`, `InlineTip`, `NonLinearReading`, and others.
**Check `pkg.component` at the version you have rather than trusting this
list** — components graduate between minors.

---

## 4. When to reach for it

Ask in this order:

1. **Does core Carbon already do it?** A `Modal` is a modal. Do not pull in a
   second package for something `@carbon/react` ships.
2. **Is this a recognised product pattern?** Create flows, tearsheets,
   about-modals, and data grids are patterns IBM has already solved. Rebuilding
   them from `Modal` and `Table` costs weeks and lands worse.
3. **Is the component released?** If it is canary, you are accepting API churn.

The clearest wins:

| Need | Reach for | Instead of |
|---|---|---|
| Multi-step create flow | `CreateTearsheet` / `CreateFullPage` | Hand-rolled `ComposedModal` + stepper |
| Data table with filters, column config, batch actions, nested rows | `Datagrid` | `DataTable` plus a lot of glue |
| Detail or edit surface without leaving the page | `Tearsheet` / `SidePanel` | A modal that hides the context |
| Product about/version dialog | `AboutModal` | A bespoke modal |
| Empty and error states | `EmptyState`, `HTTPError*` | Ad-hoc markup per screen |
| Page title, breadcrumbs, tabs, actions | `PageHeader` | Reassembling it per route |

**`Datagrid` is the highest-leverage component in the package**, the way
`DataTable` is in core. It composes through hooks — `useFiltering`,
`useColumnOrder`, `useSelectRows`, `useNestedRows`, `useInlineEdit` — so you opt
into complexity rather than configuring it away.

---

## 5. The components worth knowing

**`Tearsheet`** — a sheet that covers most of the viewport while keeping the
page visible behind it. Use for a focused task that needs room but is not a page
navigation. `TearsheetNarrow` for single-input decisions. Reach for a `Modal`
only when the decision must be resolved before anything else can happen.

**`SidePanel`** — a side sheet for detail or edit while the user keeps their
place in a list. Prefer it over a modal whenever the context behind matters.
Note core `@carbon/react` also exports a `SidePanel`; if both are installed,
import deliberately and consistently.

**`PageHeader`** — title, breadcrumbs, tabs, actions, and the collapse behaviour
on scroll. Core Carbon's `unstable__PageHeader` is a different, simpler thing.

**`Datagrid`** — see above.

**`EmptyState`** — the variants exist so an empty table, a failed search, and a
403 do not all look identical. Pick the one that matches the cause; an empty
state that explains the wrong thing is worse than a bare message.

**Create flows** — `CreateTearsheet` (multi-step in a sheet), `CreateFullPage`
(multi-step taking the whole page), `CreateModal` (single-step). Choose by the
number of steps and how much room the form needs, not by preference.

---

## 6. Pitfalls

**Assuming a component is available.** The most common failure. Check
`pkg.component.<Name>` before designing around something.

**Enabling flags too late.** Set them at entry, before render.

**Mixing this layer's version with an incompatible core.** `@carbon/react` is a
peer with a floor (`^1.111.1` at 2.97.0). Upgrading this package can force a
core upgrade.

**Reaching here first.** This layer is heavier than core and moves faster. If
`@carbon/react` covers the need, use it — a `Tile` is not worth a
`ProductiveCard`.

**Styling through `.c4p--*` classes.** Same rule as core: internal API, changes
between minors. Props first, then `className`, then a wrapper.

**Treating it as part of Carbon in a design review.** It is a separate package
with its own cadence. When auditing (`audit.md`), report core Carbon adoption
and this layer separately — they are different decisions with different upgrade
costs.

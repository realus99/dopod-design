# Layout — the 2x Grid, layering, and page structure

Carbon layouts are built structure-first. If you place components and then try
to align them, you will fight the system; if you lay the grid first, alignment
is free.

**Contents**

1. [The 2x Grid](#1-the-2x-grid)
2. [Grid in React](#2-grid-in-react)
3. [Grid modes: wide, narrow, condensed](#3-grid-modes-wide-narrow-condensed)
4. [Subgrids](#4-subgrids)
5. [Layering](#5-layering)
6. [The UI Shell](#6-the-ui-shell)
7. [Responsive strategy](#7-responsive-strategy)
8. [Common layout recipes](#8-common-layout-recipes)

---

## 1. The 2x Grid

Everything in Carbon is built on multiples of 8px (the **mini-unit**), with a
fluid 16-column grid on top.

| Breakpoint | Min width | Columns | Margin |
|---|---|---|---|
| `sm` | 320px | 4 | 0 |
| `md` | 672px | 8 | 16px |
| `lg` | 1056px | 16 | 16px |
| `xlg` | 1312px | 16 | 16px |
| `max` | 1584px | 16 | 24px |

The gutter is 32px (16px per side) at every breakpoint. Carbon's default grid is
**wide**: gutters are drawn as padding *inside* each column, so column
backgrounds meet edge to edge and the content inside them is inset. This is why
a Carbon tile grid has no visible gaps between tiles unless you ask for them.

**Why 16 columns instead of 12.** 16 divides into 2, 4, and 8, so a
half/quarter/eighth split all land on the grid. It is also why Carbon layouts
often use 4-column cards — four across at `lg` is exactly `span={4}`.

---

## 2. Grid in React

```jsx
import { Grid, Column } from '@carbon/react';

<Grid>
  <Column sm={4} md={8} lg={16}>Full width at every breakpoint</Column>
  <Column sm={4} md={4} lg={8}>Half at lg, half at md, full at sm</Column>
  <Column sm={4} md={4} lg={8}>The other half</Column>
</Grid>
```

Each breakpoint prop takes the number of columns to span **at that
breakpoint's column count** — `sm={4}` is full width because `sm` only has 4
columns; `lg={4}` is a quarter because `lg` has 16.

**Offsets and explicit spans:**

```jsx
<Column lg={{ span: 8, offset: 4 }}>Centered eight-column block</Column>
<Column lg={{ start: 5, end: 13 }}>Columns 5 through 12</Column>
```

`start`/`end` uses CSS Grid line numbers, which is easier to reason about for
complex layouts than span+offset arithmetic.

Two grid implementations ship:

- **`Grid`** — CSS Grid. The v11 default. Use this.
- **`FlexGrid`** (with `Row`) — the flexbox v10-style grid, kept for migration.
  Only use it if you are incrementally migrating a v10 layout.

In SCSS, the equivalent classes are `cds--css-grid`, `cds--css-grid-column`,
`cds--col-span-{n}`, `cds--{breakpoint}:col-span-{n}`.

---

## 3. Grid modes: wide, narrow, condensed

This is the control people miss, and it is the difference between a layout that
looks Carbon and one that looks generic.

| Mode | Gutter | Use |
|---|---|---|
| **wide** (default) | 32px, as internal padding | Standard content layouts |
| **narrow** | 32px, but the column hangs into the left gutter | When content must align to the grid line while the container is inset |
| **condensed** | 2px | Tightly-packed tiles, dashboards, data-dense panels |

```jsx
<Grid condensed>…</Grid>
<Grid narrow>…</Grid>
<Grid fullWidth>…</Grid>   {/* removes the max-width and outer margins */}
```

Per-column overrides exist too: `<Column narrow>` inside a wide grid.

**Condensed is the right answer for dashboards.** A tile grid on a monitoring
page should almost always be `condensed` — 32px gutters between metric tiles
wastes the space that makes a dashboard readable.

---

## 4. Subgrids

Nest a `Grid` inside a `Column` and it inherits the parent's column tracks
rather than starting a new 16-column context. This keeps deep layouts aligned
to the same vertical lines all the way down.

```jsx
<Grid>
  <Column lg={12}>
    <Grid>                        {/* subgrid: still on the page's columns */}
      <Column lg={6}>…</Column>
      <Column lg={6}>…</Column>
    </Grid>
  </Column>
  <Column lg={4}>sidebar</Column>
</Grid>
```

Do not hand-roll a nested flexbox row inside a column — you lose grid alignment
and the responsive behavior has to be rebuilt by hand.

---

## 5. Layering

Layering is Carbon's model for depth. It is the concept agents most often get
wrong, because the token names look like a gray ramp and they are not.

`$layer-01`, `$layer-02`, `$layer-03` mean **first, second, third level of
nesting** — not "light, medium, dark". In the `white` theme, `layer-01` is gray
and `layer-02` is white; in `g100` it inverts. Choosing by eye guarantees a
broken dark theme.

### Use the `<Layer>` component

```jsx
import { Layer, Tile } from '@carbon/react';

<Tile>                       {/* on $background → resolves to layer-01 */}
  <Layer>
    <Tile>                   {/* now resolves to layer-02 */}
      <Layer>
        <Tile>…</Tile>       {/* layer-03 */}
      </Layer>
    </Tile>
  </Layer>
</Tile>
```

`<Layer>` increments a React context; components inside read the *contextual*
tokens (`$layer`, `$field`, `$border-subtle`, `$layer-hover`, …) which resolve
to the right numbered token for the current depth. In SCSS, the contextual
tokens are what you should write inside anything that might be nested:

```scss
.my-panel { background: $layer; border: 1px solid $border-subtle; }
```

`<Layer level={2}>` sets the level explicitly when you need to. Carbon caps the
model at three levels — if you need a fourth, the hierarchy is too deep and the
layout should be reconsidered.

Web Components use `<cds-layer>`; the SCSS mixin is `theme.$layer` /
`layer.$layer`.

---

## 6. The UI Shell

The application frame: top header, optional left side nav, and content region.
Building this by hand is a classic mistake — the shell handles skip links, focus
order, responsive collapse, and the fixed-offset math for the content region.

```jsx
import {
  Header, HeaderContainer, HeaderName, HeaderNavigation, HeaderMenuItem,
  HeaderGlobalBar, HeaderGlobalAction, HeaderMenuButton,
  SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem,
  SkipToContent, Content,
} from '@carbon/react';
import { Notification, UserAvatar } from '@carbon/icons-react';

<HeaderContainer
  render={({ isSideNavExpanded, onClickSideNavExpand }) => (
    <>
      <Header aria-label="Acme Platform">
        <SkipToContent />
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
          onClick={onClickSideNavExpand}
          isActive={isSideNavExpanded}
        />
        <HeaderName href="/" prefix="Acme">Platform</HeaderName>
        <HeaderNavigation aria-label="Acme Platform">
          <HeaderMenuItem href="/overview">Overview</HeaderMenuItem>
          <HeaderMenuItem href="/reports">Reports</HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Notifications" tooltipAlignment="center">
            <Notification size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
        <SideNav aria-label="Side navigation" expanded={isSideNavExpanded} isPersistent={false}>
          <SideNavItems>
            <SideNavMenu title="Analytics">
              <SideNavMenuItem href="/usage">Usage</SideNavMenuItem>
            </SideNavMenu>
            <SideNavLink href="/settings">Settings</SideNavLink>
          </SideNavItems>
        </SideNav>
      </Header>
      <Content>{/* page content — Content applies the shell offset */}</Content>
    </>
  )}
/>
```

Points that matter:

- `<SkipToContent />` must be the first child of `<Header>`. It is a hard a11y
  requirement, not decoration.
- `<Content>` (rendered as `<main>`) applies the padding that clears the fixed
  header. Skipping it makes your first row of content disappear under the shell.
- `HeaderContainer` owns the expand/collapse state — use its render prop rather
  than wiring your own `useState`.
- `isPersistent={false}` makes the side nav a rail that collapses on small
  screens; `true` keeps it always visible.
- The header is 48px tall and the side nav is 256px wide. Those are the numbers
  to use if you must compute an offset manually.
- Inverting the shell with a `g100` `<Theme>` while the page stays `white` is
  standard Carbon and requires no extra CSS.

---

## 7. Responsive strategy

**Mobile-first.** Base styles target `sm`; `breakpoint()` emits `min-width`.

```scss
@use '@carbon/react/scss/breakpoint' as *;
.panel {
  padding: $spacing-05;
  @include breakpoint('md')  { padding: $spacing-06; }
  @include breakpoint('lg')  { padding: $spacing-07; }
}
```

Other helpers: `breakpoint-down('md')` for max-width queries,
`breakpoint-between('md', 'lg')` for a band.

In React, `useMatchMedia` and the `HideAtBreakpoint` component cover the cases
where CSS alone can't express the change. Prefer CSS — a JS breakpoint hook
causes a flash on hydration.

**Reflow, don't shrink.** Carbon's responsive approach is to change the number
of columns content occupies, not to scale everything down. A 4-across card grid
becomes 2-across at `md` and 1-across at `sm`; it does not become four tiny
cards.

---

## 8. Common layout recipes

**Page with heading and content, on the grid**

```jsx
<Grid fullWidth>
  <Column sm={4} md={8} lg={16}>
    <h1 className="page-heading">Reports</h1>
  </Column>
  <Column sm={4} md={8} lg={12}>{/* main */}</Column>
  <Column sm={4} md={8} lg={4}>{/* aside */}</Column>
</Grid>
```

**Dashboard tile grid (condensed)**

```jsx
<Grid condensed>
  {metrics.map((m) => (
    <Column key={m.id} sm={4} md={4} lg={4}>
      <Tile>…</Tile>
    </Column>
  ))}
</Grid>
```

**Vertical rhythm inside a column** — use `Stack`, not margins:

```jsx
<Stack gap={6}>   {/* 24px between children */}
  <TextInput … />
  <TextInput … />
  <Button>Submit</Button>
</Stack>
```

`Stack` defaults to vertical; `<Stack orientation="horizontal" gap={3}>` for a
button row. The `gap` value is the spacing step number.

**Full-bleed section inside a constrained page** — wrap the section in its own
`<Grid fullWidth>` rather than negative margins.

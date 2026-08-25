# @carbon/react — setup and patterns

The flagship implementation. In v11 everything is consolidated into one package:
components, styles, and icons all come from `@carbon/react`.

**Contents**

1. [Install](#1-install)
2. [SCSS entry point and config](#2-scss-entry-point-and-config)
3. [Loading IBM Plex](#3-loading-ibm-plex)
4. [Theming](#4-theming)
5. [Framework integration notes](#5-framework-integration-notes)
6. [Icons](#6-icons)
7. [Styling Carbon components correctly](#7-styling-carbon-components-correctly)
8. [Patterns](#8-patterns)
9. [Testing](#9-testing)

---

## 1. Install

```bash
npm install @carbon/react sass
```

`sass` is a **peer dependency** (`^1.33.0`) — Carbon's styles are SCSS and will
not compile without it. `@carbon/react` supports React 16.8 through 19.

Icons come along with `@carbon/react`, but installing `@carbon/icons-react`
directly is fine and sometimes clearer.

Do **not** also install `carbon-components` or `carbon-components-react`. Those
are the deprecated v10 packages; having both produces duplicate CSS and
conflicting class prefixes.

---

## 2. SCSS entry point and config

The single most common setup failure is importing the JS and forgetting the
styles, which yields unstyled components.

**Everything at once** (simplest, larger bundle):

```scss
// styles/index.scss
@use '@carbon/react';
```

**Granular** (recommended for apps that care about CSS size):

```scss
@use '@carbon/react/scss/reset';
@use '@carbon/react/scss/theme' as *;
@use '@carbon/react/scss/spacing' as *;
@use '@carbon/react/scss/type' as *;
@use '@carbon/react/scss/grid';

// only the components you use
@use '@carbon/react/scss/components/button';
@use '@carbon/react/scss/components/data-table';
@use '@carbon/react/scss/components/text-input';
```

Component style partials live under `@carbon/react/scss/components/<kebab-name>`.

### Config options

Configure **before** anything else `@use`s Carbon — Sass module config must
happen at first use:

```scss
@use '@carbon/react/scss/config' with (
  $font-path: '@ibm/plex',      // where the Plex files live
  $prefix: 'cds',               // class/custom-property prefix (default 'cds')
  $css--font-face: true,        // emit @font-face rules
  $css--body: true,             // style <body> background + text color
  $css--reset: true,            // include Carbon's CSS reset
  $css--default-type: true,     // apply default type to base elements
  $css--emit-type-custom-props: false,  // emit --cds-body-01-font-size etc.
  $use-akamai-cdn: false,       // load Plex from IBM's CDN instead of node_modules
  $font-display: swap,
  $use-flexbox-grid: false      // set true only for legacy FlexGrid layouts
);
@use '@carbon/react';
```

Set `$css--emit-type-custom-props: true` if you need type values as CSS custom
properties (for CSS-in-JS or runtime-computed layouts).

**`$prefix`.** Only change it if you are embedding Carbon inside an app that
already owns the `cds--` namespace. If you do, also wrap your React tree in
`<ClassPrefix prefix="…">` so the JS and CSS agree.

---

## 3. Loading IBM Plex

Carbon does not ship the font binaries. Without them the design silently falls
back to system sans and every measurement is subtly wrong.

**From npm:**

```bash
npm install @ibm/plex
```

```scss
@use '@carbon/react/scss/config' with ($font-path: '@ibm/plex');
```

Some bundlers need `'~@ibm/plex'` (the default) instead — the tilde is a
webpack/`sass-loader` convention for resolving out of `node_modules`. If fonts
404, this is the first thing to check.

**From IBM's CDN** (no local font files):

```scss
@use '@carbon/react/scss/config' with ($use-akamai-cdn: true);
```

**Per-family packages** (`@ibm/plex-sans`, `@ibm/plex-mono`) reduce install size:

```scss
@use '@carbon/react/scss/config' with ($use-per-family-plex: true);
```

---

## 4. Theming

Three layers, and you usually want the React one.

### `<Theme>` — a themed subtree

```jsx
import { Theme } from '@carbon/react';

<Theme theme="g100">
  <Header … />          {/* dark shell */}
</Theme>
<Theme theme="white">
  <Content>…</Content>  {/* light page */}
</Theme>
```

`<Theme>` emits the theme's custom properties on its own element and provides
React context so JS-driven components (charts, tooltips, notifications) read the
same theme. **A CSS class alone is not enough** — that is the bug behind
"my tooltips are light on a dark page".

### `<GlobalTheme>` — the whole app

```jsx
<GlobalTheme theme={isDark ? 'g100' : 'white'}>
  <App />
</GlobalTheme>
```

Combine with a `useState` + `prefers-color-scheme` for a theme switcher. Because
components consume `var(--cds-*)`, the switch is instant with no re-render of
styles.

### SCSS — a compile-time theme

```scss
@use '@carbon/react/scss/theme' with ($theme: theme.$g100);
```

Or scoped regions:

```scss
@use '@carbon/react/scss/theme';
@use '@carbon/react/scss/themes';

:root { @include theme.theme(themes.$white); }
[data-theme='g100'] { @include theme.theme(themes.$g100); }
```

### Custom themes

Extend a stock theme rather than defining tokens from scratch — you will miss
some otherwise:

```scss
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/theme' with (
  $theme: map.merge(themes.$g100, (
    interactive: #8a3ffc,
    link-primary: #a56eff,
  ))
);
```

Change tokens by **role**, not one component at a time. If your brand color is
purple, override `interactive`, `link-primary`, `focus`, `border-interactive`,
`background-brand`, and the `button-*` tokens together — otherwise the UI ends
up half-purple, half-blue.

---

## 5. Framework integration notes

**Next.js (App Router).** Carbon components are client components. Either mark
your component files `'use client'` or wrap Carbon usage in a client boundary.
Import the SCSS once in `app/layout.tsx` via a global stylesheet. Next needs
`sass` installed; no extra webpack config is required for modern versions.
Watch for hydration warnings from components that generate ids — wrap the app in
`<IdPrefix prefix="app">` for stable ids across server and client.

**Vite.** Works out of the box with `sass` installed. If you hit deprecation
warnings from Sass's legacy JS API, set
`css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } }`.

**Remix / CRA / Webpack.** Standard `sass-loader` setup. With webpack 5 the
`~` prefix in `$font-path` may need to become a plain package path.

**CSS Modules.** Carbon's own classes are global. Your CSS-module class names
compose fine on top via `className`, but never try to `:global(.cds--btn)` your
way into overriding internals.

---

## 6. Icons

```jsx
import { Add, TrashCan, ChevronDown } from '@carbon/icons-react';

<Add size={16} />
<Button renderIcon={Add}>Create</Button>   {/* component ref, not element */}
```

Sizes are 16, 20, 24, 32. **16 is the default for UI** — 20 for header/global
actions, 24+ for empty states and marketing.

Icons are decorative by default. If an icon carries meaning on its own, give it
`aria-label` and remove `aria-hidden`; if it sits next to a text label, leave it
hidden so screen readers don't announce it twice.

There are thousands of icons. Search names at
`carbondesignsystem.com/elements/icons/library`. Pictograms are a separate
package (`@carbon/pictograms-react`) for illustrative, larger-scale use.

---

## 7. Styling Carbon components correctly

In priority order:

1. **Use the component's props.** `size`, `kind`, `renderIcon`, `hideLabel`,
   `light` replacements via `<Layer>`. Most "I need custom CSS" moments are a
   prop you haven't found.
2. **Use `className` on the Carbon component.** It lands on the outermost
   element. Style from there with tokens.
3. **Wrap it.** Put layout concerns (margin, grid placement) on a wrapper, not
   on the component.
4. **Only then, and reluctantly, target internals.**

```scss
// acceptable
.my-toolbar-button { margin-inline-start: $spacing-03; }

// fragile — .cds--btn is internal API and changes between minors
.cds--btn { border-radius: 4px !important; }
```

`!important` against Carbon is always a signal that step 1 was skipped.

**Never mix in a utility CSS framework.** Tailwind's preflight and Carbon's
reset conflict; the two spacing scales disagree; and Tailwind's static colors
break theme switching. If a project has both, isolate them: Carbon owns the app
chrome and components, and the utility framework does not touch anything inside
a Carbon component.

---

## 8. Patterns

### Theme switcher

```jsx
const [theme, setTheme] = useState('white');
<GlobalTheme theme={theme}>
  <Toggle
    id="theme-toggle"
    labelText="Dark mode"
    toggled={theme === 'g100'}
    onToggle={(checked) => setTheme(checked ? 'g100' : 'white')}
  />
</GlobalTheme>
```

### Form with validation

```jsx
<Form onSubmit={handleSubmit}>
  <Stack gap={6}>
    <TextInput
      id="email"
      labelText="Email address"
      type="email"
      invalid={Boolean(errors.email)}
      invalidText={errors.email}
    />
    <Select id="region" labelText="Region" defaultValue="us-east">
      <SelectItem value="us-east" text="US East" />
      <SelectItem value="eu-west" text="EU West" />
    </Select>
    <Stack orientation="horizontal" gap={3}>
      <Button kind="secondary" type="button" onClick={onCancel}>Cancel</Button>
      <Button kind="primary" type="submit">Save</Button>
    </Stack>
  </Stack>
</Form>
```

### Async action with inline feedback

```jsx
{status === 'idle'
  ? <Button onClick={submit}>Deploy</Button>
  : <InlineLoading
      status={status}                 // 'active' | 'finished' | 'error'
      description={
        status === 'active' ? 'Deploying…'
        : status === 'finished' ? 'Deployed' : 'Failed'
      }
    />}
```

### Empty state

Carbon core has no `EmptyState` component. Compose it: a pictogram or 32px
icon, `heading-03`, `body-01` explanatory copy, and one primary `Button`.
Center it in the column, do not center it in the viewport.

### Dashboard tile

```jsx
<Column sm={4} md={4} lg={4}>
  <Tile>
    <Stack gap={3}>
      <span className="metric-label">Requests / sec</span>
      <span className="metric-value">14,208</span>
      <Tag type="green" size="sm">+4.2%</Tag>
    </Stack>
  </Tile>
</Column>
```

```scss
.metric-label { @include type-style('label-01'); color: $text-secondary; }
.metric-value { @include type-style('heading-04'); color: $text-primary; }
```

---

## 9. Testing

Carbon components render real DOM, so React Testing Library works normally. The
Carbon-specific parts are the four below, and two of them fail in ways that look
like your test is wrong rather than your query.

### Query by role and accessible name

```js
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits the form', async () => {
  render(<DeployForm />);
  await userEvent.type(screen.getByLabelText('Service name'), 'api-gateway');
  await userEvent.click(screen.getByRole('button', { name: 'Deploy' }));
  expect(screen.getByRole('status')).toHaveTextContent('Deploying');
});
```

This is worth more than convenience: a query by accessible name **fails when the
accessible name breaks**, so every test doubles as an a11y regression check for
free. A `data-testid` passes whether or not the control is reachable. See
`accessibility.md` §10.

### `@carbon/test-utils` is not what its name suggests

It is a **Sass renderer** for unit-testing SCSS — Carbon uses it to test its own
stylesheets. It is not a set of React or a11y helpers.

It is also **`10.3.0`, published in 2019**, and has had no v11 release. Do not
add it to an app's test setup expecting component utilities. Use React Testing
Library, `@testing-library/user-event`, and `jest-axe`.

### Themed components: assert the contract, not the colour

`<Theme theme="g100">` sets a class (`cds--g100`) and a context value. It does
**not** inline any colour — the values come from compiled SCSS, which jsdom
never loads. So `toHaveStyle({ color: '#f4f4f4' })` will fail in a passing app,
and chasing it wastes an afternoon.

Assert what is actually observable in jsdom:

```jsx
import { Theme, useTheme } from '@carbon/react';

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

test('the panel renders under the dark theme', () => {
  const { container } = render(
    <Theme theme="g100"><Panel /><ThemeProbe /></Theme>
  );
  expect(container.firstChild).toHaveClass('cds--g100');
  expect(screen.getByTestId('theme')).toHaveTextContent('g100');
});
```

For real colour verification you need a browser — Playwright or a visual
regression tool. Token correctness is not a unit-test question.

### Portal-rendered components

`Menu`, `MenuButton`, and `OverflowMenu` render through `createPortal` into
`document.body`, so they are **outside** the container `render()` returns:

```js
const { container } = render(<OverflowMenu aria-label="Actions" />);
await userEvent.click(screen.getByRole('button', { name: 'Actions' }));

within(container).queryByRole('menuitem');   // null — it is not in there
screen.getByRole('menuitem', { name: 'Delete' });   // correct
```

**`Modal`, `ComposedModal`, and `Tooltip` do not portal** — they render inline,
and container-scoped queries find them. The advice to query from `screen`
regardless is still right, because it works either way and you stop having to
remember which is which.

### The `IdPrefix` snapshot trap

Carbon generates ids with `useId`. They are stable within a render but differ
between runs, so snapshots diff on ids that mean nothing:

```diff
- <input id="text-input-3" aria-describedby="text-input-3-helper">
+ <input id="text-input-7" aria-describedby="text-input-7-helper">
```

Wrap the tree in `<IdPrefix>` to make them deterministic:

```jsx
import { IdPrefix } from '@carbon/react';

render(<IdPrefix prefix="test"><DeployForm /></IdPrefix>);
// ids become test-text-input-1, and stay that way
```

Prefer role and label queries over snapshots for Carbon components — the markup
is not your API and it changes between minors. Reach for `IdPrefix` when a
snapshot is genuinely the right tool, not to make a fragile one pass.


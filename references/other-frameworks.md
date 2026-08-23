# Angular, Vue, and Svelte

These are separate implementations at genuinely different maturity levels. The
most important thing to establish before writing any code is **which Carbon
version the port targets**, because v10 and v11 use different token names and
mixing them produces silent failures.

| Port | Package | Latest | Carbon version | Maintained by |
|---|---|---|---|---|
| Angular | `carbon-components-angular` | 5.72.x | **v11** (peers `@carbon/styles`) | Carbon team |
| Vue 3 | `@carbon/vue` | 3.0.x | **v10** | Community |
| Svelte | `carbon-components-svelte` | 0.111.x | **v10-era styling** | Community |
| Web Components | `@carbon/web-components` | 2.61.x | **v11** | Carbon team |

If v11 fidelity matters and you are on Vue or Svelte, `@carbon/web-components`
is the better answer — it is v11, first-party, and works in both. See
`web-components.md`.

---

## Angular — `carbon-components-angular`

The strongest non-React option. v5 is v11-aligned (it takes `@carbon/styles`
`^1.54.0` as a peer dependency, so all the v11 tokens in `tokens.md` apply
directly) and supports Angular 14 through 21.

### Install

```bash
npm i --save carbon-components-angular @carbon/styles @carbon/icons
```

### Styles

```scss
// src/styles.scss
@use '@carbon/styles/scss/config' with (
  $use-flexbox-grid: true,
  $font-path: '@ibm/plex'
);

@use '@carbon/styles';

html {
  @include styles.theme(styles.$white);
}
```

Note this library's docs enable the **flexbox** grid. CSS Grid is the v11
default; only keep `$use-flexbox-grid: true` if you are using the library's
flexbox grid directives. For new work, prefer the CSS grid classes described in
`layout.md`.

Icons need an ambient module declaration — create `src/module.d.ts`:

```ts
declare module '@carbon/icons/*';
```

### Usage

```ts
import { ButtonModule, TableModule, NotificationModule } from 'carbon-components-angular';

@NgModule({ imports: [ButtonModule, TableModule, NotificationModule] })
export class AppModule {}
```

```html
<button cdsButton="primary" size="md">Create</button>

<cds-table
  [model]="model"
  [sortable]="true"
  [size]="'sm'">
</cds-table>
```

The API is directive-heavy (`cdsButton`, `cdsText`, `cdsGrid`) rather than
wrapper-component-heavy. Tables use a `TableModel` object you build in the
component class — populate `model.header` and `model.data` with `TableItem`
instances rather than binding raw arrays.

Theming works through the same CSS custom properties as everywhere else, so a
`[data-carbon-theme]` attribute or a scoped `styles.theme()` include gives you
themed regions.

---

## Vue — `@carbon/vue`

**This targets Carbon v10.** It depends on `carbon-components@^10`, which is the
deprecated v10 CSS package. Everything in `tokens.md` §12 applies in reverse:
this codebase uses `$ui-01`, `$text-01`, `$interactive-01`, and the `g80` theme.
Writing v11 token names here produces nothing.

Vue 3 only — Vue 2 support ended 2023-12-31 (the `vue2` branch is archived
history). It is a community project and the README is explicit that
accessibility coverage is incomplete.

```bash
npm add @carbon/vue
```

```js
import { createApp } from 'vue';
import CarbonVue3 from '@carbon/vue';
import App from './App.vue';

const app = createApp(App);
app.use(CarbonVue3);
app.mount('#app');
```

Components are prefixed `cv-`: `<cv-button>`, `<cv-data-table>`, `<cv-dropdown>`.

**Recommendation.** For a new Vue project, use `@carbon/web-components` and get
v11, first-party maintenance, and current accessibility work. Use `@carbon/vue`
only when maintaining something that already depends on it — and when you do,
work in v10 tokens consistently rather than half-migrating.

---

## Svelte — `carbon-components-svelte`

A well-regarded community port with excellent TypeScript definitions, but its
CSS is the **v10-era** theme set — the giveaway is the `g80` theme, which v11
deleted.

```bash
npm i -D carbon-components-svelte
```

Import exactly one theme stylesheet at the app root:

```js
import 'carbon-components-svelte/css/white.css';
// or g10.css, g80.css, g90.css, g100.css
// or all.css to switch at runtime via <html theme="g100">
```

```svelte
<script>
  import { Button, DataTable, TextInput } from 'carbon-components-svelte';
</script>

<Button kind="primary">Create</Button>
<TextInput labelText="Email" placeholder="you@example.com" />
```

With `all.css`, switch themes by setting the `theme` attribute on `<html>`:

```js
document.documentElement.setAttribute('theme', 'g100');
```

The SCSS sources ship too (`carbon-components-svelte/css/white.scss`) if you
want to customize before compiling.

**Recommendation.** Fine for internal tools and prototypes where v10 styling is
acceptable. If you need v11 tokens or the current component set, use
`@carbon/web-components` inside Svelte — Svelte handles custom elements cleanly,
including property and event binding.

---

## Cross-port guidance

**Do not mix ports.** Two Carbon CSS bundles on one page — say
`carbon-components-svelte/css/white.css` plus `@carbon/styles` — produce
duplicate and conflicting rules under the same class names. Pick one.

**Design tokens are portable, component APIs are not.** The spacing scale, type
scale, motion values, grid, and layering model in `tokens.md` and `layout.md`
hold across every implementation (adjusting names for v10 where relevant). The
component props do not — do not translate a `@carbon/react` snippet to Vue by
renaming the tag.

**Accessibility parity is not guaranteed.** The first-party implementations
(React, Web Components, Angular) get the accessibility work first. On the
community ports, verify keyboard navigation and screen-reader labelling
yourself against `accessibility.md` rather than assuming the component handles
it.

**When in doubt, check `package.json` first.** The presence of
`carbon-components@^10` anywhere in the tree means you are in a v10 codebase
regardless of what the component library is called.

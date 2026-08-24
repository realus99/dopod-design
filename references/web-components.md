# @carbon/web-components

Carbon v11 as standard custom elements. Use this when the app is not React, when
you need Carbon inside multiple frameworks at once, or when you want components
that survive a framework migration.

Version pinned in `SKILL.md`. Built on Lit.

---

## Install and import

```bash
npm install @carbon/web-components
```

Import each component for its side effect — importing registers the custom
element. There is no barrel import; this is deliberate, so you only ship what
you use.

```js
import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/dropdown/dropdown.js';
import '@carbon/web-components/es/components/dropdown/dropdown-item.js';
import '@carbon/web-components/es/components/data-table/index.js';
```

```html
<cds-button kind="primary" size="md">Create</cds-button>

<cds-dropdown trigger-content="Select an item">
  <cds-dropdown-item value="all">All</cds-dropdown-item>
  <cds-dropdown-item value="active">Active</cds-dropdown-item>
</cds-dropdown>
```

Every element uses the **`cds-`** tag prefix, mirroring the `cds--` CSS prefix.

### CDN (no build step)

```html
<script type="module"
  src="https://1.www.s81c.com/common/carbon/web-components/version/v2.61.0/button.min.js">
</script>
```

Pin the version in the URL — never point at a floating "latest". For anything
user-facing, prefer bundling from npm; if you must load from the CDN, add
Subresource Integrity so a compromised CDN cannot serve different code:

```html
<script type="module"
  src="https://1.www.s81c.com/common/carbon/web-components/version/v2.61.0/button.min.js"
  integrity="sha384-…" crossorigin="anonymous"></script>
```

Also hide elements until they upgrade, or you get a flash of unstyled content:

```css
cds-button:not(:defined),
cds-dropdown:not(:defined) { visibility: hidden; }
```

---

## Attributes, properties, and events

Three rules that cover most confusion:

1. **Primitive values are attributes**, kebab-cased:
   `<cds-button size="lg" disabled>`. In React-like syntax that means
   `trigger-content`, not `triggerContent`.
2. **Objects and arrays must be set as properties**, not attributes — an
   attribute can only hold a string. Use `element.items = [...]` or a
   framework's property binding (`.items=` in Lit, `[items]=` in Angular,
   `:items.prop=` in Vue).
3. **Events are custom events with a `cds-` prefix**, e.g.
   `cds-dropdown-selected`, `cds-modal-closed`, `cds-table-row-change-selection`.
   Read the payload from `event.detail`.

```js
document.querySelector('cds-dropdown')
  .addEventListener('cds-dropdown-selected', (e) => {
    console.log(e.detail.item.value);
  });
```

Many events are cancelable "before" events (`cds-modal-beingclosed`) — calling
`preventDefault()` stops the interaction, which is how you gate a close on
unsaved changes.

---

## Styles and theming

Component styles are encapsulated in shadow DOM and come with the import. What
you still need to provide is the **theme**, the **font**, and any global reset.

Themes are applied as CSS custom properties, so they cross the shadow boundary
and reach every component:

```scss
@use '@carbon/styles/scss/theme';
@use '@carbon/styles/scss/themes';

:root                { @include theme.theme(themes.$white); }
[data-carbon-theme='g100'] { @include theme.theme(themes.$g100); }
```

```html
<body>
  <main>light region</main>
  <aside data-carbon-theme="g100">dark region</aside>
</body>
```

There is also a `<cds-theme>` wrapper element and a `cds-layer` element that
mirrors React's `<Layer>` for the layering context described in `layout.md`.

Load IBM Plex the same way as React — via `@ibm/plex` or the Akamai CDN. See
`react.md` §3; the `@carbon/styles` config options are identical.

**Custom styles inside a component** are blocked by shadow DOM by design. Use
the component's own custom properties and parts where exposed, or style a
wrapper element. Do not try to pierce the shadow root.

---

## Grid

The grid ships as plain CSS classes (no shadow DOM), so use them directly:

```html
<div class="cds--css-grid">
  <div class="cds--css-grid-column cds--sm:col-span-4 cds--lg:col-span-8">…</div>
</div>
```

Or import the SCSS grid from `@carbon/styles/scss/grid`. Same 2x Grid rules as
`layout.md`.

---

## Framework integration

**Angular.** Works natively. Add `CUSTOM_ELEMENTS_SCHEMA` to the module (or
component) so Angular stops complaining about unknown elements, then use
`[prop]` for property binding and `(cds-event)` for events. Note that for
Angular specifically, `carbon-components-angular` is usually the better choice
— see `other-frameworks.md`.

**Vue 3.** Configure `compilerOptions.isCustomElement: (tag) => tag.startsWith('cds-')`
in the Vite/Vue config. Use `.prop` modifiers for object/array bindings and
`@cds-…` for events.

**React.** React 19 supports custom elements properly (props map to attributes
or properties as appropriate, and custom events work). On React 18 and below you
need `ref`-based property assignment and manual `addEventListener`. If the app
is React, prefer `@carbon/react` — it exists for exactly this reason.

**Server rendering.** Custom elements do not render on the server. Expect a
blank frame until hydration; use the `:not(:defined)` CSS above to avoid a
flash, and don't rely on Carbon elements for above-the-fold LCP content.

---

## Choosing between `@carbon/web-components` and `@carbon/react`

| | React | Web Components |
|---|---|---|
| React app | **Yes** | only for shared micro-frontends |
| Angular app | no | possible, but `carbon-components-angular` is better |
| Vue / Svelte / vanilla | no | **Yes** |
| Multiple frameworks in one product | no | **Yes** |
| Server-side rendered content | works | does not render server-side |
| Deep style customization | easier | constrained by shadow DOM |

The two share `@carbon/styles`, so tokens, spacing, type, and themes behave
identically. Everything in `tokens.md` and `layout.md` applies unchanged.

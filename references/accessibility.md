# Accessibility

Carbon targets **WCAG 2.1 Level AA** and IBM's own accessibility requirements.
The components carry a lot of this for you — which is exactly why the failures
that remain tend to come from working *around* the components rather than
through them.

**Contents**

1. [What Carbon gives you for free](#1-what-carbon-gives-you-for-free)
2. [What you still have to do](#2-what-you-still-have-to-do)
3. [Color and contrast](#3-color-and-contrast)
4. [Focus](#4-focus)
5. [Keyboard](#5-keyboard)
6. [Labelling](#6-labelling)
7. [Motion](#7-motion)
8. [Forms](#8-forms)
9. [Checklist](#9-checklist)
10. [Testing](#10-testing)

---

## 1. What Carbon gives you for free

Use the component and you inherit: correct roles and ARIA attributes, keyboard
interaction patterns, focus management in overlays, focus trapping in modals,
screen-reader announcements for state changes, and token colors that already
meet contrast in their intended roles.

You lose all of it the moment you hand-roll the equivalent. A `<div role="button"
tabIndex={0}>` with an `onClick` is missing space-key activation, the correct
disabled semantics, and the focus ring — three separate AA failures.

---

## 2. What you still have to do

Carbon cannot know your content. These are yours:

- Accessible names for icon-only controls and regions
- Correct heading order
- Meaningful alt text
- Not conveying information by color alone
- Reading order matching visual order
- Language attributes
- Error messages that say what to do
- Anything you build custom

---

## 3. Color and contrast

Thresholds: **4.5:1** for body text, **3:1** for large text (≥24px, or ≥18.66px
bold) and for UI component boundaries and meaningful graphics.

The theme tokens already satisfy these **in their intended roles**. Contrast
failures in Carbon apps almost always come from token misuse:

- `$text-secondary` on `$layer-01` passes. `$text-secondary` on
  `$layer-accent-01` may not.
- `$text-on-color` is designed for colored fills. On a neutral surface it can
  fail badly.
- `$text-helper` is tuned for helper text at its size — do not repurpose it for
  body copy.
- Anything you set with `opacity` is unverified. Carbon has real disabled tokens
  for this reason.

**Never encode meaning by color alone.** Pair status color with an icon, a
shape, or text:

```jsx
<Tag type="red" renderIcon={ErrorFilled}>Failed</Tag>
<ShapeIndicator kind="failed" label="Failed" />
<IconIndicator kind="failed" label="Failed" />
```

`ShapeIndicator` and `IconIndicator` exist specifically to solve this for status
lists and tables.

For charts, see `charts.md` §7 — series must be distinguishable by more than
hue.

---

## 4. Focus

**Never remove the focus indicator.** `outline: none` without a replacement is
the single most common accessibility regression in styled Carbon apps.

Carbon uses `$focus` for the ring, and `$focus-inset` for an inner ring drawn
inside elements whose own fill would swallow a single ring (that is why Carbon
buttons show a two-ring focus state). `$focus-inverse` is for focus on inverse
surfaces.

If you must customize focus, replace it — do not delete it:

```scss
.custom-control:focus-visible {
  outline: 2px solid $focus;
  outline-offset: -2px;
}
```

Use `:focus-visible`, not `:focus`, so pointer users don't see rings on click
while keyboard users still do.

**Focus order must match visual order.** If a CSS `order` or `grid-area`
rearranges elements, the tab order no longer matches the screen. Reorder the DOM
instead.

**Never use positive `tabindex`.** `tabindex="0"` to make something focusable and
`tabindex="-1"` to make it programmatically focusable are the only correct
values.

**Manage focus on route change.** Single-page navigation leaves focus where it
was. Move focus to the new page's `<h1>` or main region.

---

## 5. Keyboard

Everything reachable by mouse must be reachable by keyboard.

Standard patterns Carbon implements:

| Component | Keys |
|---|---|
| Button | Enter, Space |
| Link | Enter |
| Checkbox / Toggle | Space |
| Radio group | Arrows move *and* select; Tab enters/leaves the group |
| Dropdown / ComboBox | Enter/Space/Down to open, arrows to move, Enter to select, Esc to close |
| Tabs | Arrows move between tabs, Tab moves into the panel |
| Modal | Focus trapped inside; Esc closes; focus returns to the trigger |
| OverflowMenu | Enter/Space opens, arrows navigate, Esc closes |
| DataTable | Tab through interactive cells; sort headers are buttons |
| TreeView | Arrows navigate, Right/Left expand/collapse |

Two rules for anything custom:

- **Esc must close** any dismissible overlay, and focus must return to whatever
  opened it.
- **Do not trap focus** outside a modal context.

`<SkipToContent />` must be the first child of `<Header>` so keyboard users can
bypass the nav.

---

## 6. Labelling

Every interactive element needs an accessible name.

```jsx
<IconButton label="Delete deployment"><TrashCan size={16} /></IconButton>
<TextInput id="email" labelText="Email address" />
<TextInput id="q" labelText="Search" hideLabel />   {/* visually hidden, still announced */}
<Header aria-label="Acme Platform" />
<SideNav aria-label="Main navigation" />
<Table aria-label="Deployments" />
```

- Prefer `hideLabel` over removing `labelText`. A placeholder is **not** a label
  — it disappears on input and is not reliably announced.
- Icons next to text labels should stay `aria-hidden` (Carbon's default) so
  they are not announced twice. An icon carrying meaning alone needs a label.
- Distinguish repeated controls: five "Edit" buttons in a table need
  `aria-label="Edit deployment api-gateway"`, or the screen-reader user hears
  "Edit, Edit, Edit".
- Landmarks: exactly one `<main>` (Carbon's `<Content>` renders it), and
  `aria-label` on each `<nav>` when there is more than one.

**Headings** must descend without skipping. `<Section>` + `<Heading>` computes
the level from nesting depth, which is more robust than hard-coded tags:

```jsx
<Section><Heading>Page title</Heading>      {/* h1 */}
  <Section><Heading>Subsection</Heading>    {/* h2 */}
  </Section>
</Section>
```

---

## 7. Motion

Respect the user's setting. Vestibular disorders make large motion genuinely
painful.

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Nothing may flash more than three times per second. Anything auto-playing longer
than five seconds needs a pause control — that includes carousels and
indeterminate progress that never resolves.

---

## 8. Forms

- Associate every input with a label via `id` + `labelText`.
- Put errors in `invalidText`, not in a sibling `<span>`. Carbon wires
  `aria-describedby` and `aria-invalid`.
- Error text must say how to fix it: "Enter a valid email address" beats
  "Invalid".
- Mark required fields in the label text and with `required` — do not rely on a
  red asterisk alone.
- On submit failure, move focus to the first invalid field and summarize the
  errors in an `InlineNotification` above the form.
- `readOnly` for values that are visible but not editable; `disabled` removes
  the element from the tab order, which hides it from screen-reader users
  browsing by control.
- Group related controls in `<FormGroup legendText>` so the group name is
  announced with each control.

---

## 9. Checklist

Run this before calling any Carbon UI done.

- [ ] Every interactive element reachable and operable by keyboard
- [ ] Visible focus indicator everywhere; no bare `outline: none`
- [ ] Tab order matches visual order
- [ ] Esc closes every overlay; focus returns to the trigger
- [ ] Every icon-only control has a label
- [ ] Repeated controls have distinguishing labels
- [ ] Headings descend without skipping; exactly one `<h1>`
- [ ] Every input has a real label, not a placeholder
- [ ] Errors are in `invalidText` and say what to do
- [ ] No information conveyed by color alone
- [ ] Text contrast ≥4.5:1; UI boundaries ≥3:1
- [ ] No hex codes or opacity hacks substituting for tokens
- [ ] `prefers-reduced-motion` respected
- [ ] Landmarks present; `<main>` exists once
- [ ] Skip-to-content link present and first in the header
- [ ] Charts readable without color; data available another way
- [ ] Tested at 200% zoom and 320px width without horizontal scroll
- [ ] Tested with a screen reader on the primary flow

---

## 10. Testing

**Automated** catches maybe a third of issues — necessary, not sufficient.

- `jest-axe` / `@axe-core/react` in unit tests
- IBM Equal Access Accessibility Checker (browser extension and CLI) — this is
  the tool Carbon itself is validated against, and it encodes IBM's requirements
  beyond bare WCAG
- Lighthouse for a quick signal

**Manual** finds the rest:

- Tab through the entire flow using only the keyboard
- VoiceOver (macOS/iOS), NVDA (Windows), or TalkBack (Android)
- Zoom to 200% and reflow to 320px
- Force high-contrast / forced-colors mode
- Turn on reduce-motion

**Query by accessible name in tests.** Using `getByRole('button', { name: … })`
rather than a test id means your test fails when the accessible name breaks —
free regression coverage:

```js
screen.getByRole('button', { name: 'Delete deployment api-gateway' });
screen.getByLabelText('Email address');
```

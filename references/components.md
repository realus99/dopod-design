# Components — inventory and selection

Carbon ships ~150 components. Most "I'll just build a small custom one" moments
are cases where the component already exists. Scan this before writing custom
markup.

**Contents**

1. [Shared API conventions](#1-shared-api-conventions)
2. [Actions](#2-actions)
3. [Inputs and forms](#3-inputs-and-forms)
4. [Selection](#4-selection)
5. [Data display](#5-data-display)
6. [Navigation](#6-navigation)
7. [Feedback and status](#7-feedback-and-status)
8. [Overlays](#8-overlays)
9. [Layout and structure](#9-layout-and-structure)
10. [Loading and skeletons](#10-loading-and-skeletons)
11. [AI components](#11-ai-components)
12. [Choosing between similar components](#12-choosing-between-similar-components)
13. [Stability: `unstable__` exports](#13-stability-unstable-exports)

---

## 1. Shared API conventions

Learn these once and most components become predictable.

- **`size`** — `'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`, snapping to the height
  ladder (24/32/40/48/64/80). `md` is the default. Not every component supports
  every step.
- **`kind`** — on `Button`: the variant (`primary`, `secondary`, `tertiary`,
  `ghost`, `danger`, `danger--tertiary`, `danger--ghost`). `Tag` uses **`type`**
  for its color instead — a common mix-up.
- **`labelText` / `helperText` / `invalidText` / `warnText`** — the standard
  form-field text slots. Always provide `labelText`; use `hideLabel` if it must
  be visually hidden (it stays available to screen readers).
- **`invalid` / `warn` / `disabled` / `readOnly`** — boolean state flags. `invalid`
  takes precedence over `warn`.
- **`light`** — removed in v11. If you see it, the code is v10. Use `<Layer>`.
- **`className`** lands on the component's outermost element. Style through it;
  never target `.cds--*` internals.
- **`id`** is required on most form controls for label association.
- Icons are passed as the **component reference**, not an element:
  `renderIcon={Add}`, not `renderIcon={<Add />}`.

---

## 2. Actions

| Component | Use for |
|---|---|
| `Button` | Every action. `kind` sets hierarchy. |
| `ButtonSet` | A row of related buttons with correct spacing/order. |
| `IconButton` | Icon-only action **with a built-in tooltip**. |
| `CopyButton` / `Copy` | Copy-to-clipboard with confirmation feedback. |
| `MenuButton` | A button that opens a menu of actions. |
| `ComboButton` | A primary action plus a menu of related actions. |
| `OverflowMenu` | The "⋮" menu for row- or card-level actions. |
| `Menu` / `MenuItem` | Standalone and context menus. |
| `ContextMenu` | Right-click menu. |
| `Link` | Navigation, not action. If it changes state, it is a `Button`. |

**Button hierarchy.** One `primary` per view — it is the single most important
action. `secondary` for the alternative (Cancel). `tertiary` for a low-emphasis
action that still needs a border. `ghost` for the lowest emphasis, typically
inline or in a toolbar. `danger` for destructive actions, and pair it with a
confirmation `Modal` when the action is irreversible.

**Icon-only buttons must use `IconButton`**, not `Button` with an icon and no
text — `IconButton` wires the tooltip and accessible name for you.

```jsx
<Button kind="primary" renderIcon={Add} size="md">Create</Button>
<IconButton label="Delete" kind="ghost"><TrashCan size={16} /></IconButton>
```

---

## 3. Inputs and forms

| Component | Use for |
|---|---|
| `TextInput` | Single-line text. `TextInput.PasswordInput` for passwords. |
| `PasswordInput` | Password with reveal toggle. |
| `TextArea` | Multi-line text. |
| `NumberInput` | Numeric with steppers and min/max. |
| `Search` | Filtering/search fields. `ExpandableSearch` for toolbars. |
| `DatePicker` + `DatePickerInput` | Single, range, or simple date entry. |
| `TimePicker` + `TimePickerSelect` | Time with timezone select. |
| `FileUploader` | File upload; `FileUploaderDropContainer` for drag-and-drop. |
| `Slider` | Bounded numeric input where the range matters more than precision. |
| `Form`, `FormGroup`, `FormLabel`, `FormItem`, `Stack` | Form structure. |
| `FluidForm` and `Fluid*` inputs | The "fluid" style: label inside the field. |

**Fluid vs. classic.** Classic inputs put the label above the field. Fluid
inputs put the label *inside* the field's top edge, giving a taller, more
contained control. Fluid is for dense forms and side panels. Do not mix the two
styles in the same form. Note most `Fluid*` components are exported as
`unstable__Fluid*`.

**Form layout.** Use `<Stack gap={6}>` between fields, `<FormGroup legendText>`
for related groups. Do not hand-write margins.

```jsx
<Form>
  <Stack gap={6}>
    <TextInput id="name" labelText="Full name" helperText="As it appears on your ID" />
    <TextInput id="email" labelText="Email" invalid={!!error} invalidText={error} />
    <Button type="submit">Save</Button>
  </Stack>
</Form>
```

**Validation.** Put the message in `invalidText`, not in a sibling element —
Carbon wires `aria-describedby` and the error icon for you.

---

## 4. Selection

| Component | Use for |
|---|---|
| `Checkbox` / `CheckboxGroup` | Zero-or-more from a short list. |
| `RadioButton` / `RadioButtonGroup` | Exactly one from ≤5 visible options. |
| `RadioTile` / `TileGroup` | One from a few options where each needs description. |
| `Toggle` | An immediate on/off setting. No Save button. |
| `Select` / `SelectItem` | Native `<select>`. Simple, no search. |
| `Dropdown` | Custom single-select. Styleable, keyboard-complete. |
| `ComboBox` | Single-select **with type-ahead filtering**. |
| `MultiSelect` | Multi-select with checkboxes; `MultiSelect.Filterable` adds search. |
| `ContentSwitcher` / `Switch` | 2–4 mutually exclusive views of the same content. |
| `Tabs` / `Tab` / `TabPanel` | Sections of related content. |

**The selection decision, in order:**
- ≤5 options, all should be visible, pick one → `RadioButtonGroup`
- ≤5 options, options need explanation → `RadioTile`
- 5–15 options, pick one → `Dropdown`
- \>15 options, pick one → `ComboBox` (users need to type)
- Pick several → `MultiSelect` (add `.Filterable` past ~10)
- Switching *views*, not selecting *data* → `ContentSwitcher` or `Tabs`

`Toggle` applies immediately. If the change needs saving, use a `Checkbox`.

---

## 5. Data display

| Component | Use for |
|---|---|
| `DataTable` | Tabular data. Sorting, selection, expansion, batch actions, toolbar. |
| `Table` primitives | `TableHead`, `TableRow`, `TableCell`… when you need manual control. |
| `StructuredList` | Read-only key/value or comparison lists. Not for actions. |
| `ContainedList` | A titled list inside a container, with optional actions per row. |
| `OrderedList` / `UnorderedList` / `ListItem` | Prose lists. |
| `Tile` | The general surface. `ClickableTile`, `ExpandableTile`, `SelectableTile`. |
| `Card` | Newer structured content container. |
| `Tag` | Metadata and categories. `type` sets the color (`red`, `blue`, `green`, `gray`, `cool-gray`, `warm-gray`, `magenta`, `purple`, `teal`, `cyan`, `high-contrast`, `outline`). |
| `DismissibleTag` | A tag the user can remove — filter chips. |
| `SelectableTag` | A tag that toggles a selection. |
| `OperationalTag` | A tag that opens more detail on click. |
| `CodeSnippet` | Code. `type="single" | "multi" | "inline"`. |
| `Accordion` / `AccordionItem` | Progressive disclosure of sections. |
| `TreeView` | Hierarchical navigation or selection. |
| `Pagination` / `PaginationNav` | Paging. `PaginationNav` when you only need page numbers. |
| `AspectRatio` | Constrain media to a ratio. |
| `TruncatedText` | Text with ellipsis and an accessible full value. |
| `UserAvatar` | Person representation. |

**`DataTable` is the highest-leverage component in Carbon.** It handles sorting,
row selection with batch action toolbar, expandable rows, sticky headers, and
the search/filter toolbar. Rebuilding any of that by hand is almost always a
mistake. Use the render-prop API:

```jsx
<DataTable rows={rows} headers={headers} isSortable>
  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
    <TableContainer title="Deployments" description="Across all regions">
      <Table {...getTableProps()}>
        <TableHead>
          <TableRow>
            {headers.map((h) => (
              <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                {h.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} {...getRowProps({ row })}>
              {row.cells.map((cell) => <TableCell key={cell.id}>{cell.value}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )}
</DataTable>
```

`size="xs" | "sm" | "md" | "lg" | "xl"` controls row density — `sm` or `xs` for
data-heavy screens.

**Tile vs. Card.** `Tile` is the long-standing general-purpose surface and the
safe default. `Card` is newer and more opinionated about internal structure.
`ProductiveCard` and `ExpressiveCard` are a different package again — see
`references/ibm-products.md`.

---

## 6. Navigation

| Component | Use for |
|---|---|
| UI Shell (`Header`, `SideNav`, …) | The application frame. See `layout.md`. |
| `Breadcrumb` / `BreadcrumbItem` | Hierarchical position. |
| `Tabs` | Peer sections within a page. |
| `ProgressIndicator` | Multi-step process position (linear, ordered). |
| `Link` | Inline navigation. |
| `Switcher` / `SwitcherItem` | Product/app switching in the shell panel. |
| `PageHeader` (`unstable__PageHeader`) | Standardized page title area with breadcrumbs and actions. |

`Tabs` vs. `ContentSwitcher`: tabs for content sections a user browses;
content switcher for toggling representations of the *same* content
(table vs. chart). Tabs can hold many; content switcher tops out around four.

---

## 7. Feedback and status

| Component | Use for |
|---|---|
| `InlineNotification` | Message tied to a specific region. Non-dismissible by default. |
| `ToastNotification` | Transient, time-based message in a corner. |
| `ActionableNotification` | Notification that needs a user action. |
| `Callout` | Persistent contextual information. Exported alongside its older name `StaticNotification`; prefer `Callout`. |
| `Modal` / `ComposedModal` | Blocking confirmation or focused task. |
| `Toggletip` | Click-triggered popover with interactive content. |
| `Tooltip` | Hover/focus-triggered plain-text description. |
| `Popover` | Low-level positioned container to build on. |
| `ProgressBar` | Determinate or indeterminate progress. |
| `Loading` | Full-page or region spinner. |
| `InlineLoading` | Inline "Submitting…" → "Success" state on a button row. |
| `Tag` with `type` | Status via color. |
| `ShapeIndicator` / `IconIndicator` / `BadgeIndicator` | Status that must not rely on color alone. |
| `FullPageError` | Whole-page error state. |
| `ErrorBoundary` | React error boundary with Carbon presentation. |

**Notification choice:** if the user must act on it, `ActionableNotification`.
If it relates to a specific form or panel, `InlineNotification` placed next to
it. If it is a background event ("Export finished"), `ToastNotification`. Never
use a `Modal` for a message the user cannot act on.

**`Tooltip` vs `Toggletip`:** tooltip = hover, non-interactive, short text.
Toggletip = click, can contain links and buttons. Interactive content in a
tooltip is a keyboard trap.

---

## 8. Overlays

| Component | Use for |
|---|---|
| `Modal` | Simple confirm/alert with a fixed header/body/footer shape. |
| `ComposedModal` | Full control: `ModalHeader`, `ModalBody`, `ModalFooter`. |
| `Dialog` | Lower-level native `<dialog>` wrapper. |
| `SidePanel` | Side sheet for detail or edit flows without leaving the page. |
| `Popover` | Anchored floating content. |
| `Tearsheet` | Not in core Carbon — see `references/ibm-products.md`. |
| `InterstitialScreen` | Full-screen onboarding/intro sequence. |
| `Coachmark` | Product tour highlight. |

`Modal` blocks. Prefer `SidePanel` when the user needs the page context behind
it. Reserve `Modal` for decisions that must be resolved before continuing.

Set `danger` on a `Modal` for destructive confirmations and make the primary
button text the verb (`Delete`), not `OK`.

---

## 9. Layout and structure

| Component | Use for |
|---|---|
| `Grid` / `Column` | The 2x Grid. See `layout.md`. |
| `FlexGrid` / `Row` / `Column` | Legacy flexbox grid — migration only. |
| `Stack` | One-dimensional spacing between children. |
| `Layer` | Increment the layering context. |
| `Theme` / `GlobalTheme` | Apply a theme to a subtree. |
| `Section` / `Heading` | Automatic semantic heading levels. |
| `Text` (`unstable_Text`) | Text with direction/theme awareness. |
| `ClassPrefix` / `IdPrefix` | Change the `cds--` prefix or generated id prefix. |
| `FeatureFlags` | Opt into flagged behavior. |
| `HideAtBreakpoint` | Conditionally hide by breakpoint. |
| `OverflowHandler` | Show as many children as fit, overflow the rest. |
| `ScrollGradient` | Fade edges of a scrollable region. |
| `Resizer` | Resizable panes. |

---

## 10. Loading and skeletons

Every substantial component has a skeleton twin: `DataTableSkeleton`,
`SkeletonText`, `SkeletonPlaceholder`, `SkeletonIcon`, `AccordionSkeleton`,
`TextInputSkeleton`, `ButtonSkeleton`, and so on.

Use the skeleton that matches the component you are about to render, sized to
the real content. A generic gray box is worse than a skeleton that predicts the
layout, because the layout shift on load is what users actually notice.

For actions in flight, `InlineLoading` next to the button beats replacing the
whole region with a spinner.

---

## 11. AI components

`AILabel` (the AI attribution marker, formerly `Slug`), `AISkeleton*`,
`ChatButton`, and the `ai-*` / `chat-*` tokens. Covered in `ai.md`.

---

## 12. Choosing between similar components

| If you need… | Use | Not |
|---|---|---|
| A clickable card | `ClickableTile` | `Tile` with `onClick` |
| A card the user selects | `SelectableTile` | `Tile` + `Checkbox` |
| Type-ahead single select | `ComboBox` | `Dropdown` |
| A native select for a short list | `Select` | `Dropdown` |
| Row-level actions in a table | `OverflowMenu` | a row of `IconButton`s |
| Hover help text | `Tooltip` | `Toggletip` |
| A popover with a link inside | `Toggletip` | `Tooltip` |
| Status that colorblind users can read | `ShapeIndicator`/`IconIndicator` | `Tag` color alone |
| Read-only key/value pairs | `StructuredList` | `DataTable` |
| A list with per-row actions | `ContainedList` | `StructuredList` |
| Progress through a wizard | `ProgressIndicator` | `Tabs` |
| An icon-only button | `IconButton` | `Button` with only an icon |
| A dismissible category chip | `DismissibleTag` | `Tag` with the deprecated `filter` prop |
| Full-page loading | `Loading` | `SkeletonPlaceholder` at page size |

---

## 13. Stability: `unstable__` exports

Some components ship behind an `unstable__` (or `unstable_`) prefix. That prefix
is a contract: the API may change in a **minor** release.

Currently prefixed include: all `Fluid*` inputs, `PageHeader`, `ChatButton`,
`AISkeleton*`, `Slug` (superseded by `AILabel`), `IconIndicator`,
`ShapeIndicator`, `Layout`, `LayoutDirection`, `OverflowMenuV2`, `Text`,
`FeatureFlags`, `useFeatureFlag`.

They are fine to use — many are the best available option — but say so when you
introduce one, and pin the Carbon minor if the project cannot absorb churn.

The reverse also matters: `carbon-components-react` and `carbon-components` are
**deprecated**. Anything importing from them is v10 and should migrate. See
`audit.md`.

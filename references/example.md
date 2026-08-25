# A complete build, annotated

One small app, end to end, with the reasoning attached. Every other reference
explains a piece; this shows the pieces fitting together, which is the part that
is hard to infer from fragments.

It is a deployments console: a shell, a dashboard row, a table of deploys, and a
form to trigger one. Small enough to read in full, wide enough that most real
screens are a rearrangement of it.

**The annotations are the point.** The code is ordinary; what is worth copying is
*why* each token and component was chosen, because that is what generalises to
the screen you are actually building.

**Contents**

1. [The shape](#1-the-shape)
2. [Setup](#2-setup)
3. [The shell](#3-the-shell)
4. [The page](#4-the-page)
5. [Metric tiles](#5-metric-tiles)
6. [The table](#6-the-table)
7. [The form](#7-the-form)
8. [What to change when you copy this](#8-what-to-change-when-you-copy-this)

---

## 1. The shape

```
src/
  main.jsx                    entry, theme, shell
  styles/index.scss           Carbon config + theme
  AppShell.jsx                UI Shell — header, side nav
  pages/Deployments.jsx       2x Grid page composing the three sections
  components/
    MetricTiles.jsx           the dashboard row
    DeployTable.jsx           DataTable with sort, search, batch actions
    DeployForm.jsx            validated form in a modal
```

Nine files. The baseline for this task, with no Carbon guidance, hand-rolled
twenty-five and reimplemented a table.

---

## 2. Setup

```json
{
  "dependencies": {
    "@carbon/react": "^1.114.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": { "sass": "^1.77.0", "vite": "^5.4.0" }
}
```

`sass` is a real requirement, not a preference — Carbon ships `.scss`, and there
is no prebuilt CSS bundle for the React package.

```scss
// styles/index.scss
@use '@carbon/react/scss/config' with (
  $font-path: '@ibm/plex'
);
@use '@carbon/react';
```

Config must come **before** anything else `@use`s Carbon; Sass module
configuration only applies at first use. Putting `@use '@carbon/react'` above it
fails at build time with a message that does not obviously say so.

```jsx
// main.jsx
import { createRoot } from 'react-dom/client';
import { Theme } from '@carbon/react';
import './styles/index.scss';
import AppShell from './AppShell';

createRoot(document.getElementById('root')).render(
  // Theme as a component, not a CSS import. It sets the token custom properties
  // on a wrapper element, so a subtree can override it later — a g100 header
  // above a g10 body is one nested <Theme>, not a second stylesheet.
  <Theme theme="g100">
    <AppShell />
  </Theme>
);
```

---

## 3. The shell

```jsx
// AppShell.jsx
import {
  Content, Header, HeaderContainer, HeaderMenuButton, HeaderName,
  SideNav, SideNavItems, SideNavLink, SkipToContent, Theme,
} from '@carbon/react';
import { Dashboard, Rocket } from '@carbon/icons-react';
import Deployments from './pages/Deployments';

export default function AppShell() {
  return (
    <HeaderContainer
      // HeaderContainer owns the side-nav open/closed state and hands it down.
      // Managing that with your own useState is the common mistake — you then
      // have two sources of truth and the mobile menu button desynchronises.
      render={({ isSideNavExpanded, onClickSideNavExpand }) => (
        <>
          <Header aria-label="Deployments console">
            {/* First tab stop on the page. Keyboard users land here and can
                jump past the nav; without it they tab through every nav item
                on every page load. This is a WCAG bypass-blocks requirement,
                not a nicety. */}
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
              isCollapsible
              isActive={isSideNavExpanded}
              onClick={onClickSideNavExpand}
            />
            <HeaderName href="/" prefix="Acme">Deployments</HeaderName>
          </Header>

          {/* The shell is g100 while the content below is g10. Nesting the
              theme is how Carbon expresses that, and it keeps every token name
              identical on both sides — no second set of variables. */}
          <SideNav
            aria-label="Main navigation"
            expanded={isSideNavExpanded}
            onSideNavBlur={onClickSideNavExpand}
            isPersistent={false}
          >
            <SideNavItems>
              <SideNavLink renderIcon={Dashboard} href="#/overview">Overview</SideNavLink>
              <SideNavLink renderIcon={Rocket} href="#/deploys" isActive>Deployments</SideNavLink>
            </SideNavItems>
          </SideNav>

          <Theme theme="g10">
            {/* Content applies the header offset. A hand-rolled
                `padding-top: 3rem` breaks when the header height changes. */}
            <Content>
              <Deployments />
            </Content>
          </Theme>
        </>
      )}
    />
  );
}
```

---

## 4. The page

```jsx
// pages/Deployments.jsx
import { Grid, Column, Stack } from '@carbon/react';
import MetricTiles from '../components/MetricTiles';
import DeployTable from '../components/DeployTable';

export default function Deployments() {
  return (
    // condensed: 1px gutters instead of 32px. The right choice when tiles sit
    // edge to edge as one visual surface — a dashboard row reads as a unit.
    // Use the default wide grid for reading layouts, where 32px is the point.
    <Grid condensed>
      <Column sm={4} md={8} lg={16}>
        {/* Stack over margins. One gap declaration, and it stays on the
            spacing scale — sibling margins drift to 18px the first time
            someone eyeballs it. */}
        <Stack gap={7}>
          <MetricTiles />
          <DeployTable />
        </Stack>
      </Column>
    </Grid>
  );
}
```

Columns are declared per breakpoint against Carbon's 4/8/16 column counts —
`sm={4}` is full width on small, not a quarter. Getting this backwards produces
a layout that looks right on a laptop and collapses to a sliver on a phone.

---

## 5. Metric tiles

```jsx
// components/MetricTiles.jsx
import { Grid, Column, Tile, Layer } from '@carbon/react';

const METRICS = [
  { label: 'Deploys today', value: '18' },
  { label: 'Success rate', value: '96.2%' },
  { label: 'Mean duration', value: '4m 12s' },
  { label: 'Rollbacks', value: '1' },
];

export default function MetricTiles() {
  return (
    <Grid condensed as="section" aria-label="Deployment metrics">
      {METRICS.map((m) => (
        // Four across on large, two on medium, one on small. Four metrics on a
        // phone would each be ~90px wide and unreadable.
        <Column key={m.label} sm={4} md={4} lg={4}>
          {/* Layer bumps the contextual layer token one step. Tiles sit *on*
              the page background, so they need $layer to resolve one level up
              — without the wrapper they render the same colour as the page and
              the card edges disappear. */}
          <Layer>
            <Tile>
              <p className="metric__label">{m.label}</p>
              <p className="metric__value">{m.value}</p>
            </Tile>
          </Layer>
        </Column>
      ))}
    </Grid>
  );
}
```

```scss
// Type tokens, not font sizes. These carry size, weight, line-height and
// letter-spacing as one decision, and they stay consistent across breakpoints.
@use '@carbon/react/scss/type' as *;
@use '@carbon/react/scss/theme' as *;
@use '@carbon/react/scss/spacing' as *;

.metric__label {
  @include type-style('label-01');
  color: $text-secondary;          // secondary: supporting, still AA on $layer
  margin-block-end: $spacing-02;
}

.metric__value {
  @include type-style('heading-04');
  color: $text-primary;
}
```

---

## 6. The table

```jsx
// components/DeployTable.jsx
import {
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  TableContainer, TableToolbar, TableToolbarContent, TableToolbarSearch,
  Button, Tag, Layer,
} from '@carbon/react';

const headers = [
  { key: 'service', header: 'Service' },
  { key: 'env', header: 'Environment' },
  { key: 'status', header: 'Status' },
  { key: 'when', header: 'Deployed' },
];

export default function DeployTable({ rows = [], onDeploy }) {
  return (
    <Layer>
      <DataTable rows={rows} headers={headers} isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps,
            getToolbarProps, onInputChange }) => (
          <TableContainer
            title="Recent deployments"
            // Not decoration. It is the accessible description of the table,
            // and it is where you say what the data means.
            description="Last 50 deployments across all environments"
          >
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                {/* Filters client-side through DataTable's own state. Wiring
                    your own useState here means sorting and searching stop
                    knowing about each other. */}
                <TableToolbarSearch onChange={onInputChange} persistent />
                <Button onClick={onDeploy}>Deploy</Button>
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} size="sm">
              {/* size="sm": 32px rows. Dense data wants more rows on screen;
                  the default md is right for a short list you read carefully. */}
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    // getHeaderProps returns a key. Spreading it and *also*
                    // writing key={...} is the usual source of the React
                    // duplicate-key warning here.
                    const { key, ...rest } = getHeaderProps({ header });
                    return <TableHeader key={key} {...rest}>{header.header}</TableHeader>;
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const { key, ...rest } = getRowProps({ row });
                  return (
                    <TableRow key={key} {...rest}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.info.header === 'status'
                            ? <StatusTag value={cell.value} />
                            : cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </Layer>
  );
}

function StatusTag({ value }) {
  // type carries the meaning, and Tag renders a label — so the state is never
  // communicated by colour alone. A red dot with no text fails WCAG 1.4.1 and
  // is invisible to the ~4% of users with a red-green deficiency.
  const type = { failed: 'red', succeeded: 'green', running: 'blue' }[value] ?? 'gray';
  return <Tag type={type}>{value}</Tag>;
}
```

`Tag` takes **`type`**, not `kind` — `kind` is `Button`'s prop, and the two get
confused constantly. `filter`/`onClose` are deprecated in favour of
`DismissibleTag`.

---

## 7. The form

```jsx
// components/DeployForm.jsx
import { useState } from 'react';
import { Modal, Form, Stack, TextInput, Select, SelectItem } from '@carbon/react';

export default function DeployForm({ open, onClose, onSubmit }) {
  const [service, setService] = useState('');
  const [env, setEnv] = useState('staging');
  const [submitted, setSubmitted] = useState(false);

  const serviceInvalid = submitted && service.trim() === '';

  return (
    <Modal
      open={open}
      modalHeading="Deploy a service"
      primaryButtonText="Deploy"
      secondaryButtonText="Cancel"
      // A deploy to production is destructive in the way that matters: hard to
      // undo, visible to users. danger swaps the primary button to the red
      // token set and makes the consequence legible before the click.
      danger={env === 'production'}
      onRequestClose={onClose}
      onRequestSubmit={() => {
        setSubmitted(true);
        if (service.trim()) onSubmit({ service, env });
      }}
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        <Stack gap={6}>
          <TextInput
            id="service"
            labelText="Service name"
            // helperText is always visible; invalidText replaces it on error.
            // Putting the format hint only in the error message means the user
            // has to fail once to learn the rule.
            helperText="Lowercase, hyphen-separated"
            value={service}
            onChange={(e) => setService(e.target.value)}
            invalid={serviceInvalid}
            invalidText="Service name is required"
          />
          <Select
            id="env"
            labelText="Environment"
            value={env}
            onChange={(e) => setEnv(e.target.value)}
          >
            <SelectItem value="staging" text="Staging" />
            <SelectItem value="production" text="Production" />
          </Select>
        </Stack>
      </Form>
    </Modal>
  );
}
```

`invalid` + `invalidText` is the whole validation contract. Carbon renders the
error text, the red border, **and** the `aria-invalid` / `aria-describedby`
wiring together — a screen reader announces the message on focus. Styling a
border red yourself gets the appearance and none of that.

Validate on submit, not on every keystroke. Marking a field invalid while
someone is still typing their second character is the most common way a correct
form feels hostile.

---

## 8. What to change when you copy this

**Keep:** the shell composition, `<Layer>` around surfaces, `Stack` for
spacing, `DataTable`'s render props, `invalid`/`invalidText`, and every token
name. Those are the parts that survive a theme switch and an audit.

**Change deliberately:**

- **Theme.** `g100` shell over `g10` content suits an operations tool. A
  reading-heavy product usually wants `white` throughout.
- **Density.** `size="sm"` assumes scanning. Drop it for a table someone reads
  a row at a time.
- **Grid mode.** `condensed` because these tiles form one surface. A content
  page wants the default gutters.
- **Client-side table state.** `DataTable` sorts and filters what you pass it.
  Past a few thousand rows, move both to the server and let the component
  render only — see `components.md` §6.

**The check that catches most mistakes:** flip the theme to `g100` and look at
it. Anything that disappears, or stays stubbornly light, is a raw hex or a
hard-coded colour that has not been found yet.

# Data visualization — @carbon/charts

Carbon's charting library. Built on D3, themed from Carbon tokens, and — the
part that matters — it already solves the categorical color problem that most
hand-rolled charts get wrong.

Version pinned in `SKILL.md`; framework wrappers are
`@carbon/charts-react`, `@carbon/charts-angular`, `@carbon/charts-svelte`, and
`@carbon/charts-vue`.

**Contents**

1. [Install and basic use](#1-install-and-basic-use)
2. [The data shape](#2-the-data-shape)
3. [Chart types and when to use them](#3-chart-types-and-when-to-use-them)
4. [Theming](#4-theming)
5. [The dataviz color palettes](#5-the-dataviz-color-palettes)
6. [Options you should almost always set](#6-options-you-should-almost-always-set)
7. [Accessibility](#7-accessibility)
8. [When not to use a chart](#8-when-not-to-use-a-chart)

---

## 1. Install and basic use

```bash
npm install @carbon/charts-react @carbon/charts d3
```

```jsx
import { SimpleBarChart } from '@carbon/charts-react';
import '@carbon/charts/styles.css';   // or '@carbon/charts/scss' to compile

<SimpleBarChart data={data} options={options} />
```

If your build compiles Carbon's SCSS, import `@carbon/charts/scss` instead of
the prebuilt CSS so the charts share your theme configuration.

Non-React: `@carbon/charts` exports vanilla classes
(`new SimpleBarChart(element, { data, options })`), and each framework wrapper
mirrors the same `data` + `options` contract.

---

## 2. The data shape

Every chart takes a flat array of records — **not** nested series. This trips up
people coming from Chart.js or Recharts.

```js
const data = [
  { group: 'Dataset 1', key: 'Qty',      value: 65000 },
  { group: 'Dataset 1', key: 'More',     value: 29123 },
  { group: 'Dataset 2', key: 'Qty',      value: 32432 },
  { group: 'Dataset 2', key: 'More',     value: 21312 },
];
```

- `group` — the series. This is what gets a color and a legend entry.
- `key` — the categorical axis value.
- `value` — the numeric measure.
- For time series, use `date` instead of `key` and set the axis
  `scaleType: 'time'`.

Carbon derives the legend, color assignment, and tooltip content from these
fields, so name them correctly rather than remapping in options.

---

## 3. Chart types and when to use them

| Chart | Component | Use when |
|---|---|---|
| Simple bar | `SimpleBarChart` | Comparing one measure across categories |
| Grouped bar | `GroupedBarChart` | Comparing several series across categories |
| Stacked bar | `StackedBarChart` | Part-to-whole *and* total, across categories |
| Line | `LineChart` | Change over a continuous interval |
| Area / stacked area | `AreaChart`, `StackedAreaChart` | Magnitude of change over time; cumulative totals |
| Scatter | `ScatterChart` | Correlation between two measures |
| Bubble | `BubbleChart` | Correlation with a third measure as size |
| Donut / pie | `DonutChart`, `PieChart` | Part-to-whole, **≤5 slices**, differences are large |
| Gauge | `GaugeChart` | A single value against a target |
| Meter | `MeterChart` | A single value against a bounded scale, inline |
| Bullet | `BulletChart` | Value vs. target vs. qualitative ranges |
| Histogram | `HistogramChart` | Distribution of one continuous variable |
| Boxplot | `BoxplotChart` | Distribution and outliers across groups |
| Heatmap | `HeatmapChart` | Density across two categorical dimensions |
| Treemap / circle pack | `TreemapChart`, `CirclePackChart` | Hierarchical part-to-whole |
| Tree | `TreeChart` | Hierarchy structure |
| Alluvial | `AlluvialChart` | Flow between categories |
| Radar | `RadarChart` | Several measures for a few entities |
| Lollipop | `LollipopChart` | Bar-like comparison with many sparse categories |
| Choropleth | `ChoroplethChart` | Values by geography |
| Word cloud | `WordCloudChart` | Frequency in text — rarely the right answer |
| Combo | `ComboChart` | Two chart types on shared axes (bar + line) |

**Choosing well matters more than styling well.** The most common mistakes:

- **Donut/pie with many slices.** Past five, humans cannot compare angles. Use a
  bar chart sorted descending.
- **Line chart over a categorical axis.** A line implies continuity. If the
  x-axis is product names, use bars.
- **Stacked bars for comparison.** Only the bottom segment shares a baseline, so
  only it is comparable across bars. If comparison matters more than totals, use
  grouped bars.
- **Dual y-axes.** `ComboChart` allows it; use it sparingly, because two scales
  let you imply any correlation you like.

Set `options.data.loading = true` to render the built-in skeleton while data is
in flight — it matches the chart's final shape, unlike a generic spinner.

---

## 4. Theming

Pass the Carbon theme name so the chart's gridlines, axes, labels, and tooltips
follow the app:

```js
const options = {
  title: 'Requests per region',
  theme: 'g100',   // 'white' | 'g10' | 'g90' | 'g100'
  axes: {
    left:   { title: 'Requests', mapsTo: 'value' },
    bottom: { title: 'Region', mapsTo: 'key', scaleType: 'labels' },
  },
  height: '400px',
};
```

**Wire this to your app theme, not a constant.** In React, read it from the
`<Theme>` context or the same state that drives `<GlobalTheme>`. A chart still
in `white` inside a `g100` dashboard is the single most visible theming bug.

`height` must be set explicitly (a string with units). Charts have no intrinsic
height and will collapse to zero inside a flex or grid container otherwise.

---

## 5. The dataviz color palettes

This is the reason to use `@carbon/charts` rather than styling a generic chart
library with Carbon tokens: the categorical palettes are ordered so that
adjacent series stay distinguishable, including for the most common forms of
color vision deficiency.

**Light themes (`white`, `g10`) — 14-color categorical order:**

```
1  purple-70  #6929c4      8  blue-80     #002d9c
2  cyan-50    #1192e8      9  magenta-50  #ee5396
3  teal-70    #005d5d     10  yellow-50   #b28600
4  magenta-70 #9f1853     11  teal-50     #009d9a
5  red-50     #fa4d56     12  cyan-90     #012749
6  red-90     #520408     13  orange-70   #8a3800
7  green-60   #198038     14  purple-50   #a56eff
```

**Dark themes (`g90`, `g100`) — 14-color categorical order:**

```
1  purple-60  #8a3ffc      8  blue-50     #4589ff
2  cyan-40    #33b1ff      9  magenta-60  #d02670
3  teal-60    #007d79     10  yellow-40   #d2a106
4  magenta-40 #ff7eb6     11  teal-40     #08bdba
5  red-50     #fa4d56     12  cyan-20     #bae6ff
6  red-10     #fff1f1     13  orange-60   #ba4e00
7  green-30   #6fdc8c     14  purple-30   #d4bbff
```

Carbon also defines **monochrome** (single-hue sequential) and **divergent**
quantized palettes for heatmaps and choropleths, selected automatically by chart
type.

**Rules:**

- Take the colors **in order**. The sequence is the design; picking your
  favorites out of it destroys the adjacent-contrast property.
- Use as few series as the question needs. Fourteen distinguishable colors does
  not mean fourteen readable series.
- Do not use theme tokens (`$support-error`, `$interactive`) for series colors —
  they carry semantic meaning elsewhere in the UI, and reusing them makes a
  neutral series read as an error.
- **Do** use semantic tokens when a series *is* semantic: an "errors" line
  should be `$support-error`, a "success" area `$support-success`.
- Override with `options.color.scale` when a series has an established meaning
  in your product:

  ```js
  color: { scale: { Errors: '#da1e28', Success: '#24a148' } }
  ```

- Never encode meaning by color alone — see below.

---

## 6. Options you should almost always set

```js
const options = {
  title: 'Deployments over time',        // charts without titles are unreadable in isolation
  theme,                                  // from app state
  height: '400px',
  axes: {
    bottom: { title: 'Date', mapsTo: 'date', scaleType: 'time' },
    left:   { title: 'Count', mapsTo: 'value', includeZero: true },
  },
  legend:  { alignment: 'center' },
  tooltip: { enabled: true },
  toolbar: { enabled: false },            // enable for export/zoom when useful
  data:    { loading: isLoading },
};
```

- **`includeZero`** — leave it true for bar charts. A truncated baseline
  exaggerates differences. It is legitimate to set it false on a line chart
  where the variation is small relative to the absolute value, but say so on
  the axis.
- **Axis titles** — always. Units belong here, not in the tooltip.
- **`legend.enabled: false`** when there is exactly one series; the title
  already says what it is.
- **Number formatting** — set `ticks.formatter` on the axis rather than
  pre-formatting values into strings, or sorting and scaling break.

---

## 7. Accessibility

`@carbon/charts` renders SVG with roles and labels and supports keyboard
navigation between data points. What it cannot do for you:

- **Do not encode meaning by color alone.** Pair color with shape (line markers
  differ per series by default — keep that on), direct labels, or pattern fills.
- **Give the chart an accessible name** via `options.title`, and describe the
  takeaway in surrounding copy. A chart's insight should survive being read
  aloud.
- **Provide the data another way** for anything critical — an adjacent
  `DataTable`, or a "View as table" toggle using `ContentSwitcher`. This is also
  simply better UX for precise values.
- **Check contrast for text on the chart**, especially annotations placed over
  filled areas.
- **Respect `prefers-reduced-motion`** — disable the entrance animation.

See `accessibility.md` for the general checklist.

---

## 8. When not to use a chart

- **One number** → a `Tile` with `heading-04` type and a `label-01` caption.
  Optionally a sparkline. Not a gauge.
- **Precise values people will read individually** → `DataTable`. Charts are for
  shape and comparison, not lookup.
- **Two or three values** → a labelled list or a `MeterChart`. A pie chart with
  three slices communicates less than three labelled numbers.
- **A ratio against a target** → `MeterChart` or `ProgressBar` inline, which read
  faster than a gauge and take a fraction of the space.

If you are building charts outside `@carbon/charts` — inline SVG, a custom D3
render, a different library — everything in §5 through §7 still applies: take
the palette in order, title the axes, and never rely on color alone.

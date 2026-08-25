# Motion and animation

Carbon has a motion vocabulary most people never find, and almost no guidance on
applying it. This file covers both — and is explicit about which parts are
Carbon and which are ours.

**Two layers, always labelled:**

- **Carbon canon** — durations, easings, and the five named *surfaces*. Use
  these; they are what makes motion feel like Carbon rather than generic.
- **dopod house layer** — implementation techniques borrowed from
  shadcn/Radix, and patterns Carbon simply does not cover. Marked
  **`[house]`**. These are ours, not IBM's. Do not present them as Carbon.

That distinction is not pedantry. Misattributing a choice to a design system is
how a house style quietly becomes "what Carbon says", and nobody can tell later
which decisions were deliberate.

**Contents**

1. [The rule that prevents most bad motion](#1-the-rule-that-prevents-most-bad-motion)
2. [Carbon's named surfaces](#2-carbons-named-surfaces)
3. [Durations and easings](#3-durations-and-easings)
4. [Expand and collapse](#4-expand-and-collapse)
5. [Navigation](#5-navigation)
6. [Overlays](#6-overlays)
7. [Charts](#7-charts)
8. [State-driven transitions](#8-state-driven-transitions)
9. [Reduced motion](#9-reduced-motion)
10. [When not to animate](#10-when-not-to-animate)

---

## 1. The rule that prevents most bad motion

**Animate to explain a change, never to decorate one.** If the motion does not
help the user understand what just happened — where a thing came from, what it
turned into, what is still loading — it is costing attention for nothing.

Two practical consequences:

- **Entrances earn more motion than exits.** Something arriving needs to be
  understood; something leaving just needs to get out of the way. Carbon
  encodes this with separate `entrance` and `exit` easings.
- **Distance and size set duration.** A 200px panel sliding in is not the same
  as a checkbox ticking. Carbon's duration scale exists so you pick from six
  values, not from intuition.

---

## 2. Carbon's named surfaces

Carbon ships five **surfaces** — semantic names that bind a duration to an
easing for a specific kind of interaction. This is the vocabulary to reach for
first, because it removes the two decisions people get wrong.

| Surface | Duration | Easing | For |
|---|---|---|---|
| `disclosure` | `moderate-01` (150ms) | entrance, productive | Accordion, table-row expand — reveal in place |
| `contextual` | `fast-02` (110ms) | entrance, expressive | Icon → tooltip/popover — fade and scale |
| `stretch` | `slow-01` (400ms) | entrance, expressive | Reveal stretching from the vertical axis |
| `expand` | `moderate-02` (240ms) | standard, productive | Card → side panel/tearsheet — shared-element morph |
| `invoke` | `moderate-02` (240ms) | standard, expressive | Button → modal/menu — morph from the trigger |

```scss
@use '@carbon/react/scss/motion' as *;

.filter-panel {
  transition: surface(disclosure);
}
```

If a surface fits your interaction, use it. Reaching past it to hand-pick a
duration and easing is how two screens end up feeling different for no reason.

---

## 3. Durations and easings

When no surface fits, compose from the scale. Full token list in
`tokens.md` §10.

| Token | ms | Reach for it when |
|---|---|---|
| `$duration-fast-01` | 70 | State flip with no travel — checkbox, toggle |
| `$duration-fast-02` | 110 | Small fade, tooltip |
| `$duration-moderate-01` | 150 | **Default.** Small expansion, short movement |
| `$duration-moderate-02` | 240 | Panel, toast, anything crossing the viewport |
| `$duration-slow-01` | 400 | Large expansion, important interruption |
| `$duration-slow-02` | 700 | Background dimming, hero transitions |

**Productive vs expressive** is the other axis. Productive for work UI that
should feel instant; expressive for moments that deserve attention. A settings
toggle is productive. An onboarding reveal is expressive. Getting this backwards
makes an app feel either sluggish or frantic.

```scss
transition: transform $duration-moderate-02 motion(entrance, expressive);
```

---

## 4. Expand and collapse

`Accordion`, `TreeView`, and `Tile` animate themselves — use them and this is
handled. Everything else you build by hand.

The hard part is animating to a height you do not know. **`height: auto` is not
animatable**, which is why so many disclosure animations either jump or get
hard-coded to a wrong pixel value.

There are two good answers. Reach for the first unless you need what the second
gives you.

**`[house]` — the grid technique. Start here.** A grid row animates between
`0fr` and `1fr`, and `fr` resolves against the content's own height — so the
browser does the measuring and you write no JavaScript at all:

```jsx
<div className="disclosure" data-state={open ? 'open' : 'closed'}>
  <div className="disclosure__inner">{children}</div>
</div>
```

```scss
@use '@carbon/react/scss/motion' as *;

.disclosure {
  display: grid;
  transition: grid-template-rows surface(disclosure);

  &[data-state='closed'] { grid-template-rows: 0fr; }
  &[data-state='open']   { grid-template-rows: 1fr; }
}

.disclosure__inner {
  overflow: hidden;   // without this the content spills out of the 0fr row
  min-block-size: 0;  // grid items default to min-content; this lets it reach 0
}
```

The wrapper element is required — the animating row and the clipped content
cannot be the same element. Both declarations on `__inner` are load-bearing;
leaving either out is why this technique sometimes gets written off as not
working. Content that resizes while open is handled for free, which is the part
the measured approach gets wrong.

**`[house]` — the measured-height technique**, borrowed from Radix. Reach for it
when you need the height as an actual value — to drive a second animation, to
scroll the panel into view, or when a wrapper element is not available. Measure
once, publish the height as a custom property, animate to it:

```jsx
const ref = useRef(null);
const [height, setHeight] = useState(0);

useLayoutEffect(() => {
  if (ref.current) setHeight(ref.current.scrollHeight);
}, [children]);

<div
  className="disclosure"
  data-state={open ? 'open' : 'closed'}
  style={{ '--disclosure-height': `${height}px` }}
>
  <div ref={ref}>{children}</div>
</div>
```

```scss
@use '@carbon/react/scss/motion' as *;

.disclosure {
  overflow: hidden;
  transition: height surface(disclosure);   // Carbon's own disclosure timing

  &[data-state='closed'] { height: 0; }
  &[data-state='open']   { height: var(--disclosure-height); }
}
```

The timing is Carbon's in both; only the mechanism is ours.

The cost of this one is a layout read on every content change. If `children`
changes and you forget the dependency, the panel animates to a stale height —
the failure the grid technique cannot have.

**Modern alternative:** `interpolate-size: allow-keywords` makes `height: auto`
animatable directly. Support is real but not universal — use it as a
progressive enhancement behind `@supports`, not as the only path.

---

## 5. Navigation

**Side nav collapse.** Animate `width`, not `transform` — the content beside it
must reflow, and a transform would leave a gap or overlap.

```scss
.side-nav {
  inline-size: 16rem;                    // 256px, Carbon's side nav width
  transition: inline-size $duration-moderate-02 motion(standard, productive);

  &[data-state='collapsed'] { inline-size: 3rem; }   // 48px rail
}
```

Labels need to disappear *before* the width finishes, or they wrap mid-animation
and look broken:

```scss
.side-nav__label {
  opacity: 1;
  transition: opacity $duration-fast-01 motion(exit, productive);
  .side-nav[data-state='collapsed'] & { opacity: 0; }
}
```

**`[house]` — tab indicator.** Carbon's `Tabs` does not slide its underline.
Animating it reads as a meaningful upgrade because it shows *where you came
from*:

```scss
.tab-indicator {
  transition: transform $duration-moderate-01 motion(standard, productive),
              inline-size $duration-moderate-01 motion(standard, productive);
}
```

Drive `transform: translateX()` and `inline-size` from the active tab's
measured position.

---

## 6. Overlays

`Modal`, `Popover`, `Toggletip`, and `SidePanel` animate themselves. Match their
timing when building something custom, or the new thing will feel foreign beside
them.

| Overlay | Surface | Motion |
|---|---|---|
| Popover, tooltip | `contextual` | Fade + slight scale from the trigger |
| Modal | `invoke` | Fade + rise, backdrop fades over `slow-02` |
| Side panel | `expand` | Slide from the edge |
| Toast | — | Slide in over `moderate-02`, out over `fast-02` |

**`[house]` — origin-aware reveal.** Radix's most-copied trick: scale from the
side the popover is anchored to, so it appears to grow out of its trigger rather
than materialise nearby.

```scss
.popover[data-state='open'] {
  animation: popover-in $duration-fast-02 motion(entrance, expressive);
}
.popover[data-side='top']    { transform-origin: bottom center; }
.popover[data-side='bottom'] { transform-origin: top center; }

@keyframes popover-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
```

Keep the scale delta small — 0.96, not 0.8. Large scale reads as playful, which
is wrong for a data-dense product.

---

## 7. Charts

`@carbon/charts` exposes exactly **one** control: `animations?: boolean`, on by
default. No duration, no easing, no stagger.

```js
const options = { animations: true, data: { loading: isLoading } };
```

Use `data.loading` for the in-flight state — the skeleton matches the chart's
final shape, so there is no layout jump when data arrives.

**`[house]` — anything beyond on/off** means CSS on the rendered SVG. Carbon
cannot express these, so they are ours.

**Trendline draw-on** uses the dash-offset technique:

```scss
.cds--line path.line {
  stroke-dasharray: var(--line-length);
  stroke-dashoffset: var(--line-length);
  animation: draw-line $duration-slow-01 motion(entrance, expressive) forwards;
}
@keyframes draw-line { to { stroke-dashoffset: 0; } }
```

Set `--line-length` from `path.getTotalLength()` after render.

**Pie and donut sweep** — rotate the group and fade in. Do not animate arc
angles individually; it reads as a slot machine.

```scss
.cds--pie-group {
  animation: sweep $duration-moderate-02 motion(entrance, productive);
  transform-origin: center;
}
@keyframes sweep {
  from { transform: rotate(-90deg); opacity: 0; }
  to   { transform: rotate(0); opacity: 1; }
}
```

**Series stagger** — 40–60ms between series. More than ~80ms and the chart feels
slow; the whole entrance should complete inside `slow-01`.

```scss
.cds--bar-group:nth-child(n) { animation-delay: calc((var(--i)) * 50ms); }
```

**Never animate on data update in a monitoring context.** A dashboard that
re-animates every poll is unreadable. Animate on first render only, and diff
quietly thereafter.

---

## 8. State-driven transitions

**`[house]`** — the Radix convention, and the reason its animations are easy to
reason about: put state in a `data-*` attribute and let CSS respond, instead of
toggling classes imperatively.

```jsx
<div data-state={isOpen ? 'open' : 'closed'} data-side="bottom">
```

Why it is worth adopting: the state is inspectable in devtools, CSS stays
declarative, and enter/exit are expressed in one place. It also composes with
Carbon components, which already emit their own `data-*` state.

**Exit animations need the element to survive its own removal.** React unmounts
immediately, so an exit transition never runs. Either keep it mounted until the
transition ends, or use `motion` — which `@carbon/react` already depends on
(`motion@^12`), so it costs no new dependency:

```jsx
import { AnimatePresence, motion } from 'motion/react';

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.24, ease: [0.2, 0, 0.38, 0.9] }}  // moderate-02, standard productive
    />
  )}
</AnimatePresence>
```

Note the easing array is Carbon's `standard/productive` curve. Reach for
Carbon's numbers even when the library is not Carbon's.

---

## 9. Reduced motion

**Non-negotiable.** Vestibular disorders make large motion genuinely painful,
and this is a WCAG obligation, not a preference.

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Two things the blanket rule does not cover:

- **Turn chart animation off explicitly** — it is JS-driven, so CSS cannot
  reach it:
  ```js
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const options = { animations: !reduce };
  ```
- **Reduced motion is not no feedback.** Replace movement with an instant state
  change, never with nothing — the user still needs to know something happened.

Every pattern in this file has a reduced-motion form. If you add one that does
not, it is not finished.

---

## 10. When not to animate

- **Data updating in place.** A number changing in a monitoring dashboard should
  just change. Animation makes it harder to read and implies an event occurred.
- **Anything above ~700ms.** Past `slow-02` the user is waiting on you.
- **Loading states that could be skeletons.** A skeleton predicting the layout
  beats a spinner; use `data.loading` for charts and the matching `*Skeleton`
  component elsewhere.
- **More than one thing at a time in the same region.** Two competing
  animations read as jank, however well-timed each is alone.
- **Anything the user triggers repeatedly.** A filter toggle animating on every
  click becomes an obstacle by the fifth use. Keep those at `fast-01` or
  instant.

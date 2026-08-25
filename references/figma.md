# Figma and the design-token pipeline

Where the handoff actually breaks: a designer sends a value, and the value is
not a token. This covers how to find the token they meant, what to do when there
isn't one, and how to stop it recurring.

**Contents**

1. [The two ends of the pipeline](#1-the-two-ends-of-the-pipeline)
2. [Mapping a Figma value to a code token](#2-mapping-a-figma-value-to-a-code-token)
3. [Which direction is truth](#3-which-direction-is-truth)
4. [Tokens Studio](#4-tokens-studio)
5. [When the value is off-scale](#5-when-the-value-is-off-scale)
6. [Automating the check](#6-automating-the-check)

---

## 1. The two ends of the pipeline

**In Figma**, Carbon's colors are published as **variables**, and the library
carries all four themes — White, Gray 10, Gray 90, Gray 100 — the same set the
code has. A designer switching a frame between themes is switching the same
variable collection you switch with `<Theme>`.

**In code**, Carbon publishes machine-readable tokens in
[DTCG](https://tr.designtokens.org/format/) format, in the Carbon repo at
`packages/themes/src/dtcg/`:

```
dtcg/
  white.json  g10.json  g90.json  g100.json
  components/   button.json, tag.json, notification.json, status.json, …
```

Each entry carries its type, value, and a description of what it is *for*:

```json
"field": {
  "01": {
    "$type": "color",
    "$value": "{gray.10}",
    "$description": "Default input field background"
  }
}
```

Two things follow from that shape, and both matter later. Values are often
**aliases** (`{gray.10}`) rather than literals, so the same semantic token
resolves differently per theme. And the `$description` is the authoritative
statement of a token's role — it is the fastest way to check you picked the
right one.

**Verify against your installed version, not this file.** The token set moves;
`node_modules/@carbon/themes` is the copy your build actually uses.

---

## 2. Mapping a Figma value to a code token

**Map by role, never by hex.** This is the single rule that matters.

Within any one theme, several tokens resolve to the same color. Picking by hex
picks one of them arbitrarily, and it is right until the theme changes or the
role diverges in a later release — at which point one element moves and the
others do not, and nothing in the diff explains why.

The order that works:

1. **Ask what the element is**, not what it looks like. Page background,
   raised surface, input field, divider, secondary text, disabled control.
2. **Find the token whose `$description` says that.** `tokens.md` groups them by
   role; the DTCG JSON has the description inline.
3. **Only then check the value matches**, as a confirmation that you picked
   right — not as the way you picked.

If a designer hands you a hex with no context, the useful question is not "which
token is `#f4f4f4`" but **"what is this element?"** The answer names the token.

When the layer *is* named after a Carbon variable, that name is the answer —
take it directly and skip the lookup.

---

## 3. Which direction is truth

Carbon's own tokens flow **one way: Carbon → your code**. They arrive with
`@carbon/themes`, they are versioned with it, and an upgrade updates them.

A Figma export must never overwrite them. Doing so forks the design system: the
next `npm update` silently reverts your file, or worse, does not, and you are
now on a private snapshot of Carbon that no longer receives fixes.

What legitimately flows **Figma → code** is your *own* layer — brand colors,
product-specific semantic tokens, anything Carbon does not define. Keep it in a
separate file that consumes Carbon rather than replacing it:

```scss
@use '@carbon/react/scss/theme' as *;

// Ours. Defined in terms of Carbon's, so a theme switch still works.
$brand-accent: #6929c4;
$callout-background: $layer-02;
```

The test for whether a token belongs to you: **would Carbon ever ship it?** If
yes, use theirs even if the Figma file has its own copy.

---

## 4. Tokens Studio

Tokens Studio reads and writes DTCG, which is the same format Carbon publishes —
so the two interoperate without a translation layer. That is the reason to
prefer it over an ad-hoc plugin export.

Two cautions specific to Carbon:

- **Do not round-trip Carbon's tokens through it.** Import them as a read-only
  reference set if you want them visible in Figma; generating SCSS from that
  export and committing it recreates the fork in §3.
- **Aliases must survive the export.** If `{gray.10}` gets flattened to
  `#f4f4f4` on the way out, every theme collapses into whichever one was active
  at export time. A flattened export is the usual cause of "dark mode works in
  Figma but not in the build".

Check an export for literal hex values where the source had aliases. If they are
there, the export is not usable.

---

## 5. When the value is off-scale

A designer sends `18px`. The spacing scale has 16 (`$spacing-05`) and 24
(`$spacing-06`). There is no 18, and there will not be one.

**The scale is not a constraint on the design, it is the reason the design
survives contact with real content.** Every Carbon component's internal padding
is on it; an 18px gap next to a 16px one reads as a mistake at a glance, and
nobody can say which is intentional six months later.

So the conversation is not "we can't do 18". It is **"16 or 24 — which is the
intent?"** Framed that way it is a design decision, quickly made, and it usually
turns out the 18 was a nudge to fix something else — an alignment problem that a
grid column or a different type token solves properly.

The same holds for type: font sizes come from type tokens, which bundle size,
weight, line-height, and letter-spacing as one decision. A one-off `17px`
discards the other three.

**When it is genuinely not on the scale.** Optical alignment, an icon that sits
2px low, a third-party embed with fixed dimensions. These are real. Handle them
explicitly rather than by widening the scale:

```scss
.logo {
  // Optical: the mark's baseline sits 2px above its bounding box.
  // Deliberate, not a missed token.
  margin-block-start: -2px;
}
```

One comment naming it as intentional is the whole difference between a
considered exception and drift.

---

## 6. Automating the check

The conversation in §5 does not scale. Make the machine find them.

**Stylelint** catches raw values in the properties that should be tokens:

```json
{
  "rules": {
    "declaration-property-value-disallowed-list": {
      "/^(padding|margin|gap|row-gap|column-gap)/": ["/^-?\\d+px$/"],
      "/^(color|background|background-color|border-color)$/": ["/^#/"]
    }
  }
}
```

Two notes on making this stick. Scope it to your own styles — it should never
run over `node_modules` or generated files. And allow negative pixel values
only if you mean to permit the optical-alignment case in §5; the rule above
catches them, which is usually what you want, with an inline
`/* stylelint-disable-next-line */` and a reason as the escape hatch.

**In review**, the fastest check needs no tooling: **switch the theme to `g100`
and look**. Anything that disappears, stays stubbornly light, or loses its edges
is a hard-coded value the linter did not reach — an inline style, a
CSS-in-JS object, an SVG `fill`.

**What not to automate.** Do not fail a build on a token *choice* — `$layer-01`
versus `$layer-02` is a judgment a linter cannot make, and a rule that guesses
gets disabled within a week. Automate the objective part (is this a raw value
where a token belongs) and leave the semantic part to review.

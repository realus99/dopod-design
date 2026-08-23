# Carbon for AI

Carbon has a dedicated visual language for AI-generated and AI-assisted content.
Its purpose is **provenance**: a user should be able to tell at a glance which
parts of an interface came from a model, and get to an explanation of why.

That makes this the one part of Carbon where the styling is doing ethical work.
Applying the AI treatment to non-AI content is not a harmless aesthetic choice —
it misrepresents where information came from. Applying nothing to AI content is
the same problem in reverse.

**Contents**

1. [The AI label](#1-the-ai-label)
2. [Attaching AI treatment to components](#2-attaching-ai-treatment-to-components)
3. [AI tokens](#3-ai-tokens)
4. [Chat](#4-chat)
5. [AI-specific patterns](#5-ai-specific-patterns)
6. [What not to do](#6-what-not-to-do)

---

## 1. The AI label

`AILabel` (formerly `Slug` — that name is deprecated) is the sparkle marker that
identifies AI-generated content and opens an explanation.

```jsx
import { AILabel, AILabelContent, AILabelActions, Button } from '@carbon/react';

<AILabel size="xs" align="bottom-right" autoAlign>
  <AILabelContent>
    <p className="secondary">AI Explained</p>
    <h2 className="ai-label-heading">Forecast confidence</h2>
    <p className="secondary bold">84% confidence</p>
    <p className="secondary">
      This projection is generated from the last 90 days of usage and does not
      account for planned capacity changes.
    </p>
    <AILabelActions>
      <Button kind="ghost" size="sm">View source data</Button>
    </AILabelActions>
  </AILabelContent>
</AILabel>
```

Props:

- `size` — `'mini' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'`. Match the density
  of what it annotates: `mini`/`2xs` inside table cells, `xs`/`sm` on form
  fields and tiles, `md`+ for section-level attribution.
- `kind` — `'default'` (the standalone sparkle button) or `'inline'` (a text
  affordance that sits in a line of content).
- `align` / `autoAlign` — popover placement. Use `autoAlign` so the callout
  flips instead of clipping near a viewport edge.
- `aiText` (default `"AI"`) and `textLabel` for the inline variant.
- `revertActive` / `revertLabel` — for content the user can revert to its
  pre-AI value after an AI edit.

**Always put a real explanation inside `AILabelContent`.** A label that opens to
nothing is worse than no label — it signals "AI was involved" and then refuses
to say how. Say what generated it, what it was based on, and how confident it
is. Put the escape hatch (view sources, edit, revert) in `AILabelActions`.

---

## 2. Attaching AI treatment to components

Carbon components accept a **`decorator`** prop that both places the label and
applies the AI visual treatment — the gradient border and aura that mark the
whole element as AI-touched.

```jsx
<TextInput
  id="summary"
  labelText="Summary"
  decorator={<AILabel size="mini">…</AILabel>}
/>

<Tile hasRoundedCorners decorator={<AILabel size="xs">…</AILabel>}>
  AI-generated recommendation
</Tile>
```

Supported on inputs, dropdowns, tiles, table rows/cells, modals, and more.

**`slug` is the deprecated name for this prop** and will be removed in the next
major. If you see `slug={<Slug>…}` in a codebase, migrate it to
`decorator={<AILabel>…}`.

`hasRoundedCorners` on `Tile` is part of the AI language — AI surfaces are the
exception to Carbon's square-corner rule, because the softer shape is part of
how the treatment reads as distinct.

---

## 3. AI tokens

Theme tokens dedicated to AI surfaces. They exist in all four themes and resolve
appropriately in each.

**Surface and aura**

`$ai-aura-start` · `$ai-aura-start-sm` · `$ai-aura-end` · `$ai-aura-hover-start`
· `$ai-aura-hover-end` · `$ai-aura-hover-background` · `$ai-inner-shadow`
· `$ai-drop-shadow` · `$ai-overlay`

**Border**

`$ai-border-start` · `$ai-border-end` · `$ai-border-strong`

The AI border is a **gradient** from `-start` to `-end`, not a solid color. That
gradient is the recognizable signal; a flat blue border is not the AI treatment.

**Popover**

`$ai-popover-background` · `$ai-popover-shadow-outer-01/02`
· `$ai-popover-caret-center` · `$ai-popover-caret-bottom`
· `$ai-popover-caret-bottom-background` · `$ai-popover-caret-bottom-background-actions`

**Skeleton**

`$ai-skeleton-background` · `$ai-skeleton-element-background`

Use `AISkeletonText` / `AISkeletonPlaceholder` / `AISkeletonIcon` (exported as
`unstable__AiSkeleton*`) while AI content generates, so the loading state is
also marked as AI.

You rarely need to write these tokens directly — `decorator` applies them. Reach
for them when building a custom AI surface Carbon doesn't cover.

---

## 4. Chat

Carbon ships tokens for conversational UI, though not a full chat component in
core.

`$chat-shell-background` · `$chat-header-background` · `$chat-header-text`
· `$chat-bubble-user` · `$chat-bubble-user-text` · `$chat-bubble-agent`
· `$chat-bubble-agent-text` · `$chat-bubble-border`
· `$chat-prompt-background` · `$chat-prompt-border-start`
· `$chat-prompt-border-end` · `$chat-prompt-text`
· `$chat-avatar-user` · `$chat-avatar-agent` · `$chat-avatar-bot`
· `$chat-button` · `$chat-button-hover` · `$chat-button-active`
· `$chat-button-selected` · `$chat-button-text-hover` · `$chat-button-text-selected`

Three distinct avatar tokens — `user`, `agent` (a human agent), `bot` (AI) —
because "who am I talking to" is a distinction users need. Do not collapse
`agent` and `bot`.

`ChatButton` (`unstable__ChatButton`) is the suggestion/prompt-chip button for
chat surfaces.

The prompt input uses the gradient border (`$chat-prompt-border-start` →
`-end`), tying it back to the AI language.

---

## 5. AI-specific patterns

**Progressive disclosure of provenance.** Label first, one-line explanation on
open, deeper sources behind an action. Do not dump a full citation list into the
popover.

**Confidence.** If the model produces a confidence value, show it — as text, not
as a color-coded badge alone. If it does not, do not invent one.

**Editability.** AI-generated values in form fields should stay editable, and
once the user edits one, the AI treatment should come off that field: it is
their content now. `revertActive` / `revertLabel` support the inverse — letting
them get back to the AI value.

**Streaming.** Use `AISkeletonText` before the first token, then render
progressively. Keep the container's height stable so the page does not jump.

**Failure.** When generation fails, use an `InlineNotification` in the AI
surface's place, not a toast — the failure belongs where the content would have
been. Offer retry.

**Table cells.** Use `size="mini"` on the `AILabel` and put it on the cell, not
the row, when only some values are generated. Marking a whole row implies more
than is true.

---

## 6. What not to do

**Do not use AI tokens for non-AI UI.** The gradient border and aura are a
claim about provenance. Using them because they look nice makes the signal
meaningless and misleads users about where information came from. This is the
one Carbon rule where the cost of breaking it lands on the user rather than the
codebase.

**Do not mark AI content without an explanation.** An `AILabel` with empty or
generic content ("This was generated by AI") gives the user no way to judge
whether to trust it.

**Do not round corners globally** because AI surfaces are rounded.
`hasRoundedCorners` is scoped to the AI treatment.

**Do not use `Slug`.** It is deprecated in favor of `AILabel`, and the `slug`
prop in favor of `decorator`.

**Do not hide the AI treatment to make an interface feel more polished.** If a
stakeholder asks to remove AI attribution from AI-generated content, that is a
substantive product decision about disclosure, not a styling preference — raise
it rather than quietly implementing it.

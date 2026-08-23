# dopod-design

Carbon Design System guidance, installable as a skill into Claude Code, Cursor,
GitHub Copilot, and OpenAI Codex. Published to npm as
[`dopod-design`](https://www.npmjs.com/package/dopod-design); source at
[`realus99/dopod-design`](https://github.com/realus99/dopod-design).

> **The local folder is `a-design-skill` but the package and repo are
> `dopod-design`.** Historical; the package was renamed from `carbon-design` to
> avoid proximity to IBM's `@carbon/*` branding. Don't be misled by the path.

## Orient here first

| Question | Read |
|---|---|
| Why is it built this way? | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| What's planned and why? | [`docs/BACKLOG.md`](docs/BACKLOG.md) + [issues](https://github.com/realus99/dopod-design/issues) |
| What changed and when? | [`CHANGELOG.md`](CHANGELOG.md) |
| How do I release it? | Private repo `realus99/dopod-design-admin` |
| What did we measure? | `evals/README.md` in that same private repo |

Project history, decisions and their rationale, and current state live in
`CONTEXT.md` in the private `realus99/dopod-design-admin` repo. Read it before
resuming substantial work — it explains *why*, which this repo mostly doesn't.

## Working on it

```bash
npm run build     # regenerate dist/ from SKILL.md + references/
npm test          # 95 tests, node --test, no deps to install
```

**Edit only `SKILL.md` and `references/*.md`.** Everything in `dist/` is
generated — changes there are overwritten on the next build.

Adding a reference file means adding it to `REFERENCES` in `lib/build.js` (slug,
description, glob) *and* the `SKILL.md` routing table. The build fails if the
file is missing, so a half-added reference can't ship.

## Constraints that are not negotiable

- **Zero dependencies**, runtime and dev. This package writes files into other
  people's repositories; a small surface is part of why that's acceptable.
- **Never overwrite a file we didn't write.** `AGENTS.md` and
  `copilot-instructions.md` are merged inside marker blocks. `uninstall` must
  return a pre-existing file byte-identical — there's a test for it.
- **Emitted files are prefixed `dopod-design-`, not `dopod-`.** The sibling
  package `@urmindra/dopod-design-carbon` already owns `dopod-tokens.mdc` and
  `dopod-components.mdc` in `.cursor/rules/`; both may be installed together.
- **Renaming an emitted file or changing install paths is a breaking change**,
  even though it looks cosmetic — existing installs can no longer be cleanly
  updated or removed.
- **Content claims are sourced from the Carbon repo**, not from recall. When
  updating tokens, components, or versions, fetch from
  `raw.githubusercontent.com/carbon-design-system/carbon/main/packages/...`.
  The docs site lags the repo.

## Two things known to be true and easy to get wrong

**`@carbon/vue` and `carbon-components-svelte` are still Carbon v10.** Writing
v11 token names into either silently resolves to nothing. This is the skill's
sharpest insight and the claim most likely to quietly go stale — see
[#3](https://github.com/realus99/dopod-design/issues/3).

**The skill's trigger recall is 6/10 on prompts that never say "Carbon"**, with
zero false positives. The package name carries triggering signal, and
`dopod-design` is opaque where `carbon-design` was not. Rewording the
description does not recover it — that was measured. See
[#4](https://github.com/realus99/dopod-design/issues/4).

## Publishing

Requires an npm granular access token with **bypass 2FA**. Account 2FA is
disabled, so `npm publish --otp=...` always fails with `E403` regardless of the
code — the error message actively misleads here. Full runbook in the private
admin repo.

#!/usr/bin/env python3
"""Add Success criteria + Definition of done to every backlog issue.

Fetches each issue body, strips the old ad-hoc "Acceptance" block and the
backlog footer, then re-appends a consistent pair of sections:

  Success criteria — observable, measurable outcomes. How you know it worked.
  Definition of done — the completeness bar. What must be true to close it.

Idempotent: re-running replaces the generated sections rather than stacking
them, so criteria can be revised in this file and pushed again.
"""
import json
import re
import subprocess
import sys

REPO = "realus99/dopod-design"
BACKLOG = f"https://github.com/{REPO}/blob/main/docs/BACKLOG.md"

# Applies to every issue. Stated once here rather than repeated 21 times.
SHARED_DOD = [
    "`npm test` passes; new behaviour has tests covering it",
    "`npm run build` succeeds and is reproducible (a rebuild yields identical file hashes)",
    "No new runtime dependencies — the package stays zero-dependency",
    "`CHANGELOG.md` updated under the target version",
    "User-visible changes reflected in `README.md` and `--help` where relevant",
    "Merged to `main` via PR; this issue closed by that merge",
]

# ref -> (success criteria, issue-specific definition-of-done items)
ITEMS = {
1: ([
    "`npm run check:upstream` exits 0 against the current release and non-zero once any tracked upstream fact moves",
    "Seeded-regression test passes: corrupt one token name in `references/tokens.md`, and the script fails naming that exact token",
    "All five surfaces covered — theme tokens, component inventory, spacing/motion/type values, package versions, `unstable__` exports",
    "Completes in under 60s using only public GitHub and npm endpoints, no auth",
], [
    "Script at `scripts/check-upstream.js`, wired to `npm run check:upstream`",
    "Scheduled weekly in CI and run on PR",
    "On drift, the scheduled run opens or updates a single tracking issue rather than filing a duplicate each week",
    "README documents how to run it and how to accept a legitimate upstream change",
]),
2: ([
    "Editing a version in `versions.json` and rebuilding updates the `SKILL.md` block and nothing else",
    "Build fails loudly if `versions.json` and the rendered block disagree",
    "`grep` finds no hard-coded `@carbon/*` version numbers left in prose anywhere in `SKILL.md` or `references/`",
], [
    "`versions.json` committed as the single source",
    "`scripts/build.js` renders the block at build time",
    "Test covers both the happy path and the disagreement failure",
    "Issue #1 reads `versions.json` rather than parsing prose",
]),
3: ([
    "Check resolves the Carbon major for `@carbon/vue`, `carbon-components-svelte`, `carbon-components-angular`, and `@carbon/web-components` from their published dependency trees",
    "Correctly reports today's reality: Vue v10, Svelte v10-era, Angular v11, Web Components v11",
    "If a port moves, the failure message names the port and the direction it moved",
], [
    "Folded into `scripts/check-upstream.js` rather than a separate script",
    "Unit-tested against a recorded fixture so tests need no network",
    "`references/other-frameworks.md` table verified against the check's output",
]),
4: ([
    "Trigger rate re-measured on the full 20-query set at 3 runs per query using the patched harness",
    "Either recall reaches ≥8/10, or a written finding documents the ceiling and lists every variant tried",
    "Precision does not regress — false positives stay at 0",
], [
    "Measurement artifacts committed so the numbers are reproducible, not asserted",
    "`SKILL.md` description updated if a winner emerges",
    "`CHANGELOG.md` records before/after numbers",
    "If the ceiling is confirmed, README known-limitations says so plainly",
]),
5: ([
    "≥40 queries with a stratified split placing implicit-trigger cases on both sides",
    "Holdout demonstrably discriminates: two candidate descriptions produce different test scores (the current set cannot — it scored 8/8 every iteration)",
    "The existing 20 queries are retained and still pass as a regression floor",
], [
    "Eval set committed alongside the current one",
    "A short note records how queries were sourced and why each negative is a genuine near-miss",
    "Issue #4 uses this set",
]),
6: ([
    "README explains that a process skill can intercept build-from-scratch requests before this one loads",
    "A reader hitting the symptom can self-diagnose and knows how to invoke the skill explicitly",
], [
    "README troubleshooting section added",
    "Names the observed case: `superpowers:brainstorming` on an 'I need to build X' prompt",
]),
7: ([
    "`references/ibm-products.md` covers install, its version relationship to core Carbon, and the inventory of the major components",
    "Routed from the `SKILL.md` table and present in the build's `REFERENCES` list, so it ships to all four tools",
    "Every 'not in core Carbon' pointer in `components.md` now resolves to it",
    "Its Cursor/Copilot globs do not attach it to every file the user opens",
], [
    "Build emits it for claude-code, cursor, copilot, and codex",
    "Build test asserts its presence across all four",
]),
8: ([
    "`references/react.md` §9 covers `@carbon/test-utils`, testing themed components, querying portal-rendered components, and the `IdPrefix` snapshot trap",
    "Each topic has a runnable snippet, not just prose",
], [
    "Cross-linked from `references/accessibility.md` §10, since query-by-role doubles as an a11y check",
]),
9: ([
    "A reader can map a Carbon Figma kit value to the correct code token",
    "The reference answers what to do when a designer supplies an off-scale value — including how to automate the check",
], [
    "`references/figma.md` created, routed, and in the build's `REFERENCES`",
    "Glob scoped so it does not attach to source files",
]),
10: ([
    "One complete annotated build: UI Shell, 2x Grid page, themed dashboard with metric tiles, a `DataTable`, and a validated form",
    "Every token and component choice is annotated with why, not just what",
    "The example compiles against the versions the package pins",
], [
    "Lives in `references/` and is routed from `SKILL.md`",
    "Re-run eval-0 afterwards to test the hypothesis that a concrete target beats more prose",
]),
11: ([
    "Windsurf, Gemini CLI, Cline, and Zed each install, update, check, and uninstall cleanly",
    "`--tools` accepts the new names and `--help` lists them with their target paths",
    "Marker-merged targets preserve pre-existing user content through a full install → uninstall cycle",
    "Each new target has an explicit global-scope decision, surfaced in `--help` if unsupported",
], [
    "Emitters added in `lib/build.js`, path handling in `lib/paths.js`",
    "Path tests cover project and global scope for every new tool",
    "Install smoke test (#16) extended to the new targets",
]),
12: ([
    "`upsertBlock` and `stripBlock` preserve the host file's dominant line ending",
    "A CRLF `AGENTS.md` round-trips through install → uninstall byte-identical",
    "`check` reports no drift arising purely from line endings",
], [
    "Tests cover LF, CRLF, mixed, and empty-file cases",
    "CI runs the suite on Windows",
    "The Windows limitation is removed from `CHANGELOG.md` rather than left stale",
]),
13: ([
    "A definitive answer on whether VS Code exposes a user-level instructions path Copilot reads",
    "If it exists, `--global` writes there instead of skipping; if not, the finding is recorded so this is not re-investigated",
], [
    "`GLOBAL_UNSUPPORTED` in `lib/paths.js` updated if a target exists",
    "Either way, `--help` text matches actual behaviour",
]),
14: ([
    "`npm test` runs green on Node 18, 20, and 22 across macOS and Linux",
    "`npm pack --dry-run` content is asserted, so a mis-scoped `files` array fails the build rather than shipping",
    "A PR cannot merge with a failing suite",
], [
    "Workflow runs on push and PR to `main`",
    "Marked as a required status check",
    "Windows added once #12 lands",
]),
15: ([
    "Pushing a `v*` tag publishes to npm and creates the GitHub release without manual steps",
    "The workflow refuses to publish when the tag and `package.json` version disagree",
    "A dry run proves the path before it is trusted with a real release",
], [
    "Granular access token with **bypass 2FA** stored as an Actions secret — account 2FA is disabled, so `--otp` cannot work",
    "`prepublishOnly` still gates on build and tests",
    "RELEASING.md documents the flow and the token requirement",
]),
16: ([
    "Smoke test installs from the packed tarball into a scratch project and asserts the expected file count per tool",
    "`check` exits 0 after install; `uninstall` leaves the tree clean",
    "A pre-existing `AGENTS.md` returns byte-identical after uninstall",
    "A sibling package's `.cursor/rules/dopod-*.mdc` files are untouched throughout",
], [
    "Runs in CI on every PR",
    "Fails loudly rather than warning, so a regression cannot merge",
]),
17: ([
    "The lockfile records the published tarball integrity hash alongside per-file hashes",
    "`check` distinguishes 'the user edited a file' from 'a different package version wrote this' in its output",
], [
    "Lockfile schema change is backward-compatible with v0.1.0 lockfiles",
    "Tests cover reading an older lockfile without the field",
]),
18: ([
    "`references/audit.md` instructs the reader to report correctness and accessibility defects encountered during an audit, not only Carbon deviations",
    "The report template has a place to put them",
    "Re-running the audit eval, the with-skill run matches or beats the baseline on bug-finding — the baseline currently finds two runtime crash bugs and a missing entry point that the skill run misses",
], [
    "Eval assertions extended to check for non-Carbon defect reporting",
    "Before/after comparison recorded",
]),
19: ([
    "`iteration-2/` complete with both arms across all five evals",
    "Compared against `iteration-1` in the viewer with `--previous-workspace`",
    "No regression on evals that already passed",
], [
    "Run after the content items land, especially #18",
    "Re-verify the three assertions rewritten as judgment items in iteration-1 — regexes fired on correct text there",
    "Findings folded back into the skill, not just recorded",
]),
20: ([
    "Issue filed upstream with a minimal reproduction showing recall collapse under parallel workers",
    "The report states the symptom clearly: recall 0–17% with precision 100%, which reads as a pass if only precision is checked",
], [
    "Reproduction references the verified fix — prefix matching instead of per-caller uuid",
    "Patched copy in `carbon-design-workspace/harness/` offered as a PR if maintainers want it",
]),
21: ([
    "Issue filed upstream showing MCP startup exceeding the default per-query timeout",
    "Report includes the measurement: a single query at 85s wall, of which ~10s was model work",
], [
    "Notes that this compounds with #20 — together they invert the harness result entirely",
    "Fix offered: add `--strict-mcp-config` to the subprocess command",
]),
}


def render(success, dod):
    lines = ["## Success criteria", "",
             "_Observable outcomes. How we know this worked._", ""]
    lines += [f"- [ ] {s}" for s in success]
    lines += ["", "## Definition of done", "",
              "_The completeness bar for closing this issue._", ""]
    lines += [f"- [ ] {d}" for d in dod]
    lines += [f"- [ ] {d}" for d in SHARED_DOD]
    return "\n".join(lines)


def main():
    apply = "--apply" in sys.argv
    for num in sorted(ITEMS):
        success, dod = ITEMS[num]
        raw = subprocess.run(
            ["gh", "issue", "view", str(num), "--repo", REPO, "--json", "body,title"],
            capture_output=True, text=True, check=True).stdout
        data = json.loads(raw)
        body = data["body"]

        # Strip the backlog footer, any previous Acceptance block, and any
        # previously generated sections, so re-running replaces rather than stacks.
        body = re.split(r"\n---\nFrom the v1\.0\.0 backlog", body)[0]
        body = re.split(r"\n\*\*Acceptance\*\*", body)[0]
        body = re.split(r"\n## Success criteria", body)[0]
        context = body.rstrip()

        new_body = (f"{context}\n\n{render(success, dod)}\n\n"
                    f"---\nFrom the v1.0.0 backlog. Context: {BACKLOG}")

        if not apply:
            print(f"#{num} {data['title'][:60]} — {len(success)} success, "
                  f"{len(dod) + len(SHARED_DOD)} done items")
            continue

        subprocess.run(["gh", "issue", "edit", str(num), "--repo", REPO,
                        "--body-file", "-"],
                       input=new_body, text=True, check=True,
                       capture_output=True)
        print(f"  updated #{num}")


if __name__ == "__main__":
    main()

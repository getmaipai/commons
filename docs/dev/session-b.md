# Session B handoff (2026-09-20, end of context)

Written per COORDINATOR's standing rule: past 60% of this session's
context budget, hand off at the next stop point rather than start the
next step cold. Step 5b's done report was accepted (no objection
raised); this is a natural boundary. Whoever picks this up next reads
this file, then `stack/docs/plans/session-b-shared-2026-09-20.md` (the
original work order) and `stack/docs/plans/refocus-work-order-2026-09-20.md`
(steps 0b/0c) for the full assignment.

## Identity and the hard boundary

"Session B" in the multi-session refocus effort. Assignment: create
`getmaipai/shared`, land `core-v0.1.0` and `ui-v0.1.0`, adopt both in
Home, move `home/spec` to `shared/spec`, make Home and Catalog pin it
- steps 0b/0c of the refocus work order. **Hard boundary, still in
force: never touch `stack/`.** Session A owns `stack/`; it never
touches `shared/`, `home/`, or `catalog/`. Reading stack's own plan
docs for context is fine; editing anything under `stack/` is not.

COORDINATOR directs both sessions via cross-session messages (this
build's `SendMessage`/`ListAgents` tools - `ListAgents` shows her as
`COORDINATOR`). Reporting contract: `ready` (done), `done <step>` with
commit hash and `git show --stat HEAD`, `blocked [owner: what]`,
`question` (try the `design-resolver` agent first for anything
resolvable from spec/code alone), `low context` (this note). Never
poll another session's git; never send "still waiting."

## What's landed (all pushed, all reported, all accepted)

**`getmaipai/shared`** exists, on `main` at `627cb80`. Three
workspaces: `core/` (`core-v0.1.0`), `ui/` (`ui-v0.2.4`, four patch
tags past the original `ui-v0.1.0` - see `ui/CHANGELOG.md` for the
full list), `spec/` (not yet created - that's step 6 below, the next
item). No workspace imports a product.

**`getmaipai/home`** on `main` at `1b74bba1`, pinned to
`core-v0.1.0`/`ui-v0.2.4`:
- Step 5: adopted `@maipai/ui`, replaced the hand-built kit and shell.
- Step 5a: adopted the kit's own tokens (real palette overlay, product
  keeps only `--primary`/`--destructive`).
- Step 5b: rebuilt chat onto the kit's own chat pattern (senses dock,
  child band, sources card, memory chip; the assistant-ui wrappers
  moved into `shared/ui`). Commit `ac991288`. Full writeup with every
  regression found and fixed: `home/docs/dev.md`, "Home rebuilds chat
  on the kit's own chat pattern (step 5b)".
- A follow-up commit `786835dd`/shared `3589ca0`+`957516e` (ui-v0.2.3,
  ui-v0.2.4): a real product bug found live during a restart
  verification COORDINATOR asked for after 5b landed - the collapsed
  left rail showed one stray letter per nav row instead of an
  icon-only look (missing `group-data-[collapsible=icon]:hidden`),
  and the first fix for that then broke every nav link's accessible
  name (caught by Home's own a11y gate before it shipped, fixed as
  ui-v0.2.4). Full writeup: `shared/docs/dev.md`, the two entries
  after "Home adopts the kit's own tokens".
- Two small doc-only cherry-picks from the local-model lane, landed at
  this stop point: `1b74bba1` (the AI-outputs disclaimer paragraph the
  org rule requires in the README).

**`getmaipai/shared`** also picked up two doc-only cherry-picks at
this same stop point: `cb5af4b`+`762ebcb` (the root README's workspace
tag table, corrected to the tag actually current on landing) and
`627cb80` (each workspace's own README gets a "Pinning this workspace"
section). Full detail in the message I sent COORDINATOR when I landed
these - two discrepancies from her original instructions worth
knowing if this surfaces again: a commit hash she named (`9a0b7b8`)
turned out to already be on main under a different hash (`3610033`,
same content); the worktree she named was actually sitting on a newer
branch than the one she named (`codex/165`, not `codex/163`) with
additional finished work never reported - landed both since they were
clean and non-conflicting.

## What's next: step 6 (spec-v0.1.0, the 0c half)

Per `stack/docs/plans/session-b-shared-2026-09-20.md`, point 6:

1. Move `home/spec` whole (`pyproject.toml`, the Python package,
   `gen/`, `schemas.resolved`, fixtures, tests, `uv.lock`) into
   `shared/spec`. Its own tests and the Python round trips must be
   green inside `shared`'s own `check.sh`. Tag `spec-v0.1.0`, push.
2. Home pins it: add the dependency, remove the `spec/` workspace from
   Home entirely. Home's own `check.sh` has a "spec: standards gen/
   presence" block (checks the sibling `.github` checkout's `gen/ts`
   and `gen/py` are already generated before spec's own codegen runs)
   - that block moves to `shared`'s own `check.sh`, since the check is
   about `shared/spec`'s codegen now, not Home's. Full gate green,
   review, one commit, push.
3. Catalog (`getmaipai/catalog`, untouched by this session so far)
   deletes `catalog/schema/` and `scripts/refresh-schema.sh`, pins the
   `shared/spec` package instead, and its own lint reads the resolved
   schemas from there. `check.sh` green, review, commit, push.

RF-05b (from the coordinator state notes) said the Stack half of the
spec move (backend/src schema references) is Session A's own work on
my tag, not mine - I move the spec files and tag; A repoints Stack's
own imports once I've pushed the tag. Don't wait on A before tagging;
report `done` with the tag name and let COORDINATOR sequence it.

Before starting: re-read `stack/docs/plans/session-b-shared-2026-09-20.md`
in full (only point 6's own text is quoted above; the file may have
been updated since this note was written) and check
`shared/docs/BACKLOG.md`/`home/docs/BACKLOG.md` for anything COORDINATOR
added since this note.

## Standing gotchas for whoever picks this up

- **`bun install --force` after every `shared` edit.** A `file:`
  dependency resolves into `node_modules/.bun/@maipai+X@file+...`, a
  snapshot taken at install time, not a live link - a plain
  `bun install` will not see a `shared` source change (the lockfile
  entry hasn't changed). Every `UI_PIN`/`CORE_PIN` bump in
  `home/scripts/check.sh` needs this in `home/frontend/`.
- **Code review is now budgeted** (owner rule, `.github` commit
  `32c38de`, landed mid-session): low effort for an S item or a
  docs-and-config change, medium for an M item or a route/guard/wire
  change. One pass per commit; after fixes, re-review the fix hunks
  only; never a third pass. State the review level, pass count, and
  dispositions in every done report.
- **Context percentage goes in every done report too** (same rule).
  Past 60%, hand off at the next stop point - a note like this one to
  `shared/docs/dev/session-b.md`, then COORDINATOR hands it to Jesse
  for a fresh session.
- **The live app on this laptop** (`home/data/local-app`, `bun start`/
  `stop`/`restart` from the `home/` root) is Jesse's own real
  household data on port 8787 - never sign in with his real PIN
  (off-limits). A restart-verification against the running build uses
  a throwaway seeded demo backend instead (`scripts/screenshot.ts`'s
  own pattern - `newContext`, a fresh temp data dir, a seeded demo
  household); `scripts/screenshot.ts --shell-rail-review` is a real,
  permanent interactive check of the shell's left rail (expanded/
  collapsed, the toggle, persistence across reload) added this
  session, worth reusing for any future shell change.
- **This laptop runs low on free memory under concurrent sessions.**
  A `check.sh` gate got OOM-killed once this session while COORDINATOR,
  Session A, and a local-model lane were all active simultaneously.
  COORDINATOR clears a "gate slot" (pauses other heavy work) on
  request before a retry - ask rather than blind-retry if a gate dies
  to something that looks like a kill, not a real failure, and report
  the free-memory figure at the kill (`vm_stat` / `memory_pressure`).
- **Playwright's `.count()` does not respect visibility** - it counts
  DOM-present-but-CSS-hidden elements as matches. Use `.isVisible()`
  or `.waitFor({ state: "hidden"/"visible" })` for any assertion about
  whether something is actually shown, found live this session
  diagnosing a false-positive in the shell-rail persistence check.

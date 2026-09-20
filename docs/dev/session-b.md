# Session B handoff (2026-09-20, end of context)

Written per COORDINATOR's standing rule: past 60% of this session's
context budget, hand off at the next stop point rather than start the
next step cold. Step 6 (the spec move, all three legs) just landed and
was accepted; this is a natural boundary. This note supersedes the
previous one (step 5b's handoff) - that work is long since landed and
accepted, no longer relevant to what's next.

## Identity and the hard boundary

"Session B" in the multi-session refocus effort. Assignment per
`stack/docs/plans/session-b-shared-2026-09-20.md` and
`stack/docs/plans/refocus-work-order-2026-09-20.md` (steps 0b/0c):
create `getmaipai/shared`, land `core-v0.1.0` and `ui-v0.1.0`, adopt
both in Home, move `home/spec` to `shared/spec`, make Home and Catalog
pin it. **Hard boundary, still in force: never touch `stack/`.**
Session A owns `stack/`; it never touches `shared/`, `home/`, or
`catalog/`. Reading stack's own plan docs for context is fine; editing
anything under `stack/` is not.

COORDINATOR directs sessions via cross-session messages (`SendMessage`/
`ListAgents`, she shows as `COORDINATOR`). Reporting contract: `ready`
(done), `done <step>` with commit hash and `git show --stat HEAD`,
`blocked [owner: what]`, `question` (try the `design-resolver` agent
first for anything resolvable from spec/code alone), `low context`
(this note). Never poll another session's git; never send "still
waiting."

## What's landed (all pushed, all reported, all accepted)

Everything from the previous handoff (steps 0b/0c: `core-v0.1.0`,
`ui-v0.1.0` through the chat rebuild) plus, this session:

**`spec-v0.1.0` + `spec-v0.1.1`** (`shared`, commits `2c87009` then
`1aee790`): `home/spec` moved whole into `shared/spec` by plain copy
(no shared git history, matching `ui-v0.1.0`'s own precedent). RF-05b
folded in the same tag: the Stack's nine wire shapes moved read-only
from `stack/backend/src/spec/` on `origin/main` (never touched the
`stack/` checkout itself) into `spec/schemas/` (flat), `spec/fixtures/
<shape-name>/` (flat), and a new `spec/stack/ts/` domain folder for
their hand-written Zod mirrors. **Those mirrors stay hand-written on
purpose** - a same-tag detour tried generating them via `gen:ts`
instead and `bun test` caught three `stack-event` fixtures silently
losing their required-field checks (an `allOf`/`if`/`then` conditional
neither generator preserves, the same class of gap
`spec/records/ts/validate.ts` already documents). `gen-ts.ts` and
`bundle-schemas.ts` now share one `spec/scripts/stackSchemaNames.ts`
exclusion list so a future codegen run can't silently overwrite them
again. `spec-v0.1.1` also fixed every schema's `$id` (still said
`home/spec` after the move) and two consumers still pointing at the
deleted `home/spec` directly (`shared/ui`'s own pin, one `ui/` test).
Full account: `shared/docs/dev.md`'s "Workspace status" `spec/` entry
and its `spec-v0.1.1` correction entry right after.

**`home` pins it** (`afd2abe0`): `SPEC_PIN=0.1.1`. Nearly free since 64
of 65 spec-importing files already used the `@maipai/spec/...` package
form (Home's `package.json` already had it as a Bun workspace member).
A second sweep - only caught by actually running the full backend
suite, not by grepping for quoted relative-path strings - found four
more files reading `spec/llm/*.json` corpora via `join(import.meta.dir,
"..", "..", "..", "spec", "llm", ...)` (a separate `join()` argument,
missed by the first grep). Fixed through one new
`backend/src/lib/specDir.ts`, reused by seven call sites. Full account:
`home/docs/dev.md`'s "Home pins @maipai/spec" entry.

**`catalog` pins it** (`e554bf7`): deleted the maintainer-refreshed
`schema/` mirror and `refresh-schema.sh`; `tools/` pins `@maipai/spec`
directly, `lint.ts` reads schemas from the installed package with every
schema's own accurate `$id` doing the cross-repo `$ref` resolution
automatically. CI needed a `getmaipai/shared` checkout too (a `file:`
dependency is a real filesystem path, not an env-var override) - first
attempt (`path: ../shared`) was wrong, a code review caught it
(`actions/checkout@v4` rejects any path escaping `$GITHUB_WORKSPACE`,
confirmed against its own source), fixed with a nested checkout plus a
symlink step and verified locally (reproduced the exact layout,
ran a real `bun install` through it) before landing. Full account:
`catalog/docs/dev.md`'s Step 0 status, the `schema/` deleted bullet.

**Cherry-pick, COORDINATOR's own request, no reply needed at the
time**: `1d817ad` (`codex/181-home-wrappers-test`, `home-codex`
worktree) onto `home` main as `bac07c93`, branch deleted, the
`home-codex` worktree left detached at `origin/main` (never removed -
Codex's fixed folder).

**`bot`'s own pin**: raised as a possible gap, resolved by
COORDINATOR - it's docs-only until the robot has a real Python project
to install into (`codex-177` already names the new
`getmaipai/shared@spec-v0.1.1` URL form in `bot`'s own `AGENTS.md`), so
there's no code-side item waiting here.

## Standing gotchas for whoever picks this up

- **`bun install --force` after every `shared` edit.** A `file:`
  dependency resolves into a content-addressed store, a snapshot taken
  at install time, not a live link - a plain `bun install` will not see
  a `shared` source change. Every pin bump in a consumer's `check.sh`
  needs this in that workspace.
- **Code review is budgeted**: low effort for an S item or a
  docs-and-config change, medium for an M item or a route/guard/wire
  change. One pass per commit; after fixes, re-review the fix hunks
  only; never a third pass. State the review level, pass count, and
  dispositions in every done report.
- **Context percentage goes in every done report too.** Past 60%, hand
  off at the next stop point - a note like this one, then COORDINATOR
  hands it to Jesse for a fresh session.
- **A `git add` with multiple pathspecs aborts entirely if ANY one of
  them doesn't match** (e.g. a deleted directory already staged from an
  earlier `git rm`) - it doesn't just skip the bad one. This session hit
  it live: a catalog commit landed with only half its intended diff
  because of exactly this, caught by reading `git show --stat HEAD`
  right after committing, before pushing. Always read that output
  before `git push`, not just before `git commit`.
- **`actions/checkout@v4` refuses any `path` that resolves outside
  `$GITHUB_WORKSPACE`** - checked directly against its own source this
  session, not assumed. A sibling-repo checkout for a real filesystem
  `file:` dependency (as opposed to an env-var-driven path like
  `MAIPAI_STANDARDS_DIR`) needs a nested checkout plus a plain `ln -s`
  shell step to fake the sibling relationship, not `path: ../other-repo`
  directly.
- **When a JSON Schema uses `allOf`/`if`/`then` conditionals, don't
  trust either `json-schema-to-zod` or `datamodel-code-generator` to
  preserve per-branch `required` fields without a fixture round-trip
  proving it** - `spec/records/ts/validate.ts` documented this for one
  set of schemas; RF-05b's `stack-event` hit it live for another. The
  fixture test that catches this (Ajv against the raw schema, the Zod
  mirror, both required to agree) is the actual proof, not a read of
  the generator's docs.
- **The live app on this laptop** (`home/data/local-app`, `bun start`/
  `stop`/`restart` from the `home/` root) is Jesse's own real household
  data on port 8787 - never sign in with his real PIN.
- **This laptop runs low on free memory under concurrent sessions** - a
  `check.sh` gate or a large test suite got noticeably flaky under load
  this session too (a few backend tests failed once under the full
  3143-test run, passed clean every time run in isolation or alone).
  Ask COORDINATOR to clear a "gate slot" before a retry if a failure
  looks like resource contention rather than a real regression - don't
  just blind-retry, but don't chase a phantom bug either.

## What's next

Step 6 (the spec move) is the last item from this session's original
assignment (`session-b-shared-2026-09-20.md`) that was still open. No
queued next step from that work order remains unstarted. Whoever picks
this up should check with COORDINATOR for the next assignment rather
than assuming one - the `bot` pin gap above is one candidate, otherwise
check `shared/docs/BACKLOG.md` and `home/docs/BACKLOG.md` for anything
added since this note was written.

# Session B handoff (2026-09-21, end of session)

Written on the coordinator's own call, not a context-percent guess:
"given the size and your session's length: stop here the right way."
Tonight's chat-program work (items 1-3 of `home/docs/plans/shell-on-
shadcndashboard-2026-09-21.md`, plus part of item 4) is landed and
pushed; ARTIFACT-02 is fully designed and approved but has zero code -
a fresh session builds it cold from the design below and in
`home/docs/dev.md`/`home/docs/BACKLOG.md`. This note replaces the
previous one (HOME-STACK-04a/HOME-STACK-01) - both landed and accepted,
no longer relevant to what's next.

## Restart line

```
cd /Users/jessetorres/Developer/github.com/getmaipai/home-b && claude --dangerously-skip-permissions
```

That worktree is on branch `b/home-stack-02b` (the name is stale, it
tracks `main` directly), pushed and even with `origin/main` at
`cf18d7ed`. No uncommitted state, no stash, nothing to recover.
`commons-b` (branch `b/artifact-spec`, same tracking-main shape) is
even with `origin/main` at `aae7606` - also clean, nothing pending.
`stack-b` (`/Users/jessetorres/Developer/github.com/getmaipai/stack-b`,
branch `b/home-stack-01-installer`) is untouched since the last
handoff, even with `origin/main` at `233bc4f` - needed again only if a
future Stack-side change is asked for.

## What landed this session (all pushed, all reported, all accepted)

- **`commons` `08824d7` / tag `spec-v0.1.7` (the Artifact record)**:
  `spec/schemas/artifact.schema.json` - one immutable version of a
  generated markdown/code/html document, chained by `parent_version`
  naming the prior version's own `id` (conversation-turn's
  `parent_turn_id` convention, deliberately not `TurnArtifact`'s bare
  `revision` counter - the wire needs a version's own id). TS+Python
  generated, two fixtures (a first version, a chained edit),
  `validateArtifact`/`validate_artifact` in both `records/ts/
  validate.ts` and `records/py/validate.py` (a self-chain guard plus
  version/parent_version pairing - a medium review on the pre-rebase
  commit found the self-chain gap unguarded, same class as
  `validateEntity`'s own `parent_id` check) with matching
  `fixtures/validation/cross-field.json` cases proving both languages
  agree.
- **`home` `af0af0aa` (the artifact data layer + weather/almanac
  structured parts)**: `backend/src/db/schema.ts`'s `artifacts` table
  (migration `0053`) - `artifactKey` and `isCurrent` are Home-internal
  bookkeeping the spec record has no concept of, a partial unique index
  keeps exactly one current row per `artifactKey`. `lib/artifacts.ts`:
  `createArtifact`/`updateArtifact` (refuses updating a superseded
  version, 409), `getArtifactRow`/`currentArtifactRow`,
  `visibleArtifactRow()` (a child sees an artifact only from their own
  turn and only when that turn's `safetyAction !== "refuse"`, extending
  `canAccessPerson()` rather than a content-stripping projection -
  there is no field to strip here, the whole version is visible or it
  isn't). `routes/artifacts.ts`: `GET /api/artifacts/:id` and
  `GET /api/artifacts/:id/export` (a slugged download, content type by
  `kind`) - both real `createRoute()`/`.openapi()` routes (the medium
  review's one finding: the export route was a plain Hono `.get()`
  first, missing from `docs/api/openapi.json` - fixed, re-reviewed, 131
  paths now). `TurnValue.artifact?: {id, version}` added additively,
  no writer until ARTIFACT-02. `wire.ts`'s new `StructuredPart` type
  (`spec_sheet` kind, matching assistant-ui's spec-sheet prop shape
  exactly) and `TurnValue.structured_part`: `composer.ts`'s
  `structuredPartForOutcomes()` maps weather's and almanac-date's own
  `result.data` onto it (first known producer wins, same precedent
  `buildDocument()` sets), hooked into `turnEngine.ts`'s
  `logTurnSafely()` beside `document_available`/`rung` - one line, no
  new dispatch. `almanac-date/handler.ts` gained a `data: {date,
  weekday}` field (Tier 1 handlers already pass `data` through, no
  plumbing change needed). Forgot `artifacts` in `lib/hlc.ts`'s
  `HLC_BEARING_TABLES` on the first pass - the full suite's own
  `tests/hlc.test.ts` caught it before landing.
- **`home` `cf18d7ed` (docs only): ARTIFACT-02's design**, written up
  in full below and in `home/docs/dev.md`/`home/docs/BACKLOG.md` -
  approved by the coordinator with one addition (provenance). No code.

Also landed, folded into `af0af0aa`'s own commit and doc sections but
worth naming separately since they're decisions, not just code: item
1's **"The wire the Elements expect"** table (every assistant-ui
Element on this session's row, its exact part shape against Home's
wire today - fed/rename/gap) and the **approval-card/guardrail-notice
resolution** (two kinds of approval kept: a same-turn `approval-card`
on the live tool call for the requester's own action, Home's existing
async `approvals.ts` queue for a cross-person decision, surfacing as
`approval-card` only on the parent's side; guardrail-notice stays a
named gap for a later spec bump) - both in `home/docs/plans/shell-on-
shadcndashboard-2026-09-21.md`.

## ARTIFACT-02: the next item, build this design, don't re-derive it

Full writeup in `home/docs/dev.md`'s "ARTIFACT-02, designed" section
and `home/docs/BACKLOG.md`'s ARTIFACT-02 item (identical content, the
checklist form) - read one of those two in full before writing any
code. The short version, so this note is self-contained enough to
start from:

**Why**: every check in `turnEngine.ts`'s `resolveToolCallsInOrder()`
reads a real `PackageManifest` (`rankedById.get(c.tool)!.manifest`); a
Tier 1 `handler.ts` has zero DB access (an isolated Deno subprocess).
The sanctioned way a package writes a real record live is a recipe
primitive, `remember`'s own `"op": "remember"` precedent.

**The design (coordinator-approved, build as written)**: an 18th
recipe op, `{"op": "artifact", "as": "result", "title": "{title}",
"kind": "{kind}", "body": "{body}", "id_from": "artifact_id"}`, in
`recipe.schema.json`, both interpreters (`interpreters/ts/recipe-
interpreter.ts` and `interpreters/py/recipe_interpreter.py`, byte-for-
byte behaviorally identical, proven by new conformance fixtures in
`fixtures/recipes/`). `title`/`kind`/`body` interpolate normally,
always required even on an update. `id_from` names a scope variable to
read directly (`scope[step.id_from]`, no `{}` - `pick`'s own `"from"`
convention), because `interpolate()` leaves an unresolved `{name}` as
the literal string rather than `undefined`, and `artifact_id`'s
presence-or-absence IS the create-vs-update discriminator (the recipe
language has no conditional to express that another way). `Host.
artifact` (`host-emulator.ts`): `create({title, kind, body}): {id,
version}`, `update({artifact_id, title, body}): {id, version}`,
throwing `HostError` with an EXISTING `errors/errors.json` code
(`not_found`, `invalid_input`), not a new one - plus a deterministic
in-memory emulator implementation (both `host-emulator.ts` and
`emulators/py/host_emulator.py`) for the fixtures to run against. New
permission `artifact:write` in `vocab/permissions.json`.

**Provenance (the coordinator's one addition)**: `host.artifact.
create`/`update`'s real implementation (`packageHost.ts`) sets
`provenance` with the SAME expression `remember()` already uses for
`source` - `turnId ?? \`package:${manifest.id}\`` - not a bespoke
string. `packageHost.ts` resolves `conversation_id` by looking up the
bound `turnId`'s own row before calling `lib/artifacts.ts`'s
`createArtifact`/`updateArtifact` directly.

**Wiring back**: the op binds two flat scope keys,
`scope.artifact_id`/`scope.artifact_version` (never nested -
`interpolate()` has no dot-path support). The bundled `documents`
package (`backend/packages/documents/`, ranked and consequential like
any action package): the `artifact` step, then a `format` step with
`data: {"artifact_id": "{artifact_id}", "artifact_version":
"{artifact_version}"}` - the exact shape `structuredPartForOutcomes()`
already reads weather's/almanac-date's own data from, so
`TurnValue.artifact` gets its writer the identical way. Tool name
`write_document` - what artifact-card's own frontend toolkit already
binds to, nothing extra to register there.

**Review**: high (spans `commons/spec`'s two interpreters plus a real
Home host implementation and a new package - real behavioral-parity
risk between languages, the exact class of bug the conformance
fixtures exist to catch). One pass covering the whole diff is right
here, not the usual medium - do not under-scope it to save time.

**Acceptance**: a model-driven live chat creates then edits an
artifact, `TurnValue.artifact` set from the real tool call, TS/Python
conformance fixtures agree. Out of scope: any other package gaining
`artifact:write` by default.

## Then REASONING-01 (after ARTIFACT-02, not before)

Also in `home/docs/BACKLOG.md` under "The chat program: assistant-ui
Elements." The `reasoning` Element's stream event
(`{type: "reasoning", text, status?}`) is real but genuinely entangled:
`wellFormed.ts`'s `thinkingPrefix()`/`visibleText()` already split a
model's `<think>` block from the visible reply, but the extracted
prefix gets REATTACHED to the raw text at several points deep in
`turnEngine.ts`'s streaming buffer and sentence-splitting logic
(`composeBlocking`, the retry-token machinery, the mid-stream `<think>`
handling around line 5654) for reasons a read-only pass didn't fully
explain. Understand why that reattachment exists - and prove whatever
it protects still holds - before extracting reasoning as its own
stream event. Checked and deliberately NOT attempted this session
rather than risking a rushed edit to that machinery.

Image generation's own part sequence is NOT this session's or the next
one's item - no image-generation feature exists in Home at all yet
("image" is a role id in the Engines API's list, nothing else). It's
`CHAT-MEDIA-01`'s own item; that item already has a one-line pointer to
the `image-generation` Element's contract and its missing numeric-
progress prop.

## Standing gotchas for whoever picks this up

- **The chat program's design record is
  `home/docs/plans/shell-on-shadcndashboard-2026-09-21.md`** - "The
  wire the Elements expect" table, the artifact record section, and the
  turn-engine tool section (superseded in detail by ARTIFACT-02's own
  design above, but still the right place to see how this fits the
  whole chat program). Read it before touching any Element-adjacent
  wire shape, not just before ARTIFACT-02.
- **`bun install --force`, not a plain `bun install`,** in `backend/`
  after any `commons` pin bump - a `file:` dependency resolves into
  bun's content-addressed store, a snapshot taken at install time, not
  a live link. Iterate against a local `file:../../commons-b/spec` pin
  while a tag isn't cut yet if needed, but never commit that path -
  flip to the real `commons-tags/spec-spec-vX.Y.Z/spec` tag worktree
  before the final commit.
- **`scripts/check.sh`'s API-docs and settings-registry drift checks
  diff the working tree against the *index*, not `HEAD`.** Regenerate,
  then stage the result, before running the gate - this session hit
  this twice (once for `gen:api-docs`, once for `gen:settings`) and
  both were the same "index, not HEAD" gotcha the previous handoff note
  already named.
- **Code review is budgeted**: low for an S item or docs/config, medium
  for an M item, high only when named (ARTIFACT-02 is named high
  above - don't default it to medium because everything else tonight
  was medium). One pass per commit; after fixes, the re-review covers
  the fix hunks only.
- **Two full gates on this machine at once produces real, misleading
  test flakes** - this session's own backend suite failed a different,
  unrelated test on two separate full runs (once while another
  session's gate was also running) and came back 100% clean on a third
  run alone. Before trusting a failure as a real regression, check
  whether another session is gating at the same time, and re-run alone
  if so.
- **A shared `commons` origin/main moves fast under multiple sessions
  cutting spec/ui tags in the same evening** - rebase `commons-b`
  immediately before starting new work, not just once at session start;
  this session rebased three times as `spec-v0.1.6`, then `ui-v0.5.0`/
  `spec-v0.1.7`, then `ui-v0.5.2` landed from other sessions in
  between.
- **Never touch the real household app on this machine** - `home/`'s
  own checkout at the repo root (not a worktree), port 8787, Jesse's
  real data.

## What's next

**ARTIFACT-02** (design above and in `home/docs/dev.md`/
`home/docs/BACKLOG.md`), high review. Then **REASONING-01**. Get the
actual work order from COORDINATOR before starting either - this note
is state, not the work order itself.

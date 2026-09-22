# Changelog (`@maipai/spec`)

All notable changes to the `spec` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `spec-vX.Y.Z`. Everything stays `0.x` until the platform's Hub v0.1
scope lands.

## [spec-v0.1.20] - 2026-09-22

### Added
- `ModelCapabilities` gains an optional `turn_budget` (U2a, home's
  `docs/plans/turn-machine-state-record-2026-09-22.md`, "The budget
  record"): the per-model tool-calling budget turnNext.ts's model and
  tool nodes read - tool rounds, the fixed offered tool set, the
  always-search interim rule and its `answer_from_this_conversation`
  alternative, whether the model drives a second transition, context
  and thinking-token allowances, per-node deadlines, and
  ARCH-MEASURE-01's measured numbers. Absent for a model with no
  measured record. `model-capabilities.chat.example.json` gains the
  8B's starting values (deadlines model 20s/tool 10s/total 45s,
  `always_search` true, `rounds` 1); `rewrite_pass_rate` is recorded 0
  with a note in `measured.on` - the query-rewrite bench has not run
  for this model yet.
- `turn.pipeline.next` in `spec/settings/keys.json` (household scope,
  boolean, default off, level advanced, honoured by `home` and `bot`):
  the switch U6 flips once the new turn path passes the replay set.
- `turn-budget.test.ts` and `settings-registry.test.ts`: the former
  proves `turn_budget`'s own rules (optional, `rounds` closed to
  0/1/2, `deadlines_ms`/`measured` all-or-nothing, no stray keys); the
  latter round-trips every entry of `keys.json` through `SettingsKey`
  (nothing did before) and pins `turn.pipeline.next`'s declared shape.

### Fixed
- Tag numbering: `spec-v0.1.19` was cut locally on another session's
  branch (`a/woq3-corpus`) and never pushed to `origin/main`, so
  `spec-v0.1.19` is skipped here to avoid a tag collision. That branch
  and its tag are unmerged and flagged for cleanup by whoever owns it.

## [spec-v0.1.18] - 2026-09-22

### Added
- `llm/routing-corpus.json` gains seven rows for ROUTE-FIND-03 (b)
  (home's BACKLOG.md): "search who won the Seattle Mariners game
  yesterday" plus five paraphrases ("search"/"look up"/"google" followed
  by a plain query), all expecting `websearch` - home's
  `websearch/manifest.json` gained matching `routing.patterns` in the
  same fix. Plus one collision pin: "look up the artist Adele" still
  expects `music`, whose own "look up the artist *" pattern must keep
  winning over websearch's new, broader "look up *".

## [spec-v0.1.17] - 2026-09-22

### Added
- `turn-stream-event`'s `tool_call` shape gains an optional `label` string
  (TOOL-EVENTS-01's label addendum): the human label the turn stream
  carries while a package runs, read from the package manifest's own
  `tool_label` entry (below) and templated from the call's `args` by the
  engine. A `valid-tool-call-labeled` fixture and the hand-written Zod
  mirror's `label: z.string().min(1).optional()` round-trip it through
  `stack-fixtures.test.ts`.
- `manifest.schema.json` gains an optional `tool_label` string: the
  package-declared label its own `tool_call` wire events carry. `{arg}`
  slots are filled from the call's `args` by the consuming engine when
  that arg is present; absent, the timeline falls back to the package's
  `display` name.

## [spec-v0.1.16] - 2026-09-22

### Added
- `turn-stream-event` wire shape (`schemas/turn-stream-event.schema.json`):
  the three tool-event shapes the home backend's turn stream emits
  (TOOL-EVENTS-01) - `tool_call` (`t`, `package_id`, `args`, `call_id`),
  `tool_result` (`t`, `call_id`, `package_id`, `outcome` with optional
  `text`/`error_code`), and `tool_error` (`t`, `call_id`, `package_id`,
  `error`). A hand-written Zod mirror (`stack/ts/turn-stream-event.ts`)
  and nine fixtures under `fixtures/turn-stream-event/` round-trip it
  through `stack-fixtures.test.ts`; the schema joins the
  `STACK_SCHEMA_NAMES` exclusion so `gen:ts` never clobbers the mirror.

## [spec-v0.1.15] - 2026-09-21

### Changed
- `ui.look`'s enum drops `studio` and `calm` and shrinks from ten
  values to eight; the default moves from `studio` to `neutral` (owner
  ruling, LOOK-01: "the default is a named shadcn theme, not a Home
  name that hides what it is" - `neutral` is the exact palette
  `studio` always rendered, so nothing on screen moves for anyone
  already on the default). `studio`/`calm` were geometry presets over
  the shared palette; the template's own default geometry already
  matches what `studio` set, so neither needs a preset anymore. A
  stored `studio` or `calm` value migrates to `neutral` in the
  consuming app (getmaipai/home's own
  `db/migrations/0057_look_studio_calm_to_neutral.sql`), not here -
  this workspace holds no data of its own to migrate.

## [spec-v0.1.14] - 2026-09-21

### Changed
- `ui.look`'s enum grows from nine values to ten, adding `navy`: Home's
  own former default palette, displaced from the zero-attribute default
  by HOME-UI-04e's "identical to the source" ruling (the default now
  renders the shadcndashboard template's own palette, byte-for-byte),
  kept as its own named preset (`commons-a/ui/src/dashboard/css/
  globals.css`'s `.style-navy`) so nobody loses it.

## [spec-v0.1.13] - 2026-09-21

### Added
- `settings/keys.json` gains two `notifications.memory.*.telegram`
  toggle keys, following the `notifications.engines.*.telegram` four
  keys' own pattern: `memory.updated` (`lib/notificationTypes.ts`) had
  been `configurable: true` and triggered since getmaipai/home#64 but
  never had a real settings key, so nobody could opt it into Telegram;
  `memory.judge_failed` is a new sibling type for the judge's other
  terminal outcome (the poison guard giving up after repeated
  extraction failures), the 1:1 backend counterpart to
  chatMemoryChip.tsx's own pre-existing "failed" chip state.

## [spec-v0.1.12] - 2026-09-21

### Changed
- `ui.look`'s enum grows from `studio`/`calm` to nine values, adding
  the seven shadcn base-color presets (ui.shadcn.com/docs/theming's
  own current list: Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe) -
  HOME-UI-04b's theme-preset item. CSS for the new values lives on
  `/next` only (commons-a/ui/src/dashboard/css/globals.css); the old
  shell keeps resolving the value but has no palette of its own for
  them yet.

## [spec-v0.1.11] - 2026-09-21

### Added
- `llm/ts/types.ts`'s `ChatCompletionChunkDelta`/`ChatMessage` gain
  `reasoning_content?: string | null` (REASONING-01): llama.cpp's own
  `--reasoning-format deepseek`/`auto` split, confirmed live against the
  pinned b10797 build (a real `enable_thinking: true` request streams
  reasoning ONLY in this field, `content` empty until it's done, no
  `<think>` tags anywhere). `llm/ts/client.ts`'s `chatCompleteStream()`
  synthesizes it into the identical `<think>...</think>` shape
  `wellFormed.ts`'s whole downstream pipeline already expects around a
  template that leaks the tags into `content` instead - one uniform
  shape either way, no caller needs to know which engine behavior
  produced it. `stubServer.ts` gained `scriptedReasoning` so a test can
  script either shape.

## [spec-v0.1.10] - 2026-09-21

### Fixed
- `ui.shell.next`'s `level` corrected from `"expert"` to `"advanced"`
  (COORDINATOR finding): the settings renderer
  (`commons/ui/src/settings/groupSettings.ts` line 74) drops `"expert"`
  keys entirely from every group it builds, so nothing ever revealed an
  `"expert"` key in Settings, at any account level - `ui.shell.next` was
  unreachable there since it was declared. `"advanced"` surfaces it
  behind "Show N advanced settings" in the System group instead. No
  other field changed (`home/backend/scripts/gen-settings-registry.ts`
  regeneration confirmed as a one-line diff to this file).

## [spec-v0.1.9] - 2026-09-21

### Added
- `artifact` recipe op (`schemas/recipe.schema.json`'s 18th step),
  implemented identically in both interpreters (ARTIFACT-02, the
  sanctioned way a Tier 0 recipe writes a live chat artifact - the same
  role `remember` plays for `host.memory.remember`): `title`/`kind`/
  `body` interpolate normally, `id_from` names a scope variable read
  directly (not through `interpolate()`) whose presence is the create-
  vs-update discriminator. `Host.artifact.create`/`update` on both
  emulators (`host-emulator.ts`/`host_emulator.py`), throwing existing
  `not_found`/`invalid_input` codes rather than a new one. New
  `artifact:write` permission (`vocab/permissions.json`). Five new
  conformance fixtures (create, update, not_found, invalid_input, and
  an explicit-JSON-`null` `id_from` case a code review caught the two
  interpreters disagreeing on before it shipped).

### Fixed
- `spec-v0.1.8` was tagged with `spec/package.json`'s own version field
  still reading `0.1.7` - caught by a consumer's own pin-honesty check
  (`home/scripts/check.sh`'s `ensure_pin()`), the same class of mistake
  `docs/BACKLOG.md`'s "spec's settings registry" item records for
  `spec-v0.1.4`/`spec-v0.1.5`. `v0.1.8` retires unused in this same
  session: the one checkout that had pinned it (`home-b`, mid-work when
  the bad tag was caught) moves to `v0.1.9` in the same change, before
  it lands anywhere else - same precedent as `v0.1.4`, cut the next tag
  rather than rewrite a pushed one.

## [spec-v0.1.7] - 2026-09-21

### Added
- `Artifact` record (`schemas/artifact.schema.json`): one immutable
  version of a generated markdown/code/html document (the chat
  program's artifact-card/canvas-split experience), chained by
  `parent_version` (conversation-turn's `parent_turn_id` convention,
  not TurnArtifact's bare `revision` counter - rationale in the
  schema's own description). `validateArtifact`/`validate_artifact`
  added to `records/ts/validate.ts`/`records/py/validate.py` (self-
  chain guard, version/parent_version pairing), proven identical across
  both languages by new cases in `fixtures/validation/cross-field.json`.
  Two new fixtures, `artifact.v1`/`artifact.v2`, cover a first version
  and a chained edit.

## [spec-v0.1.6] - 2026-09-21

### Added
- `ui.shell.next` settings key (household scope, boolean, default
  `false`): the flag behind the shell-on-shadcndashboard stand-up's
  `/next` route tree (`home/docs/plans/shell-on-shadcndashboard-
  2026-09-21.md`), governing the shell and the chat together.

## [spec-v0.1.4] - 2026-09-20

### Added
- Four `notifications.engines.*.telegram` settings keys (person scope,
  boolean, default `false`): one per Stack engine notification type from
  `home`'s HOME-STACK-03 event bridge (`engines.update_available`,
  `engines.update_applied`, `engines.update_failed`, `engines.problem`).
  Regenerated `settings/keys.json` from `home/backend/src/settings/
  notificationKeys.ts` via `bun run gen:settings`.

## [spec-v0.1.3] - 2026-09-20

### Added
- `engines.stack.url` settings key (household scope, text, default empty):
  the Stack base URL Home routes chat, embeddings and voice through when a
  MaiPai Stack is installed on the machine. Regenerated `settings/keys.json`
  from `home/backend/src/settings/coreKeys.ts` via `bun run gen:settings`.

## [spec-v0.1.2] - 2026-09-20

### Added
- `ui.look` settings key (person scope, `select`, options `studio`/
  `calm`, default `studio`): the owner's "Two looks, one setting"
  ruling - Home's `useLook.ts` reads it to choose between the
  reference-matching Studio look and the softer Calm look that shipped
  first. Regenerated `settings/keys.json` from `home/backend/src/
  settings/uiKeys.ts` via `bun run gen:settings`.

## [spec-v0.1.0] - 2026-09-20

### Added
- Moved whole from `home/spec`: Person, Setting, Memory/Entity/Episode,
  the package manifest/recipe/result shapes, the settings registry, the
  capability and permissions vocabularies, UI schema v0 (Chat only), both
  recipe interpreters, both host emulators, Entity/Relationship/Grant,
  Source, TurnSignal/ReplyPlan/SubjectRef/ConversationTurn/OpenQuestion -
  full history in `home/docs/dev.md` predates this tag.
- RF-05b: the Stack's wire shapes, moved whole from
  `stack/backend/src/spec/` - role request/reply headers, the event feed,
  health, settings, precious-state, the STT session types, the job -
  their schemas, fixtures, and `tests/ts/stack-fixtures.test.ts`.

## [spec-v0.1.1] - 2026-09-20

### Fixed
- Every schema's `$id` and `gen-ts.ts`'s `LOCAL_ID_BASE` still said
  `home/spec` after the `spec-v0.1.0` move; now say `shared/spec`,
  matching the nine RF-05b schemas that already had it right.
- Two consumers still pointed at the now-deleted `home/spec` directly:
  `ui/package.json`'s own `@maipai/spec` dependency
  (`file:../../home/spec` → `file:../spec`) and
  `ui/src/schema/catalog.test.ts`'s `SPEC_DIR` default (its own comment
  already named the exact fix, written before the move landed).
- `gen-ts.ts` and `bundle-schemas.ts` both import the same
  `STACK_SCHEMA_NAMES` exclusion (`scripts/stackSchemaNames.ts`, one
  list instead of two, a code-review finding fixed before landing) for
  RF-05b's nine schemas, after a same-tag detour: dropping their
  hand-written `spec/stack/ts/` mirrors
  in favor of letting `gen:ts` generate them (it already sweeps every
  file in `schemas/`, no exclusion list existed yet) silently lost
  three `stack-event` fixtures' required-field checks -
  `json-schema-to-zod` doesn't preserve the per-branch `required`
  fields inside that schema's `allOf`/`if`/`then` conditionals, the
  same class of gap `spec/records/ts/validate.ts`'s own header already
  documents for JSON Schema conditionals generally. Reverted to the
  hand-written mirrors, now with the exclusion list so a future
  `gen:ts` run can't silently overwrite them again.

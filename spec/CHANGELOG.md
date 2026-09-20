# Changelog (`@maipai/spec`)

All notable changes to the `spec` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `spec-vX.Y.Z`. Everything stays `0.x` until the platform's Hub v0.1
scope lands.

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

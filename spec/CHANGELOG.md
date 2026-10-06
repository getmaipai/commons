# Changelog (`@maipai/spec`)

All notable changes to the `spec` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `spec-vX.Y.Z`. Everything stays `0.x` until the platform's Hub v0.1
scope lands.

## [Unreleased]

## [spec-v0.1.84] - 2026-10-06

### Added
- Optional `thinking_mode` on `ModelCapabilities` (`switchable`, `none` or `always`): the record says whether the model can reason before it answers, so a host shows or hides its thinking control from the record, never from a model id. A record written before the field falls back to its turn budget's `thinking_budget_tokens_toggled`. A chat-role record may carry `image_input` (nothing restricts it to the vision role). New fixture `model-capabilities.vision-chat.example.json`: Qwen3-VL-8B-Instruct as a chat model with its projector and no thinking mode (VISION-02a).

## [spec-v0.1.83] - 2026-10-06

### Added
- Optional `image_input` on `ModelCapabilities`: present only on a model proven to read pictures, and it requires the pinned multimodal `projector` file (name, URL, sha256, size) its engine loads beside the weights, so image input without a projector cannot validate. A host keys picture support on this declaration, never on a model id (VISION-01a). New fixture `model-capabilities.vision-role.example.json`.
- Closed presence states, turn-stream event mappings, private activity ownership rules, resolver priority/timing, web/Eyes/body joins, emotion-map overlays, Row-Bot transition fixtures, and the optional `RobotState.presence` field (PRESENCE-STATES-01).
- Household, person, and robot device settings for Reachy, including the default-off tailnet opt-in and the six Home-honoured robot controls (SETTINGS-ROBOT-01). Filed the EYES-07 quiet-hours follow-up.
- Closed emotion-to-primitive and optional clip map, the twelve emotion labels, optional `ReplyPlan.react_move`, and the `thinking`, `offer`, and `shake` primitive names (EMO-MAP-01).
- Reachy device capabilities `gestures` and `sound_events`; two Reachy Mini fixtures model the body without Eyes and with Eyes fitted. `eyes` reuses the existing capability id (BODY-VOCAB-01).
- `DeviceCommand`, `RobotOffer`, and `RobotAssetManifest` schemas and fixtures, the fixed household `safety.alarm` notification declaration, the checksum and licence pinned base robot asset list, and optional `watch_level` on `robot.state` (SPEC-ROBOT-01). No moves or firmware are in the base asset list.
- Optional `motion` (`resting` or `held`, null when the body cannot tell) and optional `put_down_count` (non-negative integer) on `robot.state` (MOVE-CARRY-02). `activity` gains no value. Two fixtures: `robot-state.held.example.json` and `robot-state.resting.example.json`.
- `vocab/capabilities.json`: the twenty body ids a robot declares on its device row (`head_6dof`, `head_pan_tilt`, `roll`, `antennas`, `body_yaw`, `eyes`, `mouth`, `light_ring`, `doa`, `state_feed`, `encoders`, `touch`, `distance`, `imu`, `battery_readout`, `physical_mute`, `camera_shutter`, `moves_recorded`, `speech_pod`, `speech_robot`), and two robot device fixtures, a Reachy Mini and a MaiPai build (BODY-VOCAB-01).

## [spec-v0.1.82] - 2026-10-06

### Changed
- `StackJob.state` adds `waiting_for_you` and `paused` to the existing queued, running, done, failed and cancelled states. The shape adds no age-band or raw fields (ACTIVITY-01a).

## [spec-v0.1.81] - 2026-10-06

### Changed
- The stub server's tokenizer splits a long run of letters or digits into pieces of up to four, the way a real subword vocabulary does, so a test that sizes a long text gets a count in proportion to its length.

## [spec-v0.1.80] - 2026-10-06

### Added
- Person settings `reference.images` ("Show pictures in answers") and `chat.photo_uploads` ("Send photos in chat"): boolean, default true, honoured by home. Adults and teens are on by default, children are off until a parent enables them, and teens control their own (IMG-SPEC-KEYS).
- `TokenCountRequest` and `TokenCountResponse` (schemas, Zod mirrors in `stack/ts/token-count.ts`, fixtures): the Stack's `POST /v1/tokenize`, the chat engine's own token count on its own template render (STACK-TOKENIZE-01, for Home's THIN-3B). `LlamaServerClient.countTokens()` takes the same count from a llama-server directly (`/apply-template`, then `/tokenize`), and the stub server answers all three routes offline.

## [spec-v0.1.79] - 2026-10-06

### Added
- The `robot` notification channel, person preference for `time_sensitive` robot delivery, optional notification privacy declarations (absent means private), strict spoken/content-free `notify` payload variants, and `RobotChannelFrame` for delivery acknowledgements, voice-only offer answers, and voice snooze answers. The waiting variant contains no `text` property and fixtures reject content in that form.

### Changed
- Corrected the unused `offer` command payload to `{offer_id, person_id, tier, non_personal_line}`. Prepared text remains in the hub-side `RobotOffer` record; the outbound command cannot contain it.

## [spec-v0.1.73] - 2026-10-05

### Added
- `reconnecting` and `sleeping` values on `robot.state` `activity`
  (ROBOT-STATE-ACTIVITY-01). `reconnecting` means the robot lost the hub
  link and is trying to restore it; `sleeping` means it is deliberately
  idle, not unreachable. A consumer treats an activity it does not know as
  unknown, not as an error.
- Optional `background_turns` boolean on the model `turn_budget`
  (MODEL-BG-SPEC-01): the model may run unattended background turns
  (heartbeat, errands, price watches). Absent means false, and a model
  with no record or no `turn_budget` is false too.

## [spec-v0.1.72] - 2026-10-04

### Removed
- Retired household setting `turn.pipeline.next` and the unused
  `answer_from_context_tool` field from model turn budgets.

## [spec-v0.1.71] - 2026-10-03

### Added
- Household setting `chat.teen_gate_grain` (`sentence` by default, or `arrival`): how a teen's written replies are checked before they are shown. A child and every spoken turn are always checked per sentence.

## [spec-v0.1.70] - 2026-10-01

### Added
- Household settings for the internet probe switch, DNS name, TCP address, and TCP port.

## [spec-v0.1.69] - 2026-10-01

### Added
- Optional `needs` declarations on package manifests for engine, service and internet dependencies.
- `internet` and validated `service:<id>` status components.
- Valid and invalid manifest-needs and status-event fixtures, checked by the TypeScript and Python generated validators.

## [spec-v0.1.68] - 2026-09-30

### Added
- `model_file_bytes`, an optional hard fact on StackFitPlan

## [spec-v0.1.67] - 2026-09-30

### Added
- `engines.stack.use_chat`, `engines.stack.use_embeddings`, `engines.stack.use_stt` and `engines.stack.use_tts`, the per-role Stack switches.

## [spec-v0.1.66] - 2026-09-30

### Added
- `notifications.browser.enabled`, the per-person setting for alerts on the open device.

### Changed
- `MaintenanceWindow` gains optional `rrule` and `until` fields for recurring maintenance series (STATUS-D1, home `docs/plans/status-page-2026-09-30.md`). Occurrence times remain derived from the stored start, end duration and current clock.

## [spec-v0.1.65] - 2026-09-30

### Changed
- `MaintenanceWindow` gains optional `rrule` and `until` fields for recurring maintenance series (STATUS-D1, home `docs/plans/status-page-2026-09-30.md`). Occurrence times remain derived from the stored start, end duration and current clock.

### Added
- `status-note.schema.json` and `maintenance-window.schema.json` (STATUS-B1, home `docs/plans/status-page-2026-09-30.md`): admin-pinned plain-text status notes and scheduled maintenance windows, with generated TypeScript/Python models and valid, invalid and hub-enforced fixtures. Maintenance status is derived at read time; recurrence is not modeled, component ids are listed in the schema, and the hub must enforce that `ends_at` follows `starts_at`.
- `status-event.schema.json` and shared `status-component.schema.json` (STATUS-C1, home `docs/plans/status-page-2026-09-30.md`): append-only component state changes, with generated TypeScript/Python models and valid and invalid fixtures. The hub enforces when rows are written, 90-day pruning, duration from the next row, and the operational display rule for components with no rows.

## [spec-v0.1.62] - 2026-09-30

### Added
- `status-event.schema.json` and shared `status-component.schema.json` (STATUS-C1, home `docs/plans/status-page-2026-09-30.md`): append-only component state changes, with generated TypeScript/Python models and valid and invalid fixtures. The hub enforces when rows are written, 90-day pruning, duration from the next row, and the operational display rule for components with no rows.

## [spec-v0.1.61] - 2026-09-30

### Added
- `status-note.schema.json` and `maintenance-window.schema.json` (STATUS-B1, home `docs/plans/status-page-2026-09-30.md`): admin-pinned plain-text status notes and scheduled maintenance windows, with generated TypeScript/Python models and valid, invalid and hub-enforced fixtures. Maintenance status is derived at read time; recurrence is not modeled, component ids are listed in the schema, and the hub must enforce that `ends_at` follows `starts_at`.

## [spec-v0.1.60] - 2026-09-30

### Added
- the role vocabulary in model-capabilities.schema.json gains judge, rerank and music

## [spec-v0.1.59] - 2026-09-30

### Added
- `kv_cache_type` definition; the `mlx-serve`, `sherpa-onnx-node` and `pocket-tts` engine names; the footprint entry and the `footprints` property on the model record; and `stack-fit-plan.schema.json` (the Stack fit-plan wire shape).

## [spec-v0.1.58] - 2026-09-29

### Added
- `data-class.schema.json`, `data-location.schema.json` (`schema: 2`) and `data-folder.schema.json`: the class declaration, the bootstrap record of where each class of a household's data lives (a root, per-class overrides with generation and volume identity, the move in progress with per-class steps) and the folder marker (DATA-LOCATION-00a, home `docs/dev.md`, "DATA-LOCATION"). Generated TypeScript and Python models, 76 valid and invalid fixtures, and a round-trip test in each language. Additive: no existing shape changed. The choices made where the design record left one are listed in `spec/README.md`.

## [spec-v0.1.57] - 2026-09-29

### Added
- `robot-state.schema.json`: optional, nullable `app_version`, the MaiPai app version the robot runs (the `maipai-bot` release), so the hub can compare a robot to a `getmaipai/bot` release. `daemon_version` is unchanged and stays the vendor SDK's version. Additive: producers that omit it still validate. Fixtures cover present, null and omitted.

## [spec-v0.1.56] - 2026-09-29

### Added
- `settings/keys.json`: `ui.enrollment_sounds`, a person-scoped boolean (default true, level basic, `lives_in` `profile.appearance`, honoured by `home`) that turns the face-enrollment capture sounds on or off. Regenerated from Home's declaration by `gen:settings`; no other key changed.

## [spec-v0.1.55] - 2026-09-29

### Added
- `robot-state.schema.json`: the hub-local state projection for a paired robot's Devices-page card (activity, muted, tracking, battery state and level, daemon version), keyed externally by device_id and without synced-record identity fields. Battery and daemon fields may be omitted by producers that do not report them; explicit null represents unknown state. Six fixtures cover all activity values and the all-null optional state.

## [spec-v0.1.54] - 2026-09-28

### Added
- `biometric-print.schema.json`: a shared record for one accepted face or voice enrollment sample's reference embedding (person_id, modality, model_id, model_sha256, dim, embedding, consent_at, consented_by_person_id, timestamps, hlc), the commons-side piece bot's FACE-01 was blocked on (bot `docs/dev/face-voice-recognition-design-2026-09-28.md`, `docs/dev/design-face-recognition-models-2026-09-28.md`). `validate_biometric_print`/`validateBiometricPrint` check embedding's length against dim, the one thing JSON Schema can't express; wired into the shared cross-language conformance suite. Three fixtures: an adult's own face and voice prints, and a child's face print consented by a different, adult person_id.

## [spec-v0.1.53] - 2026-09-28

### Fixed
- `manifest.schema.json`: remove `format: uri` from `companion.style_adapters[].url` so Python generation retains the same `^https://` pattern validation as TypeScript and JSON Schema.

## [spec-v0.1.52] - 2026-09-28

### Added
- `manifest.schema.json`: optional `companion.style_adapters` declarations identify a companion's GGUF LoRA adapter per base model, with download size, artifact checksum, and corpus checksum. The TypeScript and Python fixture suites validate a companion manifest carrying an adapter alongside the existing manifest fixture without this optional field (STYLE-SPEC-01, home `docs/BACKLOG.md`).

## [spec-v0.1.50] - 2026-09-27

### Added
- `settings/keys.json`: `voice.wakeword.enabled` is a device-scoped boolean, defaulting off, for explicit per-device opt-in to the locally installed stock wakeword detector. Home's `backend/src/settings/wakewordKeys.ts` is its source declaration; the registry was regenerated from that declaration and diffed against spec-v0.1.49 to confirm this is the only key change.

## [spec-v0.1.47] - 2026-09-27

### Added
- `settings/keys.json`: two keys completing `NOTIFY-SHARE-01` (home `docs/BACKLOG.md`) - `notifications.file.shared_with_you.telegram` and `notifications.file.shared_with_household.telegram` (both person scope, basic level, boolean, default `false`), regenerated from `home/backend/src/settings/notificationKeys.ts`'s `NOTIFICATION_SETTINGS_KEYS` via `bun run gen:settings` (`spec/settings/README.md`'s "not a placeholder to fill in by hand" rule), mirroring `notifications.memory.updated.telegram`'s exact shape. Diffed against `spec-v0.1.46` to confirm the change is additive only.

## [spec-v0.1.46] - 2026-09-26

### Added
- `manifest.schema.json`'s `kind` enum gains `project` (PROJECT-PKGTYPE-01 spec half, home `docs/BACKLOG.md`): a project-kind package declares a background project type, its body `plan.json` (a `ProjectPlan`, `project.schema.json`'s own `$defs/ProjectPlan`), never `recipe.json`. No new manifest field: the existing `args` field already holds a project package's own parameter schema. `fixtures/records/manifest.project.example.json` and `fixtures/records/project-plan.example.json` (one `text` step with a `{topic}`-templated `promptTemplate`, one `assemble` step) validate in TypeScript (`Project.shape.plan`) and Python (`ProjectPlan`).

### Fixed
- `tests/ts/fixtures.test.ts`'s `ErrorEntry` import: a hardcoded relative climb to the sibling `.github` checkout with no override, unlike `tests/py/_standards.py`'s own `MAIPAI_STANDARDS_DIR`-aware resolution - broke every fixture test in the file under a nested worktree. Now resolved the same way the Python side already does; unchanged for a plain checkout.

## [spec-v0.1.45] - 2026-09-26

### Added
- `settings/keys.json`: three keys for `STORE-CAP-01` (home `docs/plans/household-storage-2026-09-23.md`, "the two caps, declared once") - `storage.household.cap_bytes` (household, basic, default `0` meaning the setup wizard hasn't set one yet), `storage.person.default_cap_bytes` (household, basic, default 20 GB in bytes), and `storage.person.cap_bytes` (person, advanced, default `0` meaning no override - falls back to the household default). All three regenerated from `home/backend/src/settings/storageKeys.ts`'s `STORAGE_SETTINGS_KEYS` via `bun run gen:settings` (`spec/settings/README.md`'s "not a placeholder to fill in by hand" rule), diffed against `spec-v0.1.44` to confirm the change is additive only. Deliberately distinct from `storage.critical_free_gb` (disk-space headroom monitoring) and `storage.person_quota_gb` (cloned-voice storage today) - a different subsystem, checked before adding these.

## [spec-v0.1.44] - 2026-09-26

### Added
- `file.schema.json` (STORE-SPEC-01, home `docs/plans/household-storage-2026-09-23.md`): the general record for anything a person made or sent, replacing `attachment.schema.json` (no attachment rows existed in any household yet, so the rename is free) and folding in the never-built `media.schema.json` (`MEDIA-RECORD-01`). Additive over the attachment shape: `origin` (`sent`, `made`, `exported`), `kind` (`image`, `video`, `audio`, `document`, `story`, `other`), and a structured `provenance` object (`conversation_id`/`turn_id` for a sent file, `package_id`/`turn_id`/`job_id` for one a package made, `requested_by_person_id`/`turn_id` for an export) replacing the old free-text `provenance` string and the old top-level `conversation_id`/`turn_id` fields; `retention` gains `kept` alongside the existing `conversation` value. No sharing field: `share.schema.json` is the pointer record for that. `fixtures/records/file.example.json` (the migrated attachment fixture, `origin: sent`) and `fixtures/records/file.made-image.example.json` (`origin: made`, `kind: image`, from a picture-generation job) both validate in TypeScript and Python.
- `share.schema.json` (STORE-SPEC-01): the pointer record a file is shared through - `id`, `file_id`, `from_person_id`, `to` (a person id or `"household"`), `provenance`, `created_at`, `hlc`. No `kind`, `token`, or expiry fields yet; `share-link-01` (home `docs/plans/external-sharing-2026-09-23.md`) adds those additively for an external link. `fixtures/records/share.example.json` validates in TypeScript and Python.
- `turn-artifact.schema.json`'s `document` section: `attachment_id` renamed to `file_id` (pattern `^file-[a-z0-9]{6,}$`), matching the record it cites. `fixtures/records/turn-artifact.document.example.json` updated, including its citation `url`'s pseudo-scheme (`attachment://` to `household-file://`).

### Removed
- `attachment.schema.json` and its fixture, superseded by `file.schema.json` above.

## [spec-v0.1.43] - 2026-09-26

### Fixed
- `settings/keys.json`: spec-v0.1.42's two new session-lock keys were hand-appended, not regenerated from a real declaration - `spec/settings/README.md`'s "not a placeholder to fill in by hand" rule, caught by home's own `gen-settings-registry.ts` drift check (`backend/src/settings/coreKeys.ts no longer matches spec/settings/keys.json`). The two keys now come from a real declaration, `home/backend/src/settings/securityKeys.ts`'s `SECURITY_SETTINGS_KEYS`, wired into the generator alongside every other keys module; regenerating now reproduces this file byte for byte (sorted position and formatting corrected, values unchanged). spec-v0.1.42 is not deleted or moved - superseded here, not amended.

## [spec-v0.1.42] - 2026-09-26

### Added
- `settings/keys.json`: two new person-scope keys for INCOGNITO-07 (session lock with PIN re-entry) - `security.session_lock_required` (boolean, default off) and `security.session_lock_timeout_minutes` (number, default 5, range 1-120). Both `level: "expert"`, which `groupSettings()`'s own `level !== "expert"` filter (commons `ui/src/settings/groupSettings.ts`) drops from every renderer's eligible list entirely, self scope included - no generic settings UI surfaces them at any disclosure tier. Home's own PATCH /api/people/:id is the one owner/admin-gated surface that reads and writes them, since this is an admin-configurable-for-any-account control, not a personal preference.

## [spec-v0.1.41] - 2026-09-26

### Added
- `manifest.schema.json`: a required `incognito: blocked | ephemeral | unaffected` field on every package manifest (INCOGNITO-04) - a manifest that omits it fails validation, the same as any other required field, enforced by home's existing `PackageManifest.safeParse()` gate in `loadManifestOnly()`/`loadPackage()`. `fixtures/records/manifest.example.json` and `manifest.reference.example.json` both gain `"incognito": "unaffected"`. Additive to the shape; not additive to validity, since every existing manifest now needs the field set.

## [spec-v0.1.40] - 2026-09-26

### Added
- Project record (project.schema.json): the harness's durable project, its plan, steps and artifacts. (`package.json`'s own version field was never bumped for this tag - corrected at spec-v0.1.41 below, no shape change.)

## [spec-v0.1.39] - 2026-09-26

### Added
- `person.schema.json`: optional nullable `bio` (up to 160 characters) and `accent` (blue, violet, teal, orange, pink, red) fields for profile presentation. The person round-trip fixture exercises both fields.

## [spec-v0.1.38] - 2026-09-25

### Fixed
- The LLM stub server handle's `stop()` now returns the server's shutdown promise, so callers can await the listener port being released. A real loopback rebind test covers the contract.

## [spec-v0.1.37] - 2026-09-24

### Fixed
- `settings/keys.json`: `search.safe_search`'s own `range` field reformatted to match `gen-settings-registry.ts`'s real canonical output (`JSON.stringify(sorted, null, 2)` fully expands a nested array; spec-v0.1.35 hand-wrote it compact) - caught by home's own settings-registry drift check the moment `search.safe_search`'s TS declaration (`backend/src/settings/searchKeys.ts`) and `reference.library_dir`'s (new `backend/src/settings/referenceKeys.ts`) landed there. No field value changed, formatting only.

## [spec-v0.1.36] - 2026-09-24

### Added
- `vocab/status-phrases.json`: the written chat's default waiting-line phrases, one set per moment (`thinking`, `searching`, `checking`), ~50 phrases seeded from the owner's own list (STATUS-PHRASES-01).
- `manifest.schema.json`'s `companion` object gains an optional `status_phrases` block, the same three moments - a companion's own set replaces the default for a moment it declares, falls back to `vocab/status-phrases.json` for one it leaves out. Each phrase array is schema-enforced (non-empty, max 40 characters, ends in a single "…"). Additive; every existing fixture still validates unchanged.

## [spec-v0.1.35] - 2026-09-24

### Added
- `manifest.schema.json`: a `reference` package `kind` (a declarative offline knowledge archive, no code, like `model` and `voice`) and a `knowledge_source` block (`origin`: archive or live, `book`, `languages`, per-flavour `approx_bytes`/`snapshot_date` sizing inputs, `freshness`) - `SOURCE-SPEC-01`, home/docs/plans/knowledge-sources-2026-09-24.md.
- `source.schema.json`: `archive` added to `Source.kind`, a citation row from an installed offline knowledge source.
- `settings/keys.json`: `reference.library_dir` (household, text - a local folder, an external drive, or a NAS mount; Home's own data folder only the default) and `search.safe_search` (person, select: `default`/`off`/`moderate`/`strict` - `SEARCH-SAFE-01`, Jesse's own ruling 2026-09-24: an adult may change their own, only an adult may change a child's or teen's, a child or teen can never loosen their own below their band default).
- `fixtures/records/manifest.reference.example.json`, `source.archive.example.json`: round-trip fixtures for both new shapes.

Additive throughout; every existing fixture still validates unchanged.

## [spec-v0.1.34] - 2026-09-24

### Changed
- `stack/ts/turn-stream-event.ts`: `tool_result.outcome.sites`' own cap is now a named export, `TOOL_RESULT_SITES_MAX`, instead of a bare `5` only the Zod mirror knew about - a code review on TOOL-EVENTS-02's own home-side consumer caught it duplicating that number as its own unrelated literal. No shape change; every existing fixture still validates unchanged.

## [spec-v0.1.33] - 2026-09-24

### Added
- `turn-stream-event.schema.json`: `tool_result.outcome.sites` (host + page URL, at most five) - the sites a search step actually read, so a client can show them as chips under the step (TOOL-EVENTS-02). Additive; every existing fixture still validates unchanged.

## [spec-v0.1.30] - 2026-09-23

### Added
- `vocab/capabilities.json`: the engine roles (`vision`, `image`, `video`, `music`, `stt`, `tts`), named exactly as the Stack's own role ids, so a package manifest's `requires`/`optional` and the hub's engine allocation share one list (CAP-VOCAB-01).

### Changed
- tool-call corpus: "what's the latest Stephen king novel" expects a websearch call (a fresh-fact world question is a fitting search; REPLAY-BAR-01).

## [spec-v0.1.29] - 2026-09-23

### Fixed
- `llm/ts/client.ts`: `chatCompleteStream()`'s own non-ok branch reads
  and includes the response body (bounded to 2000 characters, best
  effort) in the thrown `LlmClientError`, instead of the status code
  alone. Found live: home's `generation_failed` regression (dev.md)
  had no way to tell a rejected message shape from a dead engine or a
  timeout, because the status-only message was the only thing a
  caller ever saw.

## [spec-v0.1.28] - 2026-09-23

### Added
- `model-capabilities.schema.json`: `turn_budget` gains
  `reply_ceiling_tokens` (the reply floor, home dev.md
  "turn-machine-state-record-2026-09-22.md", "The reply floor", owner's
  rule 2026-09-23): the most visible tokens one written adult reply may
  take, a runaway-guard backstop the way FORCED-CALL-01's own cap plays
  for a forced call, never a length target - the written plan's own
  length numbers (`register.ts`'s `writtenBudgetFor`) stay room the
  model's own end-of-reply decides inside. Required, the same reason
  `thinking_for_minors` and `thinking_budget_tokens_toggled` are: a
  budget with no opinion on it would silently leave a written adult
  reply with no backstop at all. The chat model example fixture gets
  `reply_ceiling_tokens: 1536`.

## [spec-v0.1.27] - 2026-09-23

### Added
- `model-capabilities.schema.json`: `turn_budget` gains
  `thinking_budget_tokens_toggled` (THINK-DEFAULT-01, home dev.md "U6
  rerun ruling" (b) 1): `thinking_budget_tokens` becomes the turn's
  default - 0 on every real budget, so thinking is off unless the
  person turns it on for that turn - and the new field carries the
  value used when they do, per model rather than one hardcoded
  constant. Both required, the same reason `thinking_for_minors` is: a
  budget with no opinion on either would silently default to the
  wrong thing. The chat model example fixture's own
  `thinking_budget_tokens` moves from 512 to 0, with
  `thinking_budget_tokens_toggled: 512` alongside it - the number
  itself is kept, not dropped, just repurposed as the toggled-on
  value.

## [spec-v0.1.26] - 2026-09-23

### Added
- `llm/ts/types.ts`: `ChatCompletionRequest` gains `stream_options?: {
  include_usage?: boolean }` (USAGE-01, home dev.md "U6 rerun ruling"
  (b), the second measurement fact): without it a streamed completion
  never carries a final usage chunk, so `cached_tokens`
  (`ChatCompletionUsage.prompt_tokens_details`, spec-v0.1.24) stayed
  blank on every streamed row. Only meaningful alongside `stream:
  true`; harmless, and ignored, on a non-streaming request. Client
  passthrough only (`client.ts` already spreads the whole request) -
  no client code changes needed.

## [spec-v0.1.25] - 2026-09-23

### Added
- `turn-signal.schema.json`: `target` gains `computed` and the clause
  `subject` gains `{ kind: "computed" }` (SIGNAL-02, home dev.md "U6
  rerun ruling" (b) 3): a turn the hub's own clock, calculator or
  converter answers with no lookup (arithmetic, a percentage, a unit or
  currency conversion, the time or date in a place, a date difference).
  The turn machine's interim rule forces a web search on `world` only.
  `target`'s description now says what the field is read as (the
  emotion's target on an emotional turn, the question's referent on a
  question), which is how home's classifier has derived it since
  SPEC-01. Fixture `turn-signal.computed.example.json`; the tool-call
  corpus gains six `computed` rows with an optional `target` label, the
  first two being the replay controls that were forced to search.
  Additive: every existing fixture validates unchanged.

## [spec-v0.1.24] - 2026-09-23

### Added
- `llm/ts/types.ts`'s `ChatCompletionUsage` gains an optional
  `prompt_tokens_details.cached_tokens` (ENGINE-CONTRACT-01/02): llama-
  server's own OpenAI-shaped prompt-cache telemetry, confirmed live
  against the pinned b10797 build - home's turn machine reads it onto
  the stored generation record so a required-miss can be read by cache
  state.

## [spec-v0.1.23] - 2026-09-23

### Added
- spec: the capability vocabulary gains the engine roles (vision, image,
  video, music, stt, tts), named as the Stack's role ids (CAP-VOCAB-01).

## [spec-v0.1.22] - 2026-09-23

### Added
- `ModelCapabilities.turn_budget` gains `thinking_for_minors` (required
  boolean): whether the model node even asks the engine to think on a
  minor's turn, false by default (GROUND-01, home/docs/plans/
  turn-machine-state-record-2026-09-22.md, "Reasoning is a second
  output"). A cost control only - a minor's turn never emits or persists
  reasoning regardless of this field, since `context.ts`'s
  `decideReasoning()` already forces `reasoning.emit` false from the age
  band alone.

### Changed
- The chat model example fixture's `answer_from_context_tool` flips to
  `false`, matching the owner's ruling (state record, 2026-09-22) that
  the `answer_from_this_conversation` escape is off in every budget
  until reuse-with-freshness is built.

## [spec-v0.1.21] - 2026-09-22

### Fixed
- `turn.pipeline.next`'s `lives_in` corrected from `household.system` to
  `household.ai`: spec-v0.1.20 hand-edited `spec/settings/keys.json`
  directly instead of going through home's own declaration files
  (`backend/src/settings/*Keys.ts`), the registry's real source of
  truth (`spec/settings/README.md`: "not a placeholder to fill in by
  hand", `backend/scripts/gen-settings-registry.ts`). That left home's
  `check.sh` "settings registry, regenerate and check for drift" stage
  red: regenerating from declarations produced no `turn.pipeline.next`
  entry at all. Fixed at the root by adding the key to
  `backend/src/settings/aiKeys.ts` (beside `chat.model_id`, the other
  chat-model setting) and regenerating this file from it - every other
  entry is byte-identical to spec-v0.1.20's hand-written version,
  confirmed by diff, so nothing else drifted.

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

## [spec-v0.1.396] - 2026-11-14

- LISTEN-SONG-01, additive: `device-command` gains `listen_song` with a `request_id` and optional 5 to 15 second clip duration (default 10); the robot posts the clip to Home for song identification and never keeps it.

## [spec-v0.1.395] - 2026-11-14

- SCENE-01f, additive. The person setting `scene.ha_person_entity` links someone's own Home Assistant person or device tracker for Home's coarse home-state cue on their place line.

## [spec-v0.1.394] - 2026-11-13

- `player` accepts optional `marks: { bind?, field?, heading? }` for a seekable list of saved moments, and its `actions` args may use `{position_s}` (matches ui 0.5.665).

## [spec-v0.1.393] - 2026-11-13

- INSTANT-FILLER-01a: update `voice.talk_over` copy to describe the varied short spoken cues Home uses.

## [spec-v0.1.392] - 2026-11-13

- `media_shelf` accepts optional `poll_while: { field, values }` to refetch its bound rows while any row's configured field has a value that means work is still in progress (matches ui 0.5.664).

## [spec-v0.1.391] - 2026-11-13

- `prompt_bar.references` takes `max`, an integer from 1 to 3 with a default of 1, matching ui 0.5.663.

## [spec-v0.1.389] - 2026-11-13

- MUSIC-ID-01, additive. New household setting `music.identify.online` (`on` default, `ask`, `off`): whether Home may look a song up on AcoustID by fingerprint when its own library has no match. `spec/package.json` is 0.1.389.

## [spec-v0.1.388] - 2026-11-13

- ONE-COMPOSER, additive. The `prompt_bar` `chips` array takes up to 16 chips (was 10), so one Create page can hold a combined chip with many groups; the visual limit stays one row, enforced by the kit's overflow rule. `spec/package.json` is 0.1.388.

## [spec-v0.1.387] - 2026-11-13

- SCENE-01a, additive. Adds runtime-only `SceneObservation` and `Scene` schemas for in-memory conversation context, plus generated TypeScript and Python models and validation tests.

## [spec-v0.1.385] - 2026-11-13

- VIDEO-COMPOSER-03, additive. `prompt_bar` chips and their options take kit icon names (1 to 40 characters), and references take a `disabled_reason` plain line (1 to 120 characters) for the disabled slot and composer's "+" (matches ui 0.5.658). `spec/package.json` is 0.1.385.

## [spec-v0.1.384] - 2026-11-13

- VIDEO-LD-04, additive. `media-collection` gains `family_picks`, a shared household vote queue; items can record unique voter ids in `votes` and the person who added them in `added_by`.

- MAKE-CLEARER-02 (MAKE-CLEARER-2026-11-13), additive. The `image_editor` node takes `resize_upscale` (boolean, default true); false hides the Resize bar's own Upscale 2x and 4x buttons (matches ui 0.5.650). `spec/package.json` is 0.1.384.

## [spec-v0.1.383] - 2026-11-13

- STACKCHAN-VOICE-01, additive. `device-command` gains the kinds `timer_set` (`seconds` 1 to 86400, optional `label`), `alarm_set` (`hour`, `minute`, optional `label`), `timer_list`, `timer_cancel` (optional `id`; none cancels all), `timer_stop` and `timer_snooze` (optional `seconds`, at most 3600) for the robot's own timers. The robot's answer rides in the ack state as `{ok: true, ...}` or `{ok: false, error}`.

## [spec-v0.1.382] - 2026-11-13

- CREATOR-13 (CREATOR-PORT-2026-11-13), additive. `media-template` fragment `group` gains `picture_look`, `relight`, `angle` and `format`, the picture preset families, so they never share a group with the shot-card `look` and `light` words.

## [spec-v0.1.381] - 2026-11-13

- ONE-COMPOSER-2026-11-13 (COMPOSER-04), additive. New record `turn-composer` (`TurnComposer`): the chat composer's mode and chip values sent beside the words of one written chat turn (`mode`, optional `settings` keyed by chip id, optional `cast` of up to six ids). A hint the model reads, never a route: it has no tool name and no unknown keys. The hub honours it on written chat turns only and checks every entry against the person's own band.

## [spec-v0.1.380] - 2026-11-13

- STACKCHAN-HOME-01, copy only. `robot.dance.auto_sensitivity` option lines read as the names the settings page shows in its list (Low, Medium, High with a few words each).

## [spec-v0.1.379] - 2026-11-13

- STACKCHAN-HOME-01, additive. Seven robot device-scope keys (honoured by home and bot, on the robot's device card): `robot.dance.enabled` (true), `robot.dance.show_ring` (true), `robot.dance.auto` (false), `robot.dance.auto_sensitivity` (low, medium, high; default medium), `robot.timers.enabled` (true), `robot.announce.enabled` (true) and `robot.repeat.enabled` (true). `device-command` gains the kinds `dance` (empty payload), `music_test` (optional `fast`) and `announce` (`text`, optional `urgent`); the robot's answer rides in the ack state. The robot's light keys (`robot.indicator.*`) stay robot-only, declared by the robot on hello, and are not in this registry.

## [spec-v0.1.378] - 2026-11-13

- CREATOR-01 (CREATOR-PORT-2026-11-13), additive. New record `creation-record`: one per made item, written only by a finished job's writer, holding the made files, jobs, production and shot, recipe and route, cast with look, sources with roles, a `generation-provenance` block by reference, settings, checks, `parent_id`, `review` (pending, kept, rejected), `audience`, `made_audience` and `lock`; `words` and `plan` are private to the maker and never go in `file.provenance.generation`. `generation-provenance` `kind` gains `picture`, `video`, `film` and `task` gains `generate`, `edit`, `film` so pictures, clips and films can carry it. `media-subject` gains optional `person_id` (a household member's subject; `real` and the minor fact are derived from the person at read time) and `locked_description` (up to 400 characters). `media-template` `kind` gains `fragment` with a required `group`; every template reader must skip fragment records. `media-production` `scene` gains optional `act` and `sequence` labels. `records/ts/validate.ts` gains `validateCreationRecord` and `validateMediaTemplate`.

## [spec-v0.1.377] - 2026-11-13

- EDITOR-HANDOFF, additive. An `image_editor` `actions` entry takes `hand_off: "video_create"` instead of `action`: the host opens the Video app's Create form with the picture in place and starts nothing (a package page cannot navigate into another app).

## [spec-v0.1.376] - 2026-11-13

- EDITOR-HANDOFF, additive. `image_editor` gains `actions` (up to three `{ label, action }`): the page's own hand-offs for the picture on screen, drawn as header buttons; each runs its action with `{file}` set to the Library file id of the version being shown and starts nothing itself.

## [spec-v0.1.375] - 2026-11-13

- EDITOR-AGE-ADD and EDITOR-TOOLS-READY, additive. `image_editor` gains `add_picture` (`{ label, action }`: an "Add a picture" control that opens the host's media picker and hands the chosen file id to `action` as `{id}`). A row of `operations` may carry `tool` (markup, comment, remove_background, erase, resize, crop or adjust): it is then the readiness of that built-in tool, `{ tool, enabled, reason }`, and is never listed under More. `handlers.pick_reference` is now run with `{ file, ref }` (`ref` is the Library file id the person chose in the host's picker).

## [spec-v0.1.374] - 2026-11-13

- IMG-STUDIO-03, additive. `empty_state` gains `secondary_action` and `secondary_action_label` (a quiet second button, drawn only beside `action`). `image_editor` gains `empty_state`, `hide_when_empty` and `fields.empty` (a placeholder row draws the page's own empty state), and its `apply` and `markup` replies may carry `locked: true` and a `note` (the new version was saved behind the person's lock; the editor keeps the picture being edited and says so).

## [spec-v0.1.373] - 2026-11-13

- IMG-STUDIO-01, additive. `ui/schema.json` gains the `image_editor` node (the picture Studio): `bind` (one picture row, chosen by a Library file id from page state), `fields`, `initial_tool`, `tools`, `tool_reasons`, `compare`, `comment_brush`, `operations.bind` (the host's one-click operation rows `{ id, label, summary, controls, enabled, reason }`), `handlers` (`run`, `apply`, `markup`, `comment`, `pick_reference`) and `on_close`. It is allowed on a package page (`app-check.ts`).

## [spec-v0.1.371] - 2026-11-12

- TALK-OVER-01, additive. `voice.talk_over` now defaults to `gentle` (owner decision 2026-11-12).

## [spec-v0.1.370] - 2026-11-12

- STT-SMARTTURN-01 and TALK-OVER-01, additive. Settings registry: `voice.speculative_start` now defaults to on (Home's declaration since 2026-11-12 never took effect: Home's registry keeps the spec's copy of a key the spec already carries, so the hub refused every speculative start as "off"); gains `voice.talk_over` (household, select off / gentle / natural, default off, advanced) and `voice.talk_over_window_ms` (household, number 500 to 1200, default 800, advanced), both honoured by home.

## [spec-v0.1.369] - 2026-11-11

- PACK-GESTURE-01, additive. Companion pack clips may declare `gesture: { kind, amp }`; gesture clips must cover the full rest pose, and each state keeps an ordinary clip for its loop.

## [spec-v0.1.368] - 2026-11-11

- STT-SMARTTURN-01, additive. Settings registry gains `voice.speculative_start` (household, boolean, default off, advanced, honoured by home). spec-v0.1.367 carried the key but its package version still read 0.1.366, so the tag was cut against the wrong version; use this tag.

## [spec-v0.1.366] - 2026-11-11

- PACK-SOURCE-01, additive. `companion-pack.schema.json` gains an optional top-level `source: { x0, size }` (`x0` a number of 0 or more, `size` a number above 0): the frame the pack's layer coordinates are pixels of, a square tile starting at `(x0, 0)` with side `size`. Absent means `{ x0: 224, size: 576 }`, exactly the old behaviour, so every existing pack is unchanged. A pack made in a plain 480 tile declares `{ x0: 0, size: 480 }`. Generated TS and Python readers and both validators (plain-words problems for a bad x0 or size) updated; new fixtures `valid-source-frame.json` and `invalid-source-frame.json`. Pairs with ui-v0.5.595.

## [spec-v0.1.365] - 2026-11-10

- MAKER-G, additive. `companion-pack.schema.json` gains an optional `voice` layer: a `base` picture (the rest picture without the reactive parts, optional) and 1 to 12 `parts`, each a picture with alpha plus a `box` and `anchor` in the 480 pixel tile and a list of `effects` that map the voice `level`, the mouth-cue energy (`cue_energy`) or the companion `state` to scale, rotate, translate, opacity, brightness and glow, with attack and release smoothing and per-state presets (idle, listen, think, speak, interrupt). `states`, `mouth`, `emotion` and `life` are now optional in the schema and required by `validateCompanionPack` (TS and Python) only when `voice` is absent, so a pack may be a still plus parts with no video. The validator also checks unique part ids, boxes inside the tile, `pulse` and `blink` curves only on the `state` channel, `drive` only on `state`, a glow colour for any glow effect, and that listed pictures exist. New fixtures `valid-still-parts-maipai.json` and six `invalid-voice-*` / `invalid-no-states-no-voice` fixtures. Existing packs are unchanged. Pairs with ui-v0.5.583.

## [spec-v0.1.364] - 2026-11-10

- PACK-01c, additive. `companion-pack.schema.json` makes `head` and `eyes` optional (their shapes are unchanged), so a pack without the head flow layer or the eyelid pictures is valid; the validator skips the head and eyes checks when a layer is absent and runs them all when it is listed. New fixtures `valid-no-head-eyes.json` and `invalid-head-missing-meta.json`. `scripts/gen-py.sh` now sets the Python regex engine on the companion pack models (pydantic rejects the look-around path patterns otherwise), and the Python pack tests match the 0.1.360 shape.

## [spec-v0.1.363] - 2026-11-10

- VIDEO-COMPOSER-03. `prompt_bar` supports a compact Image / Video mode selector, mode-specific submit actions, leading and trailing control alignment, icon-only closed choices, dropdown quality presentation and icons on option choices. Defaults are unchanged.

## [spec-v0.1.362] - 2026-11-10

- VIDEO-COMPOSER-02. `prompt_bar.layout` adds the optional `chat` presentation for a compact input and toolbar; defaults and earlier layouts are unchanged.

## [spec-v0.1.361] - 2026-11-10

- VIDEO-COMPOSER-01. `prompt_bar.layout` adds the optional `block` (default) and `composer` presentations. Engine-unavailable `starts` reasons disable only submit; prompt and choices remain editable.

## [spec-v0.1.360] - 2026-11-10

- PACK-01b, breaking for the unreleased companion pack schema only. `companion-pack.schema.json` now matches the real demo packs: mouth is a `calm` and optional `shout` folder each with a `meta.json`, `head`, `eyes` and `emotion` are folders, `rest` is a file, a clip may name a `phone` twin and a `trackFile`, flow files may be deflate-compressed (`flowEncoding`), `life` takes demo channel gains. The validator checks phone twins, folder meta files, flow encoding and counts the desktop tier. No other schema changes; no consumer used the 0.1.359 shape yet.

## [spec-v0.1.359] - 2026-11-10

- PACK-01, additive. New `companion-pack.schema.json` (states with arrays of clips, mouth atlas and flows, eyes, emotion layers, life channels, budget, provenance), generated TypeScript and Python types, and a pure `validateCompanionPack` validator with fixtures for the three demo characters. Replaces the unbuilt TALK-04 `animation.mouth` plan; `manifest.schema.json` is untouched.

## [spec-v0.1.358] - 2026-11-10

- STYLES-CIVITAI-01, additive default change. `generation.styles.civitai` now defaults to true (Civitai search and install on) and its help and the Styles area note say Home contacts civitai.com only when an admin searches or installs a style. A household that set it explicitly keeps its value.

## [spec-v0.1.357] - 2026-11-10

- CLIPS-FEED-02, no schema change. `PACKAGE_PAGE_NODE_TYPES` in `ui/app-check.ts` did not list `clip_feed` (added in 0.1.355), so a package page using it was refused and the whole app failed to register. It is now allowed, and the checker applies the package rules to it: `bind` is a package list entry, `item_fields` are field paths, and `actions` and `on_close` stay under the app. `widget_tiles` stays refused on purpose (it reads another route, like `widget_card`). Pages valid before stay valid.

## [spec-v0.1.356] - 2026-11-10

- VIDEO-UI-15, additive. `action.call.fresh_confirm` asks the host for a fresh secret and merges its ticket for call argument templates; `result_feed.actions[].show_when` gates an action on a truthy dotted row field, and actions now allow up to eight. Existing pages remain unchanged. Pairs with ui-v0.5.570.

## [spec-v0.1.355] - 2026-11-10

- CLIPS-FEED-01, additive. New page node `clip_feed`: a full-screen vertical feed of the household's own short clips. `bind` (package data call, the existing `clips` rows), `item_fields {src, poster, title, duration_s, id, subtitle?, liked?}` (dotted paths), `actions {like?, remake?}` (each a `feed_handler`: navigate, call or confirm; `like` also receives the typed `{liked}`; `remake` carries `starts`, default `video`, so the host's making notice disables it), `empty_state`, `start_id?`, `on_close?` (Close button action; absent: back one page), `autoplay` (default true) and `autoplay_field` (a boolean on the first row; false turns autoplay off for a child band). Save and Share are deliberately not in the schema. Fixture `ui/pages/clips-feed.json`. Pairs with the next ui tag.

## [spec-v0.1.354] - 2026-11-10

- PODCAST-RATE-01, additive. `player.rate {field?, value?, on_change?}`: the initial playback speed from a row field (dotted path to a number) or a constant `value`, and an action (a `call`) fired with the new `{rate}` whenever the person picks a speed. Absent: unchanged. Fixture `ui/pages/podcast-rate.json`. Pairs with the next ui tag.

## [spec-v0.1.353] - 2026-11-10

- QA-FINISH-01, additive. `list.hide_when_empty` (boolean, default false): the list draws nothing, not even the empty text, when its bound call returns no rows (`media_shelf` already has it). `action.call.success_label` (string, 1 to 40 characters, `{field}` placeholders allowed): after the call succeeds the kit shows it as a brief toast; absent means no toast.

## [spec-v0.1.352] - 2026-11-09

- MEDIA-PARITY-02, additive. Person settings `ui.activity_seen_at` (ISO string, default null), `music.library_sort` (recents|az|creator, default recents), `videos.library_sort` (recents|az), `music.crossfade_s` (0 to 12, default 0), `music.eq_preset` (flat|bass|treble|vocal, default flat), `podcasts.auto_download` (off|followed, default off) and `podcasts.auto_download_max_gb` (1 to 100, default 10); the podcast pair is parked in the new unplaced group `person.podcasts`. `media-collection` playlists: `media_kind` ("music"|"video", default music), `members` (person ids who may add items, default empty) and `cover_file_id` (file id or null); records without them stay valid. UI: `media_shelf` and `track_rows` `reorder {call, id_param}`; `media_shelf.item_badge_presentation` ("label"|"dot"); `search.suggest {bind, item_key_field?, item_label_field?, max?, min_chars?}`; `action.confirm.status` (package binding to a status-card row; dialogs are declared only as `confirm`, there is no dialog node); new node `widget_tiles`. Manifest widget `size` gains `tiles`. House widget kinds need no change: widget ids are free strings, not an enum. Fixture `ui/pages/media-parity-2.json`.

## [spec-v0.1.351] - 2026-11-09

- PRO-LOOK-01, additive. `media_shelf.card_radius` also accepts `soft` (the 18 pt soft card radius, section 17). New person setting `ui.home_order` (expert text, default `[]`, `profile.appearance.internal`): the ordered list of Home card ids, declared like `ui.home_hidden`. Card size is not added. `media_shelf` already expresses an empty-state action through `empty_state.action` and `action_label`, so no `empty_action` field. Pairs with the next ui tag.

## [spec-v0.1.350] - 2026-11-09

- 0.1.350: re-release of 0.1.349 (the 0.1.349 tag points at a commit still versioned 0.1.348). No schema change.

## [spec-v0.1.349] - 2026-11-09

- PARITY-01, additive (Podcasts, Music and Videos parity). `player`: `sleep_timer`, `skip {back, forward}`, `double_tap_seek`, `long_press_speed`, `pip` (booleans except skip), `transcript_bind` and `fields.transcript` (rows `{start_s, text}`), and `details_show` accepts `transcript`; the duplicate `details_show` key is gone. `media_shelf`: `sort {state, label, options}`, `chips {state, label, options}`, `item_avatar_field`, `pinned_field` with `pinned_max` and `pinned_heading`, and `row_actions` up to 3 (also on `track_rows`); `item_badge_field` already existed. `creation_header.backdrop: "art_gradient"`. `search.type_chips {state, label, options}` (`recents` already existed). New action `share {to, title?}` (a hub-route link). Play next, Add to queue, Mark played, Unfollow and Go to need no new op: they are a `call` or `navigate`. Fixture `ui/pages/media-parity.json`. Pairs with the next ui tag.

## [spec-v0.1.348] - 2026-11-09

- TALK-04, additive. The companion `animation` object accepts optional `mouth` (`anchor` as fractions 0 to 1 of the rest picture, and `shapes` with the six keys A to F, each a png filename) and optional `eyes` (`anchor`, `closed`, optional `half`). Rest is the rest picture; shape X draws nothing. Pairs with ui 0.5.555.

## [spec-v0.1.347] - 2026-11-09

- 0.1.347: re-release of 0.1.346; the 0.1.346 tag points at the wrong commit, use this one. No schema change.

## [spec-v0.1.346] - 2026-11-09

- UI-ROW-ACTION-WHEN-01, additive (landed in ui 0.5.552 without a spec tag). `media_shelf` `row_actions` accept optional `show_when_field` and `hide_when_field` (a row field name; the button is drawn only when it is truthy, or falsy). The `circle-dot` icon is a kit icon name, no schema enum. No existing page changes.

## [spec-v0.1.344] - 2026-11-08

- HOUSE-08b, additive. `settings-area` `matrix.rows` accepts `house/exposure`: a grid whose rows the host supplies at run time from the household's Home Assistant exposure list (no spec file). `spec/gen/ts` and `spec/gen/py` regenerated (landed with ui 0.5.530).

## [spec-v0.1.343] - 2026-11-08

- TRANSLATE-06, additive. Recipe step `translate` (`as`, `text`, `to`, optional `from`, all templates) calls `host.translate({text, to, from?})` and binds `{text}` like `llm_complete`. A host owns keep-terms and its output gate; the TS and Python emulators echo `[emulator: translate to <to>] <text>`. Interpreters, generated TS and Python and fixture `translate-step` updated. No existing recipe changes.

## [spec-v0.1.342] - 2026-11-07

- SPEC-GEN-PY-01, no schema change. `spec/gen/py` regenerated with the pinned generator (datamodel-code-generator 0.76.1, uv.lock): TALENT-00 had changed the broad sweep to modular output without regenerating the other modules, so `check` failed on drift. Adds the `presence_state` and `status_component` Python modules, unused RootModel wrapper classes (`Act`, `Stance`, `Subject`, `Day`, `Kind` and similar) and no removals. `gen-py.sh` now strips a module's own-name prefix from its union references (answer_block, conversation_turn, result and subject_ref failed at import without it).

## [spec-v0.1.341] - 2026-11-07

- UI-ACTION-CAPS, additive. `ui/schema.json`: a `result_feed` takes up to 5 `actions` (was 4) and a `studio` `export_result` up to 3 (was 2), so a page can carry a second entry that posts its own `call.args` (for example `{ surround: true }`). Pages valid before stay valid. Pairs with ui-v0.5.520.

## [spec-v0.1.340] - 2026-11-07

- AUDIT-DEAD-01, no schema change. Retired keys, parked the way `generation.people_prompts` already was: `engines.stack.use_chat`, `use_embeddings`, `use_stt` and `use_tts` (the Stack decides which engine does each role) move from `household.ai_developer` to the new parked group `household.ai_retired`, listed in `not_placed`, so no settings card draws them. They stay registered and writable; a stored value still reads and is ignored, never an error. Migration note: nothing to migrate; the paired drop tag removes the keys and any stored rows. `generation.people_prompts` (already parked in `household.media_retired`) gets help text that says it is retired. `robot.greetings.mode` is NOT retired: the robot body (`body/maipai_body/app.py`) reads it. Reworded the `chat.search_assist` help, which still said Rescue was not active yet: it now says the model decides when to search and the setting only picks Off, Shadow or Rescue for the assist.

## [spec-v0.1.339] - 2026-11-07

- TALENT-00, additive. Manifests can reference shared synth persona and metadata; Synth and ShowFormat records are added, with show data on productions, synth links on media records, production media sources, show provenance, and five synth settings. Existing companion manifests retain their shape.

## [spec-v0.1.338] - 2026-11-07

- I18N-K2, additive. The TypeScript `describeSetting` takes an optional third argument `t?: (id, fallback) => string`, applied to every copy field it returns (`does`, `title`, `what_is_stored`, `consent`, `reason`; ids `setting.<key>.<field>`, `.does.child`, `.does.teen`, `.label` when the label stands in, `.reason.<code>`; reason lines are translated before {admin} and {person} are filled in). Without it the output is byte-identical to before. The Python runtime is unchanged.

## [spec-v0.1.337] - 2026-11-07

- i18n, additive. `household.locale` gains the option `es` (Spanish). New person key `person.locale` (select; `household`, `en-US`, `en-GB`, `es`; default `household`; lives in `person.profile`; honoured by home and bot): `household` follows the home's language, anything else is the person's own choice. No record shape changes.

## [spec-v0.1.336] - 2026-11-06

- Python baseline, no schema change. `gen-py.sh` re-adds the `locked_fields` uniqueness check on the generated `MediaItem` (datamodel-code-generator drops `uniqueItems`; a regeneration had silently lost the validator, so Python accepted a duplicate like the TypeScript validator rejects). The Python device-command fixture test now expects 17 entries (16 kinds, `notify` twice) matching the TypeScript test.

## [spec-v0.1.335] - 2026-11-06

- WEATHER-SCENE-07, additive. The `weather_card` answer block gains three optional props: `sunrise` and `sunset` (ISO 8601 local date-time strings in the place's zone, the shape of `hourly[].time`, for example `2026-10-16T07:12`) and `wind_speed` (number, km/h, 0 to 400). Absent reads as before (fixed dawn and dusk, calm air), so every existing block validates unchanged.

## [spec-v0.1.334] - 2026-11-06

- LTXD, additive. The `Lora` record gains two optional fields: `tested_on_25` (`tested`, `no_effect` or null; only a record whose `base_model` is `ltx-2.3` holds a value, the Stack enforces that) and `untested_on_25` (boolean, derived by the Stack on read). Absent reads as null and false, so every existing record validates unchanged. The Stack's generation reply may also carry `lora_warnings` (`id`, `code` of `untested_on_25` or `tested_on_25`, `message`); that reply has no spec schema yet, so nothing changes for it here.

## [spec-v0.1.333] - 2026-11-06

- SCHED-02 / HOUSE-01, additive. New `ScheduledTask` record (`sched-` ids): `person`, `kind` (remind, timer, turn, device_action, scene), `executor` (hub, home_assistant), a recurrence in the alarm's shape (`once_at`, or `time` with `days` and `zone`; ISO weekdays 1 to 7 as in `alarm`, empty `days` means every day), `what` (`targets`, `action`, `value` 1 to 100, `text` up to 200), `enabled`, `state`, `paused_reason`, an opaque `external_ref` that is never the id, `grant_snapshot`, `deliver_on` (hub, robot, both; default hub), tombstone `deleted_at`, provenance and clock stamp. `validateScheduledTask` (TypeScript) and `validate_scheduled_task` (Python) check: exactly one recurrence form; device_action and scene need targets and an action; remind, timer and turn need executor hub; `external_ref` differs from `id`. `grant-actions.json` is unchanged.

## [spec-v0.1.332] - 2026-11-06

- SPEC-INSTANCES-02, additive. `Integration` gains optional `options`: an object of at most 8 non-secret per-instance settings (keys `^[a-z][a-z0-9_]{0,30}$`, string values of at most 200 characters), for example Uptime Kuma's `status_page` slug. The keys `token`, `password`, `secret` and `api_key` are rejected; secrets stay in the credentials center behind `credential_ref`.

## [spec-v0.1.331] - 2026-11-06

- SPEC-INSTANCES-01, additive. New `Integration` record, one per connected service instance: `type` (home_assistant, uptime_kuma, gitea, immich, unifi, plex), `instance` slug (no `/` or `:`), `label`, `address`, `credential_ref` (an opaque reference, never a secret), `enabled`, tombstone `deleted_at`, plus provenance and clock stamp. `validateIntegrations` checks (type, instance) uniqueness. Grant targets for connector actions may be `<instance>/<native target>` split at the first `/`; an unprefixed target means `default` (documented in `grant-actions.json`). Design: Home `docs/design/connector-instances-2026-11-06.md`.

## [spec-v0.1.330] - 2026-11-06

- CAPTION-01a, additive. Adds strict `Transcript`, `TranscriptRevision`, and `CaptionTrack` records with generated/imported provenance, clock stamps, stable segments, revision operations, caption cues, and optional style. Timing order and speaker references are checked by the record validators; overlapping cues remain allowed.

## [spec-v0.1.329] - 2026-11-06

- STYLES-04, additive. `prompt_bar` gains optional `style_suggest` `{ rows, style_state, character_state, max }`: a package binding of `{id, name, kind}` rows that drives up to two removable suggested style or character chips. The app check requires `rows` to name one of the package's own row data entries.

## [spec-v0.1.328] - 2026-11-06

- HOUSE-01a, additive. Four grant actions for smart-home control by room and item: `house.see:<target>`, `house.control:<target>` and `house.confirm:<target>` (target is `area:<id>` or `entity:<id>`), and `house.server` (restart Home Assistant, owner only, never callable by the model). Parameter rows by device class (lock, alarm, garage, entry_cover, camera, server) keep a child at `never` on every sensitive class and a teen at `never` on cameras and the server. Design: Home `docs/design/smart-home-controls-2026-11-06.md` (SMART-HOME-CONTROLS-01).

## [spec-v0.1.327] - 2026-11-06

- STYLES-04, additive. `Lora` gains optional `allow_suggesting`; missing values read as true for all-ages styles and false for adult-only styles, while admins may set the value per style. New roster-only fixture `lora.suggesting-off.example.json`.

## [spec-v0.1.326] - 2026-11-05

- MUSIC-GEN-11 (home `docs/design/music-listen-create-2026-11-01.md` slice C7, `docs/design/audio-parity-2026-11-05.md`), additive. `media-item` `kind` gains `sound` (a short sound effect or ambience made here); `generation-provenance` `kind` gains `sound` and `task` gains `sfx`. No existing value changes.

## [spec-v0.1.325] - 2026-11-04

- SPEC-MEDIA-01, additive: add `MediaTemplate` (picture or video prompt skeleton, category, audience, Library references, styles, aspect and transparency), `MediaSubject` (private-by-default character, prop or place with look words and approved Library picture ids), and `MediaProduction` (cast roles, sets, props, script, media and finished cuts). Real-person subjects carry `real`; `subject_age_band` is deliberately absent. File references are Library file ids, never paths. Add `media-template-categories.json` and roster-only round-trip fixtures in TypeScript and Python.

## [spec-v0.1.324] - 2026-11-04

(spec-v0.1.323 was cut before its package version was bumped; use this tag.)

- HOST-GUARD-00: add four household settings for the Mac host guard: mode,
  account and service failure time, graphics failure time and restart limit.
  The registry entries follow the Home key shape and live in
  `household.resources`.

## [spec-v0.1.322] - 2026-11-03

- MUSIC-GEN-20b, MUSIC-GEN-20c, MUSIC-FACTS-01, MUSIC-DJ-01 (home `docs/design/music-generation-2026-10-17.md` 18.5a and 18.5b, `docs/design/music-dj-facts-2026-11-03.md`), additive. `media-item` `lyrics.timed[]` lines gain the optional `words` (`{ t, end, text }`, seconds, each closed) for word-by-word timing and the optional `secondary` (one translation or pronunciation line). `music.artist_wikimedia` (same key, default and scope) is reworded to cover artists and songs: label "Show facts and photos from Wikimedia", new help and `copy.does`. New person key `music.dj` (`off`, `minimal`, `full`; `band_default` child `off`, teen `off`, adult `full`; guardian control for child and teen) and new person key `music.lyrics_translate` (a language name, empty means off; no band rule), both in the new person group `person.music`, drawn as the **Music** card on the Chat and AI page, tab Personalization. Fixtures `media-item.lyrics-words` and `media-item.invalid-lyrics-word-extra`; tests in `tests/ts/media-records.test.ts` and `tests/ts/settings-areas.test.ts`.

## [spec-v0.1.321] - 2026-11-03

- INSTALL-EVERYTHING-01, additive. The AI and models card lists five more choices with their words, so Settings and Setup can install and name every model the Stack knows: `picturesdetailed-qwen`, `videos-ltx25`, `videos-ltx25max`, `music-boost` and `music-max`. No existing choice changes.

## [spec-v0.1.320] - 2026-11-03

- VIDEO-LORA-09, additive. A `prompt_bar` chip takes `private`: its choice is never written into the page address (the id of an adult-only style must not reach a link or a history entry). Test in `tests/ts/ui-schema.test.ts`.

## [spec-v0.1.319] - 2026-11-03

- VIDEO-LORA-09, additive. A `prompt_bar` takes up to ten chips (was six): the Create page now has Shape, Length, Look, Camera, Voices, Styles, Characters and Strength. Test in `tests/ts/ui-schema.test.ts`.

## [spec-v0.1.318] - 2026-11-03

- VIDEO-LORA-09 (home `docs/design/video-loras-2026-11-02.md` 6.2 and 6.4), additive, every default unchanged. The `prompt_bar` node's chips gain `locked` (adds the one lock tile to a cards chip), `enabled_tiers` (the levels `standard`, `boost`, `max` at which the chip can be used; elsewhere it is disabled and sends nothing), `disabled_reason` (the one plain line shown while it is disabled) and `quiet_value` (a value that adds nothing to the group's summary); chip options gain `note` (one plain line under the cards while the option is chosen). Test in `tests/ts/ui-schema.test.ts`.

## [spec-v0.1.317] - 2026-11-02

- VIDEO-LORA-02b (home `docs/design/video-loras-2026-11-02.md` section 15.2). `Lora` gains the optional `adult_check`: `state` (`normal`, `unknown`, `adult`), `basis` (`source_flag`, `source_levels`, `source_tag`, `none`), `flag`, `levels_seen`, `adult_levels`, `checked_at`. It records what the source's own data said (Civitai flag and per-image levels, the Hugging Face tag `not-for-all-audiences`, never a word list) and is evidence only: `audience` stays two-valued and stays the access decision, so the Stack's `classification` mirror is unchanged. Absent reads as unknown, so every existing record validates. `validateLora` now requires `audience_set_at` as well as `audience_set_by` on an all-ages record (the schema `allOf` says the same), and checks that `adult_levels` does not exceed `levels_seen` and that `normal` has no flag, no adult level and at least one level seen. The `audience` description is reworded (an admin's Install click is the explicit choice). New fixture `lora.civitai-unknown-check.example.json`. Additive; the Stack must not be sent a full `Lora` carrying `adult_check` while pinned to an older spec.

## [spec-v0.1.316] - 2026-11-02

- VIDEO-SETTINGS-03 (home `docs/design/settings-media-2026-11-02.md` sections 3, 4 and 8). The household page **Pictures, videos and music** (`media`) keeps its name and gets four tabs, **Pictures, Videos, Music, Styles**; the tab `media-library` is removed (`legacy-sections.json` sends `home/media-library` to tab `pictures`). Cards by `lives_in` group: `household.media_pictures`, `household.media_kids` (Children and teens), `household.media_videos`, `household.media_music`, `household.media_online`, `household.media_lookups` (folded) and `household.media_styles`; `household.pictures` is empty. Five new view ids in the settings-area schema (`home.media_pictures`, `home.media_kids`, `home.media_videos`, `home.media_music`, `home.media_styles`); the old `home.pictures_library`, `home.media_library` and `account.likeness` stay in the list until Home stops using them. Card `description` and `copy` carry the exact text of section 4, including the three "Choose models" link rows and the Styles tab's Civitai notice.
- New household keys: `generation.picture_tier` and `generation.video_tier` (`standard` or `boost`, default `standard`; rename of `generation.picture_quality` and `generation.video_quality`, `quick` to `standard`, `detailed` to `boost`), `generation.styles.adult_only` (`allowed` or `restricted`; merges `generation.adult_adapters` and `generation.video.adult_adapters`: `restricted` if either old value is `restricted`), `generation.styles.civitai` (boolean, default off) and `generation.styles.civitai_key` (secret). Existing keys that move card: `generation.adults`, `generation.video.enabled`, `generation.music.enabled` (was `household.ai_music`), `generation.music.length`, the four `music.*` lookups, `generation.kids`, the two daily limits and `generation.household_likeness`. Relabelled: `generation.video.enabled` is "Video making", `generation.kids` says children, `generation.household_likeness` adds songs, `generation.music.enabled` is "Adults can make songs", the `generation.music.length` options say Short and Full (ids stay `quick` and `full`), `voice.hf_token` is "Hugging Face token". All eight old keys that nothing will read (`generation.adult_adapters`, `generation.video.adult_adapters`, `generation.picture_quality`, `generation.video_quality`, `generation.picture_quick_model`, `generation.picture_detailed.enabled`, `engines.video.choice`, `engines.music.choice`) and `generation.people_prompts` stay declared and readable until the paired drop tag (VIDEO-SETTINGS-09).
- Not placed: `generation.people_prompts` alone in `household.media_retired` (retired: nothing reads it); the two old adult-only style switches alone in `household.media_styles_old` (read once for the migration step); `person.likeness` (`generation.kid_enabled`, drawn on the child's Family page). The person page `pictures` ("Pictures and videos") is removed from the Yours group, which drops to six pages (`account/pictures` maps to `profile`). Home must update its declarations in `backend/src/settings/*Keys.ts` byte for byte with the pinned `keys.json` in the pin-bump commit (its drift check compares each key). Additive for readers; the view enum only grows.

## [spec-v0.1.315] - 2026-11-02

- VIDEO-STUDIO-05 (home `docs/design/video-studio-2026-11-02.md` K3, the editing half). The `studio` node gains, all optional: `tools` (which of split, delete, add_clip, add_voice, add_music are drawn), `tool_reasons` (a plain line that disables an Add button), `panels` (volume, fades, crossfade, level), `limits` (`video_pieces` 6, `audio_pieces` 2, `film_s` 60), `level_steps` (the Level panel's balances, default the five of `MIX_LEVELS`), `handlers.export` (one action run with `{ clip, plan }`; a whole `{plan}` placeholder keeps its JSON type) and `handlers.add` (a `call` whose JSON reply `{ ref, src, label, duration_s }` is the added piece), `export_label`, `export_disabled_reason`, `make_more` (up to three buttons, one action each, run with `{ clip, piece, at_s }`) and `export_result` (the export job's card: bound row, `fields`, `handlers` stop and retry, `actions`, required `poll_while`; the export reply `id` is written to page state `export_id`). `checkAppPackage` checks every handler, make_more and export_result action stays under the package and the polled record is a data entry of it. Additive.

## [spec-v0.1.314] - 2026-11-02

- VIDEO-STUDIO-04 (home `docs/design/video-studio-2026-11-02.md` K3, K4; the playback half). New app-page node **studio** (the kit's `TrackStudio`): `bind` (one clip row), `kind` (`video` default, or `audio`) and `fields` (dotted paths `key`, `title`, `poster`, `lanes`, `locked`, `making`). The bound row carries `{ id, title, poster, locked, lanes: [{ id: video | voice | music, label, hue, pieces: [{ id, ref, src, label, in_s, out_s, source_s, at_s, level_db, fade_in_s, fade_out_s, crossfade_s, duck }] }] }`; `src` is a same-origin path or an own-origin `blob:` URL the host made from an authenticated read. A row whose `locked` path is true draws one lock tile and nothing else. `checkAppPackage` allows `studio` on a package page, requires a `rows: "list"` data entry for its `bind` and checks every `fields` value is a path, not an address. Additive; no existing page changes. Editing (tools, panels, handlers, export) is VIDEO-STUDIO-05 and adds optional properties.

## [spec-v0.1.313] - 2026-11-02

- SPEC-FILE-OBJECT-01 (fix): the TypeScript generator emitted `File` as `object.and(z.any())` since 0.1.309 (the `made_audience` and `lock` if/then), a Zod intersection with no `.shape`, `.extend` or `.pick`, so Home crashed at import on `File.shape.kind`. `gen-ts.ts` now drops an object's `allOf` made only of if/then/else entries (they rendered as `z.any()` and checked nothing), so `File`, `Lora`, `LikenessAdapter` and `ProblemReport` are plain `z.object` again, and nested objects of `manifest`, `recipe`, `result`, `settings-area(s)`, `conversation-turn`, `content-ceiling` and `hero-slide` lose the same no-op. The record contents are unchanged; `lock` and `made_audience` stay ordinary optional fields and the rule that a lock is never on for an all-ages file stays in `validateFileAdultLock`. Python is unchanged. New `tests/ts/object-shape.test.ts` pins `.shape` and `.extend`. Consumers may pin this tag; 0.1.309 to 0.1.312 cannot be imported by anything that reads a File shape.

## [spec-v0.1.312] - 2026-11-02

- VIDEO-STUDIO-03 (home `docs/design/video-studio-2026-11-02.md` K2 and K5): `creation_header` `variant` gains `studio`, with the optional `eyebrow` (string, 1 to 40 characters), `secondary` (as `primary`) and `fields.locked` (dotted path to a boolean). `media_shelf` and `result_feed` gain the optional `heading_style` (`default`, or `eyebrow`). All additive, defaults unchanged; `app-check` checks the studio header's `primary` and `secondary` actions.

## [spec-v0.1.311] - 2026-11-02

- VIDEO-STUDIO-02 (K1b): `page` gains the optional `surface` (`page` default, or `studio`: the page body draws as a rounded pane on the kit's studio token scope). `checkAppPackage` refuses any other `surface` word. Additive; old pages are unchanged.

## [spec-v0.1.310] - 2026-11-02

- ADULT-LOCK-01 (home `docs/design/video-loras-2026-11-02.md` section 3.8): `media_shelf` gains the optional `locked_field` (dotted path to a boolean, default `locked`) and `making_field` (default `making`); `result_feed` `fields` gains the optional `locked` and `making`. A row whose locked flag is true is a locked item: the kit drops it before reading any other field and draws ONE identical lock tile per list, whatever the number of locked rows, with no title, description, picture, tags or count. `checkAppPackage` checks both media_shelf fields as paths (result_feed `fields` are already checked). Additive; a node without them is unchanged.

## [spec-v0.1.309] - 2026-11-02

- VIDEO-LORA-02 and the ADULT-LOCK-06 file fields (home `docs/design/video-loras-2026-11-02.md`, sections 3.10 and 4.1). New record **Lora** (`schemas/lora.schema.json`, `gen/ts/lora.ts`, `gen/py/lora_schema.py`): one household LoRA with id, provenance and clock stamp from first write; name, kind, description, media (`video` or `picture`), source (site, url, remote id, version id, `token_ref` by name only), file facts (sha256, bytes up to 4 GB, rank, modules, safetensors), `base_model` (`ltx-2.3`, `ltx-2.5`, `wan2.2-ti2v-5b`, `unknown`) and `compatible_with`, trigger words and position, positive, negative and avoid-as-positive add-ins, strength (default, min, max, 0 to 2), `audience` (default and uncertain is `adult-only`; `all-ages` needs `audience_set_by`), `availability` (`admins` default, `adults`, or `people` with person ids), added by and at, licence with acknowledgment, preview file, `removed_at` and `trash_until` (30-day trash), `last_check`. `validateLora` in `records/ts/validate.ts` carries the rules the generators drop (strength order, 400-character add-in totals, compatible_with contains the base, trash fields together, availability.people). The writer, not the record, refuses a minor in `availability.people` (the record holds no ages). Additive: `File` gains optional `made_audience` (`all-ages` or `adult-only`, the never-lowered minor ceiling) and `lock` (`on` or `off`, the creator-clearable Adult lock; never on while made_audience is all-ages; `validateFileAdultLock`). Absent fields read as before, so every existing file record validates unchanged. Home reads `Lora` and the two file fields; the Stack reads `file`, `base_model`, `compatible_with` and `audience` (as its `classification` second lock).

## [spec-v0.1.308] - 2026-11-02

- VIDEO-UI-14: `result_feed` gains the optional `look` (`default`, or `media`: the newest entry wide, a grid keyed on the feed's pane width, the tags on the picture, one caption) and `filters_presentation` (`inline` default, or `popover`: one View button). `media_shelf` gains the optional `media_loop` (boolean) and `item_loop_field` (dotted path to a same-origin mp4 looped over the poster); `checkAppPackage` requires `item_loop_field` when `media_loop` is true and checks it is a field path. All additive; old pages are unchanged.

## [spec-v0.1.307] - 2026-11-02

- VIDEO-UI-13 (items 4 and 5 of the Videos Create feel note): `prompt_bar` chips in a popover `group` gain `trigger` (`default`, or `banner`: the shared trigger drawn as a poster banner) and `popover_size` (`default`, or `wide`: a wider popover, six cards a row); both are read from the first chip of the group that sets them. `split_view` (main and aside form) gains `main_surface` (`page` default, or `stage`: the main column on the recessed kit surface). All additive; old pages are unchanged.

## [spec-v0.1.306] - 2026-11-02

- VIDEO-UI-12 (home `docs/design/video-create-feel-2026-11-02.md` change 3): `split_view` gains the optional `aside_width` (`default` 360 px, or `wide` 420 px at `lg`), `prompt_bar` gains `field_size` (`default`, or `large`: a five row box), `references[].placement` gains `tile` and `references[].hint` (a one-line hint on the tile), `tier.presentation` (`segment` default, or `cards`) and `submit_detail.placement` (`below` default, or `in_button`). checkAppPackage counts `tile` with `in_field` (at most one between them, picture, character or place only). Additive; every default is unchanged.

## [spec-v0.1.305] - 2026-11-02

- VIDEO-UI-03 (K2 to K4, K8, K11): `prompt_bar` gains the optional `placement` (`inline` default, or `panel`: a control panel beside a feed that reads its mode from the enclosing `split_view`), `suggestions` (up to 4 `{label, text}` idea chips), `submit_detail` (`{state, labels}`, the small line under the submit chosen by a chip or tier value) and `starts` (`picture` or `video`, so the host can disable the bar with its one reason); chips gain `presentation` (`inline` default, or `popover`), `group` (the visible name of a shared popover trigger) and `fold` (under "More settings"); references gain `placement` (`row` default, or `in_field`) and the kinds `audio` and `video`. `split_view` gains `aside_side` (`end` default, or `start`); its description now says `lg`, 960 px, not 1024. `checkAppPackage` refuses two in-field references, an audio or video slot in the field, a `submit_detail.state` the bar does not own, and `aside_sheet: "phone"` beside a panel `prompt_bar`. All additive; old pages are unchanged.

## [spec-v0.1.304] - 2026-11-02

- VIDEO-UI-04 (K9, K10): new UI node `result_feed`: a newest-first feed of the package's own rows, one `VideoPlayer` per entry with words, tags and reference chips, `filters` (toggle, select) that write page state, day headings (or the words, for a toggle marked `group`), `handlers` for the player's built-in `stop`, `retry`, `make_another`, `render`, `another_still`, `edit_words` and `favorite` (each one action plus the optional `starts` marker), extra `actions` with `when`, and the required `poll_while` (`statuses` of running jobs, `record`: the data call that reads one job's own record). `checkAppPackage` allows the node on a package page and checks its bind, handler and action targets, `fields` paths, `poll_while.record` data id and distinct filter keys. All additive; no existing node changes.

## [spec-v0.1.303] - 2026-11-02

- VIDEO-UI-05 (K12): `media_shelf` gains the optional `group_by_field` (a date path; day groups headed by the kit DayDivider, grid layout) with `group_noun` (the counted word, `{one, other}`), `size_control` (boolean, default false; the kit CardSizeSlider above a grid) and `favorite` (`{field, action}`, a heart toggle on each tile). `checkAppPackage` keeps the favorite call inside the package and both fields as paths. Additive; a shelf without them is unchanged.

## [spec-v0.1.302] - 2026-11-02

- MUSIC-LYRICS-KEY-01: the household setting `music.lyrics_online` (boolean, on by default, advanced, honoured by home), the switch for the Music app's one-song lyrics lookup. Home already declares it identically. Additive.

## [spec-v0.1.301] - 2026-11-02

- MUSIC-STUDIO-ALBUM: new record `MadeAlbum` (`malbum-`: title, `made_artist_id`, `song_style_id`, blurb, `look`, `cover_file_id`, `cover_seed`, `track_media_ids` in play order). It holds the SAME shared `style` and `seed` definitions as `SongStyle` and `MadeArtist`; a track is a normal made song, so the album only lists ids. New answer-block kinds `album` and `song_style` (props mirror the kit Album and SongStyle Elements). The `band`, `album` and `song_style` props gain `editable` (edit mode) and the editable words `look` and `sound`. Edit saves report these actions with only the changed fields: `edit_band`, `edit_album` (tracks as `track_ids`, the full new order), `edit_song_style`; `play_track` reports `{media_id}`. Additive.

## [spec-v0.1.300] - 2026-11-02

- VIDEO-CREATE-02 U1: `prompt_bar` chips gain the optional `variant` (`dropdown` default, or `cards`: a grid of picture cards, one choice) and each chip option gains the optional `media` (a relative package asset path, no `..`, no scheme, for a short silent mp4 or webp loop or an image). `prompt_bar` gains the optional `references` (up to 6 `{state, label, kind: picture | character | place}` slots; each writes a chosen file id under `state` and joins the submit item). `checkAppPackage` counts reference keys in the distinct-state check. All additive; old pages are unchanged.

## [spec-v0.1.299] - 2026-11-02

- MUSIC-LIKE-02: `player` gains the optional `actions_wrap` (boolean, default false): the actions row wraps instead of scrolling sideways. Additive.

## [spec-v0.1.298] - 2026-11-02

- MUSIC-LIKE-01: `media-item` gains the optional `made_artist_id` (`mband-...`, the made band a track belongs to; default null), `action.call` gains the optional `then` (a `navigate` run after a successful call, the response merged over the item, so a button can make something and open it), and a `player.actions` item gains the optional `busy_label` (the button's words and disabled state while its action runs). `checkAppPackage` checks `then` like any action. All additive.

## [spec-v0.1.297] - 2026-11-02

- MUSIC-STUDIO-S2, MUSIC-LISTEN-C5: new records `SongStyle` (`sstyle-`, a saved way a song should sound: style words, never lyrics) and `MadeArtist` (`mband-`, a band made here: name, back story, genres, members, portrait and logo file ids). Both carry `source`, `provenance`, `hlc`, `created_at`, `updated_at` and `deleted_at`, hold ONE shared `style` definition (`song-style.schema.json#/$defs/style`) and ONE `seed` field (`{file_id}` of a song made here, or `{media_id}` of a library item). New answer-block kind `band` (props mirror the kit Band Element). Additive.

## [spec-v0.1.296] - 2026-11-02

- MUSIC-ONLINE-01: three household settings for the music package's background lookups, `music.musicbrainz_match`, `music.artist_wikimedia` and `music.album_art_online` (all boolean, on by default, advanced, honoured by home). Additive.

## [spec-v0.1.295] - 2026-11-01

- MUSIC-POLISH-01: `track_rows` gains the optional `row_actions` (up to two quiet icon buttons at each row's end, each `{icon, label, action}`; the action receives its row, like `on_play`), and `creation_header.shuffle` gains the optional `icon` (default `shuffle`) and `labeled` (draw the label beside the icon). Both additive; `checkAppPackage` keeps a `row_actions` action inside the package. Fixture `ui/pages/music-listen.json` shows `row_actions`.

## [spec-v0.1.294] - 2026-11-01

- MUSIC-KIT-01: four new UI nodes for the modern music pages, `quick_tiles` (Listen now's six compact tiles), `top_result` (Search's Top result card), `category_tiles` (colour tiles for genre, mood, decade) and `track_rows` (numbered tracklist, the number turns into a play icon on hover). `media_shelf` gains the optional `card_radius` (`default` or `tight`), `press_scale`, `on_play` (a hover Play button that fires with the tile's row) and `play_label`; `player` gains the optional `art_spring` and `lyrics_blur`. All additive and allowed on a package page (`PACKAGE_PAGE_NODE_TYPES`); `checkAppPackage` keeps `on_select` and `on_play` inside the package (`play` allowed). Play counts are data: a page for a child profile binds rows without a count field. Fixture `ui/pages/music-listen.json`.

## [spec-v0.1.293] - 2026-11-01

- VIDEO-CREATE-01: new UI node `prompt_bar` (a prompt box, up to six chips that each choose one value, an optional Standard/Boost/Max tier, and one Make button whose `submit` action receives the prompt and every chosen value). Allowed on a package page (`PACKAGE_PAGE_NODE_TYPES`); `checkAppPackage` checks its `submit` stays inside the package and its state keys are distinct. Fixture `ui/pages/videos-make.json`.

## [spec-v0.1.292] - 2026-11-01

- MUSIC-MB-01: `media-item` gains the optional `musicbrainz_recording_id`, `musicbrainz_artist_id` and `musicbrainz_release_group_id` (each a lowercase UUID string or null, default null): the MusicBrainz ids a track is matched to. Additive; an item without them reads as unmatched.

## [spec-v0.1.291] - 2026-11-01

- RESEARCH-TIER-01: household setting `research.max_web` (boolean, default on, owner ruling 2026-11-01): Max may run up to 12 web searches and read up to 40 pages for one question, at most 4 from one site, 3 seconds apart, stopping at the first refusal. Off keeps Max to the offline library and one ordinary search. Additive.

## [spec-v0.1.290] - 2026-11-01

- RESEARCH-TIER-01: `turn_budget` gains the optional `rounds_thinking` and `rounds_max` (0 to 12): the tool rounds an adult's written turn may take when the person picked Thinking or Max for that message, so research depth follows the answer style. `rounds` keeps its 0, 1 or 2 and stays the Instant figure. Additive.

## [spec-v0.1.289] - 2026-11-01

- MEDIA-HEADER-01: manifest `contributes.header` declares what an app puts in the shell's one header row: a `search` trigger for the app's own scoped search, 2 or 3 `modes` (a segmented control whose page and sidebar groups change with the mode) and `actions` (one primary button plus an overflow menu). Sidebar groups gain an optional `mode`. The manifest lint checks pages, actions, mode names and that the search trigger has a sidebar search to open. Additive.

## [spec-v0.1.288] - 2026-11-01

- TIER-PRIO-02/06: household settings for the job queue policy: `resources.max_concurrent_per_person` (1 to 3, default 1), `resources.max_wait_before_aging.image|video|music` (minutes, default 0) and `resources.strict.image|video|music` (a kind that goes before every other, default off). Additive.

## [spec-v0.1.287] - 2026-11-01

- The AI glance card in settings gains the words for a Stems card: `stems`, `stems-standard`, `stems-finer` and `stems-more`. Additive.

## [spec-v0.1.286] - 2026-10-31

- News article props gain optional `kicker_channel` (`topic` or `feed`, with a non-empty key) so the category label can open its channel. Additive.

## [spec-v0.1.285] - 2026-10-31

- Person setting `companions.ambient_bot` (a robot's device id for the top-right companion spot, empty by default) and device command kind `find_me` (chirp and ring flash, optional seconds 1 to 30). Additive.

## [spec-v0.1.284] - 2026-10-31

- Recipe `format` steps gain an optional interpolated BCP-47 `language` for replies. Invalid or empty values are omitted. Additive.

## [spec-v0.1.283] - 2026-10-31

- getmaipai/home#58: optional `PluginResult.reply.language`, a BCP-47 tag for the reply text and speech. The hub uses an installed voice for that language or says plainly when none is installed. New valid `es` and `es-MX` fixtures and an invalid language fixture. Additive.
- MEM-PROV-01 (getmaipai/home#57): optional nullable `created_by` on MemoryRecord names the member whose action wrote it. Additive.

## [spec-v0.1.282] - 2026-10-31

- MemoryRecord and the recipe `remember` step gain the category `instruction`: a standing rule the person gave the assistant about how to behave for them (answer in short sentences, check the weather when I say it is cold, do not say X). Durable, person scope. The category field now carries a description. Additive.
- MemoryRecord `archived_reason` gains `profile_card_replaced`: the weekly profile paragraph row was retired when the deterministic profile card replaced it (2026-10-31). Additive.

## [spec-v0.1.281] - 2026-10-30

- MEM-SPACE-09: settings key `resources.close_apps.no_reopen`, the apps Home does not reopen after a job (the per-app Reopen when done switch; `reopen` stays the household default). Additive.

## [spec-v0.1.280] - 2026-10-30

- MEM-SPACE-04: settings key `resources.profiles`, the profile table (one row per lead job and tier, one cell per category: a tier, `queued` or `off`; chat is never queued or off), default as in the resource profiles note section 3. Additive.

## [spec-v0.1.279] - 2026-10-30

- TIER-SPEC-01: resource tiers. New `vocab/resource-tiers.json` (tiers reduced, standard, boost, max; who-can-use choices; switch-cost classes option, family, cross; typed options per category; the minors policy) and the `tier-slot` record `{ model, options }` with the typed-options check `records/ts/tierSlot.ts`. `tier.max` and `tier.max:<category>` join the grant vocabulary (child never, teen only the picture lane with an admin's approval, adult by assignment). `StackJob` gains optional `tier`, `window`, `tier_reason` and a counts-only `profile` (no app names); `GenerationProvenance` gains optional `tier`; `ModelCapabilities` gains optional `family`. Settings: 20 slot keys `engines.<chat|image|video|music|tts>.tier.<reduced|standard|boost|max>` (all Reduced slots start off), and `resources.preset`, `quiet_seconds` (least 20), `quiet_max_wait`, `quiet_timeout`, `cooldown_seconds`, `lower_without_asking.<chat|image|video|music>`, `priority`, `close_apps.mode` (off or automatic), `.always`, `.never`, `.reopen`. All additive; the old `engines.<role>.choice`, `generation.picture_quick_model` and `generation.picture_detailed.enabled` stay until Home migrates them into the slots. The `grant-actions` byte baseline in `coding.test.ts` moves to the new file.

## [spec-v0.1.278] - 2026-10-30

- READER-14: Offline data is its own Settings page in The home (section `offline-data`, view `home.reference_library`, admin), right after Search and web. The Reference library tab leaves Search and web, which gains a link card to the new page, and the old `reference-library` route maps to it. Owner decision 2026-10-30: the household page limit rises from nine to ten.

## [spec-v0.1.277] - 2026-10-30

- MOON-LOOK-02: `weather_card` props gain optional `moon: { phase, illumination }` for phase-accurate night rendering. Additive; absent moon data keeps the generic moon. New valid and invalid fixtures.

## [spec-v0.1.276] - 2026-10-30

- READER-05: add the person-scope `ReferenceSave` record (one saved reference article: book, path, title, `offline`, clock stamp, provenance; id prefix `refsave-`). Additive.

## [spec-v0.1.275] - 2026-10-29

- ANIM-QUALITY-01: `vocab/companion-media.json` (version 3) gives each creator animation a `motions` list of three or four specific, varied motions (`motion` stays the first, for older readers), drops robot words from the text people see, and sets the generated clip size to 384 by 384 (the delivered clip stays 480). Additive: `motions` is optional.

## [spec-v0.1.271] - 2026-10-28

- ANIM-SPEC-01 (COMPANION-3S-01): `vocab/companion-media.json` (version 2) lists 13 creator animations (required `idle`, `listening`, `thinking`, `speaking`; optional `working`, `researching`, `writing`, `done`, `sleeping`, `laughing`, `surprised`, `sad`, `confused`). The six older ids (`idle_look`, `needs_you`, `greeting`, `happy`, `oops`, `celebrate`) stay valid and are marked `legacy`. New data: `fallback` (which state plays when a clip was not made), `emotion_clips` (emotion label to clip, with each label's `child_band` copied from `emotion-map.json`), `picture_fallback` (keyframe, then still, then portrait). The manifest `animation.states` objects gain the new ids and an optional `keyframe` beside the required `still`; the kit's avatar machine resolves clips through `resolveClip`, `emotionClip` and `pictureFor`. Additive: old manifests stay valid. `presence-states.json` and `emotion-map.json` are unchanged.

## [spec-v0.1.270] - 2026-10-28

- NAT-07b: `MemoryRecord` gains an optional `archived_reason` (`end_date`, `decay`, `person`, `edit`, `forgotten`, or null), why a record left the active set. `OpenQuestion.kind` gains `thread` (the one "how did it go?" asked when a conversation opens) and `subject_id` also accepts a memory record id. `TurnSignal` gains an optional `no_task` boolean (the turn carries no task of its own). All additive.

## [spec-v0.1.269] - 2026-10-28

- AIMODELS-VISION-01: the AI and models glance card gains the `vision` job ("Describing pictures") and its `vision-reader` choice (words only), and `engines.vision.choice` moves to its own group `household.ai_vision` (listed in the glance card's `groups`) so the job card, not Model per job, draws it. Additive.
- NAT-07c: `MemoryRecord` gains an optional `offer_withheld` (boolean or null): the memory judge's one tag, at extraction, that a record must never be offered as an opening thread. It only adds withholding on top of the hub's own floor. Additive; a record without it reads as not withheld.

## [spec-v0.1.268] - 2026-10-28

- SPLASH-KEY-01: `api-key.scopes` gains `engine`, a key an owner or admin makes so an assistant session can switch the chat engine between `auto`, `llama-server` and `splash` and nothing else. Additive; a key with only `turn`, `code`, `settings` or `diagnose` is unchanged.

## [spec-v0.1.267] - 2026-10-28

- Owner decision: `radio.directory.enabled` (Find radio stations online) and `podcasts.directory.enabled` (Find podcasts online) default to on. A household that set either keeps its choice. Children still never reach either directory, and teens reach podcasts only behind `podcasts.directory.teens` (still off by default).

## [spec-v0.1.266] - 2026-10-28

- AMBIENT-05: new `page-context` record (app id, route, optional record kind, record id and title) and the `quick-action` ids.

## [spec-v0.1.265] - 2026-10-28

- DIAG-KEY-01: `api-key.scopes` gains `diagnose`, a read-only key an owner or admin makes so an assistant session can read turn timings and engine state to find out why chat is slow. Never message text, people or settings changes. Additive; a key with only `turn`, `code` or `settings` is unchanged.

## [spec-v0.1.264] - 2026-10-28

- NAT-06b: `TurnSignal` gains an optional `wants_advice` (`yes` or `no`): the person asked for advice, or asked to be heard instead. Absent when the turn said neither. Additive; nothing existing changes.

## [spec-v0.1.263] - 2026-10-28

- AMBIENT-06: the `companions.dock` setting is relabelled "Ambient companion" and its help and `copy.does` describe the companion at the top right of every page; the key, scope and default are unchanged.

## [spec-v0.1.262] - 2026-10-28

- NAT-06: a manifest `companion` block gains optional `clock_style` (`formal`, `plain`, `loose`), `hedging` (`low`, `medium`, `high`) and `social` (`humor`, `warmth`, `initiative`, each `low`, `medium`, `high`). Additive; a companion that sets none behaves as before.

## [spec-v0.1.261] - 2026-10-28

- PODCAST-PORT-03: `media-collection.kind` gains `filter`, a saved episode filter. `rules` was always null; it is now null or an object of optional rules (`unplayed`, `in_progress`, `saved`, `min_minutes`, `max_minutes`, `source_ids`, `released_within_days`), all of which must match. Only kind `filter` carries rules; `items` stay empty. Additive; existing collections stay valid. New fixture `media-collection.filter.example.json`.

## [spec-v0.1.260] - 2026-10-28

- RADIO-01: `media-source.kind` gains `station`, a live internet radio stream. The stream address is `url`, the name is `label`, and a new optional `station` object holds `live` (always true), `favicon_url`, `tags`, `country_code`, `codec` and `bitrate_kbps`. Additive; existing sources stay valid. New fixture `media-source.station.example.json`.

## [spec-v0.1.259] - 2026-10-28

- NAT-02: `normalizeForSpeech` (TypeScript and Python) takes optional `now`, `timeZone` and `timeStyle` (`plain` or `formal`). With `plain` and a `now`, a time on the same day within 12 hours reads without its part of day ("four o'clock", not "four o'clock in the afternoon"); `formal` keeps it. No options leaves output unchanged. Additive; new fixture cases.

## [spec-v0.1.258] - 2026-10-28

- WEATHER-PORT-07: the `weather_card` block's props take two optional fields. `advice` (up to 12 chips of `id`, `label`, optional kit `icon` name and `tone` info or warn) and `alert` (`title`, optional `text`, optional `severity` info, warn or severe). Additive; existing blocks stay valid. New fixture `valid-weather_card-advice.json`.

## [spec-v0.1.257] - 2026-10-27

- Add the household switches `radio.directory.enabled`, `podcasts.directory.enabled` and `podcasts.directory.teens` (boolean, basic, all off by default, in the new `household.media_online` group shown as the "Online radio and podcasts" card in the Media settings area). Honoured by Home. Additive (RADIO-08, PODCAST-PORT-12).

## [spec-v0.1.256] - 2026-10-27

- DUPLEX-02. New Stack wire shape `SttEndpointResponse` (`complete`, `probability`): the reply to an end-of-turn check on `POST /v1/audio/endpoint`, which takes the same WAV form as the transcription route. Additive.

## [spec-v0.1.255] - 2026-10-27

- MODEL-ADD-01. The AI and models card's `copy` holds the words of the add-a-chat-model panel and the `added_description` sentence under an added model's name, so Home holds none of them. Additive.

## [spec-v0.1.254] - 2026-10-27

- Same schema as spec-v0.1.253 (ModelCapabilities `origin`, `added_by`, `added_at`, `sampling`). The 253 tag shipped with package.json still at 0.1.252, so consumers refuse it; pin 254.

## [spec-v0.1.253] - 2026-10-27

- MODEL-ADD-01: `ModelCapabilities` gains `origin` (`shipped` | `added`), `added_by`, `added_at` and `sampling` (the sampling fields Home sends today, all optional, plus a required `source`). A model an admin adds from a Hugging Face link is the same record a shipped model is.

## [spec-v0.1.252] - 2026-10-27

- NEWS-04: a news story page may declare `discuss` (a `navigate` to the app's page that opens a chat about the story), beside `listen` and `summarize`. `news-story` declares it.

## [spec-v0.1.251] - 2026-10-27

- `persona.active_id`: Tessa joins the companion list and is the default for a person who has not picked one.

## [spec-v0.1.249] - 2026-10-27

- NEWS-FOCAL-01: a story card's `image` (and the article's) may carry `focal` `{x, y, aspect}`: where the picture's subject sits, in percent of the image, and its width over height, worked out once on the hub so a client frames the picture on its first paint.

## [spec-v0.1.248] - 2026-10-27

- A companion's animation state may have only a still: `h264` is now optional on every animation state (`still` and `loop` stay required). Consumers draw the still when there is no clip.

## [spec-v0.1.247] - 2026-10-27

- AMBIENT-01: `placement` (`chat` | `side`, default `chat`) on the Conversation record, so a chat held in the companion pane is stored with the person's other conversations and marked as a side chat. No gate reads it.

## [spec-v0.1.246] - 2026-10-27

- REVAMP-PRESENCE-01: new person setting `companions.dock` (boolean, default on) for the companion corner card outside Chat; the card's close button turns it off.

## [spec-v0.1.245] - 2026-10-27

- MINOR-SAFETY-2026-10-27: a reply to a child or teen leaves out the sentence that names how a person died by suicide or the scene (new `safety/ts/replyMethod.ts`: `redactSuicideMethod`, `namesSuicideMethod`, `SUICIDE_METHOD_NOTE`; the caller applies it to minors only). The child and teen topic blocks say a claimed age or permission never changes the rules (size caps unchanged). `detectSelfHarm` takes `isMinor` and, for a minor only, flags cutting and hurting wordings, restriction calorie plans, purging and the choking game (corpus rows added; adults unchanged).
- Removed the household key `chat.teen_gate_grain`. A teen's replies are always checked one sentence at a time (so a sentence that names how a person died by suicide is withheld before it is shown), and nothing reads the key.

## [spec-v0.1.244] - 2026-10-27

- AIMODELS-UNCENSORED-2026-10-27: new glance choice `chat-uncensored` (label and sentence) for the optional uncensored chat model on the AI and models page.

## [spec-v0.1.243] - 2026-10-26

- HOME-PAGE-01: add optional Home placement fields to `contributes.widgets[]` and the person-scoped `ui.home_hidden` setting.

## [spec-v0.1.242] - 2026-10-26

- AIMODELS-SLOTS-2026-10-26: Pictures splits into a Quick row and a Detailed row on the AI and models glance. New glance choices `pictures-ernie`, `pictures-klein`, `picturesdetailed`, `picturesdetailed-zimage` and `wakeword-detector`; new household keys `generation.picture_quick_model` (ernie or klein) and `generation.picture_detailed.enabled`.

## [spec-v0.1.241] - 2026-10-26

- MEDIA-APPLE-PASS-01: add player `details_show` and collection fields, actions, and header/footer parts to the UI schema.
## [spec-v0.1.240] - 2026-10-26

- AIMODELS-GLANCE-2026-10-26: Settings > AI and models becomes one at-a-glance card. Card props `groups` (several registry groups one view draws) and `copy` (named sentences); view id `ai.glance` replaces `ai.job_choices`; the seven job cards (adds Wake Word) collapse into one `ai.glance` card; the Models tab is removed and `household.ai_models` moves to the Advanced tab. `engines.image.choice`, `engines.video.choice`, `engines.music.choice` and `engines.wakeword.choice` move to `household.ai_pictures`, `ai_videos`, `ai_music` and the new `household.ai_wakeword`.

## [spec-v0.1.239] - 2026-10-26

- Removed the LikenessAsk record and the household key `likeness.per_use` (the per-use consent step is dropped: models censor, the app filters only to protect kids). Nothing in Home reads either.

## [spec-v0.1.238] - 2026-10-26

- Same content as spec-v0.1.237 (AI job cards), cut again because 0.1.237 was tagged before its package version was bumped. Use 0.1.238.

## [spec-v0.1.237] - 2026-10-26

- AIMODELS-2026-10-25: one Settings > AI and models card per job (Chat, Pictures, Videos, Music, Voice and speaking, Coding helper), each with its own settings group (`household.ai_chat`, `ai_pictures`, `ai_videos`, `ai_music`, `ai_voice`, `ai_coding`). Card props `view`, `description` and `choices`; view ids `ai.job_choices` and `ai.always_on`; the Search and memory link card; the dead Manage card is dropped. Six keys move group; `generation.picture_quality` option copy is reworded.

## [spec-v0.1.236] - 2026-10-26

- Added the LikenessAsk record and the `likeness.per_use` key; both removed in spec-v0.1.239.

## [spec-v0.1.235] - 2026-10-25

- MEDIA-DETAIL-02b: add the optional player action `on_lyrics_open` to the UI schema.

## [spec-v0.1.234] - 2026-10-25

- MEDIA-DETAIL-02: add player lyrics and edit fields, and phone aside sheets to the UI schema.

## [spec-v0.1.232] - 2026-10-25

- MEDIA-DETAIL-01: add optional player `fields.description` and `fields.facts` row field mappings.

## [spec-v0.1.231] - 2026-10-25

- HOME-LAYOUT-01: add the person setting `ui.home_layout`, with Shelves as the default and Ask first as the child band default. A child's row is guardian-controlled and reads from spec copy.

## [spec-v0.1.230] - 2026-10-25

- MEDIA-DETAIL-00: add optional lyrics and unique locked fields to MediaItem, and recognize `hub:edit` provenance. Rescans preserve fields marked as locked.

## [spec-v0.1.229] - 2026-10-25

- LIKENESS-SIMPLIFY-01, owner decision Jesse, 2026-10-25: add the household boolean setting `generation.household_likeness` (default on, honoured by Home) for family pictures, videos and songs. Remove the per-person keys `likeness.adults` and `likeness.adult_content`, the `LikenessConsent` and `LikenessUse` schemas, and their generated models and fixtures. Keep the saved style subject binding in `LikenessAdapter`.

## [spec-v0.1.228] - 2026-10-25

- SPEC-ANSWERED-BY-01. Add optional `answered_by` to ConversationTurn and optional `companion_id` to StackJob and Project provenance. Additive; older records read as null.

## [spec-v0.1.227] - 2026-10-25

- Voice: read validated US slash dates, abbreviated month dates, contextual years, and formatted phone numbers naturally in speech (`normalizeForSpeech`, TypeScript and Python, shared fixtures).

## [spec-v0.1.226] - 2026-10-25

- `news.full_text_prefetch` defaults on (owner, 2026-10-25), and its help says the 30 second pace is per site. A household that already set it keeps its choice.

## [spec-v0.1.225] - 2026-10-25

- Voice: the `stt` socket gains the additive server events `reply_pause` and `reply_resume` and the client message `played_ms {reply_id, ms}` (`SttClientMessage`), for full-duplex voice (home `docs/design/full-duplex-voice-2026-10-24.md`, DUPLEX-01). Existing clients ignore them.

## [spec-v0.1.223] - 2026-10-23

- A settings section's `scope` is optional in the schema again (a package area's sections read as person), as it was for areas in 0.1.215; `checkAreas` still requires it on every section of the central areas file. 0.1.218 made it required everywhere, which invalidated every bundled and community package manifest.

## [spec-v0.1.222] - 2026-10-23

- Add the household setting `coding.api.tailnet_nodes` (text, advanced, in the coding group): names of the household's own devices allowed to use coding through Tailscale Serve, separated by commas; empty means none. Honoured by Home. Additive.

## [spec-v0.1.221] - 2026-10-23

- Settings: the household page is labelled "Household and people" (it was "Household", the same name as its first card, which made the page content region and the card region share a landmark name; axe landmark-unique). Label only.

## [spec-v0.1.220] - 2026-10-23

- Owner decision 2026-10-23: one central Settings area replaces the unreleased home/account split and removed chat area. The single column groups seven personal pages under Yours and nine household pages under The home. Sections carry required person/household scope; household sections are admin or narrower. Earlier two-area structure never shipped. Legacy routes map into Settings; Chat link rows retain replacement reasons.

- Settings IA: Home is nine tabbed pages and Account is seven. Tabs carry optional views and audience constraints; old section routes have a complete redirect map. Page count is enforced, while the settings cap stays deferred.

## [spec-v0.1.219] - 2026-10-23

- Add optional `sourceIconUrl` to article props for the publisher favicon. Additive.

## [spec-v0.1.217] - 2026-10-23

- Add the optional `sourceIconUrl` favicon route to embedded `news_story_card` values, including story-feed cards. Match the standalone NewsStory path pattern. Additive.

## [spec-v0.1.208] - 2026-10-22

- LOOK-01: add the LookResult record, the default household Look vocabulary (detector classes, nouns, scene types, lighting, activities, colours) and the pinned YOLOX-nano model (Apache-2.0) to the robot asset list. Additive.

## [spec-v0.1.207] - 2026-10-22

- CMEDIA-SIZE-01: the clip generation size is 480 x 480 for 3 seconds (73 frames); additive in shape (a new `seconds` field), changed in value (was 832 x 480, 121 frames).

## [spec-v0.1.206] - 2026-10-22

- MODE-SPEC-01: `coding.home_mode` is honoured by `home` only (v0.1.205 listed `stack` too, which widened the `honoured_by` enum and broke consumers typed on `home | bot`). The enum is back to `home | bot`. Home sends the mode to the Stack itself.

## [spec-v0.1.205] - 2026-10-22

- MODE-SPEC-01: add the admin-only `coding.home_mode` setting for normal and coding use, with its choices and copy. Add the `CodingModeReadiness` record, ordered checklist, reason vocabulary, fixture and generated TypeScript/Python types. Additive.

## [spec-v0.1.204] - 2026-10-21

- OPS-KEY-01: `api-key.scopes` gains `settings`, a key an owner or admin makes so an assistant session can change a short named list of household settings (never people, passwords, safety or age gates). Additive; a key with only `turn` or `code` is unchanged.

## [spec-v0.1.203] - 2026-10-21

- CMEDIA-SPEC-01: add the shared companion media vocabulary and optional manifest fields for character look, review status and pre-rendered video animation. The additions are additive, so existing manifests continue to validate unchanged.

## [spec-v0.1.202] - 2026-10-21

- DYNAMIC-COMPANION-01: a companion may declare `audience` (`all`, `teen` or `adult`), `behavior` style lines and `examples_child`, `examples_teen`, `examples_adult` few-shot lines; `persona.active_id` gains the option `rivet`. Additive; a manifest without `audience` reads it from `min_role`.

## [spec-v0.1.201] - 2026-10-21

- ROBOT-COMPANION-02: `persona.active_id` gains the options `lively-child`, `lively-teen` and `lively-adult` (the three bundled companions Home ships for a robot). Additive.

## [spec-v0.1.197] - 2026-10-20

- SPEC-FLASH-MANIFEST-01: add the signed `FirmwareFlashManifest` record (ESP Web Tools shape plus flash size and each part's size and sha256) with its validator and signing payload, for flashing a robot from the browser. Additive. `spec-v0.1.196` carries the same record but its package version still read 0.1.195, so consumers pin this tag instead.

## [spec-v0.1.195] - 2026-10-20

- SPEC-SETTING-CONFIRM-01 and SPEC-ROBOT-FACE-NIGHT-01: add the household Robots switch with confirm-before-off copy, and add per-robot face color and night mode settings. Additive.
- SPEC-ROBOT-MEMORY-01: optional nullable `device_id` on MemoryRecord and Conversation, with generated TypeScript/Python models and fixtures.

## [spec-v0.1.194] - 2026-10-20

- SPEC-ROBOT-VOICE-01: add the `robot.voice.id` device setting, letting an admin choose this robot's voice from the household TTS voice list. `default` keeps the voice Home uses for the robot today. Additive.

## [spec-v0.1.193] - 2026-10-20

- SPEC-ROBOT-TEST-01: add the `no_vendor_login` capability for robot bodies without a published login password; add the hub-to-device `self_test` command and device-to-hub `robot-self-test-result` record; and place `robot.hello` on the chosen robot settings dialog as an admin-only device card. All additions are additive.

## [spec-v0.1.192] - 2026-10-19

- CSAM-TEXT-01 (Owner-approved 2026-10-19): `SafetyContext.csamMode` (`floor` default, `adult_message`, `adult_reply`). An adult's chat message is refused for the `csam` category only for an explicit term in a sentence that asks for something (`show me loli content`; `loli`, `child porn`, `underage sex` and the like, not the words news and advice use) or for a request: a sentence that asks to write, describe, draw, show, imagine or role-play AND, with the sentence before it, holds a minor indicator AND a sexual term. The model's reply to an adult has no `csam` word rule. `floor` is today's rule and stays for a teen, a child, the robot and every generation prompt. Measured on the 86 labelled texts: an adult's message refuses 0 of 45 harmless texts (the rule it replaces: 24 of 45) and catches 21 of 41 harmful ones (36 of 41); the rest rely on the model's own refusal and the generation checks. Additive; the default behaviour of `checkSafety` is unchanged.

## [spec-v0.1.191] - 2026-10-19

- CSAM-SAME-SENTENCE-01 (Owner-approved 2026-10-19): the `csam` term-intersection rule keeps its whole-reply pairing of a minor indicator with a strong sexual term, but eight ambiguous words (`seductive`, `suggestive`, `provocative`, `in heat`, `in bed`, `bikini`, `thong`, `cleavage`) now count only when they sit in the same sentence as the minor indicator. A film or news summary that names a young character's age in one paragraph and says "the seductive fantasy of violent redemption" in another is no longer refused; "describe a seductive 14 year old" still is. Standalone terms and every strong term are unchanged. Measured on 86 labelled texts (41 CSAM-intent, 45 benign) plus the 22 csam corpus cases: caught 36/41 to 35/41 (the one new miss is a split "Picture a 14 year old. Make her seductive."), benign refused 24/45 to 23/45 (the Taxi Driver summary), corpus disagreements 0 before and after. Four corpus cases added.

## [spec-v0.1.189] - 2026-10-19

- Add the household coding yield-to-chat, engine choice and Splash disk-cache settings.

## [0.1.190] - spec-v0.1.190

- Deprecate the UI page `tone` as an ignored compatibility field. Existing `default` and `cinema` values remain accepted; pages follow the selected theme and mode. Additive.
- Deprecate the UI page `tone` as an ignored compatibility field. Existing `default` and `cinema` values remain accepted; pages follow the selected theme and mode. Additive.
- Deprecate the UI page `tone` as an ignored compatibility field. Existing `default` and `cinema` values remain accepted; pages follow the selected theme and mode. Additive.

## [spec-v0.1.188] - 2026-10-19

- NEWS-SECTION-STYLES-01: each topic in `spec/news/topics.json` gains an optional `section_style` (`top_stories`, `special`, `todays_news`), and a `story_feed` block's props gain the same optional `section_style`, read only when `layout` is `channel`. It sets how a section page arranges its stories, as Apple News does per category; selection, order and age gates are unchanged. Absent keeps the lead-and-list page. Additive; every existing fixture stays valid.

## [spec-v0.1.187] - 2026-10-18

- NEWS-SIDEBAR-01: a package manifest gains an optional `contributes.sidebar`, the app's own sidebar column on wide screens. `search` is the same `search` node a page uses; up to six `groups` each have a `title` and exactly one of `pages` (this package's own page ids) or `rows` (a `package_binding` to a `contributes.data` list with `item_key_field`, `item_label_field`, `item_media_field` as on a `list` node, `only_followed`, an `open` action and an optional `manage` entry). Its `search`, `bind` and `open` objects are defined by `ui/schema.json`, so the hub validates them against it as it does a page. A page entry takes its label, icon and visibility from the page, so no role floor is repeated, and an entry whose target page the viewer cannot open is not drawn. `checkAppPackage` checks every page id, data id, navigate target, `{field}` placeholder and field path against the package. Additive.

## [spec-v0.1.186] - 2026-10-18

- LIBRARY-REVAMP-03: the `file` record gains four optional fields for the Library: `name` (mutable display name; writing it advances the record's `hlc`), `deleted_at` and `trash_until` (the Trash envelope, same names, formats and 30-day meaning as `media-item`; a restore clears both; no schema default, so an absent field stays absent and existing records round-trip unchanged), and `audience` (`all-ages` or `adult-only`). The adult literal is `adult-only`, not the design note's `adult`, because that is what Home already writes in picture and video provenance notes, so no data migration is needed. Absent `audience` means unknown and is read from the provenance as before. Additive; every existing fixture stays valid.

## [spec-v0.1.185] - 2026-10-18

- CODE-SPEC-01: personal API key records for turn and code, phase 1 coding settings with copy and band defaults, a thinking budget and admin ceiling, Coding sections in Home and Account, and a coding data class example. Existing shapes and grant actions stay the same.

## [spec-v0.1.184] - 2026-10-18

- News: a feed-list package's `feeds.json` entry gains an optional `topics_hint` (topic ids from `news/topics.json`, same shape as `Feed.topics_hint`), so a list can say which topics a feed covers. Additive.

## [spec-v0.1.183] - 2026-10-18

- Settings: `generation.music.length` defaults to `full`, and its help and copy say what each kind sings: Quick is the hook (the first verse and chorus), Full every part, and a song is as long as its words (owner, 2026-10-18; Home music note 18.1a, MUSIC-SPEC-03).

## [spec-v0.1.182] - 2026-10-18

- UI: `empty_state` gains an optional `action_label` (1 to 40 characters), the button's own words for its action, such as "Add a folder". Without it the kit keeps its plain derived label. Additive.
- Settings: the Pictures sections (Account and Home) use the icon `camera` in place of `image`, which the kit does not ship (the sidebar drew the unknown icon). `camera` names the section's subject, pictures, and is in the kit's icon set; `layout-grid` was the other candidate but reads as a layout control.

## [spec-v0.1.181] - 2026-10-18

- NEWS-LOOK-02 and News search. `story_feed` props gain `header.dateline` (at most 80 characters) and `filters` (up to 16 `{id, label, selected?}` chips; an empty `id` means All). `news_story_card` gains `group` (at most 60, the hub's day group such as "This morning") and `kicker` (at most 80, the hub-built line above the headline). The `answer_blocks` node gains `filter_state` (the page-state key the filter chips write; without it the chips are not drawn). New UI node `search` (`state` default `q`, `label`, `placeholder`, `recents` package binding of rows, `item_key_field`, `item_label_field`, `submit`, `clear_recents`); `checkAppPackage` allows it and checks the recents binding, `submit` and `clear_recents` like every other action. New person-scope record `NewsSearchRecent` (`recent-...` id, `q` 1 to 120, `at`) with `validateNewsSearchRecent`, which rejects a child's row: a child's search keeps no recents. Additive.

## [spec-v0.1.180] - 2026-10-18

- Settings: a household "Media library" section (`media-library`, admin only, its own sidebar group) that draws the new Home view `home.media_library`, where an admin adds a library folder on the computer or a network share, sees each source with its last scan, rescans or removes it, and follows a podcast by feed address or imports a list of shows. The closed view list gains `home.media_library`.

## [spec-v0.1.179] - 2026-10-18

- The `answer_blocks` actions map gains `open_channel` (a `navigate`, like `open`). A shelf's channel button fires it with `channel_kind` and `channel_key`; before this it fired `open`, which a page can only point at a story. Additive: a page that omits it shows no channel buttons on a shelf.

## [spec-v0.1.178] - 2026-10-18

- `generation.music.length` carries `secret: false` and the field order Home's registry writes, so the entry is identical to Home's declaration (spec-v0.1.177 differed only in that, and Home's settings drift check compares the whole entry). No behaviour change.

## [spec-v0.1.177] - 2026-10-18

- MUSIC-SPEC-02 (Home `docs/design/music-generation-2026-10-17.md` section 16). Household key `generation.music.length` (`quick` or `full`, default `quick`) on the `household.pictures` card: what chat makes when nobody asks for a kind of song. Quick songs are about 45 seconds; full songs are about 3 minutes with every part. Additive.

## [spec-v0.1.176] - 2026-10-17

- HANDOFF-01a adds the hub-local `MediaPresence` value shape, optional nullable `RobotState.media`, the `play_media` device command with a 60 second expiry, and optional `action.play.position_s` with placeholder support. Screen device rows have no token. Both generated model sets and validation and round-trip fixtures cover the additions.

## [spec-v0.1.175] - 2026-10-17

- NEWS-02a and NEWS-07. Three household keys on the News settings group `household.news`: `news.images` (boolean, default on, "Pictures in News": show each story's picture; Home asks the publisher once, the first time a screen shows the story, and never in the background), `news.image_cache_mb` (number, default 512, minimum 32, "News picture storage (MB)") and `news.full_text_prefetch` (boolean, default off, "Load News stories ahead of time": the owner's 2026-09-24 exception, at most one attempt per item, one every 30 seconds and 150 per site a day). All three are advanced, so they show under Developer tools. Registry count 212. Additive.

## [spec-v0.1.174] - 2026-10-17

- Settings registry carries `media.budget.exempt_bedtime_audio` (MEDIA-KID-01) exactly as Home declares it: an expert household switch that leaves music and audiobooks out of the daily media minutes. The household Developer tools section gains a "Media minutes" card for the `media.budget` group, so no key stays ahead of spec in Home.

## [spec-v0.1.173] - 2026-10-17

- Settings registry carries the keys whose copy now passes COPY-LINT-01, each exactly as Home declares it: `generation.kids`, `generation.kids_daily_pictures`, `generation.kids_daily_videos`, `generation.kid_enabled`, `generation.video_quality` and `health.keep_warm`. Only the expert `media.budget.exempt_bedtime_audio` stays ahead of spec in Home.

## [spec-v0.1.172] - 2026-10-17

- Settings registry carries keys Home declared ahead of spec, each exactly as Home declares it: `audio.speed.podcast`, `audio.speed.audiobook`, `audio.speed.video`, `audio.speed.spoken_reply` (AUDIO-SESSION-01), `media.allowlist_only` (MEDIA-KID-01), `generation.people_prompts`, and the `control` on `allowance.media.daily_minutes` (a child's and a teen's daily media minutes are guardian-set). Keys whose copy does not pass COPY-LINT-01 yet (`generation.kids*`, `generation.kid_enabled`, `generation.video_quality`, `health.keep_warm`) and the expert `media.budget.exempt_bedtime_audio` stay ahead of spec in Home.

## [spec-v0.1.171] - 2026-10-17

- Additive media UI fields: `media_shelf.layout` (`rail` or `grid`, default `rail`), `art_shape` (`default` or `circle`), `density` (`default` or `compact`), `item_highlight_field` (boolean current/next-up field), `item_index_field` (leading track index) and `row_actions` (up to two `{icon, label, label_field?, action}` controls). Compact vertical rows use 72 px artwork, two caption lines and trailing `item_meta_field` running time. Grids wrap the existing card-size budget with two phone columns and honour `hide_when_empty`. `checkAppPackage` checks every row action, including confirms, like `on_select`: own-package targets and `play` allowed.
- `picker.variant` adds `pill` alongside the default `select`. Existing `bind`, `item_key_field`, `item_label_field`, `leading` and `state` supply season pills from rows, with selection in page state. New `ui/pages/music-album.json` and `ui/pages/shows-detail.json` fixtures and focused schema/conformance tests. Existing pages keep their rendering defaults.

## [spec-v0.1.170] - 2026-10-17

- MEDIA-BOOKS-01: UI `reader` node for one bound book, with optional `format` override, `fields` paths for id/src/title/format/locator, token `theme`, EPUB `font_size` step, `on_locator`, `on_close` and `empty_state`. Locator data is CFI (`kind`, `cfi`, optional `spine_index`, `block_index`) or a 1-based page. Progress actions receive a JSON `locator` and numeric `percent` (0 to 100). `checkAppPackage` allows Reader with the package's declared list data and checks both actions against the package prefixes, with `play` refused. Fixture `ui/pages/books-reader.json` and schema/app tests. Additive.

## [spec-v0.1.169] - 2026-10-17

- Safety: the shared obfuscation normaliser (`safety/ts/fold.ts`) keeps the two words of a letter-spaced phrase apart (comma, double space or punctuation between them) and also matches a phrase inside a long run of single letters. Tests in `tests/ts/safety-fold.test.ts`. Additive.

## [spec-v0.1.168] - 2026-10-17

- Safety: one shared obfuscation normaliser, `safety/ts/fold.ts`, now sits behind `detectCsam` in `safety/ts/signals.ts`. It folds leet, dotted, spaced, masked and repeated-letter spellings, i18n age words and native-script lists before matching, so minor-protection floors see the same text however it is disguised. Tests in `tests/ts/safety-fold.test.ts`. Additive.

## [spec-v0.1.167] - 2026-10-17

- MEDIA-POLISH-01: the UI schema's `page` gains `tone` (`default` or `cinema`, the dark media tone). `media_shelf` gains `variant` (`card` or `plain`, the frameless row), `orientation` (`horizontal` or `vertical`), `hide_when_empty` and `see_all` (a label and an action beside the heading); `billboard` gains `hide_when_empty` and `size` `banner`; `player` gains `details` (the title block) and `actions` (up to six buttons, each optionally a toggle on a boolean `field` with an `on_label`). `split_view` gains a `main` and `aside` form (arrays of nodes, `aside_label`); exactly one form is required. `ui/app-check.ts` allows `split_view` on a package page and checks its children, a shelf's `see_all` and the player's actions like any other action (no `play` there). Fixtures `videos-home.json` and `videos-watch.json` use them. Additive.

## [spec-v0.1.166] - 2026-10-17

- Add `ui.reasoning_open`, `voice.hesitations`, `chat.paused`, `chat.paused_message` and `generation.picture_quality` from Home's generated settings declarations. Additive; existing entries stay unchanged.

## [spec-v0.1.165] - 2026-10-17

- MUSIC-SPEC-01 (Home `docs/design/music-generation-2026-10-17.md`). Household key `generation.music.enabled` (boolean, default on: adults can ask chat for songs and change them; children and teens never can, whatever it says) on the `household.pictures` card, retitled "Pictures, videos and music". New `GenerationProvenance` (`generation-provenance.schema.json`): kind, job, task, model id, revision and licence, engine, seed, duration, bpm, key, parent version, source kind (`upload` reserved and refused), `commercial_use` with its basis; carried on the new optional `file.provenance.generation`. `StackJob.kind` names `music`. Additive; every existing fixture validates unchanged.

## [spec-v0.1.164] - 2026-10-17

- MEDIA-PLAYER-01: the UI schema gains `billboard` (bound rows as a rotating hero: title, subtitle and eyebrow templates, art field, a primary action and up to two secondary ones, `size` card or hero, `autoplay`) and `player` (one bound media item; default field names id, src, title, subtitle, poster, chapters, captions, thumbnails, position_s, completed, up_next, overridable through `fields`; `kind`, `layout`, `autoplay_next` off by default, `on_progress`, `on_next`). `media_shelf` gains `heading`, `item_subtitle_field`, `item_progress_field`, `item_badge_field` and `item_meta_field`. `play.media_id` is non-empty and documents its `{field}` placeholders. `ui/app-check.ts` allows `media_shelf`, `billboard` and `player` on a package page, each bound to a `"rows": "list"` entry of the package, art fields as field paths only, and `play` on a shelf tile, a billboard button and the player's `on_next` (still refused elsewhere, the player's `on_progress` included). New page fixtures `videos-home.json` and `videos-watch.json`. Additive.

## [spec-v0.1.163] - 2026-10-17

- `tts.voice_id` carries `default` (the voice built into the speech engine now in use) as its first option and its default, matching the declaration Home shipped in VOICE-PICK-01 ("Home's tts.voice_id declaration supersedes the spec's until a tag carries default"). Home's settings drift check passes again at this tag.

## [spec-v0.1.162] - 2026-10-17

- MEDIA-SPEC-01 (the media records; home `docs/design/media-apps-blend-2026-10-17.md` section 7). Four new records, each with id, clock stamp and provenance: `MediaItem` (`media-`: a video, episode, film, track, podcast episode, book, audiobook or audiobook chapter; `location` is exactly one of a saved `file_id`, a `{root_id, path}` on a library root or a stream-only `url`; `playable` original, transcode, none or unknown; chapters, subtitles, previews, series and track fields, `external` for a web or feed item, `advisory`, `band_ok`, `fingerprint`), `MediaSource` (`msrc-`: kinds root, feed, channel, link; the `auto` save rules with `max_per_check` capped at 10; per-source speed and skip seconds; poll state, quiet-mode backoff, `visible_to` and the "deleted stays gone" `archive`), `MediaProgress` (`mprg-`: one row per person and item, position as seconds or a reader locator plus percent, the `completed` latch, plays, skips, finishes, bookmarks, the writing device) and `MediaCollection` (`mcol-`: liked, watch later, queue, playlist, watchlist, pins; `rules` reserved as null). New `OfflineManifest` (KEEP-OFFLINE-01's one shape for any record kind; entry addresses are hub paths only). `File.origin` gains `fetched` with `provenance.media_source_id`; `Feed` gains `purpose` (`news` or `podcast`, absent reads as news; the design named it `feed.kind`, which NEWS-00 made the format); `Device` gains `offline_scope` (a closed default-deny list: `media.offline`, `offline.records`); the `StackJob.kind` description names the six media job kinds. The media records carry TRASH-01's `deleted_at` and `trash_until`. Eighteen fixtures with persona names; `tests/ts/media-records.test.ts` and the Python round-trip. Additive; every existing fixture validates unchanged.

## [spec-v0.1.161] - 2026-10-17

- WEATHER-FIX-01. UI schema: `answer_blocks` gains `states` (`needs_place`, `down`, `timed_out`), each a `data_state` (icon, title, text, up to three buttons: `navigate`, `locate` or `retry`), so a package page says why it has nothing to draw (no place chosen, the source unreachable, too slow) in its own words. `checkAppPackage` lets a stated-reason button and any package action navigate to the app's own settings area `/settings/<id>`. `ui/pages/weather.json` uses all three. Additive; every existing page validates unchanged.

## [spec-v0.1.160] - 2026-10-17

- NEWS-00 part 3 (the News records and topics). `Feed` gains `kind` (`rss`, `atom`, `json`), `site_url`, `icon_ref`, `topics_hint`, `list_id` and `alerts` (reserved for FEED-ALERTS-01); `NewsItem` gains `topics`, `image_url`, `image_ref`, `content_ref`, `content_source` (`feed`, `fetched`, `archived`, `teaser`), `reading_s` and `author`; `NewsStory` gains `lead_item_id`, `topics`, `image_ref`, `summary`, `summary_band` and `summary_at`. Three new person-scope records, each with id, clock stamp and provenance: `NewsInterest` (follow and computed affinity per topic or source; `validateNewsInterest` in `records/ts/validate.ts` refuses an inferred row or a computed affinity for a child, because nothing is inferred about a child), `NewsSave` and `NewsRead` (including the More and Less like this feedback and the Listen resume point). New `news/topics.json` (the ten topics, `kids` offered to the child band only, politics deliberately absent) with its `NewsTopics` schema. Additive; every existing fixture validates unchanged. The six News settings keys follow with Home's declarations in NEWS-02.

## [spec-v0.1.159] - 2026-10-17

- NEWS-00 part 2 (what the News app's kit parts need). `AnswerBlock` gains the additive kinds `story_feed` (layouts `today`, `channel`, `rows`: an optional hero, up to four featured stories, shelves, rows, `as_of`) and `article` (kicker, title, byline, picture, optional Key points with the band they were written for, a typed `blocks` list, "Also covering" stories, the `speech` chunks Listen speaks, `content_source`). Both share the `news_story_card` shape; pictures are same-origin hub paths. The reader's block model moves into spec as `article_block` (heading, paragraph, list, rows, table, figure, note and the new `quote`; a link inline carries a book `target` or an outbound `href`, which only a teen or adult copy keeps). UI schema: the `tabs` node (peer views of one page), `list` gains `item_media_field` and `row_toggle`, `answer_blocks` gains an `actions` map (`open`, `save`, `follow`, `feedback`, `summarize`, `reset_mix`, `listen`), and the `navigate` action gains `state` (a map written into the target page's state, with `{field}` placeholders). Manifest `contributes.data[].rows` gains `"list"` (a bare row array for a `list` node). `checkAppPackage` now allows `tabs` and `list` on a package page, requires a package source and a `rows` data entry for a list, checks every action in the `actions` map, `row_toggle` and `row_action` against the package prefixes, and allows `play` only in the `listen` entry. Fixtures: `valid-story_feed`, `valid-article` and six invalid ones; `ui/pages/news-today.json`, `news-following.json`, `news-story.json`. Additive; every existing fixture validates unchanged. The remaining NEWS-00 items (the News records, `topics.json`, the six settings keys) follow in a later tag.

## [spec-v0.1.158] - 2026-10-17

- NEWS-00 (first part). `contributes.pages[]` gains an optional `min_role` (`owner`, `admin`, `adult`, `teen`, `child` or `guest`, the same enum as the package's own): the floor role a person needs to see and open that page, its data ids and its actions. Absent means the package's floor; a page may only raise it, and `checkAppPackage` takes the package's `min_role` as an optional fourth argument and reports a page that lowers it. Additive; every existing manifest validates unchanged. The rest of NEWS-00 (News records, topics, keys, block kinds, UI schema changes) follows in later tags.

## [spec-v0.1.157] - 2026-10-17

- LEFTNAV-APPS-01. `contributes.pages[]` on an app's "index" page gains optional `pinned_by_default` (boolean) and `pin_order` (integer 0 to 99): the app is pinned in the left rail for every person who may open it and has never chosen their own pins, in `pin_order` order. A person's saved `ui.pinned_apps` always wins. Additive; the `nav` description no longer says an app is never a rail icon (it reaches the rail as a pin).

## [spec-v0.1.156] - 2026-10-17

- LIKENESS-01 (owner ruling 2026-10-17: an adult may make a picture, video or style that looks like a consenting household adult). Two person settings keys on a new card of Account settings, Pictures and videos (`account` section `pictures`, adults, closed view `account.likeness`): `likeness.adults` (boolean, default off, changed only by the person themselves: let other adults in this household make pictures, videos and styles that look like me) and `likeness.adult_content` (boolean, default off, separate: including adult content; counts only while the first is on). Three new records, all with id, provenance and clock stamp: `LikenessConsent` (an append-only history of each switch change), `LikenessUse` (each time another adult made something that looks like the person; shown only to the subject) and `LikenessAdapter` (who a saved style looks like: a household adult, always adult-only, or nobody). Additive; every existing fixture validates unchanged.

## [spec-v0.1.155] - 2026-10-17

- VIDEO-GEN-04. Two household keys on the existing `household.pictures` card of Home settings, Pictures and videos: `generation.video.enabled` (boolean, default on: adults can ask chat for short videos; children and teens never can, whatever it says) and `generation.video.adult_adapters` (`allowed` or `restricted`, default `allowed`: whether adults can use video styles marked adult-only). Additive.

## [spec-v0.1.154] - 2026-10-17

- IMGGEN-SET-01. Home settings gains a "Pictures and videos" section (`pictures`, admin) with one card for the registry group `household.pictures` and the closed view `home.pictures_library` below it (the style library and the picture model status). Two household keys: `generation.adults` (boolean, default on: adults can ask chat for pictures; children and teens never can, whatever it says) and `generation.adult_adapters` (`allowed` or `restricted`, default `allowed`: whether adults can use styles marked adult-only). Additive.

## [spec-v0.1.153] - 2026-10-17

- APP-KIND-01. The `app` kind's contract, additive except one tightening nothing used. Manifest: `contributes.pages[]` gains `keywords` (up to 8, each up to 24 characters), `id` and `module` become plain names (`^[a-z][a-z0-9-]*$`, `module` also allows `_`), `nav` is defined precisely (index: library, search and pin entry; other pages: the app's own sections), and `kind: "web"` is no longer valid (it was always refused by the loader). New `contributes.data[]` (`{id, surface?, rows?, inputs?, refresh_s?}`): `surface` (`weather` or `maps`) makes the host resolve the place and inject coordinates; `rows: "places"` returns the person's saved places for a picker with no recipe run. UI schema: binding `source` gains `package` (then `path` is a data id) and `params` (literals or `$state.<name>`), new nodes `answer_blocks` and `picker`, new `$defs.package_binding`. New `spec/ui/app-check.ts` (`checkAppPackage`): one `index` page, unique ids, bindings only to declared data ids, calls only under `/api/plugins/<id>/`, navigation only under `/apps/<id>/`, and only the node types a package page may use. New fixture `spec/ui/pages/weather.json`.


## [spec-v0.1.152] - 2026-10-16

- WEATHER-CARD-01. `AnswerBlock` gains the additive kind `weather_card`: `props` are `place`, `unit` (`F` or `C`), `current` (`temp`, `condition`, `code` as a WMO weather code, `is_day`), optional `hourly` (at most 24 of `time`, `temp`, optional `pop` 0 to 100), `daily` (1 to 8 of `date` as YYYY-MM-DD, `high`, `low`, `code`, optional `pop`) and `attribution`. The kit renders it as the weather card Element. Additive; every existing block validates unchanged. New fixtures `valid-weather_card.json` and four invalid ones (nine daily rows, missing place, `pop` 101, fractional `code`).

## [spec-v0.1.151] - 2026-10-16

- ROBOT-SPEC-V1 (lane V, 2026-10-16). Three additive robot changes, (1) New device setting `robot.sleep.auto` (boolean, default true, `robot.hello`, honoured by home and bot): the robot sleeps after 10 minutes of darkness and no speech, and during quiet hours; a face, speech or a knock wakes it. Per robot; an admin changes it through Home, which delivers it as `settings_changed`. (2) `household.quiet_hours.from` and `.to` are now also honoured by `bot` (the robot's temporary `night_from` and `night_to` keys can be dropped). (3) Motor reboot offer, proposal (least-surprising shape, built on the 0.1.149 state fields): `RobotState.motors_reboot_offer` (optional list of latched motor names, a subset of `motors_latched`, for which the robot asks the hub to offer a reboot to an adult; empty or omitted means no offer) is the robot-to-hub signal, carried on the existing state frame; `DeviceCommand` kind `motor_reboot` with payload `{motors: [names]}` (at least one, distinct) is the hub-to-robot command, sent only after an adult says yes on the Devices card, acknowledged by the existing `ack` channel frame. The robot never reboots a motor without the command. New fixtures `robot-state.motor-reboot-offer.example.json` and a `motor_reboot` row in `device-command.kinds.example.json`.

## [spec-v0.1.150] - 2026-10-16

- Remove the `reference.update.mode` and `reference.pageviews_signal` settings keys (owner-approved 2026-10-16): nothing reads either one. The reference presets no longer set `reference.update.mode`.

## [spec-v0.1.149] - 2026-10-16

- CAPTURE-REQ-01 wording (owner-approved 2026-10-16). The `ReplyPlan.moves.capture` description no longer promises a parent-visible record for every age band. A capture leaves a note with no image; for a child a parent sees it through the existing person-access path, and for a teen or adult only that person sees it. Description text only; the move and its values are unchanged.

## [spec-v0.1.148] - 2026-10-16

- SETUP-ROLES-01. `engines.vision.choice`, `engines.stt.choice` and `engines.tts.choice` gain a fixed `off` option beside their `options_from` model list, with plain-words `copy.options.off` text, so settings can turn Photos and Voice off and back on.

## [spec-v0.1.147] - 2026-10-16

- CAPTURE-REQ-01. `ReplyPlan.moves` gains the optional ninth move `capture` (`required`, `allowed`, `forbidden`; absent means forbidden): the hub may ask the robot for one camera picture during a turn. Owner ruling 2026-10-16: allowed for every age band. Additive; every existing plan validates unchanged. New fixture `reply-plan.capture.example.json`.
- ROBOT-SPEC-H1. `robot.live_view.who` declares `range.multiple: true` (a list of adult person ids; the flag was already in the SettingsKey schema), so a hub no longer special-cases the key. A test holds that every `person` key with `range.multiple` has a list default.
- ROBOT-SPEC-H2. `RobotState` gains the optional `motors_latched` (list of latched motor names), `motors_stuck` (boolean) and `thermal` (`level`, `temp_c`, `vision_hz`, `fault`) keys, the shapes the robot's motor gate and thermal governor already produce. Additive; every existing fixture validates unchanged. New fixture `robot-state.degraded.example.json`.

## Unreleased

- ROBOT-TIME-01. `RobotState` gains optional `clock_synced`, a boolean indicating whether the robot's clock was last corrected against the hub's. Additive; producers may omit it.

## Unreleased

- KS-REF-00. Add the reference library presets vocabulary (Minimum, Moderate, Full), the `off` value on `reference.update.mode`, and the `reference.download.when` key.
- STACKCHAN-31. Add a StackChan robot Device fixture with its declared capabilities.
- Accept optional `attribution` and `hosts` fields on manifest `data_sources` rows through the shared PrivacyRow schema.

## [spec-v0.1.139] - 2026-10-14

- SPEC-SETUP-WIZARD-01. Add the `backup_key` setup step, an `Acknowledgment` record for accepted item ids and wording versions, and `companions.allowed`, a guardian-controlled person setting that defaults on. Place the companion switch in Chat Personalization. Repin `scripts/check.sh` to `std-v0.3.3` so generated PrivacyRow fields match the shared schema.

## [spec-v0.1.140] - 2026-10-14

- PLACE-WEATHER-01 (PW-01a): recipe steps gain the optional `unless_set` field to skip when a named scope variable is bound to a non-null, non-empty value. Additive; recipes without the field behave as before.

## [spec-v0.1.135] - 2026-10-13

- SPEC-SESSION-SOURCE-01. New `SessionSignInSource` schema (`local`, `away`, `paired_device`, default `local`): how a session signed in, set by the hub on the server when it issues the session. It lets a person see which of their own sessions came in through the Tailscale address. Additive; the spec has no Session record, so Home stores the value in its own sessions table.

## [spec-v0.1.134] - 2026-10-13

- Add the person setting `setup.checklist_dismissed`, a JSON list of setup checklist item ids this person chose to hide.

## [spec-v0.1.133] - 2026-10-13

- SPEC-BACKUP-KEY-01. Add the household-only `backups.emergency_kit_saved_at` setting for the time the owner saved or printed the emergency backup key. It defaults to null and stores no key material.

## [spec-v0.1.132] - 2026-10-13

- SPEC-SETUP-STATE-01 and SPEC-TOUR-01. Added `SetupState` for setup source, step status, phase, engine location and hardware, away choice, plan references, health checks and timestamps; `HeroSlide` for slide image, heading, copy source, teaching point, audience and order. Added `Tour` and `TourProgress` schemas for package-declared tours and per-person completion, tour declarations on package manifests, and the `tours.autostart.enabled` setting.

## [spec-v0.1.131] - 2026-10-12

- `ease.preset` is labelled "Comfort style", not "Look": the Appearance page already has a theme row called "Look", and two rows with one name on the same page read as a mistake. Nothing else changed.

## [spec-v0.1.130] - 2026-10-12

- EASE-OF-USE-01 polish. In `keys.json` the `ease.*` keys are ordered with the preset first, then text size, spacing, button size, contrast, motion, Simple mode, reading level, explainers, word help and read aloud, and `ease.preset` moved to the top (it carried the card's own title, "Ease of use"). No key, range or default changed.

## [spec-v0.1.129] - 2026-10-12

- EASE-OF-USE-01a, ease of use settings (owner rulings 2026-10-12). New keys `ease.preset` (`standard`, `comfortable`, `large`, `simple`; Kids start on Simple, Teens and Adults on Standard), `ease.targets`, `ease.text_size`, `ease.spacing`, `ease.contrast`, `ease.motion` (calm mutes colors and stops animation), `ease.simple_mode`, `ease.word_help`, `ease.read_aloud` and `ease.explainers` (each defaults to `preset`, so a preset sets it until the person changes that one) and `ease.reading_level` (`standard`, `plain`, `very_simple`; Kids start on Plain). All are layered (`band`, `household`, `person`), `merge: override`, group `profile.ease`, in a new "Ease of use" card beside Appearance. Preset and level names are working names.
- A settings key gains `self_service` (boolean, default false): a person changes their own value at any age, a child included, unless an admin has locked the key for them (the lock itself is Home's write gate, not a spec field). Only the `ease.*` comfort keys carry it; a spec test holds that no safety, topics, search, security or guardian-controlled key does.
- `ease/presets.json`: the one record of what each preset sets and the numbers behind each value (text scale, spacing scale, target minimum in px, contrast ratio, motion), so the kit's token CSS and Go read one source.

## [spec-v0.1.128] - 2026-10-12

- SETTINGS-LAYERS-01a, three layers of settings per person (owner rulings 2026-10-12). User overrides (`person:<id>`) beat global defaults (`household`), which beat user defaults (Kids, Teens, Adults, `band:<child|teen|adult>`). A settings key gains `layers` (the scopes a row may be stored at, lowest first), `merge` (`override`: the most specific layer wins; `union`: a list key where each layer adds entries and a more specific layer may remove one it can see) and the transitional `user_defaults_keys` (the band-named keys that hold the user defaults until they move to `band:` rows). A setting value's scope may now be `band:<child|teen|adult>`, and a value may carry `set_by` (`self`, `system` or an admin id). New `SettingsDelta` schema: the value of a list key at a user override, `add` and `remove` entries that each record `item`, `set_by` and `hlc`, so a later change above still flows through and only an admin can lift what an admin set.
- Keys: new `search.blocklists` (the layered list of site kinds to block) and `search.page_text_cleaning` (boolean, on for Kids and Teens, off for Adults); `search.hosts.deny` and `search.hosts.allow` become layered unions; `search.safe_search` and `search.web_sources` become overridable user defaults. Not changed and not overridable: the adult-site list locked for child and teen (a custom allow never lifts it), hard lines, the crisis overlay and the output gate.

## [spec-v0.1.127] - 2026-10-12

- News feed lists (KS-05, owner requirement 2026-10-12). `news/feed-lists.json` declares each list once: id, the bundled module package that carries its feeds, plain-words label and line, the user types it is offered to and the ones that start with it on. The default set is a household list (teen and adult) and a kids' list (child only). A list not offered to a user type is not an option of that type's key, and Home ignores it if stored, so a minor never gets a list not marked for them. New `FeedLists` and `FeedListPackage` schemas (the `feeds.json` file of a feed-list package), fixtures, generated TS and Python models.
- Settings keys `news.lists.child|teen|adult` (household multi-selects, basic, `household.news`) and `news.feeds.child|teen|adult` (household text, advanced: extra feed addresses an admin adds or removes for that user type). Admin-edited and household-wide; the age filter on each item cannot be switched off by any of them.
- Settings card `matrix` additions, both optional: `rows` may name `news/feed-lists`; `rows_label` sets the heading over the rows; `unavailable_note` explains a box shown unchecked and disabled because the row is not offered to that user type. The News shelf card in Settings, Search uses it.

## [spec-v0.1.126] - 2026-10-12

- Settings card `matrix` (MINOR-SEARCH-01e-10, owner decision 2026-10-12): an `areas.json` card may name a tick-box grid, a row per option source (`rows`, here `search/blocklists`) and a column per audience (`columns`: label, settings key, band), with a `locked_note` and a `save_error`. The Blocked sites card in Settings, Search uses it: a row per kind of site, a box each for Kids, Teens and Adults. It writes the same `search.blocklists.<band>` keys, so there is no second store. The three blocklist keys and the eight `search.hosts.*` keys now live in `household.blocked_sites`.

## [spec-v0.1.125] - 2026-10-12

- Settings keys `search.hosts.child.deny`, `search.hosts.child.allow`, `search.hosts.teen.deny`, `search.hosts.teen.allow`, `search.hosts.adult.deny` and `search.hosts.adult.allow` (household text, advanced, `household.search`; MINOR-SEARCH-01e-9, owner decision 2026-10-12): a band's own always-block and allow hosts, added to the household pair from spec-v0.1.124. A deny always wins; an allow can never unblock a host on a list locked for the band.

## [spec-v0.1.124] - 2026-10-12

- Settings keys `search.hosts.deny` and `search.hosts.allow` (household text, advanced, `household.search`; MINOR-SEARCH-01e-8, owner decision 2026-10-12): comma-separated hosts the household always blocks in web search, and hosts it may show even when a blocked-sites list has them. A deny always wins. An allow can never unblock a host on a list locked for the band, so the adult-site list stays locked for child and teen controls. Admin-edited, household-wide, no per-person override.

## [spec-v0.1.123] - 2026-10-12

- Topic copy trimmed to fit the prompt budget (MINOR-TOPICS-01c). Measured with the Qwen3.8 9B tokenizer, the v0.1.122 default blocks were 328 tokens (child, with the three family-story names) and 265 (teen) against the 260-token bar. The sentences are shorter now, same instructions: child 256, teen 258. Only wording in `safety/topic-copy.json` changed; no key, stance or schema moved. The reachable-combination safety test also keeps the care sentence, hard lines and danger carve-out.

## [spec-v0.1.122] - 2026-10-12

- Sensitive-subject topics for child and teen controls (MINOR-TOPICS-01a, owner sign-off 2026-10-12). The content-ceiling record gains an additive `topics` map (seven families: bodies, health, feelings, risk, violence, people, beliefs; each with a default `stance`, the `allowed` stances a household may pick and a `fixed` flag) and, on the child record, `family_stories` (`keep` by default, with the built-in names). The adult record carries neither. Topics govern whether and how a subject is engaged; `dials` still govern explicitness.
- `safety/topic-copy.json` (schema `TopicCopy`): the one place the sentences a minor's topic block is made of live, keyed by family, band and stance, plus a header per band and the family-story line. `interpreters/ts/topicBlock.ts` renders them (`renderTopicBlock`), so the hub and the robot read the same text. Nothing in it matches a person's words.
- Settings keys: person-scoped `topics.bodies`, `topics.health`, `topics.risk`, `topics.violence`, `topics.family_stories`, `topics.family_story_names` (group `person.topics`, set by a parent or admin for a child, listed under `not_placed`) and household-wide `topics.teen.bodies`, `topics.teen.risk` (group `household.topics`, Home settings, Privacy). No key exists for feelings, people or beliefs, for a hard line, or for a teen on a person. A person key's `default` option resolves to the band record's `stance` for that family. Who may change a child's key is enforced by Home (parent or admin only, never a teen's own settings), not by this spec.
- The renderer never throws on a stance the record does not allow: it falls back to the record's stance, so a minor's prompt always carries the full block. Story names and the emergency number are cleaned (no newlines, bounded) before they reach the prompt. The schema now requires a fixed family to allow exactly one stance and keeps `topics` off the adult record and `family_stories` off adult and teen records.

## [spec-v0.1.121] - 2026-10-12

- Blocked-site lists (MINOR-SEARCH-01e-1). `search/blocklists.json` declares each list once: id, category, plain-words label and line, the bands that start with it on and the bands that cannot turn it off. The default set is The Block List Project's adult, gambling, scam, phishing and malware lists for child and teen controls, plus drugs for child controls only until measured. The adult-site list is locked on for child and teen. Pins (source, checksum, size) are not here; they live in the signed catalog list index, which can never unlock a list or add one a minor gets.
- Settings keys `search.blocklists.child`, `search.blocklists.teen` and `search.blocklists.adult` (household multi-selects, advanced, `household.search`): options are the lists not locked for the band, so the adult-site list is not an option for child or teen. Adult controls start with none. Admin-edited, household-wide, no per-person override; no admin sees what a teen searched or which sites were blocked.
- `interpreters/ts/hostList.ts`: `parseHostList`, the one definition of how a list file is read (formats, skipped lines counted by reason, punycode, dedupe), so the catalog pin's `entries` and the hub's count agree.
- `Blocklists` schema, fixtures, generated TS and Python models.

## [spec-v0.1.120] - 2026-10-11

- Capability policy (MINOR-SEARCH-01a): `integration:<id>` gains `by_parameter.searxng` with `none` for child, teen and adult, so web search through the household's own SearXNG runs without a parent's approval; every other integration still asks a parent for a minor. Risk stays `action`, so crisis and untrusted-provenance denials are unchanged. `search.household_subject` is now `never` for a child (was `parent`); teen and adult stay `self`.
- Settings keys `search.web.child_mode` and `search.web.teen_mode` (household select `on`/`off`, default `on`, basic, `household.search`): whether web search runs for people using child or teen controls. Admin-edited household switches; neither shows what any person searched for.
- `search.safe_search` help no longer says only an adult can change a child's or teen's. A child's is always strict; a teen can make theirs stricter but never below moderate.

## [spec-v0.1.119] - 2026-10-11

- Settings key `search.web_sources` (household select with `range.multiple`: `searxng`, `ddgs`; default `["searxng"]`; advanced): which services answer web searches. `ddgs` is listed but inert until its source is built; Home refuses an empty or ddgs-only list at write. Children and teens only use SearXNG.
- Settings key schema: `copy.option_labels`, an optional display name per select option (additive), used first by `search.web_sources`.

## [spec-v0.1.118] - 2026-10-11

- Settings key `chat.search_assist` (household select: `off`, `shadow`, `rescue`; default `shadow`; advanced). `rescue` is inert, treated as shadow, until the rescue path ships. Children and teens are never scored (ROUTER-BUILD-01a).
- `TurnLabel` record (label spec version 1): the one label shape for the search-assist head's training and bench data. `utterance_ref` and `prev_turn_ref` are pointers to stored turn rows, never hashes of text.
- `SearchAssistWeights` manifest schema: embed identity, feature shape, classes, coefficients, per-tool thresholds, label spec version, dataset hash and bench record. Both records ship fixtures.

## [spec-v0.1.117] - 2026-10-11

- Settings key `search.dictionary_fallback` (household boolean, default off, advanced): look a word up on Wiktionary when the offline library has no entry. Adults only; the word is sent to Wikimedia.

## [spec-v0.1.116] - 2026-10-10

- Same contents as spec-v0.1.115, with `spec/package.json` bumped to match its tag. The v0.1.115 tag was cut with a stale package version and is not used.

## [spec-v0.1.115] - 2026-10-09

- `vocab/source-mode.json` and the settings `search.source_mode` (`live`, `offline`, `mix`, default `mix`) plus the per-source `search.source_mode.wikimedia` and `search.source_mode.web` (`inherit` and the three modes, default `inherit`, advanced), with plain-words copy (KS-MODE-00). `offline` turns off only the Wikipedia-style live lookup. `search.wikipedia_fallback` is kept unchanged in this tag and removed in the tag paired with KS-MODE-01.

## [spec-v0.1.101] - 2026-10-07

- Include admin-only Home Voices in the Household settings group.

## [spec-v0.1.100] - 2026-10-07

- Gate household Voice catalog and Commands settings views to administrators.
- Keep Account Voice scoped to a person's own controls.

## [spec-v0.1.95] - 2026-10-07

### Fixed
- Remove the SearXNG-specific integration policy override. SearXNG now
  falls through to `integration:<id>`, retaining parent approval for
  child and teen accounts.

# Changelog (`@maipai/spec`)

All notable changes to the `spec` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `spec-vX.Y.Z`. Everything stays `0.x` until the platform's Hub v0.1
scope lands.

## [spec-v0.1.275] - 2026-10-29

## [spec-v0.1.141] - 2026-10-14

### Added
- Robot object parts, verbs, capability references and the actionable `NotSupported` error shape in `vocab/robot-api.json`; new body capability ids are declared in `vocab/capabilities.json`.

## [spec-v0.1.114] - 2026-10-09

### Added
- KS-00 knowledge-search records: Feed, NewsItem and NewsStory schemas with TypeScript and Python round-trip fixtures.
- Additive Source citation kinds and attribution fields for reference snapshots, licences, local paths and publisher counts.
- Optional model training cutoff date on ModelCapabilities.
- Eight knowledge-search settings keys generated through Home's settings registry generator.
- Processor registry rows for extract_article, cluster_story and fold_wire_copy, all marked learned: false.


## [spec-v0.1.113] - 2026-10-09

### Added
- GENUI-13a: optional `after_paragraph` (integer, minimum 0) on the AnswerBlock envelope, one shared `$def` referenced by every kind. Same meaning as `AnswerImageSet.after_paragraph`: how many paragraphs of released reply text come before the block; 0 is before any text; absent is after the whole reply, so older records render as today. The hub stamps it; a package never sets it. Additive only.
- GENUI-13a: the one paragraph definition (count, split, and the cut and boundary a placer needs, with blank lines inside a ``` code fence never a break) in `interpreters/ts/paragraphs.ts` and `interpreters/py/paragraphs.py`, both tested against `fixtures/paragraphs/cases.json`, so the hub, the web, the robot and Go count alike. It matches the count Home's picture placer already made, except that a blank line inside a code fence is no longer counted as a paragraph break (the hub never placed inside one).
- Fixtures: `valid-after-paragraph.json` and `invalid-after-paragraph-negative.json`.

## [spec-v0.1.111] - 2026-10-08

### Added
- Optional `geo` coordinates on map `Entity` records, including exact or area precision and their source.
- The `location` settings selector with `multiple` and `allow_current` range options, plus the `household.home` entity reference used by Home and Bot. Remove `household.home_place`; no consumer outside Home reads the old key.

## [spec-v0.1.112] - 2026-10-08

### Changed
- Home settings now groups household controls by their job and registers the engine, device-management and routing-stat views for Home.

## [spec-v0.1.110] - 2026-10-08

### Added
- Shared status model (STATUS-MODEL-01): `vocab/status-model.json` declares eight states (`running`, `starting`, `paused`, `down`, `limited`, `search_limited`, `waiting_internet`, `unknown`) with severity, sticky or transient, and tone (search limited is its own amber state; paused and down stay separate), ten structured causes that each map to one state, a surface table where every surface has `length` (`short`, `medium`, `long`) and `summary` (boolean), and short, medium and long copy per state for adult, teen and child, with admin reading the adult wording plus the Repairs link text for paused and down. `status/ts/statusModel.ts` exports the pure `statusCopy(state, length, audience, options?)`, `summarize(statuses, length)`, `surfaceView(surface, statuses, audience)`, `stateForCause`, `stateFromCauses` and the table readers. Summary surfaces (profile hover, profile LED, profile row, header pill, status page header) take every status, color from the worst severity and join affected service names into one sentence; four or more affected collapse to "N services need attention" at short and medium and list at long. A child sees nothing on the profile surfaces while a service has a problem. Hand-written fixtures in `fixtures/status-model/` are the contract for the robot and Go. Additive: no field removed or repurposed.

## [spec-v0.1.109] - 2026-10-08

### Added
- `AnswerBlock` (`schemas/answer-block.schema.json`), the typed, renderable part of an answer, defined once for the hub, the web kit, Go and the robot (GENUI-01). Every block carries `id`, `kind`, `schema_version`, `producer`, `alt` (a plain-sentence text fallback), optional `min_band`, `provenance`, `created_at` and `hlc`, plus the kind's `props`, which mirror the kit Element's props. Flat, never recursive. Closed v1 kinds: `spec_sheet`, `data_table`, `chart`, `timeline`, `todo_list`, `image_gallery`, `schedule_card`, `comparison`. A client that does not know a kind says `alt`.
- Optional `blocks` on `PluginResult` (`result.schema.json`) and on the stored turn (`conversation-turn.schema.json`), a `block` turn-stream event `{t, call_id, block}` (`turn-stream-event.schema.json` and its Zod mirror), and optional `returns_blocks` on the package manifest (the kinds a package may emit).
- Fixtures per kind in `fixtures/answer-block/` with invalid cases, `block` stream events, a manifest, a turn and a plugin result that carry blocks. TS and Python tests cover all of them.
- No existing field is removed or repurposed: an older turn, result or manifest without the new fields still validates unchanged.

## [spec-v0.1.107] - 2026-10-07

### Fixed
- Restore the REMOTE-STACK-SPEC-01 engine-computer settings removed during the settings-registry regeneration in spec-v0.1.106.
- Keep the spec registry additive: the registry tests now fail if these parent-tag keys are dropped.

## [spec-v0.1.105] - 2026-10-08

### Added
- REMOTE-STACK-SPEC-01: the engine computer's settings, status component, link state and error codes.
- Settings keys `engines.stack.where` (this computer or another computer, default this computer), `engines.stack.remote.host`, `engines.stack.remote.ssh_port` (22), `engines.stack.remote.local_port` (8771, expert) and `engines.stack.remote.allow_tailnet` (off by default, "Reach the engine computer when away from home"). All household scope, admin only, in `household.ai`.
- `engine_computer` status component.
- `LinkState` schema (`schemas/link-state.schema.json`): state, reason, path, rtt_ms, last_ok_at, contract.
- Error codes `link_refused`, `link_timeout`, `link_dns`, `link_auth_refused`, `link_host_key_changed`, `link_needs_update`, `link_not_paired`, `link_outside_home` and `link_stack_down`.

### Changed
- New help text for `engines.stack.url`: it describes both places the engine can run.

## [spec-v0.1.104] - 2026-10-07

### Added
- Add the typed log-event registry and ProblemReport contract with consent-gated optional content.
- Aggregate turn-derived failures by component and code in hourly counters; omit per-turn failure and safety events.


## [spec-v0.1.103] - 2026-10-07

### Fixed
- Preserve the admin-only Home Voices navigation placement alongside TOOL-OFFER-01 policy schemas.

## [spec-v0.1.102] - 2026-10-07

### Added
- Declare per-package tool offer decisions and per-model tool caps for TOOL-OFFER-01; retain `tools_offered` as optional deprecated migration data.

## [spec-v0.1.101] - 2026-10-07

- Include admin-only Home Voices in the Household settings group.

## [spec-v0.1.98] - 2026-10-07

### Added
- `SettingsKey` accepts optional per-reader copy, control, band defaults, and option-source metadata.
- Add `describeSetting` in TypeScript and Python with shared per-reader fixtures and a shrink-only COPY-LINT-01 baseline.
- `Relationship` accepts an optional `called` word for a visible relationship edge.

## [spec-v0.1.97] - 2026-10-07

### Added
- Add the `search.safe_search` policy row so the gate declares and applies
  the person's band-default safe-search floor for every search path.


## [spec-v0.1.96] - 2026-10-07

### Added
- Declare the hosted search safe-search floor as a capability limit:
  the effective per-person level must be at least the speaker's band default.


## [spec-v0.1.94] - 2026-10-07

### Added
- Shared flat chat role context fields and an HTTP stub for `GET /stack/v1/roles`, so Home and Stack derive their wire types and tests from one contract (THIN-3A).

## [spec-v0.1.91] - 2026-10-06

### Added
- `policy` on every entry of `vocab/permissions.json` and `vocab/grant-actions.json` (risk, outbound, reversible, `approver` per band `none|self|parent|never`, optional `by_parameter`, `limits`, `model_callable`), `unknown_default` (a minor asks a parent), the core ids `share.create`, `upload.photo`, `search.hosted`, `search.household_subject`, `notify.person` and `approvals.decide`, and a test that a child's cell is never looser than a teen's (SPEC-CAP-01).

## [spec-v0.1.90] - 2026-10-06

### Added
- `ChatFolder` grows the project fields (PROJECTS-P1, PROJECTS-PARITY), all optional with defaults so a spec-v0.1.87 record still validates: `color` (one of the nine kit hue names, never a hex; default `neutral`), `icon` (a name from the new `vocab/project-icons.json`, 24 kit icon names, no uploads; default `folder`), `description` (up to 500 characters, shown to people, never sent to the model), `instructions` (up to 1500 characters), `pinned` and `pinned_at`, `archived_at`, `memory_mode` (`shared` or `project_only`; a record without the field reads `shared`, the hub writes `project_only` for a new project) and `shares` (up to 20 `{person, role}` entries, role `can_use` or `can_edit`). Fixture `chat-folder.project.example.json`. Project files are not on the record yet.
- Optional `folder_id` on `MemoryRecord` (null or a `folder-` id): the project a memory or episode was written in. Provenance only until a project's `memory_mode` is `project_only`. Fixture `memory-record.in-project.example.json`.

## [spec-v0.1.89] - 2026-10-06

### Added
- `SettingsArea` schema and `settings/areas.json` (SPEC-SETAREA-01): the Account, Home settings and Chat settings areas as data (sections, cards, sidebar groups, audience), plus `contributes.settings_area` on the package manifest so an app package declares its own settings area. A card is one registry group at one scope and each registry key sits in exactly one card; `not_placed` records the three groups no area shows (`person.allowance`, `person.storage`, the robot-only `robot.hello`). The four allowed view ids, the nine reserved area ids and the three central ids are closed lists; `settings/areas-check.ts` holds the conformance check and the manifest lint. Account > Robot is adults only, Chat > Parental controls is a link row for owner, admin and adult accounts with a child (never a teen, no person id), and the only href placeholder is `{self}`. Additive.

### Changed
- Settings registry: 28 existing keys change only `lives_in`, so each group fits one card; no key added or removed, and scope, default, level and who may write are untouched. `ui.show_turn_stats` and `reference.images` move to `person.chat`; `ui.enrollment_sounds` to the new `person.profile`; `person.quiet_hours.from` and `.to` to `person.notifications`; `household.quiet_hours.from` and `.to` to `household.notifications`; `notifications.telegram.chat_id` and the 15 `notifications.*.telegram` switches to the new `person.telegram`; `backup.max_total_gb` to `household.storage`; the four `status.internet_probe.*` keys to the new `household.status`. `search.brave_api_key` is not in the registry yet and arrives with SEARCH-KEYS-SPEC-01, which lands it in `household.search`; the Home settings Search card already draws that group. Home's key declarations (the source `keys.json` is generated from) must carry the same `lives_in` values.
## [spec-v0.1.88] - 2026-10-06

### Added
- Optional `reasons` (the fixed five reason values, each at most once) and `note` (up to 1000 characters, or null) on `ReplyFeedback`, for the "What went wrong?" form after a down rating (ELEMENTS-ADOPT-02). `reason` stays and keeps the first pick for older readers. The note is private to its writer, never joins the label export, and is deleted with the rating. The child band never stores either. Fixture `reply-feedback.reasons.example.json`. Additive.

## [spec-v0.1.87] - 2026-10-06

### Added
- `ChatFolder` (`chat-folder.schema.json`, id prefix `folder-`): one person's named group of chat conversations, shown to people as a Project in the chat history column. Name 1 to 80 characters, optional `sort_order`, `provenance` naming who made it (a parent may make one for a child), `deleted_at` for sync. No instructions or files yet. Named "chat folder" so it is never confused with the background-work `Project` record (CHAT-PROJECT-01a).
- Optional `folder_id` on `Conversation` (null or a `folder-` id): the folder the conversation sits in. Deleting a folder sets it back to null; a temporary conversation never has one. Fixtures `chat-folder.example.json`, `chat-folder.parent-made.example.json`, `conversation.in-folder.example.json`.

## [spec-v0.1.86] - 2026-10-06

### Added
- SearXNG engine-group catalog, required engine minimums, operator and country disclosures, and privacy flags for Yandex and Baidu. The search URL setting now explains that an empty value uses MaiPai’s search service; household search settings live under `household.search` (SEARXNG-SET-01).

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
- `settings/keys.json`: two new person-scope keys for INCOGNITO-07 (session lock with PIN re-entry) - `security.session_lock_required` (boolean, default off) and `security.session_lock_timeout_minutes` (number, default 5, range 1-120). Both `level: "expert"`, which `groupSettings()`'s own filter on a level other than `"expert"` (commons `ui/src/settings/groupSettings.ts`) drops from every renderer's eligible list entirely, self scope included - no generic settings UI surfaces them at any disclosure tier. Home's own PATCH /api/people/:id is the one owner/admin-gated surface that reads and writes them, since this is an admin-configurable-for-any-account control, not a personal preference.

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

## [spec-v0.1.99] - 2026-10-07

### Changed
- Settings areas: keep personal voice controls in Account and declare the
  household command management view in admin-only Home settings.

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

## 0.1.196

- SPEC-FLASH-MANIFEST-01: add the signed `FirmwareFlashManifest` schema, generated TypeScript and Python models, layout validation, catalog-compatible signing payload helpers, and StackChan ESP32-S3 fixture.
- CHAT-CARDS-05: additive `media_card`, `confirmation` and `countdown` answer-block kinds, with hub-cache-only covers, semantic actions, optional Undo and client-side countdown expiry.
## [spec-v0.1.241] - 2026-10-26

- MEDIA-APPLE-PASS-01: add player `details_show` and collection fields, actions, and header/footer parts to the UI schema.
## [spec-v0.1.272] - 2026-10-30

### Added
- Alarm, WorldPlace and QuickTimer records for clock and reminders, with
  person ownership, shared bookkeeping fields, generated TypeScript and
  Python models, fixtures and validation coverage. WorldPlace time zones
  are checked against `Intl.DateTimeFormat`; Home enforces the 12-place
  per-person limit.
- Optional List `icon` from the fixed built-in icon set. Built-in lists
  have fixed icons; custom lists choose one from the set.
## [spec-v0.1.345] - 2026-11-08

- WEATHER-PRECIP-01: weather cards gain optional precipitation units, 15-minute amounts and hourly and daily rain amounts; existing cards remain valid.
## [spec-v0.1.372] - 2026-11-13

- VIDEO-LD-01, additive. `media_shelf.look` accepts `default` or `backdrop` (default `default`); backdrop draws blurred art behind the contained image.

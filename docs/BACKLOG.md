# Backlog

What's built and what's missing in `commons`. Scannable, not narrative -
reasoning and decision history live in [dev.md](dev.md). Size tags: **S**
(a session or less), **M** (a real slice, days), **L** (a platform-level
capability, needs its own design pass first).

## Skeleton

- [x] **S** Repo skeleton: `LICENSE` (AGPL-3.0), `NOTICE`, `README.md`,
  three workspaces (`ui/`, `core/`, `spec/`) each with a placeholder or
  pointer, `scripts/check.sh` pinned to `@maipai/standards`,
  `docs/BACKLOG.md`, `docs/dev.md`, a `CHANGELOG.md` per workspace. No
  push-triggered Actions. See [dev.md](dev.md).

## Tooling

- [ ] **S** A composite GitHub Action for a consumer's own CI pin
  resolution: found live during Catalog's SHARED-PIN-01 adoption
  (`catalog/docs/dev.md`) - `catalog/.github/workflows/check.yml`
  reimplements the checkout-commons-with-tags-then-`ensure-tag.sh`-per-pin
  dance directly, and `home`'s own CI (if/when it gets any) would need
  the identical steps, duplicated rather than shared (org rule 1:
  "Simplify: centralize and reuse... A second copy of anything is wrong
  even when it is faster"). Wrap it as one composite action - inputs:
  the pins to resolve (workspace/tag pairs); does the `getmaipai/commons`
  checkout with `fetch-depth: 0` (a live PR proved `fetch-tags: true`
  alone leaves a tag's ref resolvable but not its commit - catalog's
  own `docs/dev.md` has the run), the nested-checkout-then-symlink
  trick (`actions/checkout@v4` refuses a `path` outside
  `$GITHUB_WORKSPACE`), and calls `ensure-tag.sh` per pin, exporting
  `MAIPAI_COMMONS_DIR` and the resolved worktree paths - so a consumer's
  own workflow becomes one `uses:` line instead of the multi-step
  dance. Published from `getmaipai/.github` (its own composite actions
  precedent) or `commons` itself - whichever the org's "no push-triggered
  Actions in private repos" rule allows for a public repo like `catalog`
  to consume; check that rule before picking. Exit check: `catalog`'s
  `check.yml` shrinks to one `uses:` step for the commons checkout +
  pin resolution, a live PR run still green.

## Standards

- [x] **`std-` tags get the same per-tag worktree treatment as
  `commons`** - found live
  during SHARED-PIN-01's CI verification (`catalog/docs/dev.md`):
  every consumer's `check.sh` states a pin like `std-v0.2.0`, but
  every LOCAL gate run resolves `@maipai/standards` from a plain
  sibling `../.github` checkout, not a per-tag worktree - on this
  machine that checkout sat on `main`, 113 commits ahead of
  `std-v0.2.0` (`git describe --tags` -> `std-v0.2.0-113-gb67acef`),
  so every local `scripts/check.sh` run this session enforced
  whatever `main` happened to be, not the tag it claimed to pin. CI
  catches the gap because its own `.github` checkout is genuinely
  pinned to the tag (a real difference in behavior, not just a
  slower path) - it correctly failed prose-lint on real exclamation
  points local runs never saw. Two honest fixes, either resolves it:
  extended `ensure-tag.sh`'s pattern to `getmaipai/.github`
  (`standards/bin/ensure-tag.sh`): `scripts/check.sh` here resolves
  `std-v0.3.0` through `../.github-tags/std-v0.3.0`, the same
  immutable-per-tag shape `commons-tags` already gives `core`/`ui`/
  `spec` consumers, landed the same way in `bot`, `home`, `stack` and
  `catalog`. The standards pin resolves through a per-tag worktree,
  std-v0.3.0 (verified at this commit). Same commit fixed a real
  ordering defect this pass found live: the workspace loop installed,
  linted and tested one workspace at a time in `core`/`ui`/`spec`
  order, so `ui`'s own `tsc` - following a raw relative import into
  `spec/gen/ts/*.ts`, which imports `zod` - failed on `spec`'s not-yet-
  installed `node_modules` in a fresh worktree. Installing every
  workspace first, then linting and testing each, fixed it.

## `core`

- [x] **core's own ESLint gate** (S): `core/eslint.config.js`,
  typescript-eslint recommended plus "core imports no product"; verified
  at this commit.

- [x] **M** `core-v0.1.0`: sixteen modules landed - `log`, `withTimeout`,
  `paths`, `archive`, `zip` (`diagnostics`'s one generic piece),
  `hardware`, `openapi`, `secretThrottle`, `hlc`, `id`, `secrets`,
  `keystore`, `rateLimiter`, `singleflight`, `ssrfGuard`, `backupCrypto`,
  plus two internal helpers (`aesGcm`, `boundedMap`) a code review found
  were needed to avoid `secrets`/`backupCrypto` and
  `rateLimiter`/`secretThrottle` each duplicating the same logic. 126
  tests passing. `file:` decided over `link:` for the pin form (tested;
  see dev.md). See dev.md's "Workspace status" for what each module
  replaced and why.
- [ ] **S** Home adopts `core`: pin the tag, replace every import of the
  eight/fifteen helpers, delete the copies in `home/backend/src/lib`.
  Acceptance: `home`'s full `scripts/check.sh` green, one commit. Exit
  check: `home/scripts/check.sh`.

## `ui`

- [x] **S** `ui-v0.5.81`: `Header` and `FullLayout` gain an optional `statusIndicator` slot (STATUS-A1).
- [x] **S** `ui-v0.5.82`: add attributed Kibo `Status` and Tremor `UptimeStrip` snapshots (STATUS-A1b).

- [x] **M** `ui-v0.1.0`: the kit landed, extracted from the Stack's
  committed tree at `5ec0f57` (never the working tree) plus Home's
  `primitives/`, `schema/` and `settings/`. Folded in per the owner's
  ruling: the command palette and phone nav (generalized from Home's
  own, search providers and nav entries injected) and the header
  picker/notification popover chrome (generalized from the Stack's
  `machine-selector.tsx`/`notifications-popover.tsx`, data via props) -
  all one tag, not split into follow-up items, since Home's adoption
  needs a complete kit either way. 268 tests passing. The approved
  design spec moved to `ui/docs/spec.md` + `ui/docs/reference/` (six
  images), with a preface and a closing "what's Stack-only" list, body
  unedited. See dev.md's "Workspace status" for the full inventory.
  Known gap, tracked not dropped: no TV-focusable nav yet (not one of
  the five protected features).
- [x] **S** `ui-v0.1.1`: ported docs/UI.md's 48px touch-target/16px type
  floor into the primitives that shipped unhardened (they came through
  the Stack path rather than Home's own already-audited kit copy) -
  found mid-Home-adoption comparing the two kits directly. 281 tests
  passing, plus a second review pass that caught and fixed five real
  overlap bugs the port introduced or exposed (see dev.md). See dev.md's
  "Workspace status" for the full file-by-file inventory.
- [x] **S** `ui-v0.1.2`: `Shell`'s command palette gained a real header
  search button (owner ruling, 2026-09-20: no button meant search
  existed on desktop's Cmd/Ctrl+K and vanished on phone, which "one
  product, every screen" forbids). 283 tests passing.
- [x] **S** `ui-v0.1.3`: the sidebar's own keyboard-avoidance/layout
  fixes ported from Home's pre-adoption copy (`position: fixed` +
  `useVisualViewportHeight`, `min-w-0`), three more call-site
  `className` overrides defeating `ui-v0.1.1`'s own floor fix, and a
  `CommandDialog` landmark bug - found live finishing Home's step-5
  adoption. 290 tests passing.
- [x] **S** `ui-v0.1.4`: two opacity-contrast bugs found by Home's step
  5a (adopting the kit's real `tokens.css` as its base instead of a
  second, hand-picked palette) - `nav-main.tsx`'s own `/60` call-site
  override of `SidebarGroupLabel` (the one actually rendered on every
  page's "Navigation"/"Favorites" heading) measured 4.49:1 against the
  approved light theme's `--sidebar`, under WCAG AA's 4.5:1 floor (both
  it and the primitive's own `/70` default bumped to `/75`, the
  primitive defensively since it wasn't independently proven to fail on
  its own), and `TabsTrigger`'s inactive `/60` measured 4.42:1 against
  `--muted` (switched to `--muted-foreground`, matching what dark mode
  already did). A new `contrast.test.ts` regression test guards the
  sidebar label's own opacity against this bug class going forward. 292
  tests passing.
- [x] **S** `ui-v0.1.6`: `ui-v0.1.5`'s `package.json` `"exports"` field
  (added for a `"./eslint-config"` alias) broke every OTHER subpath
  import the moment it installed externally - `exports`, once present
  at all, blocks every subpath not explicitly listed, and `shared`'s own
  gate never exercises the package through an external `node_modules`
  boundary the way Home does, so nothing here caught it. Found
  re-pinning Home (`bun test`: "Cannot find module
  '@maipai/ui/src/primitives/Page'" everywhere). Fixed by dropping
  `exports` entirely; the ESLint config is importable at its real file
  path instead (`@maipai/ui/eslint.config.js`). `ui-v0.1.5` is not
  retagged (never move a pushed tag). 296 tests passing, unchanged.
- [ ] **S** `react-router-dom` as a peer, not direct, dependency of
  `ui` (matching `react`/`react-dom` already are): found live in Home's
  own step-5 adoption - a direct dependency meant two separate
  `react-router-dom` module instances could get bundled across a lazy
  `import()` chunk boundary, breaking `useLocation()`/`Shell`'s own
  `SidebarProvider` context sharing. Home's own `vite.config.ts` works
  around it with `resolve.dedupe`; the real fix is here, so every future
  consumer (`bot`, `go`) doesn't have to rediscover and repeat that
  workaround. Exit check: `ui/scripts/check.sh` green, `bun install` in
  a consumer still resolves one `react-router-dom` instance.
- [x] **S** A shared helper for the touch-target hit-area technique
  (`relative` + `before:`/`after:-inset-N`): hand-derived independently
  at every call site across `button.tsx`, `toggle.tsx`, `checkbox.tsx`
  (a code review on `ui-v0.1.1` flagged this - "a second copy of
  anything is wrong even when it is faster," org CLAUDE.md). Mirrored
  `utils.ts`'s `FOCUS_RING` constant, created for exactly this kind of
  repeated-pattern drift, as `hitArea` in `ui/src/utils.ts`. Verified at
  this commit. Exit check: `ui/scripts/check.sh` green, no
  behavior change (same computed insets, one definition).
- [x] **S** `ui`'s own a11y gate: `package.json`'s `"lint"` is
  `tsc --noEmit` only, not the ESLint config docs/UI.md says the kit
  ships to every repo and catalog CI run, and the kit has no
  touch-target/type-floor sweep of its own - Home's
  `scripts/screenshot.ts` is the only thing proving `ui-v0.1.1`'s floor
  today. Matters once `bot`/`go` adopt the kit without Home's gate.
  Exit check: `ui/scripts/check.sh` green with the new lint/sweep wired.
  Verified at this commit (the ESLint flat config shipped as
  `ui/eslint.config.js`, importable by a consumer at
  `@maipai/ui/eslint.config.js`, and enforced by `ui/scripts/check.sh`;
  the touch-target/type-floor sweep remains open).
- [x] **M** Home adopts `ui` (step 5, 2026-09-20): pinned, `@/kit` and
  `shell/Shell.tsx` replaced with `@maipai/ui` across its consumer
  files, `ProfileSwitcher`/`NotificationBell`/search providers/`PhoneNav`
  data wired into the new kit slots, the older kit and shell deleted
  (`assistant-ui/` and its own local dependencies kept in Home through
  step 5, moved into the kit itself at `ui-v0.2.0`, below). Screenshots
  taken before and after (headless), opened and judged for the shell
  and two apps at desktop and phone, differences described in Home's
  own `dev.md`; full gate green. Step 5a (same day) followed with the
  kit's own `tokens.css` as Home's base instead of a second palette.
  Exit check: `home/scripts/check.sh` - passing.
- [x] **M** `ui-v0.2.0`: the kit's chat pattern (`docs/spec.md`'s new
  "Chat" section and section 7's "One product on every screen" opening
  paragraph), four new components (`SensesDock`, `ChildBand`,
  `SourcesCard`, `MemoryChip` in `src/blocks/chat/`), and the
  `@assistant-ui/react` wrappers moved in from Home's own
  `frontend/src/kit/assistant-ui` (unchanged except imports) - Home's
  own step-5b chat rebuild consumes this. 305 tests passing.
- [x] **S** `ui-v0.2.1`: found live finishing Home's step-5b chat
  rebuild - `MemoryChip` gained a third `"failed"` kind (a save that
  never completed has nothing to keep/edit/forget, spec section 4's
  state table: a red label plus one recovery action, not a mismatched
  popover), and `SourcesCard`'s row links gained `rel="noopener"` and
  an explicit `referrerPolicy` (Home's own pre-adoption copy had both;
  the port had only `rel="noreferrer"`). 307 tests passing.
- [x] **S** `ui-v0.2.2`: `thread-list.aui.tsx`'s own call-site overrides
  silently defeated every primitive's touch-target/type floor,
  invisible until Home's step 5b made the thread list a persistent,
  always-visible desktop column instead of a toggled drawer -
  `ThreadListSearch`, `ThreadListNew`, `ThreadListItem`'s own row and
  rename input, and the "More options" trigger (an `icon` size with a
  `size-6` override and no touch-target extension) all bumped to their
  primitive's own real default or `icon-xs`. A review before landing
  caught two more: `icon-xs`'s own larger invisible hit area needed the
  row's `pe-9` reserved space bumped to `pe-11` (or a real click could
  land on the more-button instead of the title/rename field), and the
  Delete item's hand-copied destructive hover was missing the kit's
  own dark-mode contrast bump. 307 tests passing.
- [x] **M** `ui-v0.3.0`: Home's shell and dashboard, to the owner's
  ruling on "Home's pages under the kit"
  (home/docs/design/home-pages-2026-09-20.md, HOME-UI-01). Five new
  components (`IconTile`, `PanelHeader`, `HubCard`, `FooterBar`,
  `HeaderSearchField`), `Shell`'s new `footer` slot and a real centered
  header search field replacing the old bare icon button,
  `MetricCard`/`CategoryTile`/`ActionTile` restyled onto `IconTile`, the
  active nav item's flat violet swapped for the spec's gradient
  (`--hue-violet-deep`). Rebased onto spec-v0.1.1 (B's RF-05b fix): 319
  tests passing, all green. See `CHANGELOG.md` for the full
  component-by-component list.
- [x] **M** `ui-v0.4.0`: "Two looks, one setting" (owner ruling,
  2026-09-20, HOME-UI-02c) - `data-look` on `<html>` as a second theme
  dimension next to light/dark (`studio:` variant, `--tile-radius`,
  `--canvas-background`), Studio matching the reference exactly and
  Calm the softer look that shipped first, a person's choice via the
  new `ui.look` settings key (spec-v0.1.2). Same commit fixes the
  collapsed rail in both looks (owner finding, same day): one toggle
  (`rail-toggle.tsx` deleted, `SidebarTrigger` the sole control with a
  real state-aware label), 64px rail, every collapsed row a true 40x40
  centered target with its touch target still floored at 48px, the
  active item's collapsed fill gradient in Studio and flat in Calm,
  `HubCard`'s collapsed state a real icon tile instead of a lone dot.
  See `CHANGELOG.md` for the full list.
- [ ] **S** `ThreadListItemMorePrimitive.Item`'s own Rename/Delete rows
  hand-copy `DropdownMenuItem`'s base layout/floor classes
  (`min-h-12`/`text-base`/hover-focus tokens) verbatim (found by a
  ui-v0.2.2 review): assistant-ui's own menu primitive isn't the kit's
  `DropdownMenuItem`, so it can't just reuse that component, but the
  class LIST could still be one definition instead of two hand-kept
  copies - export it from `dropdown-menu.tsx` as a constant, the same
  `MARKDOWN_LINK_CLASS`/`FOCUS_RING` pattern `utils.ts` and
  `markdown-text.tsx` already use for exactly this. Exit check:
  `ui/scripts/check.sh` green, no visual change (same computed classes,
  one definition).
- [ ] **M** TV-focusable navigation in `Shell.tsx`: `ui-v0.1.0`'s shell
  has no `@noriginmedia/norigin-spatial-navigation` rail the way Home's
  old `Shell.tsx` did (real arrow-key/remote focus on the `far` surface).
  Mirror: Home's archived `shell/Shell.tsx`'s `TvNavItem`/`tvNav.ts` for
  the pattern. Needs a design pass on how it composes with `Shell.tsx`'s
  own generic `NavGroup`/`NavEntry` props first. Exit check:
  `bash scripts/check.sh` plus a real TV-surface screenshot judged.
- [ ] **S** `ui` pins `spec` by tag: `ui/package.json`'s own
  `"@maipai/spec": "file:../spec"` (a bare relative path, resolved from
  wherever `ui`'s worktree happens to be) becomes the same per-tag form
  consumers use (`"file:../commons-tags/spec-<tag>/spec"` or equivalent),
  so a kit tag names the exact `spec` version it was built against.
  Found by a code review during Home's SHARED-PIN-01 adoption
  (`home/docs/dev.md`, "Pins moved to per-tag worktrees"): before
  per-tag worktrees, `ui` and `spec` were always read from the one
  mutable `shared/` checkout, so `ui`'s nested `@maipai/spec` and a
  consumer's own direct `@maipai/spec` pin were mechanically guaranteed
  to be the same commit; now they resolve from two independently-pinned
  tags with nothing keeping them in sync (checked live: `ui-v0.3.3`'s
  nested `spec` and `spec-v0.1.1` currently match byte-for-byte except
  one docs-only file, so no live break yet, but nothing stops one). Add
  a check (in `ui`'s own `check.sh` or the standards core) that a
  consumer's `spec` pin must match `spec` version `ui`'s tag names, or
  install refuses. Exit check: `commons/scripts/check.sh` green, a new
  `ui` tag with an intentionally mismatched nested `spec` shown to fail
  the added check.
- [x] **S** `ui-v0.5.68`: `MediaGrid.tsx` (the shared `AspectRatio`-card
  grid plus lightbox `Dialog`, built once for the People profile page,
  `STORE-PAGE-01`, and any future Photos/Videos app - `home/docs/plans/
  people-profile-2026-09-26.md`'s `MEDIA-GRID-01`), plus `tokens.css`'s
  `--profile-accent-*` swatches (six names matching `spec`'s `Person.accent`
  enum: blue/violet/teal/orange/pink/red). Landed as part of tonight's
  PEOPLE-01 phase-one work; this entry backfills the tag's own record,
  never written at the time.
- [x] **S** `AVATAR-RENDER-01`: closes `Avatar.tsx`'s own deferred DiceBear
  rendering (home `docs/plans/people-profile-2026-09-26.md`) - a
  `seed` prop (`Person.avatar_seed`) now renders a real DiceBear
  picture (`adventurer` style, the open style call this item left to
  implementation, picked for a friendly all-ages face over a robot or
  an abstract identicon); no seed, or a generation failure, still falls
  back to the initial-on-tint, now a genuine last resort rather than
  the only path, mirroring the kit's existing Image-then-Fallback
  optional-asset shape (`assistant-ui/attachment.aui.tsx`'s
  `AttachmentThumb`). New direct dependencies `@dicebear/core` and
  `@dicebear/adventurer`, pinned to the exact `9.4.3` release on both
  (a first pass added the `@dicebear/collection` barrel package
  instead, caught by a code review for pulling in all ~30 unused style
  packages just to reach one; the single style package alone avoids
  that). 9 tests in `Avatar.test.tsx` (photo/seed absent, a seed
  producing a stable and distinct picture per seed, a DiceBear failure
  degrading to the initial without crashing); happy-dom's image loading
  is off by default in this workspace, so the seed-to-picture mapping
  is asserted on the exported `diceBearAvatarUri` directly rather than
  through a rendered `<img>`'s load state. `avatar_file_id` (a real
  photo overriding the generated one) is a separate, not-yet-spec'd
  field and stays out of scope here (`PEOPLE-SPEC-01`'s docs backfill
  above lists it as shipped in `spec-v0.1.43`; the schema at that tag
  and at `origin/main` HEAD has no such field - flagged, not fixed
  here). Low-effort review, two passes (the dependency-footprint
  finding above, fixed and re-reviewed clean on that hunk).
  `commons/scripts/check.sh` green end to end, rebased onto
  `STORE-SPEC-01`'s `spec-v0.1.44`.

## `spec`

- [x] **PRINT-SPEC-01: BiometricPrint, the shared face/voice reference-print record** (landed spec-v0.1.54, 2026-09-28; S, spec first; bot `docs/dev/face-voice-recognition-design-2026-09-28.md` and `docs/dev/design-face-recognition-models-2026-09-28.md`, FACE-01's own blocker). `spec/schemas/biometric-print.schema.json`: one accepted enrollment sample's reference embedding - person_id, modality (face or voice - separate records, fused once in the household runtime's turn engine, never here), model_id and model_sha256 (so a matcher refuses a print made by a different model outright rather than silently comparing two incompatible embedding spaces), dim and embedding (one accepted sample, not an array - a coverage-grid enrollment produces several print records per person), consent_at and consented_by_person_id (both required, non-nullable - enrollment is never automatic or passive; a child's print is consented by an adult, never the child), the usual timestamps, a deleted_at tombstone, an hlc. `validate_biometric_print`/`validateBiometricPrint` (both languages) check embedding's length against dim, the one thing JSON Schema can't express; wired into the shared cross-language conformance suite (4 new cases, one that only fails through the validate function, not schema validation alone). Three fixtures: an adult's own face and voice prints, a child's face print consented by a different, adult person_id. A medium-effort review (8 finder angles) came back clean. Not done here, each its own item elsewhere: the hub-owned enrollment UI and encrypted storage (`home`), real model construction and the CPU measurement (`bot`, its own FACE-01 entry). Exit: `bash scripts/check.sh` and the tag.

- [x] **ROBOT-STATE-SPEC-01: the hub-local `robot.state` frame** (landed spec-v0.1.55, 2026-09-29; S, spec first; home `docs/dev.md` and bot `docs/dev.md`, “Robot device state,” resolved by design-resolver 2026-09-29). `spec/schemas/robot-state.schema.json`: the value object keyed externally by device_id for the Devices-page card, with activity (starting/idle/listening/thinking/speaking), muted, tracking, on_battery, battery_level, and daemon_version; no record identity, timestamps, or hlc because this projection is hub-local and never synced. The core three fields are required; the battery and daemon fields may be omitted by producers that do not report them yet, while explicit null records unknown/unavailable state. Reachy Mini's on_battery is null per design section 7. Six fixtures cover every activity and all battery/version fields null. JSON Schema validation alone is sufficient; no cross-field validator was needed. Not done here: Home's `device_states` table and Devices-page card (`home`), or the robot's state reporting (`bot`). Exit: `bash scripts/check.sh` and the tag.

- [x] **DATA-LOCATION-00a: the class declaration, the location record and the folder marker** (landed spec-v0.1.58, 2026-09-29; S, spec first; home `docs/dev.md`, "DATA-LOCATION", sections (a) and (e)). `spec/schemas/data-class.schema.json`, `data-location.schema.json` (`schema: 2`) and `data-folder.schema.json`, with generated TypeScript and Python models, 76 valid and invalid fixtures, and a round-trip test in each language. The choices made where the record left one are in `spec/README.md`. Not done here: the readers, writers and path resolution in `core` (DATA-LOCATION-00b), disk facts (00d), verified copy (00e), and each product's class list. Exit: `bash scripts/check.sh` and the tag.

- [ ] **SIGNAL-SPEC-01: the `computed` target on the turn signal, cut as spec-v0.1.25** (S, Sonnet, spec first, 2026-09-23; SIGNAL-02's spec half, written into the working tree by the design session: `spec/schemas/turn-signal.schema.json` (`target` enum and description, the clause `subject` union), `spec/fixtures/records/turn-signal.computed.example.json`, six rows in `spec/llm/tool-call-corpus.json`, the CHANGELOG entry and the version bump). Left to do, mechanical: `bun run gen:ts` and `bash scripts/gen-py.sh` in `spec/` (the generated `gen/ts/turn-signal.ts` and `gen/py/turn_signal_schema.py` gain the value), one test line each in `spec/tests/ts/fixtures.test.ts` and `spec/tests/py/test_fixtures.py` for the new fixture beside the existing `turn-signal.example.json` lines, `bash scripts/check.sh`, one commit, tag `spec-v0.1.25`, push. Brief: home `data-scratch/signal-02-spec-brief.md`. Acceptance: both generated copies carry `computed`; the new fixture round-trips in both languages; every existing fixture unchanged; the tag pushed. Exit: `bash scripts/check.sh` and the tag.

- [ ] **SHARE-LINK-01: the share record's link kind and the view record** (S, spec first, inside STORE-SPEC-01's tag; home `docs/plans/external-sharing-2026-09-23.md`). `share.schema.json` gains `kind` (person, household, link), and for a link: `token` (stored hashed, never returned after creation), `expires_at`, `download_limit`, `download_count`, `revoked_at`; a `view.schema.json` record (time, file id, share id, the proxy-reported origin, never a fingerprint); fixtures in TypeScript and Python. Acceptance: a link fixture validates; a person or household share carries no token field. Exit: `bash scripts/check.sh` and the tag.

- [x] **STORE-SPEC-01: the `file` record, one record for everything a person made or sent** (landed spec-v0.1.44, 2026-09-26; S, spec first; home `docs/plans/household-storage-2026-09-23.md`). The attachment record became `spec/schemas/file.schema.json`, additive over its shape: `origin` (sent, made, exported), `kind` (image, video, audio, document, story, other), no sharing field (a share is its own pointer record, `share.schema.json`: file id, from person, to a person or "household", created_at, hlc, provenance), the blob store keyed on `sha256` so bytes exist once and a second person's identical bytes become a pointer to the first person's file, the rest as today (owner, media type, size, sha256, storage path, retention), and `provenance` restructured from a free string plus top-level `conversation_id`/`turn_id` into one object shaped by origin (`conversation_id`/`turn_id` for sent, `package_id`/`turn_id`/`job_id` for made, `requested_by_person_id`/`turn_id` for exported, a freeform `note` fallback) - a judgment call, since the design record names the fields but not the exact JSON shape; no attachment rows existed in any household yet, so the generalization was free. `turn-artifact.schema.json`'s `document` section's `attachment_id` renamed to `file_id` to match. The attachment fixture became `file.example.json` (`origin: sent`); `file.made-image.example.json` added for the acceptance criterion's image-from-a-job case (`origin: made`, `package_id`/`job_id` provenance); `share.example.json` added. Python package regenerated; both fixture sets validate. `SHARE-LINK-01`'s own line still says "inside STORE-SPEC-01's tag" - it did not land here (separate row, separate session) and needs its own tag when it does. The manifest lint's output-kind check named in this item's acceptance does not exist yet anywhere (`home`, `commons`, `catalog` all checked) - `file.kind`'s enum is ready for it, but nothing reads it yet; flagged for whoever builds that lint. `home` and `bot` pinning the new tag is explicitly out of scope here (next follow-up). Supersedes `MEDIA-RECORD-01` (folded in). Exit: `bash scripts/check.sh` and the tag.

- [x] **STORE-CAP-01 (spec half): the two storage-cap settings keys** (landed spec-v0.1.45, 2026-09-26; S, spec first; home `docs/plans/household-storage-2026-09-23.md`, "the two caps, declared once"). Three keys added to `settings/keys.json`, regenerated from `home/backend/src/settings/storageKeys.ts`'s `STORAGE_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited, per `spec/settings/README.md`): `storage.household.cap_bytes` (household, basic, default `0` - the setup wizard hasn't set one yet), `storage.person.default_cap_bytes` (household, basic, default 20 GB in bytes), `storage.person.cap_bytes` (person, advanced, default `0` - no override, falls back to the household default). Diffed against `spec-v0.1.44` to confirm additive-only (42 lines added, nothing else changed). Checked first that these are a genuinely different subsystem from `storage.critical_free_gb` (disk-space headroom) and `storage.person_quota_gb` (cloned-voice storage, its own help text says so) - no collision, no reuse. The home-side enforcement (the record API's write-time refusal, usage computed from `File` records, the reconcile health item) is `STORE-CAP-01`'s own home-repo row, not repeated here. Exit: `bash scripts/check.sh` and the tag.

- [x] **PROJECT-PKGTYPE-01 (spec half): the `project` package kind** (landed spec-v0.1.46, 2026-09-26; S, spec first; home `docs/BACKLOG.md`'s PROJECT-PKGTYPE-01, home `docs/plans/harness-turns-and-projects-2026-09-26.md`). `manifest.schema.json`'s `kind` enum gains `project`: a project-kind package's body is `plan.json` (this same file's own sibling `project.schema.json`'s `$defs/ProjectPlan`), never `recipe.json` - closing the naming collision with the older, unrelated Tier 0 `recipe.schema.json` "declarative package body" every ordinary tool package's own `recipe.json` already uses. The manifest's existing `args` field needed no new field: it's already untyped (no `$ref` into this repo's own dialect), generic enough to hold a project package's own parameter schema the same way it holds any other package's call arguments. `fixtures/records/manifest.project.example.json` (a `coloring-book` project package) and `fixtures/records/project-plan.example.json` (its own `plan.json` body: one `text` step, one `assemble` step) both validate in TypeScript (`Project.shape.plan` - no schema in this repo exports a `$defs` sub-shape as its own named TS export; checked every other multi-level schema, same convention, so none invented here either) and Python (`ProjectPlan`, already its own class - `datamodel-codegen` hoists every `$defs` entry automatically, unlike the hand-rolled TS generator). The `plan.json` fixture's `promptTemplate` placeholder is `{topic}` (single curly braces), substituted from the manifest's own `args` schema - distinct from the runner's own `{{stepId}}` double-brace step-output substitution (`home/backend/src/lib/projects/steps.ts`'s `renderTemplate()`, and the already-landed `project.example.json` fixture's own `{{story}}`), so a package's own plan body never collides with the runner's grammar. Also fixed live: `tests/ts/fixtures.test.ts`'s `ErrorEntry` import was a hardcoded four-`..` relative climb to the sibling `.github` checkout with no override, unlike `tests/py/_standards.py`'s own `MAIPAI_STANDARDS_DIR`-aware resolution - it silently failed every fixture test in the file, not just this one, under a nested worktree; resolved the same way the Python side already does, unchanged for a plain checkout. Home's own loader (`registerAllPackageProjectTypes()`), the `start_project` tool's real type enum, and removing the built-in `bedtime-story` are PROJECT-PKGTYPE-01's home-repo half, not done here. Exit: `bash scripts/check.sh` and the tag.

- [x] **NOTIFY-SHARE-01 (spec half): the two file-share settings keys** (landed spec-v0.1.47, 2026-09-27; S, spec first; home `docs/BACKLOG.md`'s NOTIFY-SHARE-01). Two keys added to `settings/keys.json`, regenerated from `home/backend/src/settings/notificationKeys.ts`'s `NOTIFICATION_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited, per `spec/settings/README.md`): `notifications.file.shared_with_you.telegram` and `notifications.file.shared_with_household.telegram` (both person scope, basic level, boolean, default `false`), mirroring `notifications.memory.updated.telegram`'s exact shape. Diffed against `spec-v0.1.46` to confirm additive-only, nothing else moved. The home-side change (`file.shared_with_you`/`file.shared_with_household` declared `configurable: true`, the actual trigger call) already landed in `NOTIFY-SHARE-01`'s home-repo commit; this is only the toggle key that lets a household turn either off. Exit: `bash scripts/check.sh` and the tag.

- [x] **NOTIFY-SHARE-02 (spec half): the muted-senders settings key** (landed spec-v0.1.48, 2026-09-27; S, spec first; home `docs/plans/people-profile-2026-09-26.md`, "the one real gap the per-type toggles can't express"). One key added to `settings/keys.json`, regenerated from `home/backend/src/settings/notificationKeys.ts`'s `NOTIFICATION_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited): `notifications.file_shared.muted_senders` (person, basic, `selector: "person"` with `range: { multiple: true }`, default `[]`) - the registry's first real multi-valued `person` selector (every prior use, the spec's own recipe fixtures, was a single id). Named for the shared feature ("file_shared"), not either `file.shared_with_*` type's own dotted id, since home's `trigger()` reads this one list for both types' dispatches to a given recipient. Diffed against `spec-v0.1.47` to confirm additive-only (one key, 18 lines added, nothing else changed). Regenerated from a scratch `commons` worktree (`commons-scratch-notify-share-02`, removed after) rather than the shared `../commons` checkout, since another session could be mid-use on it. Home's own enforcement (`trigger()`'s recipient filter, the `PersonMultiSelect` control) is `NOTIFY-SHARE-02`'s own home-repo row, not repeated here. Exit: `bash scripts/check.sh` and the tag.

- [x] **MEDIA-RECORD-01: the media record for a person's generated output** (folded into STORE-SPEC-01, 2026-09-23; S, spec first; PACKAGES.md "Uninstall, and a person's files"). The spec has `attachment` (a file a person sent) and `artifact` (a generated document version) but no record for a picture, a video, an audio clip or a story a person made through a package. Add `spec/schemas/media.schema.json`: id, owner_person_id, kind (image, video, audio, story), media_type, size, sha256, storage_path below the household data directory, retention, provenance (the package id, the turn id, the job id), created_at, hlc; the attachment record's shape generalized, one write path through the host's record API, the fixtures and the Python package regenerate, the tag bumped. Acceptance: a fixture for an image from the image job validates in TypeScript and Python; the manifest lint's output check reads this record's kinds. Exit: `bash scripts/check.sh` and the tag.

- [x] **CAP-VOCAB-01: the capability vocabulary gains the engine roles** Landed 2026-09-23 (c-99n; the tag is cut by the coordinator after the diff is read). (S, spec first; from home's `docs/plans/hardware-tiers-2026-09-23.md`, "Capabilities follow the allocation"). `spec/vocab/capabilities.json` gains `vision`, `image`, `video`, `music`, `stt` and `tts`, named as the Stack's role ids, each with a one-line description in the vocabulary's own shape; the chat role keeps mapping to the existing `gpu_llm` or `cpu_llm` and the embed role to `embeddings`, so the list stays one list; the fixtures and the Python package regenerate; the spec tag is bumped and home and bot pin it. Acceptance: a manifest fixture with `requires: ["image"]` validates; the round-trip fixtures pass in TypeScript and Python. Exit: `bash scripts/check.sh` and the tag.

- [ ] **BODY-VOCAB-01: the capability vocabulary gains the body ids**
  (S, spec first, 2026-09-27; bot's RM-00, from
  `bot/docs/dev/design-reachy-mini-2026-09-27.md` section 2, a body
  profile's declaration). `spec/vocab/capabilities.json` gains the ids
  a robot body declares on its `Device.capabilities` row, each with a
  one-line description in the vocabulary's own shape: `head_6dof`,
  `head_pan_tilt`, `roll`, `antennas`, `body_yaw`, `eyes`, `mouth`,
  `light_ring`, `doa`, `state_feed`, `encoders`, `touch`, `distance`,
  `imu`, `battery_readout`, `physical_mute`, `camera_shutter`,
  `moves_recorded`, and the speech placement pair `speech_pod` and
  `speech_robot`; two device fixtures, a Reachy Mini row (`kind:
  robot`, `head_6dof`, `roll`, `antennas`, `body_yaw`, `camera`, `mic`,
  `speaker`, `doa`, `state_feed`, `imu`, `moves_recorded`,
  `speech_pod`) and a MaiPai-build row (`head_pan_tilt`, `eyes`,
  `mouth`, `light_ring`, `encoders`, `touch`, `distance`, `imu`,
  `battery_readout`, `speech_robot`, plus the existing `camera`, `mic`,
  `speaker`, `motors`); the Python package regenerates; the tag is
  bumped and `bot` pins it. Mirror: CAP-VOCAB-01 above. Acceptance:
  both fixtures validate in TypeScript and Python; every existing
  fixture unchanged. Out of scope: any renderer, the robot's 20-item
  grant list. Exit: `bash scripts/check.sh` and the tag.
- [ ] **S** A spec tag's settings registry is a superset of its parent
  tag's: the cut (`commons` `check.sh`, or a `spec/scripts/cut-tag.sh`
  if none exists) diffs `spec/settings/keys.json` against the previous
  `spec-v*` tag and refuses when any key disappears; found 2026-09-20
  when two Home worktrees each regenerated the file from their own
  aggregate and `spec-v0.1.4` silently dropped `engines.stack.url`
  (fixed same day as `spec-v0.1.5`, no pin ever shipped against the
  broken tag). The deeper cause, for a later design pass: the registry
  is generated from Home's aggregate (`CORE_SETTINGS_KEYS` and its
  imports) - Home is the source, the spec the mirror, which inverts
  the org's spec-first rule for shared records ("Shared record changes
  go through the spec first," org `CLAUDE.md`). The real fix is the
  declaration living in the spec and Home generating from it, not the
  reverse.
- [x] **M** `spec-v0.1.0`: move `home/spec` whole (`pyproject.toml`, the
  Python package, `gen/`, `schemas.resolved/`, fixtures, tests, `uv.lock`)
  into `spec/` here. Acceptance: `bun test` and
  `uv run pytest tests/py -q` green inside `shared/check.sh`, tag
  `spec-v0.1.0` pushed. Exit check: `bash scripts/check.sh`. RF-05b
  folded into the same tag: the Stack's wire shapes moved read-only from
  `stack/backend/src/spec/` (`origin/main`) into `spec/stack/`, their
  schemas and fixtures into `spec/schemas/` and `spec/fixtures/`. One
  test left behind on purpose (`spec/tests/ts/package-bronze.test.ts` -
  reads a product's bundled packages directory, structurally belongs in
  `home`, not a product-agnostic library); tracked in the next item
  below, not a new one. `docs/dev.md`, "Workspace status", has the full
  writeup. Bumped to `spec-v0.1.1` same day: stale `home/spec` references
  the move left behind ($id URLs, `ui/`'s own pin, one `ui/` test) and a
  tried-and-reverted attempt to drop the Stack's hand-written `stack/ts/`
  mirrors in favor of codegen - see `docs/dev.md`'s `spec-v0.1.1` entry.
- [x] **S** Home pins `spec` and removes the workspace, moving its
  `check.sh` "spec: standards gen/ presence" block here, and moving
  `home/spec/tests/ts/package-bronze.test.ts` into `home`'s own test
  suite (imports `PackageManifest`/`lintSpeechTemplate` from
  `@maipai/spec` instead of a relative `gen/ts`/`voice/ts` path - left
  behind by the `spec-v0.1.0` move above, still sitting unchanged at
  that path today). Exit check: `home/scripts/check.sh`. Landed
  `home` commit `afd2abe0` (`SPEC_PIN` at `0.1.1`); a second sweep
  (`join(import.meta.dir, "..", "..", "..", "spec", "llm", ...)`
  path-segment reads the first grep missed) found and fixed four more
  broken corpus loaders, factored into one `backend/src/lib/specDir.ts`
  reused by seven call sites - `home/docs/dev.md`'s own entry has the
  full account.
- [x] **S** Catalog deletes `catalog/schema/` and
  `scripts/refresh-schema.sh`, pins `@maipai/spec`, and its lint reads
  the resolved schemas from the pinned package. Exit check:
  `catalog/scripts/check.sh`. Landed `catalog` commit `e554bf7`
  (`SPEC_PIN` at `0.1.1`, CI gained a `getmaipai/shared` checkout at
  `spec-v0.1.1` - `catalog/docs/dev.md`'s own entry has the full
  account, including a code-review-caught CI path bug fixed and
  verified locally before landing).
- [x] **S** `spec-v0.1.2`: adds the `ui.look` settings key ("Two looks,
  one setting," `ui-v0.4.0`, HOME-UI-02c) - regenerated
  `settings/keys.json` from `home/backend/src/settings/uiKeys.ts` via
  `bun run gen:settings`, additive only (diffed against the previous
  tag to confirm). Exit check: `bash scripts/check.sh`.
- [x] **M** `spec-v0.1.7`: the `Artifact` record (the chat program's
  generated-document experience, `artifact.schema.json`) - one
  immutable version per row, chained by `parent_version` (conversation-
  turn's `parent_turn_id` convention, not `TurnArtifact`'s bare
  `revision` counter, since the wire needs a version's own id -
  rationale in the schema's own description). `records/ts/validate.ts`
  and `records/py/validate.py` gain `validateArtifact`/`validate_artifact`
  (self-chain and version/parent_version pairing), with cases added to
  `fixtures/validation/cross-field.json` proving both languages agree.
  Two fixtures (`artifact.v1`, `artifact.v2`) prove the chain round-trips.
  Exit check: `bash scripts/check.sh`.
- [x] **S** `spec-v0.1.43` (via a `0.1.39`→`0.1.41` mis-cut/rebase,
  folded in): `Person` gains `avatar_file_id` (`string | null`, a `file`
  record standing in for `avatar_seed` when set), `bio` (`string | null`,
  max ~160 chars), and `accent` (`string | null`, enum
  blue/violet/teal/orange/pink/red) - `home/docs/plans/
  people-profile-2026-09-26.md`'s `PEOPLE-SPEC-01`. Fixture and
  round-trip test added in both languages. This entry backfills the
  tag's own record, never written at the time.

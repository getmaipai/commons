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

- [ ] **CALM-TOKENS-00** (docs): record elevation, `--page`, and the
  attention/info/problem tint families in `ui/docs/spec.md`. Supersede
  section 1's panel shadow and radius values and `--shadow-panel`; name
  kit layout wrappers, kit data-slot rules and kit primitives as readers,
  never Home page `className` values. Record the non-adopted Row-Bot
  canvas/tinted tiles/motion/washes/blur, the optional avatar arc gap,
  dropped dotted canvas, computed 4.5:1 text and 3:1 boundary floors,
  reduced-motion authority, and the untouched child targets and 16px
  body floor.
- [ ] **CALM-TOKENS-01**: add study 3.2's elevation scale and contrast-
  safe `--page`; owner-confirmed 12px base radius and 10px controls
  (2026-10-06). Restore the pinned template's `--radius` line and note
  it in `dashboard-upstream.md`; make no other `globals.css` or
  `elements/*` edits. The layout wrapper paints `--page`, Card reads
  `--elevation-1`, popovers read `--elevation-3`. Tests compute muted
  foreground contrast on `--page` and `--sidebar` in both themes and
  assert the Tailwind `rounded-xl` mapping to 16px. Keep
  `--elevation-accent` available, but omit a primary-button shadow until
  the kit has a stable per-view primary-action slot.
- [ ] **CALM-TOKENS-02**: define `--tint-attention`,
  `--tint-attention-fg`, `--tint-attention-border`, `--tint-info`, and
  `--tint-problem` for both themes. A `tokens.css` data-slot rule styles
  the rendered `[data-slot="tool-fallback-approval"]`; do not edit
  Elements. Tests compute the three named text pairs at 4.5:1 and button
  boundaries at 3:1 in both themes. Success has no tint; dark values
  come from test measurements.

- [ ] **CHAT-STREAMDOWN-01: Streamdown inside the kit's `MarkdownText`** (S; approved 2026-10-05 by `data-scratch/architect/CHAT-STREAMDOWN-01.verdict`). Use assistant-ui's documented `StreamdownTextPrimitive` migration while keeping the export, component overrides, lazy KaTeX, Shiki and beautiful-mermaid. Acceptance: native 150 ms word fade-in for running assistant text; reduced-motion and non-chat consumers remain static; raw HTML stays literal text; links retain today's attributes and no confirmation; citations, copy, code, tables, math and Mermaid pass the kit/Home integration tests. Exact pins: `streamdown` 2.7.0 and `@assistant-ui/react-streamdown` 0.3.18. Exit: both kit and Home gates green and browser frame audit accepted.

- [ ] **CITE-KIT-01: the kit's sources and inline-citation parts** (M, 2026-10-02; home `docs/design/RULES.md` chat rules 7 and 9, home `THIN-4B`; fixes commons #8 and #7). A message can place a numbered citation marker (`[n]`) inside its text, opening the matching source, and the sources list links out (`rel="noopener"`) with rows that no longer collide, built from the shipped assistant-ui `Sources` and inline-citation parts, not a hand-built `SourcesCard`. Files: `ui/src/blocks/chat/` (`SourcesCard` and its replacement), the kit's `markdown-text` part. Mirror: the shipped assistant-ui Element as vendored in the kit, restyled by tokens only. Acceptance: a story and a test where "[2]" links to source 2, an unmatched "[n]" stays plain text, rows are unique by index, and a `ui` tag is cut. Out of scope: the mapper that turns a model's `[n]` into parts (home `THIN-4B`, the named gap). Exit: `bash scripts/check.sh` in `commons`.

- [x] **S** `ui-v0.5.81`: `Header` and `FullLayout` gain an optional `statusIndicator` slot (STATUS-A1).
- [x] **S** `ui-v0.5.82`: add attributed Kibo `Status` and Tremor `UptimeStrip` snapshots (STATUS-A1b).
- [x] **S** `ui-v0.5.83`: make `UptimeStrip` non-interactive with one labelled image summary (STATUS-C3c).

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

- [x] **REMOTE-STACK-SPEC-01: the engine computer's settings, status component, link state and error codes** (S, Sonnet; P1; first commons item). Objective: declare once what Home and its pages read. Files: `spec/settings/keys.json` (`engines.stack.where` choice `this_computer|another_computer` default `this_computer`; `engines.stack.remote.host` text; `engines.stack.remote.ssh_port` number 22; `engines.stack.remote.local_port` number 8771 expert; `engines.stack.remote.allow_tailnet` toggle default off, label "Reach the engine computer when away from home", shown only while `where` is `another_computer`; all household scope, admin only, `lives_in: household.ai`; new help text for `engines.stack.url` per design section 9.3), `spec/schemas/status-component.schema.json` (add `engine_computer`), new `spec/stack/link-state.schema.json` (`state`: connecting|ready|degraded|reconnecting|offline; `reason`; `path`: home|tailnet; `rtt_ms`; `last_ok_at`; `contract`), `spec/errors/errors.json` (`link_refused`, `link_timeout`, `link_dns`, `link_auth_refused`, `link_host_key_changed`, `link_needs_update`, `link_not_paired`, `link_outside_home`, `link_stack_down`, each with a plain-words message). Mirror: the `engines.stack.url` entry and its CHANGELOG line. Reuse check: existing schema and generator; nothing hand-built. Acceptance: `gen/` regenerated, spec tests pass, a new tag cut with the package.json version bumped to match. Out of scope: Home use. Exit: the commons gate for `spec`. (landed 2026-10-07; 1b6ac87, 26d16c9, 6e4d237)
- [x] **REMOTE-STACK-CORE-01: one home-network address test, with the tailnet tier behind a flag** (S, Sonnet; P1). Objective: `isHouseholdNetworkHost(host, { allowTailnet = false })` in `@maipai/core`: always private IPv4, link-local, IPv6 ULA, `.local`, `.home.arpa`; with `allowTailnet` also `100.64.0.0/10`, `fd7a:115c:a1e0::/48` and `.ts.net` names that resolve into them. Moved from the Stack's cloned-voice check so Home and the Stack share one definition. Files: `core/src/net.ts` (new), the Stack's voice URL check (`stack/docs/dev.md` near 1612 names it), then the Stack's pin bump in a follow-up commit. Mirror: an existing pure helper in `core`. Reuse check: Node's `net.isIP` and `BlockList`; no hand-written range parsing. Acceptance: table tests run once per flag state: flag off refuses `100.64.0.5`, `fd7a:115c:a1e0::5` and a `.ts.net` name; flag on accepts them; both states accept every home range and a `.home.arpa` name and refuse `192.0.2.10` (documentation range) and a public name. The default is false and a test pins it. Out of scope: DNS resolution (Home resolves, then tests); any use of Tailscale as authentication. Exit: the commons gate; the Stack's `bash scripts/check.sh` after its pin bump. (landed 2026-10-07; 72e9e87)

- [x] **MOVE-CARRY-02: `motion` and `put_down_count` on `robot.state`, spec slice** (landed spec-v0.1.75, 2026-10-05; S, spec first). Two optional fields on `spec/schemas/robot-state.schema.json`: `motion` (`resting` or `held`, null when the body cannot tell, absent when the producer does not report it) and `put_down_count` (non-negative integer). `activity` gains no value; nothing removed or repurposed. Fixtures `robot-state.held.example.json` and `robot-state.resting.example.json` (the existing minimal fixture covers the absent case), generated TS and Python models regenerated, schema tests in both languages. Not done here: Home's storage and card, or the bot's reporting. Exit: `bash scripts/check.sh` and the tag `spec-v0.1.75`.

- [x] **SETTINGS-ROBOT-01: the household and person keys for the robot's behaviour** (landed spec-v0.1.77, 2026-10-05; S, spec first; approved Reachy design v2 section 9.2). Added the 25 household/person controls and `robot.offlan.tailnet` to `spec/settings/keys.json`, plus the six missing hub-honoured device keys (`robot.camera.watch_level`, `robot.follow_up.seconds`, `robot.idle.level`, `robot.barge_in.open_mic`, `robot.gestures.enabled`, `robot.initiative.allowed_here`) delivered as `settings_changed`; all declarations use the existing settings-key schema only. Child and teen policy stays in Home's band logic. The tailnet opt-in defaults off; live view's person selector is adults only; vision watch defaults to `presence` so Home can opt in according to enrolment and band rules. Added a settings fixture and registry coverage. Filed the EYES-07 follow-up: retire `robot.indicator.night_from` and `robot.indicator.night_to` now household quiet hours exist.

- [x] **EMO-MAP-01: the emotion label vocabulary and the label-to-clip map** (landed spec-v0.1.77, 2026-10-05; S, spec first; approved Reachy design v2 section 3.4). Added the closed twelve-label map with one primitive for every reply, optional candidate clips resolved only through the optional PKG-MOVES-01 manifest fixture, and child-band overrides. Added the canonical labels to `TurnSignal.expressed_emotion` while preserving prior wire values through explicit aliases, and added optional `react_move` to `ReplyPlan`; primitives include `thinking`, `offer`, and `shake`. Tests check every label's primitive and clip references, with the primitive always available when the pack is absent.


- [ ] **SAMPLING-SPEC-01: per-model sampling fields on the model catalog record** (S, spec first, 2026-10-02; home `docs/design/RULES.md` chat rule 3, home `THIN-6A`). `spec/schemas/model-capabilities.schema.json` gains optional sampling fields (temperature, top_p, top_k, min_p, repetition controls, and the like, each optional so a model with none sends none) and a `sampling_source` string naming where the values came from (the model card, a measured run, the engine default); also marks the retired `turn_budget` fields (`always_search`, `query_writer`, `model_transitions`, `rounds`, `tools_offered`) deprecated and ignored, additive only (home `THIN-2B`). Mirror: SIZER-SPEC-01 (fixtures in TypeScript and Python, a round-trip test in each, generated models). Acceptance: valid and invalid fixtures in both languages, a CHANGELOG entry, a spec tag, and the Stack's and Home's pins can move to it. Out of scope: choosing which model gets which values (home `THIN-6A`). Exit: `bash scripts/check.sh` in `commons`.

- [x] **FITPLAN-SPEC-01: the fit plan can carry the model file's size** (landed spec-v0.1.68, 2026-09-30; S, spec first; from stack STACK-SIZE-17). An optional model_file_bytes on StackFitPlan: a hard fact the Stack knows even when the figures are unknown.

- [x] **STACK16-SPEC-01: four per-role Stack switches** (landed spec-v0.1.67, 2026-09-30; S, spec first; from home STACK16-A). `engines.stack.use_chat`, `engines.stack.use_embeddings`, `engines.stack.use_stt` and `engines.stack.use_tts`, household booleans defaulting to false, so a Stack can run beside Home for sizing, health and updates without taking over any model call.

- [x] **PRINT-SPEC-01: BiometricPrint, the shared face/voice reference-print record** (landed spec-v0.1.54, 2026-09-28; S, spec first; bot `docs/dev/face-voice-recognition-design-2026-09-28.md` and `docs/dev/design-face-recognition-models-2026-09-28.md`, FACE-01's own blocker). `spec/schemas/biometric-print.schema.json`: one accepted enrollment sample's reference embedding - person_id, modality (face or voice - separate records, fused once in the household runtime's turn engine, never here), model_id and model_sha256 (so a matcher refuses a print made by a different model outright rather than silently comparing two incompatible embedding spaces), dim and embedding (one accepted sample, not an array - a coverage-grid enrollment produces several print records per person), consent_at and consented_by_person_id (both required, non-nullable - enrollment is never automatic or passive; a child's print is consented by an adult, never the child), the usual timestamps, a deleted_at tombstone, an hlc. `validate_biometric_print`/`validateBiometricPrint` (both languages) check embedding's length against dim, the one thing JSON Schema can't express; wired into the shared cross-language conformance suite (4 new cases, one that only fails through the validate function, not schema validation alone). Three fixtures: an adult's own face and voice prints, a child's face print consented by a different, adult person_id. A medium-effort review (8 finder angles) came back clean. Not done here, each its own item elsewhere: the hub-owned enrollment UI and encrypted storage (`home`), real model construction and the CPU measurement (`bot`, its own FACE-01 entry). Exit: `bash scripts/check.sh` and the tag.

- [x] **ROBOT-STATE-SPEC-01: the hub-local `robot.state` frame** (landed spec-v0.1.55, 2026-09-29; S, spec first; home `docs/dev.md` and bot `docs/dev.md`, “Robot device state,” resolved by design-resolver 2026-09-29). `spec/schemas/robot-state.schema.json`: the value object keyed externally by device_id for the Devices-page card, with activity (starting/idle/listening/thinking/speaking), muted, tracking, on_battery, battery_level, and daemon_version; no record identity, timestamps, or hlc because this projection is hub-local and never synced. The core three fields are required; the battery and daemon fields may be omitted by producers that do not report them yet, while explicit null records unknown/unavailable state. Reachy Mini's on_battery is null per design section 7. Six fixtures cover every activity and all battery/version fields null. JSON Schema validation alone is sufficient; no cross-field validator was needed. Not done here: Home's `device_states` table and Devices-page card (`home`), or the robot's state reporting (`bot`). Exit: `bash scripts/check.sh` and the tag.

- [x] **DATA-LOCATION-00a: the class declaration, the location record and the folder marker** (landed spec-v0.1.58, 2026-09-29; S, spec first; home `docs/dev.md`, "DATA-LOCATION", sections (a) and (e)). `spec/schemas/data-class.schema.json`, `data-location.schema.json` (`schema: 2`) and `data-folder.schema.json`, with generated TypeScript and Python models, 76 valid and invalid fixtures, and a round-trip test in each language. The choices made where the record left one are in `spec/README.md`. Not done here: the readers, writers and path resolution in `core` (DATA-LOCATION-00b), disk facts (00d), verified copy (00e), and each product's class list. Exit: `bash scripts/check.sh` and the tag.

- [x] **SIZER-SPEC-01: the shared shapes for fit planning** (landed spec-v0.1.59, 2026-09-30, commits 43dd3fd to 4b317e7; M, spec first; stack `docs/dev.md`, "Fit planning versus admission", and stack STACK-SIZE-03, which waits on this). Objective: the shapes the Stack's planner and Home's "what your computer can run" page both read, declared once. Pointers: `spec/schemas/model-capabilities.schema.json` (the `engine` enum near line 22, whose description still says only llama-server is wired, and `transformer_gguf_sizing`, which already carries layers, KV heads and head dimension), `spec/settings/keys.json`, the fixtures under `spec/fixtures/`. Mirror `health-item.schema.json` for a wire record and an existing fixture for the round-trip. Four parts: (1) a `kv_cache_type` definition (`f16`, `q8_0`, `q4_0`), used wherever a size is quoted; (2) a `footprint` definition on the model record, as `footprints[]`: bytes, context tokens, `kv_cache_type`, source (`measured`, `dry-run` or `estimated`), the tool and its version, a date, and a sanitized hardware line (never a hostname); (3) the engine enum gains `mlx-serve`, `sherpa-onnx-node` and `pocket-tts`; (4) a new `stack-fit-plan.schema.json`: per-role lines (role, choice, peak bytes, source), total, cap and margin bytes, one entry per execution path (`unified`, `gpu`, `multi-gpu`, `cpu-offload`, `cpu`) each with fits, a verdict and the shortfall in bytes, an overall verdict (`yes`, `slow`, `no`, `unknown`), the named bottleneck (`memory`, `disk`, `context`, `unknown`), and for every figure a low, a high, a source and a date. `slow` means the cpu-offload path; `unknown` is a first-class answer, never a default. Acceptance: schemas and fixtures validate in both the TypeScript and Python packages; one fixture per verdict; the KV rows from stack `docs/dev.md` (KV within 0.4 percent of the server's own buffer on the measured runs) become `estimated` footprint fixtures with the tool and version. The KV cache type as a Stack-declared setting is checked against `chat.kv_cache_override` (Home-only today, `honoured_by: ["home"]`) and either extended or noted as a follow-up in this item, not left unrecorded. Outcome: `chat.kv_cache_override` takes `auto`, `quantized` or `full`, is honoured only by Home (`spec/settings/keys.json:186-205`, read at Home's `llmSupervisor.ts:382`), and the Stack reads nothing for it; the person-level setting and the technical `kv_cache_type` are two vocabularies, and how they map is undecided (SIZER-SPEC-02). One note for a later cleanup: the footprint date is named `measured_at` even on an estimate. Out of scope: any Stack or Home implementation, the planner's arithmetic. The coordinator cuts the `spec-v0.1.N` tag after reading the diff. Exit: the spec workspace's `scripts/check.sh` scope, plus the tag.

- [x] **SIZER-SPEC-02: how the person-level KV setting maps to the engine's KV cache type** (S, design first, then spec; 2026-09-30; from SIZER-SPEC-01's outcome and stack STACK-SIZE-04). Objective: one declared rule from `chat.kv_cache_override` (`auto`, `quantized`, `full`) to `kv_cache_type` (`f16`, `q8_0`, `q4_0`) per engine, so the Stack can honour the setting and its planner sizes against what will really run. Design questions (the coordinator or a design pass decides, no code first): does `quantized` mean `q8_0` or `q4_0`; what does `auto` pick and from what (the tier, the free memory); does mlx-serve's own `--kv-quant` (off, 4, 8) take the same rule; is `honoured_by` widened to include the Stack or does the Stack read it through Home. Acceptance: the rule written once in stack `docs/dev.md` under "Fit planning versus admission" and mirrored by the settings key's `help` and `honoured_by` in one spec change. Out of scope: any implementation. Exit: the design record, then a `spec` item. Decided 2026-09-30: full means f16; quantized means q8_0; auto means the Stack's platform default (q8_0 on macOS, f16 elsewhere); the fit plan defaults to that same platform default; for MLX, quantized means `--kv-quant 8` (stack STACK-SIZE-11) and auto and full leave it off. Landed in the Stack as `kvCacheTypeFor` and `defaultKvCacheType` (STACK-KV-01). The person-level setting is read by the Stack when Home moves onto it (STACK-16); its `honoured_by` widens to include the stack in one spec change then.

- [x] **SIZER-SPEC-03: the role vocabulary gains judge, rerank and music** (landed spec-v0.1.60, 2026-09-30; S, spec first; from stack STACK-SIZE-08). The `role` enum in `model-capabilities.schema.json` lacked three of the Stack's role ids, so a fit plan could not list a loaded judge, rerank or music role; it now names all thirteen Stack roles plus `turn-signal`. The Stack drops its filter after pinning this tag.

- [ ] **SIGNAL-SPEC-01: the `computed` target on the turn signal, cut as spec-v0.1.25** **Dropped 2026-10-02: retired by docs/design/RULES.md chat rule 1.** Do not build; the text below is kept as history. (S, Sonnet, spec first, 2026-09-23; SIGNAL-02's spec half, written into the working tree by the design session: `spec/schemas/turn-signal.schema.json` (`target` enum and description, the clause `subject` union), `spec/fixtures/records/turn-signal.computed.example.json`, six rows in `spec/llm/tool-call-corpus.json`, the CHANGELOG entry and the version bump). Left to do, mechanical: `bun run gen:ts` and `bash scripts/gen-py.sh` in `spec/` (the generated `gen/ts/turn-signal.ts` and `gen/py/turn_signal_schema.py` gain the value), one test line each in `spec/tests/ts/fixtures.test.ts` and `spec/tests/py/test_fixtures.py` for the new fixture beside the existing `turn-signal.example.json` lines, `bash scripts/check.sh`, one commit, tag `spec-v0.1.25`, push. Brief: home `data-scratch/signal-02-spec-brief.md`. Acceptance: both generated copies carry `computed`; the new fixture round-trips in both languages; every existing fixture unchanged; the tag pushed. Exit: `bash scripts/check.sh` and the tag.

- [ ] **SHARE-LINK-01: the share record's link kind and the view record** (S, spec first, inside STORE-SPEC-01's tag; home `docs/plans/external-sharing-2026-09-23.md`). `share.schema.json` gains `kind` (person, household, link), and for a link: `token` (stored hashed, never returned after creation), `expires_at`, `download_limit`, `download_count`, `revoked_at`; a `view.schema.json` record (time, file id, share id, the proxy-reported origin, never a fingerprint); fixtures in TypeScript and Python. Acceptance: a link fixture validates; a person or household share carries no token field. Exit: `bash scripts/check.sh` and the tag.

- [x] **STORE-SPEC-01: the `file` record, one record for everything a person made or sent** (landed spec-v0.1.44, 2026-09-26; S, spec first; home `docs/plans/household-storage-2026-09-23.md`). The attachment record became `spec/schemas/file.schema.json`, additive over its shape: `origin` (sent, made, exported), `kind` (image, video, audio, document, story, other), no sharing field (a share is its own pointer record, `share.schema.json`: file id, from person, to a person or "household", created_at, hlc, provenance), the blob store keyed on `sha256` so bytes exist once and a second person's identical bytes become a pointer to the first person's file, the rest as today (owner, media type, size, sha256, storage path, retention), and `provenance` restructured from a free string plus top-level `conversation_id`/`turn_id` into one object shaped by origin (`conversation_id`/`turn_id` for sent, `package_id`/`turn_id`/`job_id` for made, `requested_by_person_id`/`turn_id` for exported, a freeform `note` fallback) - a judgment call, since the design record names the fields but not the exact JSON shape; no attachment rows existed in any household yet, so the generalization was free. `turn-artifact.schema.json`'s `document` section's `attachment_id` renamed to `file_id` to match. The attachment fixture became `file.example.json` (`origin: sent`); `file.made-image.example.json` added for the acceptance criterion's image-from-a-job case (`origin: made`, `package_id`/`job_id` provenance); `share.example.json` added. Python package regenerated; both fixture sets validate. `SHARE-LINK-01`'s own line still says "inside STORE-SPEC-01's tag" - it did not land here (separate row, separate session) and needs its own tag when it does. The manifest lint's output-kind check named in this item's acceptance does not exist yet anywhere (`home`, `commons`, `catalog` all checked) - `file.kind`'s enum is ready for it, but nothing reads it yet; flagged for whoever builds that lint. `home` and `bot` pinning the new tag is explicitly out of scope here (next follow-up). Supersedes `MEDIA-RECORD-01` (folded in). Exit: `bash scripts/check.sh` and the tag.

- [x] **STORE-CAP-01 (spec half): the two storage-cap settings keys** (landed spec-v0.1.45, 2026-09-26; S, spec first; home `docs/plans/household-storage-2026-09-23.md`, "the two caps, declared once"). Three keys added to `settings/keys.json`, regenerated from `home/backend/src/settings/storageKeys.ts`'s `STORAGE_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited, per `spec/settings/README.md`): `storage.household.cap_bytes` (household, basic, default `0` - the setup wizard hasn't set one yet), `storage.person.default_cap_bytes` (household, basic, default 20 GB in bytes), `storage.person.cap_bytes` (person, advanced, default `0` - no override, falls back to the household default). Diffed against `spec-v0.1.44` to confirm additive-only (42 lines added, nothing else changed). Checked first that these are a genuinely different subsystem from `storage.critical_free_gb` (disk-space headroom) and `storage.person_quota_gb` (cloned-voice storage, its own help text says so) - no collision, no reuse. The home-side enforcement (the record API's write-time refusal, usage computed from `File` records, the reconcile health item) is `STORE-CAP-01`'s own home-repo row, not repeated here. Exit: `bash scripts/check.sh` and the tag.

- [x] **PROJECT-PKGTYPE-01 (spec half): the `project` package kind** (landed spec-v0.1.46, 2026-09-26; S, spec first; home `docs/BACKLOG.md`'s PROJECT-PKGTYPE-01, home `docs/plans/harness-turns-and-projects-2026-09-26.md`). `manifest.schema.json`'s `kind` enum gains `project`: a project-kind package's body is `plan.json` (this same file's own sibling `project.schema.json`'s `$defs/ProjectPlan`), never `recipe.json` - closing the naming collision with the older, unrelated Tier 0 `recipe.schema.json` "declarative package body" every ordinary tool package's own `recipe.json` already uses. The manifest's existing `args` field needed no new field: it's already untyped (no `$ref` into this repo's own dialect), generic enough to hold a project package's own parameter schema the same way it holds any other package's call arguments. `fixtures/records/manifest.project.example.json` (a `coloring-book` project package) and `fixtures/records/project-plan.example.json` (its own `plan.json` body: one `text` step, one `assemble` step) both validate in TypeScript (`Project.shape.plan` - no schema in this repo exports a `$defs` sub-shape as its own named TS export; checked every other multi-level schema, same convention, so none invented here either) and Python (`ProjectPlan`, already its own class - `datamodel-codegen` hoists every `$defs` entry automatically, unlike the hand-rolled TS generator). The `plan.json` fixture's `promptTemplate` placeholder is `{topic}` (single curly braces), substituted from the manifest's own `args` schema - distinct from the runner's own `{{stepId}}` double-brace step-output substitution (`home/backend/src/lib/projects/steps.ts`'s `renderTemplate()`, and the already-landed `project.example.json` fixture's own `{{story}}`), so a package's own plan body never collides with the runner's grammar. Also fixed live: `tests/ts/fixtures.test.ts`'s `ErrorEntry` import was a hardcoded four-`..` relative climb to the sibling `.github` checkout with no override, unlike `tests/py/_standards.py`'s own `MAIPAI_STANDARDS_DIR`-aware resolution - it silently failed every fixture test in the file, not just this one, under a nested worktree; resolved the same way the Python side already does, unchanged for a plain checkout. Home's own loader (`registerAllPackageProjectTypes()`), the `start_project` tool's real type enum, and removing the built-in `bedtime-story` are PROJECT-PKGTYPE-01's home-repo half, not done here. Exit: `bash scripts/check.sh` and the tag.

- [x] **NOTIFY-SHARE-01 (spec half): the two file-share settings keys** (landed spec-v0.1.47, 2026-09-27; S, spec first; home `docs/BACKLOG.md`'s NOTIFY-SHARE-01). Two keys added to `settings/keys.json`, regenerated from `home/backend/src/settings/notificationKeys.ts`'s `NOTIFICATION_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited, per `spec/settings/README.md`): `notifications.file.shared_with_you.telegram` and `notifications.file.shared_with_household.telegram` (both person scope, basic level, boolean, default `false`), mirroring `notifications.memory.updated.telegram`'s exact shape. Diffed against `spec-v0.1.46` to confirm additive-only, nothing else moved. The home-side change (`file.shared_with_you`/`file.shared_with_household` declared `configurable: true`, the actual trigger call) already landed in `NOTIFY-SHARE-01`'s home-repo commit; this is only the toggle key that lets a household turn either off. Exit: `bash scripts/check.sh` and the tag.

- [x] **NOTIFY-SHARE-02 (spec half): the muted-senders settings key** (landed spec-v0.1.48, 2026-09-27; S, spec first; home `docs/plans/people-profile-2026-09-26.md`, "the one real gap the per-type toggles can't express"). One key added to `settings/keys.json`, regenerated from `home/backend/src/settings/notificationKeys.ts`'s `NOTIFICATION_SETTINGS_KEYS` via `bun run gen:settings` (never hand-edited): `notifications.file_shared.muted_senders` (person, basic, `selector: "person"` with `range: { multiple: true }`, default `[]`) - the registry's first real multi-valued `person` selector (every prior use, the spec's own recipe fixtures, was a single id). Named for the shared feature ("file_shared"), not either `file.shared_with_*` type's own dotted id, since home's `trigger()` reads this one list for both types' dispatches to a given recipient. Diffed against `spec-v0.1.47` to confirm additive-only (one key, 18 lines added, nothing else changed). Regenerated from a scratch `commons` worktree (`commons-scratch-notify-share-02`, removed after) rather than the shared `../commons` checkout, since another session could be mid-use on it. Home's own enforcement (`trigger()`'s recipient filter, the `PersonMultiSelect` control) is `NOTIFY-SHARE-02`'s own home-repo row, not repeated here. Exit: `bash scripts/check.sh` and the tag.

- [x] **MEDIA-RECORD-01: the media record for a person's generated output** (folded into STORE-SPEC-01, 2026-09-23; S, spec first; PACKAGES.md "Uninstall, and a person's files"). The spec has `attachment` (a file a person sent) and `artifact` (a generated document version) but no record for a picture, a video, an audio clip or a story a person made through a package. Add `spec/schemas/media.schema.json`: id, owner_person_id, kind (image, video, audio, story), media_type, size, sha256, storage_path below the household data directory, retention, provenance (the package id, the turn id, the job id), created_at, hlc; the attachment record's shape generalized, one write path through the host's record API, the fixtures and the Python package regenerate, the tag bumped. Acceptance: a fixture for an image from the image job validates in TypeScript and Python; the manifest lint's output check reads this record's kinds. Exit: `bash scripts/check.sh` and the tag.

- [x] **CAP-VOCAB-01: the capability vocabulary gains the engine roles** Landed 2026-09-23 (c-99n; the tag is cut by the coordinator after the diff is read). (S, spec first; from home's `docs/plans/hardware-tiers-2026-09-23.md`, "Capabilities follow the allocation"). `spec/vocab/capabilities.json` gains `vision`, `image`, `video`, `music`, `stt` and `tts`, named as the Stack's role ids, each with a one-line description in the vocabulary's own shape; the chat role keeps mapping to the existing `gpu_llm` or `cpu_llm` and the embed role to `embeddings`, so the list stays one list; the fixtures and the Python package regenerate; the spec tag is bumped and home and bot pin it. Acceptance: a manifest fixture with `requires: ["image"]` validates; the round-trip fixtures pass in TypeScript and Python. Exit: `bash scripts/check.sh` and the tag.

- [ ] **BODY-VOCAB-01: the capability vocabulary gains the body ids** (S, spec first; amended 2026-10-05 for Reachy design v2). `eyes` already exists in `capabilities.json` (spec-v0.1.74) and is reused, not re-added; add `gestures` (a hand-gesture vocabulary the body can produce as observations) and `sound_events` (an on-body audio tagger; vocabulary only, the feature stays off and later per OWNER-ANSWERS 5); the Reachy Mini device fixture declares `head_6dof, roll, antennas, body_yaw, doa, state_feed, imu, camera, mic, speaker, speech_pod, moves_recorded` and `eyes` only in a second fixture that models the Eyes fitted. Acceptance: both fixtures validate in TypeScript and Python; the tag is bumped; home pins it; bot records the tag in AGENTS.md (no Python pin yet). Exit: `bash scripts/check.sh` and the tag.

- [ ] **SPEC-ROBOT-01: the hub-to-robot command, the offer, the alarm, the asset manifest** (S, spec first, 2026-10-05; `home/data-scratch/research/reachy-design-v2/DESIGN-V2.md` section 10.3). Adds `spec/schemas/device-command.schema.json` (`id`, `kind` enum: `mute`, `unmute`, `capture_request`, `alarm`, `notify`, `notify_gesture`, `offer`, `play_move`, `settings_changed`, `time`, `live_view_start`, `live_view_stop`, `asset_changed`; `payload` by kind; `issued_at`; `expires_at`; `hlc`), `spec/schemas/robot-offer.schema.json` (`id`, `person_id`, `tier` 1 to 3, `text`, `expires_at`, `provenance`, `hlc`), the `safety.alarm` notification type in the notifications fixture (`level: immediate`, non-configurable, audience household, actions `acknowledge`, `quiet_here`, `false_alarm`), `spec/schemas/robot-asset-manifest.schema.json` (`id`, `file`, `sha256`, `bytes`, `licence`, `source_url`, `kind` enum `model`, `clip_bundle`, `moves`, `wheelhouse`) and the pin list `spec/assets/robot-assets.json` (openWakeWord melspectrogram and embedding v0.5.1, `trained_hey_maipai_v2`, SFace `0ba9fbfa...`, YuNet `face_detection_yunet_2026may` at revision `2b8e9223...`, the sherpa-onnx KWS zipformer 3.3M int8, each with sha256 and licence; no `moves` entry, the Pollen move pins live in PKG-MOVES-01's package manifest per OWNER-ANSWERS 7; no firmware row until AUDIO-FW-01's licence is read and recorded); `robot-state.schema.json` gains optional `watch_level` (`off`, `presence`, `identify`). Reuse check: the Stack's `/stack/v1/events` replay shape is the model for command ids; no new record kind beyond these four. Acceptance: fixtures for every command kind, one offer, one alarm, the full asset list validate in TypeScript and Python; a test that `robot-assets.json` has no entry without a 64-hex sha256 and a licence and no entry of kind `moves` or a firmware file; the tag. Exit: `bash scripts/check.sh` and the tag. Cloud: yes.

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

### Thin chat path prerequisites (2026-10-03, from `home/docs/design/RULES.md` rules 3 and 6)

- [ ] **SPEC-THIN-01: one spec tag for the thin chat path's record changes** (S, 2026-10-03; Home THIN-2B and the settings keys landed locally). Objective: make `rounds`, `tools_offered`, `model_transitions` (and the deprecated `always_search`) optional on the `turn_budget` shape, and move into the spec the two settings keys Home declares locally: `search.brave_api_key` (a write-only secret, adult use only) and `chat.teen_gate_grain` (already in `spec-v0.1.71`; verify it is complete). Acceptance: additive; fixtures validate before and after; Home's local declaration of `search.brave_api_key` is removed in the Home pin bump that follows. Exit: the commons gate, then the tag on the owner's word.

## Row-Bot shared data and kit gaps (2026-10-06)

- [ ] **CHAR-01: companion presence kit block** (S, `commons/ui`; sub-slice of Home CHAR-01). Objective: provide `companion-presence` composed only from the shipped `VoiceOrb`, `Avatar` with `AvatarBadge`, `AgentStatus`, and `SpeakerIdentity` Elements, taking one `PresenceState` prop. Acceptance: the block supports the dashboard greeting and assistant reply speaker mark; no Home-authored component; reduced motion holds a still frame; child band says “Asked a parent” and never renders concerned. The rail placement remains held for owner answer 8. Reuse check: the listed shipped Elements. Privacy and age: signed-in person's state only. Exit: commons gate.

- [x] **PRESENCE-STATES-01: one presence vocabulary for the screen, the Eyes and the body** (S, `getmaipai/commons` `spec`, landed spec-v0.1.78, 2026-10-06). Declares the closed state set, activity kinds and private owner-id rules, priority/timing, three dials, child-band joins, web/Eyes/body joins, turn-stream mappings, and one Row-Bot fixture for each of its 24 `_EVENT_REACTIONS` entries plus Buddy-disabled. `RobotState.presence` is optional and additive. Presence remains activity; emotion overlays refer to EMO-MAP-01 labels and reuse its `child_band` values. A child sees `idle` for `concerned`; no state payload has a person id, outcome, or reason. Reverse parity with Bot's Eyes priority list is deferred to `EYES-INTEGRATION-rev2`: `indicator/looks.py` is not on Bot `main` yet (verdict C3). Out of scope: any renderer. Exit: commons gate and spec tag; Home and Bot pins move only in their own follow-up items.

- [ ] **CHAR-02: the animated companion face Element** (M, `commons/ui`; later, after CHAR-01 and the named gap in the design record). Objective: add the `companion-face` Element around the pinned Rive runtime with the `state`, `emotion`, `intensity`, `motion_level` and `band` inputs fixed by PRESENCE-STATES-01. Bundle the Rive WASM and point the runtime at the bundled file; rendering makes no network requests. Before the dependency lands, record a one-paragraph licence, install-script, network API, worker, eval, telemetry and chunk review in RELEASES-AND-DEPENDENCIES.md. Acceptance: snapshots per state and emotion overlay for adult and child bands; reduced motion holds a still frame; the art uses a local or licence-clean tool, with generation record and captured tool terms kept beside the asset; revisit before any trademark filing. Out of scope: robot loading, lip-sync and eye tracking. Reuse check: the kit `VoiceOrb` lifecycle and reduced-motion handling. Privacy and age: child inputs are clamped in the resolver. Exit: commons gate and a `ui-v` tag.

- [ ] **ERRCOPY-01: person-facing error copy table** (S, `commons/spec`, spec first). Objective: define one table beside `vocab/defect-codes.json` for error kinds that reach people as callouts, with a dad-test sentence and at most one fix. Mirror: existing defect-code vocabulary. Acceptance: every callout kind has one sentence and fix, unknown codes have the generic sentence, and guard reasons or plan violations that are not shown to people stay out. Out of scope: raw detail copy. Reuse check: no second renderer-owned copy table. Privacy and age: raw details admin-only. Exit: commons gate.

- [ ] **SELF-KNOW-01: capability summary fixture shape** (S, `commons/spec`, spec first). Objective: define the shared fixture shape for package capability lines and volatile capability names; package lines use each manifest description and live-state names come from `spec/vocab/capabilities.json`. Acceptance: a three-package fixture has one capped line per installed package and an independently replaceable volatile-state block; the child fixture omits adult-only packages by declared `min_role`. Reuse check: manifest descriptions and the existing capabilities vocabulary. Privacy and age: no person identity. Exit: commons gate.

- [ ] **TRACKER-01: tracker record shapes** (S, `commons/spec`, spec first). Objective: add `tracker` and `tracker_entry` records with id, provenance and clock stamps for the catalog tracker package. Acceptance: fixtures round-trip boolean, numeric, duration and categorical entries with per-person ownership; health values cannot be inserted into memory records. Reuse check: existing spec record conventions. Privacy and age: teen-owned data stays private; a child record is parent-managed. Exit: commons gate.

- [ ] **BRAKES-02: shared ask answer stamps** (S, `commons/spec`, spec first). Objective: add additive `waiting_since` and `surface_answered` fields to the ask record only if the current spec lacks them. Acceptance: both fields round-trip through TypeScript and Python readers and do not carry private ask content into a shared event. Reuse check: existing ask record and clock fields. Privacy and age: child asks remain parent-routed. Exit: commons gate.

- [ ] **MEM-TIDY-01: tidy provenance and journal records** (S, `commons/spec`, spec first). Objective: declare source values `tidy_merge`, `tidy_decay` and `tidy_prune`, plus a `tidy-journal` record with id, provenance and clock. Acceptance: fixtures cover each source and record shape; a forgotten record cannot be restored by a later undo. Reuse check: existing provenance and journal record patterns. Privacy and age: no crisis, consent or age state. Exit: commons gate.

- [ ] **MEM-REVIEW-02: memory review status** (S, `commons/spec`, spec first). Objective: add `active`, `needs_review`, `superseded` and `archived` status values if the memory record lacks them. Acceptance: fixtures prove status round-trips; `needs_review` records are excluded from injected prompt context until a person keeps them. Reuse check: existing memory record. Privacy and age: admin may review a child's queue, never a teen's. Exit: commons gate.

- [ ] **NOTIFY-SOUND-01: companion sounds setting key** (S, `commons/spec`, spec first). Objective: declare `ui.companion.sounds` next to `ui.enrollment_sounds`, scoped per person and off by default, with parent management for a child. Acceptance: settings fixtures and generated types agree; `immediate` notices are not affected. Reuse check: existing settings key declarations. Privacy and age: a parent controls a child's switch. Exit: commons gate.

## SearXNG settings

- [ ] **SEARXNG-SET-01: the SearXNG engine-group catalog in the spec** (S, 2026-10-06; design `docs/plans/searxng-settings-2026-10-06.md` in home). Objective: one definition of the engine groups both the Stack and Home read. Files: `spec/search/searxng-engines.json`, its schema, `gen/ts`, `gen/py`, `spec/settings/keys.json` (`search.searxng_url` label and help; `search.*` household keys to `lives_in: household.search`), CHANGELOG, tag. Acceptance: groups General web and Wikipedia locked on; Images, News, Video on; Science off; Yandex and Baidu flagged and off; each engine names its operator and country; the minimums of section 2 are data; a fixture round-trips; no engine in the catalog needs a key. Out of scope: Stack and Home code. Exit: commons gate, new spec tag.

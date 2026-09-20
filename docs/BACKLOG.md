# Backlog

What's built and what's missing in `shared`. Scannable, not narrative -
reasoning and decision history live in [dev.md](dev.md). Size tags: **S**
(a session or less), **M** (a real slice, days), **L** (a platform-level
capability, needs its own design pass first).

## Skeleton

- [x] **S** Repo skeleton: `LICENSE` (AGPL-3.0), `NOTICE`, `README.md`,
  three workspaces (`ui/`, `core/`, `spec/`) each with a placeholder or
  pointer, `scripts/check.sh` pinned to `@maipai/standards`,
  `docs/BACKLOG.md`, `docs/dev.md`, a `CHANGELOG.md` per workspace. No
  push-triggered Actions. See [dev.md](dev.md).

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

## `spec`

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
- [ ] **S** Home pins `spec` and removes the workspace, moving its
  `check.sh` "spec: standards gen/ presence" block here, and moving
  `home/spec/tests/ts/package-bronze.test.ts` into `home`'s own test
  suite (imports `PackageManifest`/`lintSpeechTemplate` from
  `@maipai/spec` instead of a relative `gen/ts`/`voice/ts` path - left
  behind by the `spec-v0.1.0` move above, still sitting unchanged at
  that path today). Exit check: `home/scripts/check.sh`.
- [ ] **S** Catalog deletes `catalog/schema/` and
  `scripts/refresh-schema.sh`, pins `@maipai/spec`, and its lint reads
  the resolved schemas from the pinned package. Exit check:
  `catalog/scripts/check.sh`.

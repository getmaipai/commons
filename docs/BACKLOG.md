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
  `@maipai/ui/eslint-config` and enforced by `ui/scripts/check.sh`; the
  touch-target/type-floor sweep remains open).
- [ ] **M** Home adopts `ui`: pin the tag, replace `@/kit` and
  `shell/Shell.tsx` with `@maipai/ui` across its 45 consumer files, wiring
  Home's `ProfileSwitcher`, `NotificationBell`, search providers and
  `PhoneNav` data into the new kit slots; delete the older kit and shell;
  keep `assistant-ui/` and whatever else the ready report placed in Home.
  Acceptance: screenshots taken before and after (`PORT=8990`,
  headless), opened and judged for the shell and two apps at desktop and
  phone, differences described in `dev.md`; full gate green. Exit check:
  `home/scripts/check.sh`.
- [ ] **M** TV-focusable navigation in `Shell.tsx`: `ui-v0.1.0`'s shell
  has no `@noriginmedia/norigin-spatial-navigation` rail the way Home's
  old `Shell.tsx` did (real arrow-key/remote focus on the `far` surface).
  Mirror: Home's archived `shell/Shell.tsx`'s `TvNavItem`/`tvNav.ts` for
  the pattern. Needs a design pass on how it composes with `Shell.tsx`'s
  own generic `NavGroup`/`NavEntry` props first. Exit check:
  `bash scripts/check.sh` plus a real TV-surface screenshot judged.

## `spec`

- [ ] **M** `spec-v0.1.0`: move `home/spec` whole (`pyproject.toml`, the
  Python package, `gen/`, `schemas.resolved/`, fixtures, tests, `uv.lock`)
  into `spec/` here. Acceptance: `bun test` and
  `uv run pytest tests/py -q` green inside `shared/check.sh`, tag
  `spec-v0.1.0` pushed. Exit check: `bash scripts/check.sh`.
- [ ] **S** Home pins `spec` and removes the workspace, moving its
  `check.sh` "spec: standards gen/ presence" block here. Exit check:
  `home/scripts/check.sh`.
- [ ] **S** Catalog deletes `catalog/schema/` and
  `scripts/refresh-schema.sh`, pins `@maipai/spec`, and its lint reads
  the resolved schemas from the pinned package. Exit check:
  `catalog/scripts/check.sh`.

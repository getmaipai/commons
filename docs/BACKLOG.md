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

- [ ] **M** `core-v0.1.0`: extract `log`, `withTimeout`, `paths`,
  `archive`, `diagnostics`, `hardware`, `openapi`, `secretThrottle` from
  `home/backend/src/lib` and `stack/backend/src/lib` (read-only; `stack`
  is Session A's), taking the better side or rewriting, carrying the
  tests that describe caller-visible behavior. Add Home's `hlc`, `id`,
  `secrets`, `keystore`, `rateLimiter`, `singleflight`, `ssrfGuard` and
  backup crypto with their tests. Nothing in `core` may import a product
  or read a product's config. Mirror: `home/backend/src/lib/*.ts` and
  their `*.test.ts` files for test shape and structure. Acceptance: every
  carried behavior has a passing test in `core/`, `bun run lint` and
  `bun test` green in `core/`, tag `core-v0.1.0` (annotated) pushed. Out
  of scope: adopting it in Home or the Stack (separate items below). Exit
  check: `bash scripts/check.sh`.
- [ ] **S** Home adopts `core`: pin the tag, replace every import of the
  eight/fifteen helpers, delete the copies in `home/backend/src/lib`.
  Acceptance: `home`'s full `scripts/check.sh` green, one commit. Exit
  check: `home/scripts/check.sh`.

## `ui`

- [ ] **M** `ui-v0.1.0`: extract the Stack's `frontend/src/kit/` and
  `DashboardShell.tsx` from the committed tree at commit `5ec0f57` (never
  the working tree) via `git -C ../stack archive`, generalized per the
  kit-placement plan in `docs/dev.md`: drop everything that only the
  Stack console needed (`add-sheet`, `footer`, `system-pulse`,
  `machine-selector`'s data, `helper/HelperPanel`, `GenericForm.tsx`,
  `host.ts`, the four orphaned chat-shadcn wrappers), generalize the rest
  to take data through props (`StatusPill`, `ResourceRow`, the
  `dashboard/components` blocks, `notifications-popover`), add Home's
  `primitives/`, `schema/` and `settings/` (`SettingsRenderer.tsx`,
  `SettingField.tsx`, `groupSettings.ts` - the one that reads
  `@maipai/spec`'s `SettingsKey`). Fold `@/hooks/use-mobile` into the
  kit's own `useBreakpoint`. Acceptance: `bun run lint` and `bun test`
  green in `ui/`, tag `ui-v0.1.0` (annotated) pushed. Out of scope: the
  command palette and phone-nav generalization (below, since those come
  from Home's code, not the Stack's). Exit check: `bash scripts/check.sh`.
- [ ] **M** Command palette and phone nav into the kit: generalize Home's
  `frontend/src/shell/search/*` (search providers injected, not
  hardcoded) and `frontend/src/shell/PhoneNav.tsx` (nav items injected)
  into `ui/`'s shell, since the Stack's shell never had either. Mirror:
  the existing Home files for structure; UI.md's shell-contract list
  names both as platform-owned chrome. Acceptance: a fixture/story in
  `ui/` proves the palette and phone nav work with injected data, no
  import of a Home-specific type. Exit check: `bash scripts/check.sh`.
- [ ] **S** Header picker and notification popover chrome: generalize the
  Stack's `machine-selector.tsx` picker shape and `notifications-popover.tsx`
  into props-driven kit primitives (a header dropdown with a status dot; a
  notification popover), dropping the Stack-specific data each currently
  carries. Acceptance: both take their data via props/hook injection, no
  `@/lib/api` import remains. Exit check: `bash scripts/check.sh`.
- [ ] **M** Home adopts `ui`: pin the tag, replace `@/kit` and
  `shell/Shell.tsx` with `@maipai/ui` across its 45 consumer files, wiring
  Home's `ProfileSwitcher`, `NotificationBell`, search providers and
  `PhoneNav` data into the new kit slots; delete the older kit and shell;
  keep `assistant-ui/` and whatever else the ready report placed in Home.
  Acceptance: screenshots taken before and after (`PORT=8990`,
  headless), opened and judged for the shell and two apps at desktop and
  phone, differences described in `dev.md`; full gate green. Exit check:
  `home/scripts/check.sh`.

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

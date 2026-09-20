# Changelog (`@maipai/ui`)

All notable changes to the `ui` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `ui-vX.Y.Z`. Everything stays `0.x` until Home's adoption proves it.

## [0.2.1] - ui-v0.2.1

### Added
- `MemoryChip` gains a third kind, `"failed"`: a save that never
  completed has nothing to keep, edit, or forget, so it renders as a
  plain destructive-tinted button straight to `onOpenMemory`, no
  popover - spec section 4's state table ("a red label plus a recovery
  action"), not a second, mismatched shape forced into the success
  chip's own popover pattern. `onKeep`/`onEdit`/`onForget` are now
  optional (unused by this kind); `onOpenMemory` is new.

### Fixed
- `SourcesCard`'s row links were missing `rel="noopener"` and an
  explicit `referrerPolicy` (only `rel="noreferrer"`) - found live
  adopting this component in Home, whose own pre-adoption `SourcesCard`
  carried both (the org privacy architecture's own promise: a cited
  site learns nothing from the click but the click). `noreferrer` alone
  already strips the request's own Referer header in every real
  browser; the explicit pair matches Home's own already-audited,
  belt-and-suspenders form instead of a narrower one.

## [0.2.0] - ui-v0.2.0

### Added
- The kit's chat pattern (`docs/spec.md`'s new "Chat" section, section
  7's own new "One product on every screen" opening paragraph): layout,
  turn anatomy, sources card, memory chip, document pane, actions, turn
  stats at Developer disclosure, reasoning, the senses dock, the model
  picker in the header picker slot, the child band, the three states,
  the phone, and the acceptance screenshot set.
- Four new components in `src/blocks/chat/`, shaped by the spec's own
  paragraphs, data through props: `SensesDock`, `ChildBand`,
  `SourcesCard`, `MemoryChip`.
- `src/assistant-ui/`: the `@assistant-ui/react` wrappers, moved here
  from Home's own `frontend/src/kit/assistant-ui` unchanged except
  imports (self-references repointed from the external `@maipai/ui/
  src/*` package path to the internal `@/kit/*` alias). `src/ui/
  textarea.tsx` moved alongside it (its only local dependency, never
  migrated at `ui-v0.1.0`). New dependencies: `@assistant-ui/react`,
  `@assistant-ui/react-markdown`, `remark-gfm`.

### Changed
- `eslint.config.js` gained a `src/assistant-ui/**/*.tsx` override
  (vendored registry code, not hand-authored kit primitives): the same
  exemption class Home's own pre-adoption config gave this exact
  directory (`no-restricted-imports`, the `aui-*`/`shimmer` CSS-module
  class names `better-tailwindcss/no-unknown-classes` can't resolve,
  and the handful of a11y-nuance rules markdown-text's passthrough
  renderers and thread-list's rename-input autofocus need off).

## [0.1.6] - ui-v0.1.6

### Fixed
- `ui-v0.1.5`'s `"./eslint-config"` alias came bundled with a
  `package.json` `"exports"` field - which, once present at all, blocks
  every subpath Node/bun module resolution doesn't explicitly list,
  breaking every `@maipai/ui/src/*` import across Home (and any future
  `bot`/`go` consumer) the moment it installed. Found live re-pinning
  Home to `ui-v0.1.5` (`bun test` failing on "Cannot find module
  '@maipai/ui/src/primitives/Page'" everywhere). Fixed by dropping
  `"exports"` entirely - the ESLint config is importable at its real
  file path, `@maipai/ui/eslint.config.js`, matching this package's own
  no-barrel convention (`README.md`) instead of adding a second,
  competing subpath convention. `ui-v0.1.5` itself is not retagged
  (never move a pushed tag); Home pins `ui-v0.1.6`.

## [0.1.5] - ui-v0.1.5

### Added
- `ui/eslint.config.js`, exported as `@maipai/ui/eslint-config`: the
  kit's own a11y/style gate (`jsx-a11y`, `better-tailwindcss` on
  `src/tokens.css`, lucide-only-via-`icons.ts`, radix-only-under-`src/
  ui`, no other component library, no raw color in a `style` attribute).
  `"lint"` is now `tsc --noEmit && eslint src`, not typecheck alone.
  **Broken for any external consumer - see `ui-v0.1.6` above.**

### Changed
- `utils.ts` gained `hitArea(1 | 2 | 3)`, one definition for the
  touch-target hit-area extension (`relative` + `before:-inset-N`)
  previously hand-derived independently at each call site; `button.tsx`
  and `toggle.tsx` now call it instead of repeating the pattern.

## [0.1.4] - ui-v0.1.4

### Fixed
- `SidebarGroupLabel`'s opacity-reduced text at `nav-main.tsx`'s own
  call site (`text-sidebar-foreground/60` - the one actually rendered on
  every page's "Navigation"/"Favorites" heading) measured 4.49:1 against
  the approved light theme's own `--sidebar`, under WCAG AA's 4.5:1
  floor. Bumped to `/75`, along with the primitive's own `/70` default
  (defensively, not because it was independently proven to fail on its
  own).
- `TabsTrigger`'s inactive-state text (`text-foreground/60`, light theme
  only - dark already had its own `dark:text-muted-foreground`) measured
  4.42:1 against the approved light theme's own `--muted`. Switched to
  `text-muted-foreground` for both themes (5.4:1), one rule instead of
  two.
- Found live by Home's own step 5a (adopting the kit's tokens.css as its
  base instead of a second, hand-picked palette beside it) - both bugs
  were opacity blends that had simply never been checked against the
  kit's own real light theme before.

## [0.1.3] - ui-v0.1.3

### Fixed
- `sidebar.tsx`'s shell wrapper carries back the keyboard-avoidance
  fix Home's own pre-adoption copy had (`position: fixed`, an inline
  height/offsetTop from a new `useVisualViewportHeight` hook moved in
  from Home, since a phone's on-screen keyboard panning the document
  otherwise dragged the whole shell down with it) and a missing
  `min-w-0` on `SidebarInset` (a long unwrapped string could stretch a
  page past the viewport).
- Three more call-site `className` overrides found silently defeating
  their own primitive's `ui-v0.1.1` floor fix: `nav-main.tsx`'s nav row
  (`h-10 text-[15px]`), `SidebarTrigger`'s `size-7`, and `RailToggle`'s
  hand-rolled, never-audited `<button>` (now routed through the kit's
  own `Button`, `icon-sm`).
- `CommandDialog`'s sr-only title/description rendered as a sibling of
  `DialogContent` instead of a child (`Dialog` is a context provider
  with no DOM output of its own), sitting outside every landmark on
  every page that mounts it, closed or open - the exact axe `region`
  bug Home's own `command.tsx` had already found and fixed once.
- `command-input-wrapper`'s height corrected to `h-[49px]` (its own
  `border-b`, border-box sizing, was eating 1px off the real input's
  `h-full`, landing it at 47px) - and a competing `h-12` on the same
  element inside `CommandDialog` specifically, which would have fought
  that fix at equal specificity, removed rather than reconciled.
- `Sidebar`'s mobile (`Sheet`) branch spread the caller's `role`/
  `aria-label`/`className` onto `Sheet` (Radix's `Dialog.Root`, no DOM
  output of its own) instead of the actual rendered `SheetContent`,
  silently losing the `ui-v0.1.3` landmark fix above - and `className`
  itself - on every phone-width render. Found by review before this
  landed.

## [0.1.2] - ui-v0.1.2

### Added
- `Shell`'s header now renders a real search button whenever `search` is
  configured (opens the same command palette Cmd/Ctrl+K does). Owner
  ruling, 2026-09-20, on Home's own adoption: a phone has no keyboard
  shortcut, so without a visible trigger, search would exist on desktop
  and vanish on phone - exactly what "one product, every screen"
  forbids. The palette's open state stays internal to `Shell`; no new
  prop, since the button already covers the one thing that needed to
  open it.

## [0.1.1] - ui-v0.1.1

### Fixed
- `docs/UI.md`'s 48px touch-target and 16px type floors, ported from
  Home's own hardened kit copy into the primitives that came through the
  Stack path unhardened: `button`, `input`, `checkbox`, `select`,
  `tabs`, `dropdown-menu`, `command`, `dialog`, `sheet`, `toggle`,
  `label`, `table`, `breadcrumb`, and `sidebar`'s menu button. The kit's
  `switch`, `slider` and `sidebar` rail already carried this fix, which
  made the gap a half-merge rather than a design choice. See
  `../docs/dev.md` for the file-by-file inventory and the reasoning kept
  out (Home's own visual language stays in Home). `docs/spec.md` section
  7 gets a one-line note that its own smaller hit-target numbers predate
  this floor.

## [0.1.0] - ui-v0.1.0

### Added
- The kit, extracted from the Stack's reconciled kit (commit `5ec0f57`)
  and Home's `primitives/`, `schema/` and `settings/`: layout
  primitives, tokens, icons, the settings and UI-schema renderers, and
  a new `Shell.tsx` (rail, phone nav, header slots, the Cmd/Ctrl+K
  command palette), `HeaderPicker` and `NotificationPopover` chrome
  primitives, `AppearanceControl`, and a generic `http.ts` fetch client.
  The approved design specification lives at `docs/spec.md` with its six
  reference images at `docs/reference/`. See `../docs/dev.md` for the
  full inventory of what each piece replaced and why.

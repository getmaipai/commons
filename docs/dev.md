# shared: design record

Created 2026-09-20 out of
[`stack/docs/plans/refocus-work-order-2026-09-20.md`](https://github.com/getmaipai/stack/blob/main/docs/plans/refocus-work-order-2026-09-20.md)
steps 0b and 0c, itself following the same day's decision that the Stack is
no longer a product but Home's engine layer
([`stack-necessity-review-2026-09-20.md`](https://github.com/getmaipai/stack/blob/main/docs/plans/stack-necessity-review-2026-09-20.md)).
That refocus left two things worth keeping across the reshuffle: the
Stack's reconciled kit and shell from the 2026-09-19 UI reconciliation
(the owner's approved design), and the eight-plus helper files Home and
the Stack had each grown their own diverging copy of. Both needed one home
instead of two, and `home/spec` needed a home that isn't inside a single
product either, since the Stack, Catalog and Bot all read it. `shared` is
that home.

## Why one repo, not three

`ui`, `core` and `spec` differ in language and audience (`spec` is
TS-and-Python, `ui` is React-only, `core` is framework-agnostic TS), but
none needs its own release cadence, its own committer audience, or its own
visibility (org rule 5: "repos only when necessary"). They tag
independently (`ui-vX.Y.Z`, `core-vX.Y.Z`, `spec-vX.Y.Z`) inside one
checkout instead, the same way a consumer pins each workspace at its own
tag without needing three sibling clones.

Catalog stays its own repo: it is the one org repo that takes community
pull requests, on a different trust gate and cadence than everything else,
so it earns the separation `shared`'s own workspaces don't.

## Dependency direction

`shared` imports no product. `stack`, `home` and `catalog` import from
`shared`. `bot` gets `ui`, `core` and `spec` through Home's pinned runtime
package, and pins `spec` directly for its own Python body at the same
version Home pins. `go` pins `spec`. Reversing any of these arrows is a
bug: it would mean a library depending on the product it's meant to be
reused by.

## How a consumer pins a workspace

Mirrors `@maipai/standards` (`../.github/standards/README.md`, "Why
shell, not an npm package"): no registry, no publish step. A consumer
resolves the package from the sibling checkout, `MAIPAI_SHARED_DIR`
overriding `../shared`, and states the tag it targets (e.g. `core-v0.1.0`)
in its own dev docs and `package.json` dependency. Its `check.sh` fails
loud when the sibling is missing or the workspace's `package.json`
version doesn't match the stated pin, the same honesty-of-the-pin
contract the standards core already uses; nothing here verifies the tag
automatically.

**Decided at `core-v0.1.0`: `file:`, not `link:`.** Tested directly
(a throwaway consumer package in each form, `bun install` then a real
import): `link:` requires the target to already be registered globally
via `bun link` first - it fails outright on a plain relative or absolute
path ("Package is not linked"), which is incompatible with "no registry,
just a sibling checkout" (a fresh clone would need someone to manually
`bun link` the package before anything else could install). `file:`
works directly with no extra step: `bun install` copies the package into
the consumer's `node_modules/@maipai/core` as a real, self-contained
directory (a distinct inode from the source; editing the source
afterward does not change the installed copy without a fresh
`bun install`) that carries its OWN `node_modules` (hono, zod,
@hono/zod-openapi), so `core`'s own dependencies resolve against its own
installed versions rather than needing the consumer to also declare
them - exactly "one copy of each `core` module," self-contained. `core`
has no React dependency, so the one-React-instance test named above
doesn't apply to it; `ui-v0.1.0`'s own tag message repeats this test
against a real React consumer, since that's where a duplicated React
would actually break hooks.

A consumer's own dependency entry is therefore `"@maipai/core":
"file:../../shared/core"` (adjusted for the consumer's own depth - e.g.
`home/backend/package.json` is two levels below the org root, so
`../../shared/core`), re-resolved with a plain `bun install` whenever the
pinned tag changes.

## Workspace status

- `ui/`: `ui-v0.1.0` landed. The kit, extracted read-only from the
  Stack's committed tree at commit `5ec0f57` (the 2026-09-19 UI
  reconciliation - the design record now lives at
  [docs/spec.md](../ui/docs/spec.md), copied verbatim with a preface and
  a closing "what's Stack-only" list; never edit its body), plus Home's
  `primitives/`, `schema/` and `settings/` (the ones that already render
  `@maipai/spec`'s declaration format).
  - Carried as-is: `blocks/{browser,cards,states,phone,property-panel,
    things-page,things-table,filter-column,pane}`, every `hooks/*`,
    `icons.ts`, `tokens.css`, the `ui/*` shadcn wrappers (minus four
    orphaned chat primitives with no consumer - `message`, `bubble`,
    `attachment`, `message-scroller` - `assistant-ui/` stays Home's).
  - Generalized: `StatusPill`/`ResourceRow` (their `@/lib/status` and
    `@/lib/format` helpers moved in as `status.ts`/`format.ts`);
    `site-header.tsx`'s pieces split into a generic `AppearanceControl`
    and a new `AppSidebar` (taxonomy groups replaced by `NavGroup[]`/
    `NavEntry[]` props, `ungroupedNav()` for a flat list); Stack's
    `machine-selector.tsx` chrome generalized into `HeaderPicker`; its
    `notifications-popover.tsx` into `NotificationPopover` (data via
    props, no `@/lib/api` import); Home's `CommandPalette`/
    `SearchResultGroups`/`PhoneNav` generalized (search groups and nav
    entries injected, not Home's own providers/catalog) into `search/`
    and `PhoneNav.tsx`; `@/hooks/use-mobile` folded into
    `useBreakpoint().tier === "phone"`.
  - New: `Shell.tsx` - the layout/nav contract (docs/UI.md): a desktop
    rail, a phone bottom bar, a header with `headerTitle`/`headerActions`
    slots, rail-open persistence (`railStorageKey`, namespaced per
    product), and the Cmd/Ctrl+K command palette when a `search` config
    is given. Imports no product page; routed content is `children`.
  - `http.ts` (`request`/`ApiError`, Home's own generic fetch client -
    zero product coupling, moved in whole) backs the schema interpreter
    (`schema/actions.ts`, `binding.ts`, `NodeRenderer.tsx`'s widget
    fetches) and `settings/SettingsRenderer.tsx` (which calls the
    platform's own standardized `/api/settings/*` contract directly,
    per docs/SETTINGS.md's "one declaration, one implementation" -
    verified against Home's real routes, not guessed). `widgets.ts` and
    `settings/resolvedSetting.ts` hold two provisional hand-typed
    shapes (`WidgetDescriptor`/`WidgetItem`/`WidgetData`,
    `ResolvedSetting`) until `@maipai/spec` grows real generated ones.
  - Known gap, not silently dropped: `Shell.tsx` itself has no
    TV-focusable rail yet (the arrow-key/remote nav Home's own old
    Shell.tsx had) - tracked in `docs/BACKLOG.md`, not one of the five
    features the owner's ruling protected. A code review caught that
    `primitives/Card.tsx`/`List.tsx` already call `useFocusable()`
    unconditionally on their far-surface variant with nothing in the new
    tree ever calling the library's required `init()` first - a real
    crash waiting for the first `far={true}` caller. Fixed: `tvNav.ts`
    (`ensureTvNavInit`, `pauseTvNavForOverlay`) moved in from Home's
    `shell/tvNav.ts` (unchanged, zero product coupling), and
    `HeaderPicker`/`NotificationPopover` now call `pauseTvNavForOverlay`
    on open-change, matching Home's original `ProfileSwitcher`/
    `NotificationBell` behavior. The primitive is safe now; the rail
    itself is still the tracked follow-up.
  - Found and flagged for `.github` (Session A owns org-doc edits):
    org `UI.md` states breakpoints as "phone under 640, tablet to 1024,
    desktop above," but the actual reconciled `tokens.css`
    (owner-approved 2026-09-19) pins `sm:640, md:720, lg:960, xl:1280` -
    `responsive.ts`'s `SURFACE_MIN_WIDTH_PX.desktop` now matches the
    real tokens.css (960), not UI.md's stale prose.
  - No barrel export - a consumer subpath-imports the real file, e.g.
    `@maipai/ui/src/Shell` (the same convention `@maipai/spec` and
    `@maipai/core` already use). See `ui/README.md`'s "Importing".
  - A medium code review found and fixed six more real issues before
    this landed: `schema/NodeRenderer.tsx`'s form submit handler cleared
    its own `submitting` flag synchronously right after firing the
    dispatched action instead of waiting for it, letting a double-click
    fire the request twice (now uses `dispatch`'s own `onSettled`);
    `http.ts` reported ANY `AbortError` as a timeout, including a
    caller's own unrelated cancellation signal (now only the internal
    timeout controller's own abort counts, via a `didTimeOut()` flag and
    `AbortSignal.any` to merge both signals); `Shell.tsx`'s
    `flatEntries()` hardcoded every phone-nav icon to the generic "box"
    fallback when the caller passed grouped `NavGroup[]` nav instead of
    flat `NavEntry[]` (fixed by making `nav-main.tsx`'s own `NavItem.icon`
    a name, resolved once in `NavMain`, instead of a pre-resolved
    component - `flatEntries()` now carries it through); `PhoneNav.tsx`'s
    and `app-sidebar.tsx`'s own separately hand-rolled `isActivePath`
    used a bare string-prefix check (`/media` matched `/media-library`) -
    consolidated into one `isActiveNavPath()` in `nav.ts` with a real
    segment boundary; `SearchResultGroups.tsx` rendered a completely
    blank list for a real query matching nothing when the product had no
    `onAsk` (no chat feature) - now shows "No results."; and
    `settings/groupSettings.ts` hardcoded the literal `"home"` when
    filtering a registry key's `honoured_by`, even though this is now
    shared kit chrome any product renders - `SettingsRenderer` and
    `groupSettings()` both take an explicit `honouredBy` parameter now.
    NOTICE was also missing the ~17 new runtime dependencies this
    workspace added; fixed. 268 tests passing across 42 files.
  - **`ui-v0.1.1` (2026-09-20): the accessibility floor gap.** Comparing
    Home's own `kit/ui/*.tsx` against ui-v0.1.0's primitives (mid-Home-
    adoption, step 5) found that everything on the Stack path (`button`,
    `input`, `checkbox`, `select`, `tabs`, `dropdown-menu`, `command`,
    plus `dialog`/`sheet`'s icon close button, `toggle`, `label`,
    `table`, `breadcrumb`, and `sidebar`'s own menu button) shipped
    without docs/UI.md's 48px touch-target and 16px type floors, while
    `switch`, `slider` and `sidebar`'s resize rail (which came in through
    Home's own pieces) already carried them - a half-merge, not a design
    choice. `design-resolver` confirmed the floor is the kit's own
    property (docs/UI.md:180-182 names the kit, not the product, as the
    thing that "refuses to go below" it), so the fix landed here rather
    than as a Home-side re-patch, which would have been the "second copy
    of anything is wrong" case (org CLAUDE.md) and would have broken for
    `bot`/`go` too.
    - Ported (geometry and type only, not Home's own visual language -
      its `rounded-lg`, `bg-clip-padding`, tinted `destructive`, and
      `color-mix` hovers stay Home's, a separate visual-language question
      for `spec.md`): `button.tsx`'s `default`/`lg`/`icon` sizes now hit
      the floor directly with `text-base`; `xs`/`sm`/`icon-xs`/`icon-sm`/
      `icon-lg` keep their painted size with a `before:` pseudo-element
      hit-area extension, the inset recomputed for shared's own (not
      Home's) compact scale. Same pattern for `toggle.tsx`. `input.tsx`
      drops its `md:text-sm` demotion (16px now holds at every width).
      `checkbox.tsx` gets the `after:-inset-4` tap-area stretch.
      `select.tsx`'s trigger/item/label, `dropdown-menu.tsx`'s label/item/
      checkbox-item/radio-item/sub-trigger (min-h-12, not just text-base -
      a code review caught the first pass fixing only the label, leaving
      every actual menu row at `text-sm` with no min-height despite
      `dev.md` and `CHANGELOG.md` both already claiming `dropdown-menu`
      as hardened), and `command.tsx`'s search box/empty-state/group-
      heading/item all move onto `min-h-12`/`text-base`. `tabs.tsx` gets
      the axis-only
      `before:` extension plus `data-touch-target-exempt` on `TabsList`
      (Radix's roving `tabIndex` sits on the wrapper, not a real target).
      `dialog.tsx`/`sheet.tsx`'s icon-only close routes through the kit's
      own `Button` (`ghost`/`icon-sm`) instead of an unsized
      `Primitive.Close`. `sidebar.tsx`'s `SidebarMenuButton` default
      moves from `h-8`/`text-sm` to `h-12`/`text-base` (the sidebar's
      primary, most-tapped row); `sm` stays a declared exception.
      `label.tsx`, `table.tsx`'s cell text, and `breadcrumb.tsx`'s trail
      move to `text-base` (breadcrumb's touch target stays the WCAG
      2.5.5 inline-link exception rather than an inset, which would
      overlap adjacent crumbs the way an unguarded `TabsTrigger`
      extension once did).
    - Left alone, with a comment: `badge.tsx`, `tooltip.tsx`, `command.tsx`'s
      shortcut token, `dropdown-menu.tsx`'s shortcut token - already at
      `text-xs`/`sm` on both sides, a declared type-floor exception
      (a chip, a transient label, a keyboard token, none of them body
      text). `marker.tsx` (chat annotation line, the same "Description"
      category as Card's/Dialog's own secondary text) likewise stays
      small with a named exception rather than a guessed fix, since the
      chat kit itself is still ahead in step 5b. `avatar.tsx`'s fallback
      initials and `chart.tsx`'s axis/legend/tooltip text stay small
      (decorative or industry-standard dense data typography, not body
      text a person reads for content).
    - **A second review pass, before this landed, found five real
      overlap/regression bugs the first pass introduced or missed** (the
      dropdown-menu item gap above was one of them):
      `toggle-group.tsx` inherits `toggle.tsx`'s `sm`/`lg` hit-area
      extension, but `ToggleGroup`'s own default `spacing` is 0 - edge-
      to-edge, sharing a border - so the all-sides extension reached
      into the next item exactly the way `TabsTrigger`'s extension had to
      become axis-only to avoid; fixed by cancelling the extension
      (`before:content-none`) for grouped items rather than misfiring
      onto the wrong one (no consumer uses `sm`/`lg` through a group yet,
      so nothing regresses; `default` size is unaffected and safe as-is).
      `appearance-control.tsx`'s System/Light/Dark segmented control
      packs three `icon-sm` buttons at `gap-0.5` (2px) - the worst case
      of the same bug - fixed the same way. `NotificationPopover.tsx`'s
      "Clear all"/"See all" and its outer row, `PropertyPanel.tsx`'s
      action-icon row and its Cancel/Confirm row, and `DetailsPane.tsx`'s
      action-button row all put adjacent `size="sm"` controls at
      `gap-1`/`gap-2`, letting each button's `-inset-2` extension fully
      cover and outrun the gap into its neighbor; fixed by widening every
      one of those gaps to `gap-4` (16px clears two 8px extensions with
      margin, the same math `tabs.tsx`'s own `gap-2`→`gap-4` fix used).
      `PropertyPanel.tsx` and `KeyValueList.tsx` each had a `<Button
      size="icon">` with an explicit `className="size-9"`/`"size-7"`
      override - since `cn()` uses `tailwind-merge`, the explicit class
      won and silently kept the button at its old, pre-fix size; fixed by
      switching to the matching named size (`icon-sm`), which now
      carries the floor itself, instead of hand-sizing. `FilterColumn.tsx`
      got two fixes: its search icon was centered for the old 36px
      `Input` (`top-2.5`) and needed `top-4` for the new 48px one; and its
      per-option `<label>` rows (space-y-1, ~30px tall) let `Checkbox`'s
      new `after:-inset-4` (48px) spill into neighboring rows, fixed by
      giving each row `min-h-12` so the checkbox's extension exactly
      fills its own row with the real 4px gap as margin, not overflow.
      A universal claim needs an inventory (org CLAUDE.md): every other
      `size="sm"`/`"icon-sm"`/`"icon-xs"` consumer in `blocks/` was
      checked and had either a safe gap or no adjacent compact sibling.
    - Two follow-ups noted, not blockers: `package.json`'s `"lint": "tsc
      --noEmit"` doesn't yet ship the ESLint config docs/UI.md says the
      kit provides to every repo and catalog CI run; and `shared/ui` has
      no a11y gate of its own yet, so Home's `scripts/screenshot.ts`
      touch-target sweep (which now measures the shared kit directly) is
      the only thing proving this floor until `bot`/`go` exist.
    - `docs/spec.md` section 7 gets a one-line note that its own smaller
      hit-target numbers (44px toggle, 40-44px header controls, 36px
      footer item) predate this floor and don't govern the kit.
    - Regression coverage: `ui/src/ui/touch-target-floor.test.tsx`,
      class-level assertions per fixed primitive (13 tests, two more
      added with the dropdown-menu-item and toggle-group fixes). The
      rendered-geometry proof stays Home's `scripts/screenshot.ts` gate.
      281 tests passing across 43 files.
  - **`ui-v0.1.2` (2026-09-20): a real search button.** Owner ruling on
    Home's own step-5 adoption: `Shell`'s command palette had a Cmd/Ctrl+K
    listener and no visible way to open it - fine on desktop, but a phone
    has no keyboard shortcut, so search existed on one surface and not
    the other, which "one product, every screen" rules out. `Shell.tsx`
    now renders a real header search button (`Button`/`icon`, 48px,
    already floor-compliant from ui-v0.1.1) whenever `search` is
    configured, right of `headerTitle` and left of `headerActions`,
    calling the same internal `setPaletteOpen` the keyboard shortcut
    already used. No new prop: the palette's open state stays internal to
    `Shell`, since this button is the only thing that ever needed to
    trigger it. Two new tests (`Shell.test.tsx`): no button renders
    without a `search` config, and clicking it with one opens the
    dialog. 283 tests passing across 43 files.
  - **`ui-v0.1.3` (2026-09-20): the sidebar's own keyboard-avoidance and
    layout fixes, plus a second review pass.** `ui-v0.1.0`'s
    `sidebar.tsx` came from Stack's own reconciled kit, which had never
    needed three fixes Home's own pre-adoption copy had already earned
    in production - found live finishing Home's own step-5 adoption,
    after `ui-v0.1.1`/`0.1.2` had already landed and been consumed.
    - The shell wrapper wasn't `position: fixed`: a phone's on-screen
      keyboard panning the document dragged the whole shell down with
      it instead of staying anchored. `useVisualViewportHeight`
      (`ui/src/hooks/`, moved in from Home - it had become dead code
      there the moment `Shell.tsx` was deleted, and is a real kit-level
      concern now that the wrapper needs it, not a Home-specific one)
      drives an inline height/offsetTop override on the wrapper's own
      `h-svh`, the same technique Home's own copy used.
    - `SidebarInset` was missing `min-w-0`: a long unwrapped string
      could stretch a page past the viewport.
    - Three more call-site `className` overrides silently defeated
      their own primitive's `ui-v0.1.1` floor fix, the exact bug class
      that fix's own code review already caught twice elsewhere:
      `nav-main.tsx`'s nav row (`h-10 text-[15px]`, found by the far/TV
      a11y sweep actually rendering it for the first time),
      `SidebarTrigger`'s `size-7`, and `RailToggle` (a hand-rolled,
      never-audited `<button>` with no touch-target extension at all -
      now routed through the kit's own `Button`, `icon-sm`).
    - `CommandDialog`'s sr-only title/description rendered as a sibling
      of `DialogContent`, not a child - `Dialog` is a context provider
      with no DOM output of its own, so this sat outside every landmark
      on every page mounting a `CommandDialog`, closed or open, the
      exact axe `region` bug Home's own `command.tsx` had already found
      and fixed once. `command-input-wrapper` also needed `h-[49px]`
      (its own `border-b` eating 1px off the real input's `h-full`),
      found the same way ui-v0.1.1's own "50px, not an even 48px"
      `InputGroup` finding was: a real Command usage outside
      `CommandDialog` (`HomePage`'s own inline prompt box).
    - A second code review (before this landed) caught two more real
      bugs the fixes above introduced: `CommandDialog`'s own `<Command>`
      still carried a competing `**:data-[slot=command-input-wrapper]:
      h-12`, fighting the new `h-[49px]` base fix at equal specificity
      (removed rather than reconciled - one definition); and `Sidebar`'s
      mobile (`Sheet`) branch spread the caller's `role`/`aria-label`/
      `className` onto `Sheet` (Radix's `Dialog.Root`, no DOM output of
      its own) instead of the real rendered `SheetContent`, silently
      losing the landmark fix - and `className` itself, a pre-existing
      drop fixed as a drive-by - on every phone-width render.
    - New regression coverage: a `CommandDialog`-exercising test
      (nothing had before) and a phone-width `Sidebar` test that opens
      the real mobile `Sheet` and checks the landmark reaches
      `document.body` (nothing had exercised that open state before
      either). Verified end to end by Home's own full screenshot matrix
      (every route, every viewport including `far`/TV, both themes)
      actually passing clean, not just the two-combo `--a11y-only` fast
      pass. 290 tests passing across 44 files.
  - **`ui-v0.1.4` (2026-09-20): two opacity-contrast bugs, found by
    Home's own step 5a (adopting `@maipai/ui`'s real `tokens.css` as its
    base instead of a second, hand-picked palette beside it - the switch
    that finally let the approved light theme's own surfaces reach a
    real render). Both were opacity-reduced foreground colors that had
    simply never been measured against the kit's own light theme before
    (Home's own, different neutral scale had happened to still pass).
    - `nav-main.tsx`'s own call-site override of `SidebarGroupLabel`
      (`/60`, the one actually rendered on every page's "Navigation"/
      "Favorites" heading) measured 4.49:1 against `--sidebar`, under
      WCAG AA's 4.5:1 floor. Bumped to `/75`, along with the primitive's
      own `/70` default one line up - defensively, not because the
      default was independently proven to fail (nothing renders it
      un-overridden today), so a future call site is never the one that
      has to raise it.
    - `TabsTrigger`'s inactive state (`text-foreground/60`, light theme
      only) measured 4.42:1 against `--muted`. Switched to
      `text-muted-foreground` (5.4:1, already an audited token for
      exactly this "quiet secondary text" role) for both themes, one
      rule instead of the light/dark split the opacity approach needed.
    - `contrast.test.ts` (below) gained a real regression test for this
      bug class - opacity-blended text, which its existing solid-color
      checks never evaluated - guarding `SidebarGroupLabel`'s own `/75`
      against the surfaces it actually renders on. 292 tests passing.
      Home's own `docs/dev.md` step 5a section has the destructive-token
      and primary-accent side
      of this same adoption (Home's own color overrides, not a kit
      change).
  - **`ui-v0.1.5` (2026-09-20): two token-free-lane items, landed by
    cherry-pick.** Both built by the household's local coding model
    (Qwen3.8-27B, the `coordinate` skill's lane 1b) in its own worktree
    (`shared-c`, branch `c/82-ui-eslint`, based on `ui-v0.1.3`), reviewed
    and reported ready by COORDINATOR, then cherry-picked onto `main`
    here (`git cherry-pick eb96371 34107e5`, both applied clean, no
    conflicts).
    - **One `hitArea` helper for the touch-target extension.** A code
      review on `ui-v0.1.1` had flagged the `relative` +
      `before:-inset-N` hit-area pattern as hand-derived independently
      at `button.tsx`, `toggle.tsx`, and other call sites - "a second
      copy of anything is wrong even when it is faster" (org CLAUDE.md).
      `utils.ts` gained `hitArea(1 | 2 | 3)`, one definition mirroring
      the same file's own `FOCUS_RING` constant; `button.tsx` and
      `toggle.tsx` now call it. Same computed insets, no behavior
      change - a regression test (`hitArea.test.tsx`) asserts each step
      against its own known-good class string.
    - **The kit's own ESLint config, shipped and enforced.**
      `ui/eslint.config.js`, exported as `@maipai/ui/eslint-config` so a
      future consumer (`bot`, `go`) can extend it rather than
      reinventing the same rules: `jsx-a11y`, `better-tailwindcss`
      pointed at `src/tokens.css`, lucide-only-via-`icons.ts`,
      radix-only-under-`src/ui`, no other component library, no raw
      color in a `style` attribute. `package.json`'s `"lint"` is now
      `tsc --noEmit && eslint src`, closing the gap `docs/BACKLOG.md`
      had tracked since `ui-v0.1.0` (typecheck alone, no a11y/style
      gate of its own - Home's `scripts/screenshot.ts` was the only
      thing actually proving the kit's own floor). Two pre-existing
      lint findings fixed as part of landing it clean (`MetricCard.tsx`,
      `sonner.tsx`).
    - 296 tests passing (292 plus `hitArea.test.tsx`'s four). Full gate
      green, including the new `eslint src` step - `shared`'s own gate
      never exercises an EXTERNAL consumer's subpath resolution, which
      is exactly what this tag broke; see `ui-v0.1.6` immediately below.
  - **`ui-v0.1.6` (2026-09-20): `ui-v0.1.5`'s `exports` field broke
    every external subpath import, found re-pinning Home.** The
    `"./eslint-config"` alias `ui-v0.1.5` shipped came bundled with a
    `package.json` `"exports"` field - but ANY `exports` field, once
    present, switches Node/bun module resolution to strict mode for the
    whole package: every subpath not explicitly listed stops resolving.
    `@maipai/ui/src/primitives/Page`, `@maipai/ui/src/ui/button`, and
    every other real subpath import Home's entire step-5 adoption
    depends on broke the moment `ui-v0.1.5` installed ("Cannot find
    module" on nearly every `bun test` file in Home's own suite) -
    invisible from inside `shared`'s own gate, since nothing here
    consumes the package through its own `node_modules` boundary the
    way an external consumer does. Fixed by dropping `"exports"`
    entirely rather than trying to enumerate every subpath in it - the
    ESLint config is importable at its real file path instead
    (`@maipai/ui/eslint.config.js`), matching this package's own
    established no-barrel convention (`README.md`) rather than adding a
    second, competing one. `ui-v0.1.5` itself is not retagged (never
    move a pushed tag, org CLAUDE.md); Home pins `ui-v0.1.6`. Verified
    against the real external break: Home's own full `scripts/check.sh`
    (below), not just `shared`'s own gate.
- `core/`: `core-v0.1.0` landed. Sixteen modules, each read from both
  `home/backend/src/lib` and `stack/backend/src/lib` (read-only) where
  both had one, taken from whichever side was better or rewritten fresh:
  - `withTimeout`, `archive`, `singleflight`, `ssrfGuard`: identical or
    near-identical in both/only one side; carried with light comment
    cleanup.
  - `log`: rewritten as `createLogger(dir, name, options)` - a factory,
    not a global singleton, so nothing in `core` hardcodes a product's
    log file name or reads a product's `paths` module. Adopts the
    Stack's secret-redaction feature (`registerSecret`/`redact`) Home's
    own version explicitly lacked, keeps Home's `process.exit(1)` after
    a fatal error (Stack's own version didn't exit, which leaves a
    corrupted process running).
  - `paths`: only `ensureDataDir` and `statMtimeMs` moved in - every
    other export in both products' `paths.ts` is that product's own data
    layout (`PACKAGES_DIR`, `backupDir`, `STACK_DATA_DIR`'s `dataDir`,
    ...), which stays where it is.
  - `diagnostics`: neither product's report is generic (each reads its
    own DB, health list, or settings), so nothing named `diagnostics`
    moved. The one reusable piece buried in the Stack's version - a
    dependency-free stored-ZIP writer - moved in as `zip.ts`
    (`createZipArchive`), since that's what it actually is.
  - `hardware`: the Stack's version was the superset (disk stats, OS
    version, computer name, an injectable clock for deterministic cache
    tests) and became the base; `detectHardware()` takes an optional
    `diskPath` rather than importing a product's `paths.dataDir`.
  - `openapi`: identical in both; `apiRouter()` is now generic over the
    caller's own Hono `Env` type parameter instead of importing a
    product's `AppEnv`.
  - `secretThrottle`: rewritten as `createThrottle(options)` (a factory,
    so two UNRELATED callers never share bucket state) plus a standalone
    `getClientIp(c, { trustProxy })` - neither product's version could
    move as-is, since each read a product-specific trust-proxy flag.
    **Adoption note (a code review caught the real trap here):** Home's
    own sign-in throttle today is one module-level map shared across
    every sign-in route (`totp.ts`, `passkeys.ts`, `auth.ts`,
    `middleware/auth.ts`, ...), deliberately global so one host can't
    hammer every sign-in surface in parallel for a combined budget
    larger than 20 fails/15 min. Home's adoption commit must create
    exactly ONE `createThrottle()` for that whole budget and share the
    same instance across every one of those route files - calling
    `createThrottle()` once per route file (mirroring today's per-file
    imports) silently multiplies the allowed attempts by the number of
    routes. `secretThrottle.ts`'s own doc comment on `createThrottle`
    states this rule now.
  - `hlc`, `rateLimiter`: Home's version, rewritten as factories
    (`createHlcClock(nodeId)`, `createRateLimiter()`) for the same
    "no shared global state across unrelated callers" reason; `hlc`'s own
    `seedHlcFromDatabase()`/`HLC_BEARING_TABLES` (Home's own 19 DB
    tables) stayed in Home.
  - `id`: only `randomSuffix` moved in (plus a small `newPrefixedId`
    helper) - every `newXId()` function in Home's version names a
    Home/spec record type and stays there.
  - `secrets`, `keystore`, `backupCrypto`: Home's versions, each now
    takes its dependency explicitly (`keystore.ts`'s `createKeystore
    ({ keysDir, appId })` instead of reading `@/lib/paths`'s `dataDir`
    and a hardcoded `"maipai-home"` account/service namespace;
    `secrets.ts`/`backupCrypto.ts` take a `Keystore` instance rather than
    importing `keystore.ts`'s module functions directly). A Windows DPAPI
    protection failure in `keystore.ts` now throws
    `KeystoreProtectionFailedError` instead of silently writing the raw
    hex key to disk unprotected (a code review on this same commit caught
    the original carried-over Home behavior doing that).
  Two small internal helpers exist only because two of the above modules
  would otherwise duplicate each other: `aesGcm.ts`
  (`aesGcmEncrypt`/`aesGcmDecrypt`, the one AES-256-GCM call `secrets.ts`
  and `backupCrypto.ts` both build their own serialization on top of) and
  `boundedMap.ts` (`evictStaleIfFull`, the one "cap the map, sweep stale
  entries when full" shape `rateLimiter.ts` and `secretThrottle.ts` both
  need). `hlc.ts`'s `compareHlc` also now uses a plain ordinal comparison
  instead of `localeCompare` (locale/ICU-dependent otherwise, which two
  replicas could resolve differently) and `parseHlc` splits only on the
  first two colons so a colon-bearing nodeId (a MAC-derived id) survives
  whole instead of being truncated. `hardware.ts`'s cache is keyed by
  `diskPath`, not time alone, so two calls with different `diskPath`
  options within the TTL never return each other's disk figures.
  Every module's tests are carried or (where nothing existed, or the
  API changed) written fresh against the new shape; `bun test` is 126
  passing across the 18 modules (16 extracted + the 2 internal helpers).
- `spec/`: not moved. A README points at `home/spec`, still the source of
  truth until `spec-v0.1.0` (step 0c) moves it here whole.

## Tooling

`scripts/check.sh` runs each populated workspace's own `lint` and `test`
scripts, then the pinned `@maipai/standards` core
(`std-v0.2.0`, `../.github` by default, `MAIPAI_STANDARDS_DIR` overrides).
No workspace here uses a separate formatter (`eslint`/`tsc` are the lint
step, matching every other `getmaipai` repo; none uses `prettier` as a
gate either, only as an occasional editor tool) so there's no separate
format-check command to wire in beyond that.

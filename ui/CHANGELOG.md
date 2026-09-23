# Changelog (`@maipai/ui`)

All notable changes to the `ui` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `ui-vX.Y.Z`. Everything stays `0.x` until Home's adoption proves it.

## [0.5.35] - ui-v0.5.35

`dashboard/layouts/full/`'s `Header.tsx` and `FullLayout.tsx` gain a
header-extra slot: a new `HeaderExtraContext.tsx` (`HeaderExtraProvider`,
mounted once in `FullLayout`; `useHeaderExtra(Component)`, called by a
page deep inside the Outlet) lets a page put its own content on the
header bar's left side, in place of the default Search field, without
forking either component. The slot's value is a component type, not a
rendered element (the same shape `elements/thread.aui.tsx`'s own
`ComposerExtra` slot already uses) - a rendered element is a fresh
object identity every render, which would have re-set the slot on every
render and re-rendered `FullLayout`'s whole subtree in a loop, caught
designing this rather than found live. Default unset; no existing
caller's render changes. Upstream (shadcndashboard) has no such slot
either, checked against its own main branch first - see
`docs/dashboard-upstream.md`'s own draft issue for that project, not
yet filed (the owner's call, not this session's).

## [0.5.34] - ui-v0.5.34

`elements/thread.aui.tsx`'s `ThreadComponents` gains an optional
`ComposerAddAttachmentOverride?: ComponentType` slot - when set, it
replaces the built-in `ComposerAddAttachment` button outright instead of
rendering beside it (the way `ComposerExtra` does). A caller whose own
attach affordance is a grouped menu, not a single-click file picker,
needs the one "+" in that spot to be its own control, not a second bare
button next to it. Unset, every existing caller's render is unchanged.

## [0.5.31] - ui-v0.5.31

`elements/thread.aui.tsx`'s `ThreadComponents` gains an optional
`ComposerExtra?: ComponentType` slot - when set, it renders in the
composer's own action row, beside the attach button. Matches the shape
`AssistantMoreItems`/`AssistantActionBarExtra`/`AssistantMessageFooterExtra`/
`Indicator` already established: an append point for a product-specific
control (a response-mode toggle, e.g.) that belongs in the shipped
composer's own row rather than forked into it by hand. Unset, every
existing caller's render is unchanged.

## [0.5.30] - ui-v0.5.30

`elements/sources.tsx`'s list layout: both the title and domain spans
now get `min-w-0` (a flex child's default min-width is `auto`, not `0`,
so `truncate` silently did nothing on either span before this) - an
unusually long title or domain no longer widens the row past its
container. The domain also drops `shrink-0` for `max-w-[40%] shrink`,
so it still yields most of the row's width to the title even when it's
long. Found by an automated review on the upstream PR for this Element's
own `layout` prop (`ui-v0.5.26`), ported back here to keep the two
copies identical in behavior.

## [0.5.29] - ui-v0.5.29

`elements/thread.aui.tsx`'s `ThreadComponents` gains an optional
`Indicator?: ComponentType` slot - when set, it replaces the pending
affordance shown for a running assistant message with no content yet
(previously a hardcoded, hand-drawn `<span>●</span>`). Unset, the
default now renders the shipped `ThinkingIndicator` Element (a
shimmering label plus an optional elapsed-time stamp) instead of that
bare span - a real Element in place of hand-drawn prose, matching this
kit's own "no hand-built UI" rule; existing callers see the same
generic "Thinking…" text, just through the real Element.

## [0.5.28] - ui-v0.5.28

`elements/tool-timeline.tsx`'s `ToolTimeline` now keys each rendered step
by array index instead of `step.chip` - a review (landing TOOL-EVENTS-01's
frontend half, home) found two calls to the same package in one turn
produce two steps with the identical chip text, colliding on an
identical React key. Same class of bug and same fix `elements/sources.tsx`
already got for `source.domain` (`ui-v0.5.26`).

## [0.5.27] - ui-v0.5.27

CHAT-UI-03 (Jesse's own ChatGPT comparison, 2026-09-22). Four fixes to
`elements/thread.aui.tsx`: the sidebar footer's icon-collapsed mode
(`tokens.css`) now keeps Settings/Help visible as icons instead of
disappearing (`Sidebar.tsx`'s own `hide-menu` wrapper hid the whole
block, icons included, not just the label); `UserMessage`'s own action-
bar wrapper gets the same `min-h-7.5` reserved height
`AssistantMessage`'s footer already had, so hovering a previous message
no longer shifts the layout below it when the row unmounts
(`ActionBarPrimitive.Root`'s own `autohide` truly unmounts, not just
hides).

Two new `ThreadComponents` slots, both optional and default-unset (no
existing caller's render changes): `AssistantActionBarExtra` renders as
the last item in the assistant message's own action bar, after "More";
`AssistantMessageFooterExtra` renders as a block-level sibling after the
whole footer row, for content a bar-row trigger expands that doesn't
belong inside the bar's own single icon row.

`elements/sources.tsx`'s `Sources` gains an optional `hideTrigger?:
boolean` prop (default `false`, unchanged for every existing caller) -
a caller can render only the `Collapsible`'s content, driving
`open`/`onOpenChange` from a trigger it places elsewhere (the two new
slots above, e.g.). `SourceGlyph`, the row's own favicon-style glyph,
is now exported so that caller's own trigger can reuse it instead of a
second hand-rolled copy.

## [0.5.26] - ui-v0.5.26

`elements/sources.tsx`'s `Sources` gains an optional `layout?: "grid" |
"list"` prop (default `"grid"`, every existing caller unchanged) - a
one-line-per-source list (a favicon glyph, title, then domain), the
shape shadcn.io's own AI Sources uses for a caller whose reply text
already carries the source detail the grid's own cards exist to show.
No new component: the same `Collapsible` trigger and collapsed-by-
default behavior, a second render branch inside the existing
`CollapsibleContent`. Also fixes a real bug found live wiring this:
both layouts keyed each row by `source.domain`, so two different pages
on the same site in one reply produced two rows with the identical
React key - keyed by array index instead.

## [0.5.25] - ui-v0.5.25

`dashboard/components/ui/hover-card.tsx`'s `HoverCardContent` gains a
`container` prop, threaded straight through to the underlying
`PreviewCardPrimitive.Portal`'s own `container` (Base UI already exposes
it there; nothing here adds new positioning logic, just makes an
existing knob reachable). Found needed live: CHAT-UI-02's own peek
overlay defaulted to portalling into `document.body`, anchored to the
small trigger button's own rect - close in size and look, but not
pixel-equal to the real thread-list column's box the peek is meant to
stand in for. Portalling into the SAME container the real column is a
flex sibling of (rather than `document.body`) is what lets a consumer's
own `side`/`align`/offset math resolve against that column's own local
origin instead of the viewport's.

## [0.5.24] - ui-v0.5.24

`elements/thread.aui.tsx`'s two real action bars, extended, not forked:

- `AssistantActionBar` gains a read-aloud toggle (`ActionBarPrimitive.Speak`/
  `.StopSpeaking`, gated on `s.thread.capabilities.speech`, the same pattern
  the existing feedback buttons already use for their own capability), and a
  new `ThreadComponents.AssistantMoreItems` slot rendered after the built-in
  Export as Markdown item in the "More" menu - the append point a consuming
  app needs for a product-specific menu entry (an admin diagnostic, a stats
  reveal) that has no place in the kit itself. Both are additive and
  `undefined` by default; nothing changes for a consumer that doesn't pass
  them.
- `UserActionBar` moves from a hover-reveal column floating to the left of
  the bubble to a static row under it, right-aligned: a relative timestamp
  (the kit's own `formatRelative`), then retry, edit, copy. Retry has no
  shipped primitive of its own - `ActionBarPrimitive.Reload`'s underlying
  `MessageRuntime.reload()` throws outright on a non-assistant message
  (`@assistant-ui/core`, "Can only reload assistant messages") - so it
  drives the identical sequence `ActionBarPrimitive.Edit` +
  `ComposerPrimitive.Send` already do (`aui.composer.beginEdit()` then
  `.send()` in the same tick, both real, tested assistant-ui behavior:
  `beginEdit()` prefills the composer from the message's own text, and
  `send()` with nothing changed resubmits it as-is), from one button
  instead of two, rather than forking anything.

## [0.5.23] - ui-v0.5.23

`Footer.tsx` (`layouts/full/shared/footer/Footer.tsx`) now returns
`null`: demo content, the template vendor's own copyright line and
"Support"/"License" links pointing at their site - the same
strip-not-fork treatment as ui-v0.5.22's `V.1.0` `Badge`. Also: a
README note on why a tag bump is two edits (the tag name and
`package.json`'s own version, together), after ui-v0.5.21 was cut
with only the first and had to be replaced.

BRAND-01 follow-ups, found live on 8787: (1) `darklogo.svg`/
`whitelogo.svg` (the wordmark pair, ui-v0.5.21) looked undersized -
their own `<image>` used `preserveAspectRatio="xMidYMid meet"` inside
a `viewBox="0 0 100 32"` that doesn't match either source PNG's real
ratio (3:1 and 2.667:1), so the art letterboxed inside its own slot
before `FullLogo.tsx`'s fixed `width={100} height={32}` ever got a
say. `FullLogo.tsx`'s own attributes stay untouched (byte-for-byte),
so the rendered box is always exactly 100x32 regardless of the SVG's
content - `max-w-[120px]` on the `<img>` never actually engages
(100 &lt; 120 already, nothing for it to cap). Both files now use
`preserveAspectRatio="none"`, stretching the art to fill that fixed
100x32 box edge to edge (a small, imperceptible non-uniform scale at
this render size) instead of leaving visible padding around it - the
achievable version of "fill the slot," given the box itself can't
grow past what `FullLogo.tsx` already fixes. (2) The rail's own
header row sat 1px lower than the top header's, because `tokens.css`'s
own `[data-slot="sidebar-inner"]` deviation rule made the sidebar
panel's 1px border transparent but left its width alone - a border
occupies its own layout space whether or not it's visible, unlike
`outline`, which never does. Now `border-width: 0` there instead of a
transparent color; the matching `[data-slot="sidebar-inset"]` outline
rule needed no change (confirmed, not assumed).

Rail restructuring, owner-ruled: `sidebaritems.ts` drops the System
group (Settings alone) and the whole Manage group (Engines, Updates,
Repairs, Backups) - those four routes stay real, reachable from the
dashboard's own stat cards and from a new "Manage" section on
Settings' own Household tab (`home`'s own change), not permanent rail
weight. `NavUser.tsx` (the rail's bottom slot, the same vendor-time
data class as `sidebaritems.ts`) drops the template's own "Help
Center"/"Documentation" demo links for Settings (moved down from the
retired System group) and Help (Home's own user guide).

## [0.5.22] - ui-v0.5.22

CHAT-UI-01, owner-ruled: the section-heading renderer in the vertical
sidebar's `nav-collapse` draws a literal `"..."` in icon-collapsed
mode and reveals the full heading text on hover - ruled out on sight
("I should not see ... for sections or be able to hover and see the
label"), the same class of owner call as the "fewer lines" kit rules.
`tokens.css` hides the heading `<span>` entirely in collapsed mode
(scoped by its own exact utility-class combination, the only hook
available without touching the vendored component itself); nothing
about the component's own markup changed.

## [0.5.21] - ui-v0.5.21

BRAND-01: `FullLogo`'s and `Logo`'s own asset imports (`darklogo.svg`,
`whitelogo.svg`, `logoicon.svg`, `logoicon-dark.svg`) now carry MaiPai
Home's real logo and icon mark instead of the template's own "Shadcn
Dashboard" wordmark - branding data, not component logic, the same
class as `sidebaritems.ts`; the components themselves are unchanged.
The sidebar header's hardcoded `V.1.0` `Badge` (demo content) is
stripped - a version number belongs to the product showing it.

## [0.5.20] - ui-v0.5.20

Settings: the person.storage section title (SET-TITLES-01, the
registry-wide test's one find)

## [0.5.19] - ui-v0.5.19

SET-TITLES-01: add friendly section titles for household storage and
person allowance settings.

## [0.5.18] - ui-v0.5.18

LOOK-01's own follow-up: ui-v0.5.17 retired `.style-studio`/`.style-
calm` (the /next body-class mechanism) but missed the OLD SHELL's own,
separate `data-look="studio"` mechanism - a real, live styling system
(the main nav rail's pill margin/height/padding/gap/radius/icon-size/
font-weight in `blocks/dashboard/components/nav-main.tsx`, plus
`tokens.css`'s own tile-radius/canvas-background/group-label/divider/
active-gradient rules), not vendored, not the /next template's own
convention. Since `data-look` can now never be "studio" again, every
one of those rules had gone permanently dead the moment ui-v0.5.17
landed, silently reverting the old shell to whatever Calm's own
plainer fallback was - and since Studio was the registry default
every fresh person already saw, that's a real, if belated, regression
for most people, not a cosmetic one. Fixed the same way as
ui-v0.5.17: Studio's own values promoted to the unconditional
selector, Calm's own fallback (where one existed) retired alongside
it, verified against each rule's own built CSS before promoting it -
so what's on screen doesn't move for anyone already on the default.

## [0.5.17] - ui-v0.5.17

LOOK-01 (owner ruling: "I like the black as the default, same as the
shadcn dashboard example, but we should be using themes and have a
black theme as our default" - the default is a named shadcn theme,
not a Home name that hides what it is). `.style-studio`/`.style-calm`
(and their `.dark` pairs) retire from `dashboard/css/globals.css`:
both were geometry-only presets over the exact palette the file's own
bare `:root`/`.dark` already carries - `neutral` is that identical
palette, byte-for-byte, so `ui.look`'s new default renders it with no
preset needed, and the template's own default tile geometry already
matches what `studio` set. Their now-dead `@custom-variant style-
studio`/`style-calm` declarations retire alongside them (checked
live: neither was ever used as a `studio:`/`calm:`-style Tailwind
prefix in this kit's own source). `ui.look`'s own enum change (spec-
v0.1.15) and Home's own data migration for stored `studio`/`calm`
values land in the matching Home-side item, not here.

## [0.5.16] - ui-v0.5.16

HOME-UI-04f widened: the owner's ruling with a reference picture -
shadcn's own dashboard-01 block (dark) is the density he wants, the
same inset-sidebar layout as ours with exactly three lines fewer. Two
more fills go transparent (`tokens.css`, on top of ui-v0.5.15's
hairline-grid fill): the sidebar panel's own box border
(`[data-slot="sidebar-inner"]`'s border-color) and the main content
panel's own outline (`[data-slot="sidebar-inset"]`'s outline-color).
Widths are untouched (no layout shift); every card keeps its own
`ring-1 ring-foreground/10` and the header keeps its `border-b`. No
vendored file edited.

## [0.5.15] - ui-v0.5.15

The owner's ruling, 2026-09-21 ("still too many lines, tone it down,"
said twice, HOME-UI-04f): the template's own hairline-grid pattern
(`p-px gap-px bg-border` on a wrapper `grid`, used across the modern
dashboard, tables, form-layouts and user-profile views) wraps rounded
`.cn-card` children that already carry their own `ring-1
ring-foreground/10` - measured live on 8787, every card was lined
twice (its own ring plus the wrapper's fill bleeding through the
hairline gap), and the square wrapper fill peeked past each card's
rounded corners. `tokens.css` gains one rule, scoped to that exact
class combination via `~=` attribute selectors (never a vendored file
edited): the wrapper's fill goes transparent, leaving each card's own
ring as the only line.

## [0.5.14] - ui-v0.5.14 (CHAT-SDK-01, the coordinated bump ui-v0.5.4 named as a gap)

`@assistant-ui/react`: `0.15.18` to `0.15.21`, the only explicit range
this package's own `package.json` changes - `src/elements/
thread.aui.tsx`'s `ThreadMessage.metadata.modality` read needs
`@assistant-ui/core@0.3.20`, and `0.15.21` is the lowest
`@assistant-ui/react` whose own dependency range reaches it (`0.15.18`
depended on `@assistant-ui/core@^0.3.17`; `0.15.21` on `^0.3.20`).
Two more versions move as a direct consequence, inside `bun.lock`,
with no `package.json` range of their own to change: `zod`, moved by
`@assistant-ui/react`'s own dependency range from `^4.5.4` to
`^4.6.5` (this package's own `zod: "^4.0.0"` already allowed either);
and `@assistant-ui/react-markdown`, still pinned here at `^0.14.14`,
resolving to `0.14.16` under that same range once its own peer
(`^0.15.0`, satisfied by `0.15.21` same as `0.15.18`) let the
lockfile pick the newer patch.

This time the coordinated half of ui-v0.5.4's own gap note actually
happened: Home's `frontend/package.json` bumps to the identical
`0.15.21` in the same item (never a kit-only patch - that was exactly
what broke `0.5.1`-`0.5.3`, two different module instances of
`@assistant-ui/react` because only one of the two consumers moved).
This package's own `src/assistant-ui/` wrappers (Home's existing,
shipped chat) needed no changes at all: typecheck, lint and the full
`bun test` (382 pass) are clean at `0.15.21` with zero source edits -
unlike `0.5.1`'s attempt, nothing in the wrapper layer or the Elements
touched an API surface that actually moved between `0.3.17` and
`0.3.20`. Home's own frontend suite and backend (the `zod` ripple
`0.5.3` also found, 13 unrelated backend failures) are re-verified in
the matching Home-side item, not here - this package's own gate only
proves its own two consumers of `@assistant-ui/react`, not a
downstream workspace's.

## [0.5.13] - ui-v0.5.13

Found live re-verifying ui-v0.5.12 in a real browser, not just by scripted
diff: `/next` still rendered Home's old navy hex, not the source's own
palette ui-v0.5.12 just swapped in. `.style-calm`/`.style-studio` carried
no color of their own (only `--tile-radius`), so they'd always inherited
from the bare `:root`/`.dark` above - correct back when this file's bare
default WAS Home's navy, wrong the moment ui-v0.5.12 made that bare
default the source's palette instead, because `@maipai/ui`'s own
`tokens.css` (deliberately still navy on its own bare `:root`/`.dark`,
"so the old shell does not shift") ties with this file's bare selectors
at equal specificity once a real consumer imports both under one root,
and whichever file is imported second wins - Home's own `shell/
tokens.css` imports `tokens.css` second, so its navy silently beat this
file's palette on every page, /next included. Both classes get full
palette blocks now (light and dark), matching the seven shadcn presets'
own shape, so /next's `useNextLook.ts` - which always puts one
`.style-<look>` class on `<body>`, never none - never depends on winning
that tie again. Verified live this time: a real Playwright session
against a running build, `getComputedStyle` on body/card, not a values
diff against source text alone.

## [0.5.12] - ui-v0.5.12

HOME-UI-04e ("one Tailwind root, the source's own default palette"):
two fixes in one item, tokens only, no structural change beyond the
CSS entry points themselves.

Root cause of a real, wide bug found comparing `/next/people` to the
shadcndashboard demo's own user-profile side by side at 1440px (ours
rendered the phone layout - hero stacked, cards full-width - while
upstream rendered a row and two columns): `tokens.css` and `dashboard/
css/globals.css` were each their own `@import "tailwindcss"` root in
the same Vite build. Two roots generate each unique utility class name
independently, and Tailwind's cross-root dedup places every colliding
class wherever load order puts it - here, `globals.css`'s lazy /next
chunk re-emitted every base utility (`.flex-col`, every `sm:`/`md:`/
`lg:`/`xl:` responsive variant among them) after `tokens.css`'s own
entry-loaded copy, winning every tie site-wide. `tokens.css` stops
being a root (its `@import "tailwindcss"`/`tw-animate-css`/`shadcn/
tailwind.css`/`tw-shimmer` move to `globals.css`, the one root left);
a consumer imports both under one entry now, `globals.css` first so
its `@import "tailwindcss"` leads, then `tokens.css` (Home's own
`shell/tokens.css` does exactly this). The narrower HOME-UI-04b
sidebar symptom rule this bug used to hide behind is retired, the
general fix covering it.

Second, Jesse's own side-by-side also found the wrong colors: the
vendored snapshot's default `:root`/`.dark` in `globals.css` had been
replaced with Home's own navy hex palette rather than the template's
own shipped one (its translucent `--border`/`--sidebar-border`/
`--input` among the casualties - the HOME-UI-04b border fix patched
one symptom of this, scoped to the sidebar only). Owner ruling
("identical to the source", the same standing ruling as HOME-UI-04b's
single border): the default palette is now the source's own, byte-
for-byte from its pinned commit, oklch throughout; Home's former
default survives as its own preset, `navy` (spec-v0.1.14 adds it to
`ui.look`'s enum), on the same mechanism as the seven shadcn base-
color presets already there.

## [0.5.11] - ui-v0.5.11

HOME-UI-04d ("one theme writer on /next"): tokens.css's two `@media
(prefers-color-scheme: dark)` blocks (the theme tokens, and the
old shell's `brand-logo-*` swap) now guard with `:not(.dark)`
alongside the existing `:not(.light)` - every real writer of the
class (`useAppearance.ts` for the old shell, the vendored
`ThemeProvider` for /next, mounted this same item) now always sets
an explicit `.dark` or `.light` on mount, `"system"` included, so
the media query is only ever the fallback before that first effect
runs. Without the guard, a person whose setting disagreed with the
OS (light chosen, OS dark, or the reverse) got this block's values
from the OS query while the `.dark`-scoped block stayed off - the
kit's own variables and the template's class-driven `dark:*`
utilities (the /next header's logo swap among them) split into two
different modes on the same page.

## [0.5.10] - ui-v0.5.10

HOME-UI-04b's theme-preset item, two parts:

- Seven new style-variant presets (`.style-neutral`/`stone`/`zinc`/
  `mauve`/`olive`/`mist`/`taupe`, light and dark each) join Studio and
  Calm, transcribed from ui.shadcn.com/create's own generated output
  for each base color (a real browser session, not reconstructed) -
  ui.shadcn.com/docs/theming's own current base-color list, not the
  five-color set this item started from.
- The inset sidebar's own double-border (owner finding, "single
  border, it is supposed to be identical to the source"): cloned
  shadcndashboard at its pinned commit and ran its own dev server to
  compare directly. Structure is byte-identical to ours (Sidebar.tsx's
  `**:data-[slot=sidebar-inner]:border-border`, FullLayout's
  `SidebarInset` outline - checked both). The difference is upstream's
  own dark theme's `--border: oklch(1 0 0 / 10%)`, a translucent
  overlay nearly invisible against its near-black background; Home's
  dark palette uses an opaque `#294563`, which reads as a real visible
  line against Home's navy. Matched with a scoped override
  (`.dark .sidebar-box [data-slot="sidebar-inner"] { --border: oklch(1
  0 0 / 10%) }`) rather than touching the global `--border` every
  bordered element in both shells reads.

Also folds in a code-review finding from the ui-v0.5.9 Elements
install: `ui/src/elements/*` uses `@/elements/...` self-imports, which
Home's `vite.config.ts` doesn't special-case the way it does `@/kit/*`
- recorded as a named gap in dashboard-upstream.md for CHAT-SDK-01,
not fixed here (nothing outside `ui/src/elements` imports it yet).


## [0.5.9] - ui-v0.5.9

The remaining 99 assistant-ui Elements (131 files total under
`ui/src/elements/`), installed from the default registry flavor
(dashboard-upstream.md has the full list) - Codex's work
(`codex/241-all-elements`), taken in as a patch since its own sandbox
couldn't complete the commons gate (can't copy `file:` deps). `tsc`
clean, `eslint src` 0 errors (6 pre-existing warnings, all
`react-hooks/exhaustive-deps` or unused-disable, none new), `bun test`
382/382, independently re-verified here rather than taken on Codex's
report alone. One fix on the way in: `ui/src/elements/ui/tooltip.tsx`
lost its `"use client"` directive somewhere in the install - restored
for consistency with its sibling Radix-based files (inert in this
Vite build either way, never a runtime difference, but the vendored
files should read the same as everywhere else that carries the
directive).

## [0.5.8] - ui-v0.5.8

`0.5.7`'s fix only covered the sidebar footer (Help Center,
Documentation - real `SidebarMenuButton` rows). The main nav
(`dashboard/layouts/full/vertical/sidebar/nav-items/index.tsx`) is a
different, hand-rolled row that never uses `SidebarMenuButton` at all:
its label, badge and chevron carry the template's own `hide-menu`
class, and every rule that would hide `.hide-menu` in `globals.css`
lives inside a `[data-sidebar-type="true"]` gate nothing in the
template or this repo ever sets - dead CSS in the vendored file
itself. Adds the missing base rule on the real, working gate
(`[data-collapsible="icon"] .hide-menu { display: none; }`) instead of
the phantom attribute. Icon-only, matching the template's own intended
collapsed state; does not add the hover-to-expand mini-sidebar the
same gated block also describes, since nothing asked for that.

## [0.5.7] - ui-v0.5.7

Fixes HOME-UI-04b's collapsed-rail finding: the dashboard template's
collapsed sidebar rendered as a full sidebar cropped to ~60px with
clipped labels ("Ho", "Cha", "Peo") instead of icon-only. Root cause
was not missing Tailwind scanning (`home`'s built CSS already carried
every `group-data-[collapsible=icon]:*` utility `dashboard/components/
ui/sidebar.tsx` needs) - it was `tokens.css`'s own `[data-slot=
"sidebar-menu-button"] { overflow: visible; }`, written for this
file's pre-shadcndashboard `ui/sidebar.tsx` (its `hitArea(1)` overhang)
but matching the template's identically-`data-slot`'d
`SidebarMenuButton` too, since this file is imported globally. An
unlayered plain-CSS rule beats any Tailwind-layered utility regardless
of source order, so it silently defeated the template's own
`overflow-hidden`. Scoped with `:not(.sidebar-box ...)` - `.sidebar-box`
exists only on the template's own sidebar root
(`dashboard/layouts/full/vertical/sidebar/Sidebar.tsx`), so the
exclusion targets exactly the component the original rule was written
for and leaves it untouched.

## [0.5.6] - ui-v0.5.6

The "Buy Now" upsell shipped in two places, not one - `0.5.0`'s own
strip only caught the promo footer inside the header's profile sheet.
Found live judging this stand-up's own acceptance screenshots (the
sidebar footer's own "Basic Plan / 70% / 68/100 monthly limit used /
Upgrade" card, linking to the template's own pricing page): exactly
the same class of content principle 6 already names, missed the first
time because it wasn't named `buy-now` like the other one.

### Removed
- `layouts/full/vertical/sidebar/NavSecondary.tsx` (the sidebar
  footer's fake usage meter and upgrade link) and its one call site in
  `Sidebar.tsx`. The sidebar footer now holds only `NavUser`.

## [0.5.5] - ui-v0.5.5

A real bug, found live capturing the stand-up's own acceptance
screenshots (docs/plans/shell-on-shadcndashboard-2026-09-21.md, step
1): the desktop sidebar rail never showed - the dashboard's KPI
content rendered fine, but `FullLayout`'s own `Sidebar` was invisible
at every desktop capture. Root cause: two separate `@import
"tailwindcss"` roots in one Vite build (this file's `globals.css`, and
the kit's own `tokens.css`) generate each unique utility class name
once, wherever Tailwind's cross-root deduplication happens to place
it - `.hidden`/`.md:flex` (`sidebar.tsx`'s own `data-slot="sidebar"`/
`"sidebar-container"` classes) landed in the kit's entry stylesheet,
loaded once at boot; this file's own lazy chunk (loaded later, when
`/next` is first visited) still generates its own `.hidden{display:
none}` for the same class name (used elsewhere in its own component
tree too), which - loaded after the entry stylesheet - wins the tie
for every `.hidden` element site-wide, overriding the entry's
`@media (width>=768px) { .md\:flex }` rule that was supposed to bring
the sidebar back on desktop.

### Fixed
- `css/globals.css` gains a small, plain (unlayered) CSS override
  restating `sidebar.tsx`'s own documented default (hidden below
  768px, visible at and above it) as CSS the cross-root collision
  can't shadow - Tailwind wraps its own generated utilities in
  `@layer`, and unlayered CSS always wins over layered CSS regardless
  of source order, so this doesn't depend on which root "wins" the
  dedup. Scoped to `[data-slot="sidebar"][data-variant]:not([data-
  mobile="true"])` and `[data-slot="sidebar-container"]` - a first,
  bare `[data-slot="sidebar"]` version (caught by review before this
  landed) also force-hid `sidebar.tsx`'s mobile `Sheet` branch (shown
  by its own open state, never by `hidden`/`md:block`) and its
  `collapsible="none"` branch (a plain, always-visible div with no
  responsive classes at all); `[data-variant]` is the one attribute
  only the desktop-fixed branch this fix targets ever sets.

## [0.5.4] - ui-v0.5.4 (reverts 0.5.1 and 0.5.3; the actual conclusion)

`0.5.3`'s bump broke something `0.5.1` didn't even reach: this package
already ships its own hand-built assistant-ui wrapper components
(`src/assistant-ui/`, predating the shadcndashboard/Elements program),
already in production use by Home's real chat page. Every one of them
shares this package's own single nested `@assistant-ui/react`
resolution - so bumping it for the *new* Elements moved the *existing*
wrapper components' internal React context to a different module
instance than the one Home's own `ChatPage.tsx` imports directly
(bare `@assistant-ui/react`, left at `0.15.18` throughout `0.5.1`-
`0.5.3` since nothing asked it to move). One React tree, two different
`AssistantRuntimeProvider`/`useAuiState` instances: found live as 18
frontend test failures ("You are using a component or hook that
requires an AuiProvider") the moment a consumer's full test suite ran
end to end, not just its typecheck.

There is no version of `@assistant-ui/react` this package can pin
today that serves both consumers at once: the existing wrapper
components need to stay exactly wherever Home's already-shipped chat
page's own direct import is, and the new Elements need whatever
version actually has `ThreadMessage.metadata.modality`. Reconciling
that needs a real, coordinated SDK upgrade (this package's wrappers,
Home's own `ChatPage.tsx` import, and Home's full test suite bumped
and re-verified together), not a kit-vendoring patch - named as a gap
for that upgrade rather than solved here.

### Changed
- `@assistant-ui/react`: back to `0.15.18` (as it was before `0.5.1`,
  and as `src/assistant-ui/`'s existing wrappers and Home's real chat
  page already depend on it being).

### Known gap
- `src/elements/thread.aui.tsx` (and anything else in `src/elements/`
  that reads a `@assistant-ui/core` field added after `0.3.17`) cannot
  be exercised by a consumer yet - not a rendering bug, a real,
  unresolved SDK-version floor. `home`'s `/next/chat` row (docs/plans/
  shell-on-shadcndashboard-2026-09-21.md's wiring table) is blocked on
  this, not on anything in that repo.

## [0.5.3] - ui-v0.5.3 (supersedes 0.5.2 as well)

`0.5.2`'s fix (adding `@assistant-ui/core` as a sibling dependency,
leaving `react` at `0.15.18`) only worked in *this* package's own
install: bun's isolated linker (the default for a workspace, which
`ui` on its own isn't but every real consumer of it is) gives
`@assistant-ui/react` its own private, hash-pinned copy of its
declared `@assistant-ui/core` dependency regardless of what a sibling
package.json entry says - the same isolation the linker is *for*, just
working against this particular fix. A sibling declaration can only
ever affect what a bare `import "@assistant-ui/core"` elsewhere
resolves to, never what `@assistant-ui/react`'s own internals resolve
to. There is no way to reach that without `react` itself declaring the
newer `core` - so `0.5.1`'s original diagnosis (bump `react`) was
right after all; what was missing was isolating the one *real*
consumer that couldn't tolerate the side effect (see
`home`'s own commit pinning `backend`'s `zod` to an exact version for
its own, matching fix on that side).

### Changed
- `@assistant-ui/react`: `0.15.18` -> `0.15.21` again (as `0.5.1` did).
  `@assistant-ui/core` is no longer a direct dependency of this
  package - `react`'s own `^0.3.20` range covers it without one.

## [0.5.2] - ui-v0.5.2 (superseded by 0.5.3, do not use)

Corrects `0.5.1`: bumping `@assistant-ui/react` to `0.15.21` (to reach a
newer `@assistant-ui/core`) also bumped that release's own `zod`
dependency to `^4.6.5`, and because Home's frontend and backend share
one bun workspace lockfile, that forced backend's own `zod` usage
(schemas passed into `@modelcontextprotocol/sdk` and `@hono/zod-
openapi`, both pinned to older zod majors' own nested copies) to split
across incompatible module instances - found live as 13 backend test
failures across the turn engine, safety boundaries, widgets and the
Deno sandbox, none of them related to this kit. `@assistant-ui/core`
alone, not `@assistant-ui/react`, is what `0.5.1`'s actual fix needed
(see below); pinning it directly leaves `react` and its `zod` range
untouched.

### Changed
- `@assistant-ui/react`: back to `0.15.18` (as it was before `0.5.1`).
- `@assistant-ui/core`: added directly at `0.3.20` (previously only a
  transitive dependency of `react`, resolved to `0.3.20` in this
  package's own, smaller dependency graph but to the older `0.3.17` in
  at least one real consumer's larger one - both satisfy `react@0.15.18`'s
  own `^0.3.17`, so declaring the version this kit's Elements actually
  need directly, rather than leaving it to whichever the graph happens
  to solve to, is the fix).

## [0.5.1] - ui-v0.5.1 (superseded by 0.5.2, do not use)

Attempted to fix the same version-skew bug `0.5.2` above actually fixes:
the vendored Elements (`src/elements/thread.aui.tsx`) read
`ThreadMessage.metadata.modality`, a field added to `@assistant-ui/core`
after the version `@assistant-ui/react@0.15.18` was built against.
Because `@maipai/ui` is subpath-imported directly with no dist build, a
consumer's own bundler resolves bare-package imports inside `src/`
(including `src/elements/`) from *this* package's own `node_modules` -
a consumer bumping its own pin never reaches it, only this package's
own pin does. Right diagnosis, wrong fix: bumping the whole `react`
package pulled in an unwanted `zod` bump along with it. See `0.5.2`.

## [0.5.0] - ui-v0.5.0

Step 1 of the shell-on-shadcndashboard program (`home/docs/plans/
shell-on-shadcndashboard-2026-09-21.md`): the vendored snapshots the
program's visual stand-up builds on, not yet wired into any product.

### Added
- `src/dashboard/`: shadcndashboard (MIT, commit `6f99c0b0`), the shell,
  layouts, pages and 55 shadcn/Base UI primitives the stand-up's `/next`
  routes mount - demo apps, MSW, Tiptap, the "Buy Now" upsell and
  `isPro` badge, and one of its two icon systems stripped at vendoring.
  See `docs/dashboard-upstream.md`.
- `src/elements/`: assistant-ui's Elements registry (MIT), the chat
  building blocks (thread, thread-list-sidebar, composer, reasoning,
  tool-call, sources, artifact-card, canvas-split, the voice orb,
  read-aloud) for the stand-up's `/next/chat` route.
- `globals.css`'s (in `src/dashboard/css/`) two style presets, `.style-
  calm`/`.style-studio`, on the template's own body-class mechanism -
  the palette from `home/docs/design/home-pages-2026-09-20.md`, shared
  by both looks; only `--tile-radius` differs so far.
- `NOTICE` and `docs/dashboard-upstream.md` carry both snapshots'
  attributions and what was stripped or fixed at vendoring.

## [0.4.9] - ui-v0.4.9

The phone header fold (owner reference, "The phone composition,"
2026-09-20): on phone, search, theme and notifications move under the
avatar's own menu and into the command palette instead of sitting as
three separate header icons, and the bell's unread count becomes a dot
on the avatar rather than its own badge.

### Added
- `Shell.tsx` gains two new optional props: `phoneHeaderTitle` (a
  phone-only replacement for `headerTitle` - a product's own compact
  wordmark) and `phoneHeaderActions` (a phone-only replacement for
  `headerActions` and the visible search field - a render prop, since
  the product's own phone menu needs a way to open the kit's command
  palette without its open state becoming a controlled prop). Both
  omitted: the header renders exactly as before this version, so
  Stack and Catalog see no change until they adopt the fold.
- `primitives/Avatar.tsx` gains an optional `dot` prop, reusing the
  vendored shadcn `AvatarBadge` rather than a hand-rolled badge.

### Fixed (found across two review rounds on this same branch)
- The phone fold's own dev warning (misconfigured `phoneHeaderActions`
  with no `search`) fired even when `phoneHeaderActions` was given
  alone - a documented-inert combination where it's never invoked at
  all - and re-fired on every render for a render prop or search
  config passed as a fresh inline value, instead of once per real
  presence change. Fixed by gating on `phoneHeaderTitle` too and
  keying the effect on booleans, not references.
- `SidebarTrigger` disappeared entirely for a 640-719px viewport once
  a consumer adopted the fold: the fold's own gate is the JS phone
  breakpoint (under 720px), but the trigger's own visibility was the
  Tailwind `sm:` breakpoint (640px) - a pre-existing, previously
  inert mismatch this diff was the first to make an element vanish
  over. Fixed by rendering the trigger in both header branches; its
  own CSS class handles visibility correctly either way.
- A stray future-dated comment (2026-09-21, everything else in the
  same diff 2026-09-20) normalized for consistency.

## [0.4.8] - ui-v0.4.8

Follow-up to `ui-v0.4.7`, fixing a kit-internal import path that broke
every downstream consumer the moment the tag was actually pinned.

### Fixed
- `thread-list.aui.tsx` imported the new `thread-list-groups` module via
  a bare `@/assistant-ui/thread-list-groups` alias. Every other
  cross-file import inside this kit uses the `@/kit/...` prefix - bare
  `@/` resolves to the CONSUMING project's own src root once this
  package is installed as a `file:` dependency, not this kit's own src
  root. The mismatch type-checked cleanly inside this workspace's own dev
  environment and only surfaced as `Cannot find module` when Home's own
  `tsc --noEmit` processed the pinned `ui-v0.4.7`. Fixed in both the
  import and the re-export in `thread-list.aui.tsx`, and in
  `thread-list-groups.test.ts`'s own import.

### Added
- A lint guardrail against a third occurrence of this exact bug class
  (a code review: nothing caught it the first two times). `eslint.config.js`
  now bans any bare `@/...` import that isn't `@/kit/...` inside the
  kit's own `src/`, including in `src/ui/**` and `src/assistant-ui/**`
  where the lucide/radix path restrictions are otherwise off. The
  pattern is one shared constant (`NO_BARE_KIT_IMPORT`) with
  `caseSensitive: true` reused across all three rule blocks, not
  copy-pasted three times - a fix-hunk re-review caught both that the
  first draft omitted `caseSensitive` (ESLint matches a bare regex
  case-insensitively, so `@/Kit/...` would have slipped past the same
  guardrail meant to catch it) and that the duplication itself risked a
  future edit landing in only one of the three copies. Verified by
  temporarily reintroducing both the lowercase and the cased-typo forms
  of the broken import and confirming `eslint` flags each, then
  restoring the fix.

## [0.4.7] - ui-v0.4.7

Follow-up to `ui-v0.4.6`'s own thread-list restoration, after a review
of Home's own consumer traced real runtime behavior end to end.

### Fixed
- `useThreadListGroups` sorted pinned threads into their own group but
  never actually applied it - pinning round-tripped through
  `updateCustom()` but had no visible effect on ordering. Fixed, then
  fixed again: the first attempt dropped every unpinned, dateless
  thread from the list the moment anything was pinned (an early-return
  branch that only ever carried the Pinned group forward); rewritten as
  a single pass that partitions pinned/unpinned and always groups both.
- The pinned partition now respects the `pinnable` prop, matching every
  other pin affordance in this file - previously it read `custom.pinned`
  unconditionally, so a `pinnable=false` caller with stale or shared
  pinned data would get an unexplained "Pinned" section with no control
  anywhere to undo it.
- `ThreadListNew` ("+ New chat") had no gate for a caller viewing
  someone else's list - a new `newChatEnabled` prop (default `true`)
  hides it, closing the same cross-person-splice gap `pinnable`/
  `actions` already closed for the other controls.
- The grouping logic's own sort comparator re-fetched each thread's
  data on every comparison instead of reusing what the single scan
  already computed.

### Added
- The pure grouping logic moved to its own dependency-free module
  (`thread-list-groups.ts`, no React or `@assistant-ui/react` imports)
  specifically so it's unit-testable without a real assistant-ui
  runtime - importing it from `thread-list.aui.tsx` directly dragged in
  that file's own heavy transitive imports and broke under `bun:test`.
  A new test file covers the pin-ordering, the drop-bug scenario, the
  `pinnable=false` gate, the null-groups case, title search, and
  `skipFilter` - the first regression coverage this grouping logic has
  ever had.

## [0.4.6] - ui-v0.4.6

Restores ConversationsPage's own real functions into the thread list
(`ThreadList`, `ThreadListItem`), for Home's HOME-UI-02e: multi-select
with batch delete and a "clear all," pin/unpin on the row and its More
menu, and a caller-driven server-search mode so a caller whose own
adapter already searches message bodies isn't re-filtered client-side
by title on top of that.

### Added
- `ThreadListActions` (`batchDelete`, optional `clearAll`) and a new
  `actions` prop on `ThreadList` - opt-in, so a caller that doesn't
  supply it (Stack, Catalog) keeps today's single-thread-only rows.
  Multi-select state (a select-mode toggle, per-row checkboxes, a batch
  bar) is internal to this file.
- Pin/unpin, on the row (a small toggle, always visible when pinned)
  and in `ThreadListItemMore`'s own menu - piggybacks on
  `RemoteThreadListAdapter`'s own `custom`/`updateCustom` extension
  point (`@assistant-ui/core`'s own sanctioned shape for exactly this),
  not a new adapter method. Gated behind a new `pinnable` prop on
  `ThreadList`, since `updateCustom` is optional on the adapter type -
  a caller that doesn't implement it doesn't get a pin control that
  always fails.
- `onSearchQueryChange` prop, debounced 300ms - a caller with its own
  server-side search passes this and the list is trusted to already be
  filtered (title and anything else the caller's own adapter matches),
  skipping this component's client-side title-only re-filter.
  `useThreadListGroups` gained a `skipFilter` argument for this.

### Fixed (found across two rounds of code review before landing)
- The leading-slot reserved space (the checkbox or pin button) was
  36px against a real ~42px invisible hit-area reach - widened to 44px
  (`ps-11`), mirroring the End side's own existing `pe-9`→`pe-11` fix.
- That same reservation, and the pin button itself, weren't guarded
  against a not-yet-initialized thread (no remote id yet) or against a
  caller with `pinnable=false` - both now check `remoteId !== undefined`
  and `pinnable` before rendering or reserving anything.
- A destructive action's own success and the list-refresh that follows
  it shared one try/catch, so a reload failure after a successful
  batch-delete or clear-all was reported as the delete having failed.
  Split, with its own less alarming message.
- The debounce restarted on every parent re-render of an unmemoized
  `onSearchQueryChange` callback (a typical inline arrow function), not
  just on real search-text changes - now reads the latest callback via
  a ref instead of depending on its identity, and skips the one
  redundant call that used to fire on mount.
- The pin button's own touch target used a hand-rolled inset instead of
  the file's own established `hitArea(3)` helper, landing 8px under the
  48px floor.
- The `Dialog`/confirm/busy wrapper around `DestructiveConfirm` was
  re-duplicated three times in this file - the exact shape
  `DestructiveConfirm` was extracted to kill. Pulled into one
  `ThreadListConfirmDialog`.

## [0.4.5] - ui-v0.4.5

`ThingsTable`'s `rowActions`/`groupActions` prop had never had a real
consumer until home-b's Settings > Updates page (HOME-STACK-05), which
is how its a11y check caught two latent bugs no earlier page had
exercised: the "More actions" kebab button was a bare `size-8` (32px)
box with no touch-target extension (under docs/UI.md's 48px floor,
same class of gap the sortable header button had before `ui-v0.4.0`'s
own fix), and the Actions column header carried only an
`aria-label="Actions"` with no visible or assistive-tech-visible text
at all - `DataTable.tsx`'s own "Actions" header (an `sr-only` span, no
aria-label) already had the right pattern, so this now matches it
instead of inventing a second convention.

### Fixed
- The row and group "More actions" buttons both gain `hitArea(3)`,
  matching the sortable header button's own established fix.
- The Actions column header drops the bare `aria-label` for a visible
  (`sr-only`) "Actions" span.
- Two new regression tests in `ThingsTable.test.tsx` assert both fixes
  directly, since no test exercised `rowActions` at all before this.

## [0.4.4] - ui-v0.4.4

`ui-v0.4.3`'s own fix restated the brand row's 16px left inset as
`pl-4!`, but a live pixel measurement of the built capture still found
the tile clipped at x 0: `data-[slot=sidebar-menu-button]:p-1!`, a
leftover all-sides padding override on the same button, compiles to a
higher-specificity compound selector than the plain `pl-4!` (0,2,0 vs
0,1,0), so it deterministically won regardless of either rule's
position in the class list or the stylesheet - not the source-order tie
an earlier version of this fix's own comment first assumed.

### Fixed
- The brand button's padding is now three non-overlapping longhand
  sides (`py-1! pr-1! pl-4!`) plus an explicit collapsed-row override
  (`group-data-[collapsible=icon]:p-2!`, restating the primitive's own
  identical rule) - nothing here shares a side with anything else, so
  there is no specificity contest left to win or lose.
- A new regression test (`app-sidebar.test.tsx`) asserts the button's
  own `!important` padding tokens are exactly these four; verified live
  to fail against the original bug pattern and pass against the fix.

## [0.4.3] - ui-v0.4.3

`ui-v0.4.2`'s own committed capture still didn't match the reference:
COORDINATOR's own pixel measurement (2026-09-20) found the active pill
running the rail's full width (not inset), the brand tile clipped at
x 0 (not positioned in), and the group label sitting directly under
the tagline (no gap before it) - a visual scan of the capture had
missed all three. This release restates the owner's own literal
numbers for each, rather than the prior reconciliation to a single
"13px everywhere" figure that shipped in `0.4.2` without producing
them.

### Fixed
- Brand row: 16px left inset (own literal number, not the pills' own
  12px) and 20px top, both looks, unconditional - `app-sidebar.tsx`'s
  `SidebarHeader` and its brand `SidebarMenuButton`.
- 24px from the brand row to the first group label, one unconditional
  number (`SidebarHeader`'s own `pb-6`) instead of a look-split pair
  that could stack with the first group's own top margin.
- Group label and divider inset restated at 7px, both looks - the
  owner's own literal number for "the rail geometry, exactly," not the
  13px this shipped with after reconciling it to the pills' own inset.
- The page header (`Shell.tsx`): 16px top padding and 16px below the
  subtitle before the header's own bottom border (a fixed `h-16`
  centered the title block instead, so the subtitle touched the
  border directly); the content column now starts 24px under that
  border.

## [0.4.2] - ui-v0.4.2

A code review of `ui-v0.4.1` caught four real box-model bugs in the
same day's rail geometry before this shipped further.

### Fixed
- The nav pill's own `w-full` (the primitive's own base class) plus a
  non-auto margin on both sides (`mx-3`) is CSS's classic over-
  constrained block box - the spec drops `margin-right` to make it
  fit, so the pill's right edge overflowed the rail's own right edge
  by exactly its own right margin. `w-auto` overrides the base
  `w-full`, letting the browser compute the true width from the
  margins instead.
- The brand tile sat 8px further right than the nav pills below it:
  `SidebarHeader`'s own base `p-2` was stacking with the brand
  button's own left padding, while the pills had no container padding
  above them at all. Zeroed on the header so the brand button's own
  padding is the only source of inset, same as the pills.
- The Studio divider's own inset (`margin-inline: 13px`) was applied
  to the whole group container, shifting that group's own child pills
  and labels an extra 13px past what the first group had. Redrawn as
  a `::before` pseudo-element carrying its own independent inset,
  leaving the group's own box at zero margin.
- A stale comment still named the collapsed rail's own width as "the
  owner's own 64px," contradicting `0.4.1`'s own 72px - the "fixed
  shell" dimensions (rail 252/72, header 96, footer 40) are explicitly
  look-independent per the owner's own framing, unlike the rest of
  that finding's numbers; the changelog's own "all `studio:`-scoped"
  claim was corrected to match.

## [0.4.1] - ui-v0.4.1

Home's own HOME-UI-02d (phone dashboard, Conversations folds into
Chat, the rail's navigation correction): three real, previously-
unshipped kit gaps the phone tab bar and the rail's own reference-exact
geometry found.

### Added
- `PhoneNav`'s `max` prop (default 5, the existing behavior): a product
  can pin a smaller primary set before folding the rest under "More" -
  Home's own three-destination phone tab bar (Home, Chat, Apps) needed
  four slots total, not five. `Shell`'s own `phoneNavMax` threads it
  through.
- The rail's exact Studio geometry (owner findings, "The Studio look,
  the numbers," 2026-09-20 18:15 - a page built to reproduce the
  reference's own geometry, superseding an earlier, rougher "The rail
  geometry, exactly" pass the same day): item padding/radius/gaps, the
  active item's exact gradient stops plus a 1px inset ring and a soft
  glow, the divider and group-label colors, all `studio:`-scoped so
  Calm is unaffected. The collapsed rail's own width (72px, was 64px)
  is unscoped - that same finding names the fixed shell's own
  dimensions as look-independent, unlike the rest of its numbers, so
  both looks get the wider column.

### Fixed
- The active nav item's inset pills ran edge to edge, cut off at the
  rail's own right edge - `NavMain`'s items now carry a real margin
  against a flush rail (`app-sidebar.tsx`'s own side padding removed
  in favor of each item carrying its own inset), both looks.
- `NotificationPopover`'s unread-count badge anchored to the header
  button's own 32px box, not the 16px bell icon centered inside it -
  8px off on each axis, easily read as "floating above the bell" or
  overlapping a neighboring header control. Anchored to the icon's own
  wrapper instead; counts above 9 now show "9+".

## [0.4.0] - ui-v0.4.0

"Two looks, one setting" (owner ruling, 2026-09-20): Home shipped one
look, judged "nice, not a match" against the reference; this adds a
second, Studio, that matches it, and fixes the collapsed rail in both
(owner finding, same day).

### Added
- `[data-look]` on `<html>` as a second theme dimension alongside
  light/dark: a `studio:` Tailwind variant (`tokens.css`'s
  `@custom-variant studio`), a `--tile-radius` token (999px/circle at
  the zero-attribute default, 12px rounded square under
  `[data-look="studio"]`), a `--canvas-background` token, and plain
  attribute-selector CSS (against the kit's own stable `data-slot`/
  `data-collapsible`/`data-active` attributes) for the rail's own
  look-conditional group-label size, group divider and active-item
  radius/gradient-vs-flat - not Tailwind utility classes for those
  three, after `studio:`/`group-data-` stacked with certain bracketed
  arbitrary values turned out to depend on a fully fresh `bun install
  --force` of this package in every consumer to compile at all; see
  `tokens.css`'s own comment.
- `IconTile` and Home's own product-mark tile draw their radius through
  `--tile-radius` instead of a fixed `rounded-xl`.
- `ActionTile` and `MetricCard`'s label no longer truncate (owner
  finding: "nothing inside a card ever truncates" - found live as
  "Add a pers…"/"Open Repa…" on the dashboard's own quick actions).

### Fixed
- The collapsed rail (owner finding, "The collapsed rail," both looks):
  removed the second in-rail expand/collapse toggle (`rail-toggle.tsx`,
  deleted - the header's own `SidebarTrigger` is the only one now);
  `SIDEBAR_WIDTH_ICON` 72px → 64px; every collapsed nav row a real
  40x40 centered target (was 48px, off-center, `[&>svg]` bumped to
  20px) with its real touch target still floored at 48px via an
  unconditional `hitArea(1)`-style pseudo-element on the shared
  `sidebarMenuButtonVariants`, not a collapsed-only one (which silently
  failed to compile the same way the other stacked-variant attempts
  did); the active item's collapsed fill exactly 40x40, gradient in
  Studio and flat violet in Calm (a `background-image` layered over a
  `background-color`, so Studio's gradient always paints over Calm's
  flat color with nothing to override); `HubCard`'s collapsed state a
  40px tile with the hub icon and the status dot at its corner plus a
  real tooltip, not a lone dot in a circle.

## [0.3.3] - ui-v0.3.3

Four more real bugs, found by `home`'s screenshot-pipeline a11y gate on
the Apps page's first real run against `ThingsTable`/`FilterColumn`/
`ListRow`/`ChipRow` - none of these four files had ever been exercised
by a running page, or had a single test, before this.

### Fixed
- `ListRow`'s status text and dot (`blocks/phone/ListRow.tsx`) used
  raw, non-theme-aware Tailwind classes (`text-emerald-600`,
  `bg-emerald-500`, etc.) instead of the kit's own hue system - axe
  caught `emerald-600` failing WCAG AA on the phone list's light-theme
  background. Each `tone` now maps to a `--hue-*` var through the
  already-tested `hueTextColor()`.
- `ChipRow`'s chips (`blocks/phone/ChipRow.tsx`) were `min-h-11` (44px),
  4px under docs/UI.md's 48px touch-target floor. `min-h-12` (48px) - a
  visible-box fix, not `hitArea()`, since the chip's own box is meant to
  be the full target.
- `ThingsTable`'s sortable column header button (`blocks/things-table/
  ThingsTable.tsx`) had no touch-target treatment at all (as small as
  51x16px). A first fix attempt applied `hitArea(3)` alone - a review
  caught the math: `hitArea(3)` is a fixed +24px, so a 16px box only
  reaches 40px, still short of 48. `py-1` (+8px) brings the box to the
  24px `hitArea(3)`'s own doc comment assumes (16+8+24=48).
- `FilterColumn`'s group collapse/expand toggle (206x20px) and "Clear
  filters" link (84x36px) (`blocks/filter-column/FilterColumn.tsx`) had
  no touch-target treatment either - the same review caught the same
  math gap on both: the toggle needed `py-1` alongside `hitArea(3)`
  (20+8+24=52), and "Clear filters" needed `hitArea(2)`, not `(1)`
  (36+16=52, where 36+8=44 still missed the floor). Fixing the toggle's
  own box also surfaced a second bug the same review caught: an
  expanded group's toggle overhangs 12px below its own edge, and the
  8px `mt-2` gap before the first filter option left 4px of that
  overhang landing on the option's own clickable row (a tap there
  toggled the group instead of selecting the option) - `mt-3` (12px)
  exactly cancels it.

## [0.3.2] - ui-v0.3.2

Wiring the Apps page (HOME-UI-02, a things-table page) into real kit
components found three things the kit had never actually been exercised
against: two real bugs and one real gap.

### Added
- `TypeBadge` (`src/blocks/cards/TypeBadge.tsx`): spec section 1's "same
  shape as a status pill, without the dot" badge (App, Plugin, Person,
  Memory, Engine in Home) - `{label, hue}`, shares `StatusPill`'s
  15%-tint-plus-`hueTextColor` styling.
- `HUE_PILL_TINT`/`hueTintBackground()` (`src/utils.ts`): the shared 15%
  hue-tint-over-panel background `StatusPill` and `TypeBadge` both
  render, one definition after a review found each writing its own
  literal `15%` (plus a third copy in `contrast.test.ts`).
- `DetailsPaneAction.confirmLabel`: an optional confirm/cancel step for
  a destructive pane action (`onClick` widened to `() => void |
  Promise<void>` so the pane can actually await it). The pane fired
  every destructive action immediately with no confirmation at all,
  unlike `ThingsTable`'s own row actions - found wiring a real Remove.
  Async-safe by construction (a review pointed at the exact bug the
  schema renderer's own `ConfirmDialog` was built to avoid, 2026-09-05:
  Radix's default confirm closes on click before an async action
  settles): a `busy` state disables Cancel/Confirm/every action button
  and the pane's own Close/Escape until the confirmed `onClick` settles,
  and a `useEffect` keyed on `identifier`/`open` clears a pending
  confirm the instant the pane is re-rendered for a different item or
  closes, so a stale confirm can never fire against the wrong one.

### Fixed
- `StatusPill` rendered with no background tint or text color at all - a
  plain bordered span, missing spec section 1's "tinted with the status
  color at 15 percent and text in the color" entirely. It had zero real
  consumers until `DetailsPane`'s pane header got one (this same
  release), so nothing had ever caught it live. Its "muted" statuses
  (stopped/loading/disabled/unavailable, no real hue token) use the
  kit's own muted surface pair instead.
- The same contrast bug `ui-v0.3.1` fixed on `MetricCard`'s state link
  also existed, unshipped, on `StatusPill`'s and `TypeBadge`'s own pill
  background: a raw hue text color on a 15%-tinted pill fails 4.5:1 for
  every named hue in light theme (as low as 1.51:1 for teal), several in
  dark - worse than a plain panel, since the tint pulls the background
  toward the hue itself. `HUE_TEXT_MIX`/`hueTextColor()` (was
  `MetricCard`'s own local `STATE_LINK_HUE_MIX`, promoted here to
  `src/utils.ts` as the one shared ratio) fixes it; `contrast.test.ts`
  gained a block checking every hue, both themes, against this exact
  15%-tinted background.
- `PhoneModeContext` existed with no product ever providing it, so a
  page's `usePhoneMode()` call (`ThingsTable`/`ThingsPage`'s own phone
  layout switch) read `false` unconditionally, forever, regardless of
  actual viewport width. `Shell` now provides it, tracked with the same
  `useBreakpoint().tier === "phone"` (720px) `SidebarProvider` already
  uses for the rail's own mobile switch - a first version tracked its
  own separate 640px constant instead, caught by review as a second
  breakpoint that would have disagreed with the rail between 640 and
  719px.

## [0.3.1] - ui-v0.3.1

Two real bugs `ui-v0.3.0`'s own live verification hadn't caught, found by
`home`'s screenshot-pipeline a11y gate on its first post-merge run.

### Fixed
- `MetricCard`'s state link (`stateHref`, e.g. "View repairs") measured
  as low as 2.35:1 color contrast on the light theme (a raw hue color
  on white) and a 79x17px touch target, both under the kit's own
  floors. Fixed: the link's color mixes the hue 50/50 with the theme's
  own `--foreground` (`STATE_LINK_HUE_MIX`, exported so the new
  `contrast.test.ts` check tests the exact number the component uses,
  not a second copy); `hitArea(3)` plus real padding for the touch
  target. A first attempt at 60/40 still left teal under 4.5:1 (3.93:1)
  - `contrast.test.ts` now checks every named hue, both themes, against
    the panel surface, so the next ratio change is caught here instead
    of live.
- `PanelHeader`'s title rendered as an `<h3>` directly under a page's
  own fixed `<h1>`, an axe heading-order violation (no h2 in between).
  Fixed to `<h2>` - the panel header is the next real heading down from
  a destination's own title, not a third level.

## [0.3.0] - ui-v0.3.0

Home's shell and dashboard, to the owner's ruling on "Home's pages under
the kit" (home/docs/design/home-pages-2026-09-20.md, HOME-UI-01).

### Added
- `IconTile` (`src/primitives/IconTile.tsx`): the one icon tile every
  card, row, nav group heading and panel header draws through (spec
  section 1: 18% fill, 35% border, a soft glow, `md`/`sm` sizes).
- `PanelHeader` (`src/blocks/cards/PanelHeader.tsx`): a panel's header
  row - the icon tile, the title, a right-aligned "View all"/"Browse
  all" link with an arrow, a hairline underneath. `linkAriaLabel` lets
  two panels on one page share the same visible label with distinct
  accessible names.
- `HubCard` (`src/blocks/dashboard/components/HubCard.tsx`): the rail's
  bottom hub card (name, OS/version, a status dot and label), collapsing
  to its status dot alone when the rail is collapsed.
- `FooterBar` (`src/blocks/dashboard/components/FooterBar.tsx`): the
  fixed 40px status bar (version, linked operational counts, aggregate
  health) - rendered by a product into `Shell`'s new `footer` slot.
- `HeaderSearchField` (`src/blocks/dashboard/components/HeaderSearchField.tsx`):
  the header's real search field (a raised-panel input, the search icon,
  the ⌘K pill), icon-only under `sm`. `Shell`'s header now renders this
  in place of the old bare icon button when `search` is given.
- `arrow-right` and `calendar` added to `icons.ts`.
- `--hue-violet-deep` token (`tokens.css`): the active nav item's
  gradient stop (spec: "the gradient from section 1's violet to its
  deeper stop").

### Changed
- `Shell`: new `footer?: ReactNode` prop, rendered as a fixed row
  between the scrollable content and the phone tab bar (hidden on the
  phone). The header's three regions (title, search, actions) are now
  real flex siblings so the search field centers between the title and
  the header actions, instead of sitting flush right beside them.
- `MetricCard`, `CategoryTile`, `ActionTile`: restyled onto `IconTile`
  (18%/35%/glow, replacing each one's own inline hand-rolled tile).
  `CategoryTile` gained an optional `state` string (a caller's own state
  text, not just an installed count). `ActionTile` gained an optional
  `hue` (default blue, matching the reference's uniform Quick Actions
  tiles).
- `nav-main.tsx`: the active item's fill is now the violet-to-`--hue-
  violet-deep` gradient, not a flat color.

## [0.2.4] - ui-v0.2.4

### Fixed
- `ui-v0.2.3`'s own fix (below) shipped a regression: hiding a
  collapsed nav item's label span left the link with no accessible
  name at all (the icon carries no text, and `SidebarMenuButton`'s
  `tooltip` is hover/focus-only, never wired to `aria-label`) - a
  tablet-width a11y sweep caught every nav link failing axe's
  `link-name` check the moment the rail's own default-collapsed
  breakpoint (`defaultRailOpen()`, <1280px) applied. Fixed by adding
  `aria-label={item.title}` to the link itself, independent of the
  label span's own visibility.

## [0.2.3] - ui-v0.2.3

### Fixed
- `nav-main.tsx`'s nav item label had no `group-data-[collapsible=icon]:hidden`
  (`SidebarGroupLabel`, two lines above it in the same file, already
  had the right class) - sidebar.tsx's own `[&>span:last-child]:truncate`
  clipped the label to whatever sliver fit the collapsed 48px button
  instead of hiding it, so every row in a collapsed rail showed one
  stray letter next to its icon. Found live, step 5b's Home restart
  verification, against a real household's own report of the left rail
  looking broken. `app-sidebar.test.tsx` gained a regression test.

## [0.2.2] - ui-v0.2.2

### Fixed
- `thread-list.aui.tsx`'s own call-site overrides silently defeated
  every primitive's touch-target/type floor - invisible until Home's
  step 5b made the thread list a persistent, always-visible desktop
  column instead of a toggled drawer, when the full a11y sweep finally
  measured it for the first time. `ThreadListSearch` (`h-8`/`text-sm`
  on `Input`), `ThreadListNew` (`h-8`/`text-sm` on `Button`),
  `ThreadListItem`'s own row and rename `Input` (`h-8`/`h-7`,
  `text-sm`), and the "More options" trigger (`icon` + a `size-6`
  override, with no touch-target extension) all bumped to their
  primitive's own real default (or `icon-xs`, which keeps the same
  24px visual size but carries its own `hitArea()` extension). The
  loading skeleton row and the "More options" menu's own Rename/Delete
  items and the "No chats found" empty state got the same floor for
  consistency, found live in the same file. A review before landing
  caught two more: the trigger's own larger invisible hit area needed
  the row's reserved end-padding bumped from `pe-9` to `pe-11` (a real
  click near the row's end could otherwise land on the invisible
  more-button instead of the title or the rename field), and the
  Delete item's hand-copied destructive hover was missing the kit's own
  `DropdownMenuItem` dark-mode contrast bump.

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

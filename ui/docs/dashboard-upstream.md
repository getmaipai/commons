# The dashboard and elements, vendored

Two upstream snapshots back Home's shell and non-chat pages
(`docs/plans/shell-on-shadcndashboard-2026-09-21.md` in `home`): the
shadcndashboard template for the shell, layouts and pages, and
assistant-ui's Elements for the chat. Both are used exactly as they ship;
the only edits are import paths so the files resolve inside the kit, and
the strips named below (removing demo and marketing content is not
customizing a component).

## shadcndashboard (`ui/src/dashboard/`)

- Source: `github.com/shadcndashboard/shadcndashboard`, the Vite variant.
- Pinned commit: `6f99c0b04b7169f9ef12dc99946bc4faaeb40b9b` (2026-08-20).
- License: MIT, copyright Shadcn Dashboard - see `NOTICE`.

**Vendored**: the 55 shadcn/Base UI primitives (`components/ui/*`); the
modern dashboard, form, tables (basic/checkbox/hover/striped-row/data),
and user-profile page-level components; `FullLayout`, its header
(search, notifications, theme toggle, profile) and sidebar (nav items,
nav-collapse, `NavUser`, `NavSecondary`), and `BlankLayout`; the auth
views (login, register, forgot-password, two-steps, their shared forms,
error, maintenance) and the spinner; the `use-mobile` hook, the light/dark
theme context, `lib/utils.ts`; `globals.css` (the token set and the
style-variant mechanism); the specific image assets these views reference
(logos, the 404/maintenance illustrations, demo avatars, the two social
auth icons) under `assets/`.

**Stripped at vendoring** (not carried into the kit): the three demo apps
(Blog, Notes, Tickets) and their contexts/routes; Tiptap; MSW and the
`api/mocks` tree; the fake-data generator (`chance`); the "Buy Now" upsell,
in both places it shipped - the promo footer inside the header's profile
sheet, and `NavSecondary.tsx` (the sidebar footer's fake "Basic Plan" usage
meter and "Upgrade" link to the template's own pricing page, missed at the
initial vendoring and found live in this stand-up's own acceptance
captures - a real screenshot caught it, exactly what "every screenshot
gets looked at" is for); the `isPro` nav badge rendering (the field stays possible
on `ChildItem`/`MenuItem` only insofar as nothing sets it - the sidebar
data below never does); the sidebar header's `V.1.0` `Badge`
(`layouts/full/vertical/sidebar/Sidebar.tsx`, ui-v0.5.21) - a version
number belongs to the product showing it, and Home's real one already
has a page (`/next/updates`), not a second, hardcoded, always-stale copy
in the rail; one of the two icon systems - `@iconify/react`
goes, `lucide-react` stays (see "Icon substitutions"); `css/pages/app.css`
(calendar/demo-page rules, none of it reached by the kept views) and
`css/styles/style-lyra.css` (a demo-only component-class variant, not a
palette); the
template's local `@font-face` Geist files (no font binaries are tracked -
`docs/PACKAGES.md` - the kit's existing system-font stack stands in).

**Icon substitutions** (iconify string-name icons -> lucide-react
components, same visual role): `solar:calendar-minimalistic-linear` ->
`Calendar`, `solar:clock-circle-linear` -> `Clock`, `uim:master-card` ->
`CreditCard`, `solar:letter-linear` -> `Mail`, `solar:phone-rounded-linear`
-> `Phone`, `solar:global-linear` -> `Globe`,
`solar:link-round-angle-linear` -> `Link2`, `mdi:star`/`star-half-full`/
`star-outline` -> `Star`/`StarHalf`/`Star`, `material-symbols:download-
rounded` -> `Download`, `solar:add-circle-outline`/`pen-new-square-
broken`/`trash-bin-minimalistic-outline` -> `PlusCircle`/`Pencil`/
`Trash2`, `tabler:x` -> `X`, `ic:outline-edit` -> `Pencil`. The
`user-profile` page's social-link row (`streamline-logos:facebook-logo-2-
solid` and three others) has no lucide equivalent - lucide dropped brand
marks - so all four render a generic `Link2`; worth a real pass if/when
that row ships for real.

**Sidebar data**: `layouts/full/vertical/sidebar/sidebaritems.ts` keeps
the template's `ChildItem`/`MenuItem` shapes (component files import from
this exact path unmodified) but its content is Home's own - the plan's
stand-up list (Home, Chat, Apps; Household: People; System: Settings;
Manage: Engines, Updates, Repairs, Backups) - not the template's demo
navigation. A later wiring row can split the data out of the vendored
folder if that becomes friction; for now the component's own hardcoded
import path is the reason it lives here.

**Brand assets** (ui-v0.5.21): `assets/images/logos/darklogo.svg`,
`whitelogo.svg`, `logoicon.svg` and `logoicon-dark.svg` - the four
files `FullLogo.tsx`'s and `Logo.tsx`'s own import paths point at,
unmodified - now carry MaiPai Home's real logo and icon mark (from
`getmaipai/.github/brand/maipai-home-logo-{light,dark}.png` and
`maipai-home-icon-{light,dark}.png`, resized for a header logo and
wrapped as an SVG `<image>` so the raster art still fits `FullLogo.tsx`'s
own `width={100} height={32}` unchanged) instead of the template's own
"Shadcn Dashboard" wordmark, the same branding-data-not-component-logic
class `sidebaritems.ts` below already is - never redrawn, per
`docs/LICENSING.md`'s "third-party assets, download don't vendor" rule
read the other way: these are MaiPai's own, so the org's usual asset
pipeline (a release's own logo files, tracked here since the kit is
what every product's shell reads them through) applies, not a
substitution needing an upstream-note "stripped" entry. `FullLogo.tsx`
and `Logo.tsx` stay byte-for-byte. `logoicon.svg`/`logoicon-dark.svg`
have no current consumer inside `home`'s own `/next` tree (`Logo.tsx`
itself is never imported there, only by the vendored demo auth forms) -
swapped anyway so no vendored file under `assets/` still carries the
template's own branding, in case a later row wires `Logo.tsx` in.

**Style presets**: `globals.css` keeps the template's `dark`/`style-<name>` custom-variant mechanism. Since ui-v0.5.13 `:root`/`.dark` carry the template's OWN palette, byte-for-byte from the pinned upstream commit (light and dark, translucent borders included), per the org decision of 2026-09-21 ("the template's own palette is the default look"). `.style-studio` and `.style-calm` are full palette blocks equal to that default and differ only in `--tile-radius` (12px square, 999px circle); `.style-navy` is Home's former navy set from `docs/design/home-pages-2026-09-20.md`, kept as a preset; the seven shadcn base colors are transcribed from ui.shadcn.com. `ui.look` selects among them by body class.

**Dead CSS upstream, found live (HOME-UI-04b, ui-v0.5.8)**:
`css/globals.css`'s every `.hide-menu` rule (the main nav row's own way
of hiding its label/badge/chevron in icon-collapsed mode,
`layouts/full/vertical/sidebar/nav-items/index.tsx`) lives inside a
`[data-sidebar-type="true"]` gate that nothing in the template itself,
or anywhere in this kit, ever sets - unreachable in the vendored file
as shipped, not something adopting it here turned off. The working
substitute (`[data-collapsible="icon"] .hide-menu { display: none }`,
on the real `data-collapsible` state every consumer already sets) lives
kit-side in `tokens.css`, never in `globals.css` - the vendored file
stays exactly as upstream ships it, per this doc's own "used exactly as
it ships" rule.

## assistant-ui Elements (`ui/src/elements/`)

**A named gap for whoever wires these in (found in review, not yet a
real break since nothing imports `@/elements/*` from outside this
folder yet):** these files use `@/elements/...` self-references (the
registry's own convention, matching `dashboard/**`'s `@/dashboard/...`
style). Home's `frontend/vite.config.ts` only special-cases `@/kit/*`
(`kitAliasPlugin`, redirecting it into `@maipai/ui`'s own source); any
other bare `@/...` import - including `@/elements/...` - falls through
to the generic `resolve.alias` there and resolves against **Home's
own** `frontend/src/`, not this package's `src/`. `home/frontend/src/
elements/` doesn't exist, so the first real Home import of anything
under `ui/src/elements/` will fail to resolve until `kitAliasPlugin`
(or an equivalent) is extended to cover `@/elements/*` too - CHAT-SDK-01's
own problem to solve when it wires the chat onto these Elements, not
fixed here.

Installed from the default registry flavor on 2026-09-21:

```text
elements-surfaces
elements-range
elements-task
elements-loading-state
elements-thinking-indicator
elements-reasoning-panel
elements-streaming-text
elements-typing-indicator
elements-message-pair
elements-message-branches
elements-message-actions
elements-suggestions
elements-error-state
elements-tool-timeline
elements-terminal-block
elements-code-diff
elements-web-search
elements-inline-citation
elements-image-generation
elements-data-table
elements-number-ticker
elements-agent-plan
elements-subagent-list
elements-agent-status
elements-task-card
elements-approval-card
elements-recommendation-card
elements-artifact-card
elements-composer
elements-chat-panel
elements-empty-state
elements-thread-list
elements-scroll-anchor
elements-conversation-map
elements-todo-list
elements-message-queue
elements-message-attachment
elements-reviewable-diff
elements-file-tree
elements-elicitation-form
elements-retrieval-chunks
elements-chart
elements-trace-waterfall
elements-canvas-split
elements-voice-conversation
elements-read-aloud
elements-mcp-server-panel
elements-feedback-dialog
elements-quote-reply
elements-edit-message
elements-stopped-run
elements-message-timing
elements-connection-state
elements-agent-card
elements-web-preview
elements-draft-restore
elements-diagram
elements-flow-graph
elements-activity-graph
elements-tool-group
elements-context-breakdown
elements-model-picker
elements-reasoning-effort
elements-guardrail-notice
elements-day-separator
elements-speaker-identity
elements-regenerate-menu
elements-confidence-marker
elements-tool-error
elements-permission-grant
elements-computer-use
elements-code-runner
elements-document-reference
elements-memory-chips
elements-research-report
elements-map-answer
elements-math-block
elements-spec-sheet
elements-comparison-card
elements-timeline
elements-job-progress
elements-score-breakdown
elements-cost-meter
elements-quota-banner
elements-agent-handoff
elements-background-inbox
elements-checkpoint-history
elements-schedule-card
elements-prompt-library
elements-command-palette
elements-shared-conversation
elements-conversation-search
elements-thread-search
elements-launcher-bubble
elements-settings-panel
elements-onboarding
elements-mobile-composer
elements-context-display
elements-reasoning
elements-shiki-highlighter
elements-mermaid-diagram
elements-model-selector
elements-directive-text
```

- Source: `assistant-ui/assistant-ui`'s registry app (`apps/registry`),
  served at `r.assistant-ui.com`, the default (Radix) flavor - a "base"
  (Base UI) and "native" flavor also exist but weren't used, matching
  "used exactly as it ships" for a component that isn't the shell.
- Fetched from the live registry 2026-09-21; monorepo commit at fetch time
  `039c3c32822632f2a564164f089f538926886124`.
- License: MIT, copyright AgentbaseAI Inc. - see `NOTICE`.
- Install command (a shadcn registry add, via this repo's own
  `components.json` at `ui/components.json`, aliases pointed at
  `ui/src/elements/`):
  ```
  bunx shadcn@latest add \
    https://r.assistant-ui.com/thread.json \
    https://r.assistant-ui.com/threadlist-sidebar.json \
    https://r.assistant-ui.com/reasoning.json \
    https://r.assistant-ui.com/elements-tool-call.json \
    https://r.assistant-ui.com/elements-sources.json \
    https://r.assistant-ui.com/elements-composer.json \
    https://r.assistant-ui.com/elements-artifact-card.json \
    https://r.assistant-ui.com/elements-canvas-split.json \
    https://r.assistant-ui.com/elements-voice.json \
    https://r.assistant-ui.com/elements-read-aloud.json
  ```
  (`elements-voice` is titled "Voice Orb" upstream - the plan's "orb".)

**A CLI/registry mismatch, fixed by hand**: the registry declares these
files at `components/assistant-ui/elements/<file>` and their own source
imports each other by that same nested path aliased through `@/elements/
assistant-ui/elements/...`; `shadcn add` write them flat instead, at
`ui/src/elements/<file>` (no nested `assistant-ui/elements/` folder). Left
alone this breaks every cross-element import. Fixed by rewriting every
`@/elements/assistant-ui/elements/*` specifier to `@/elements/*` (matching
where the files actually landed), `@/elements/icons/github` to
`@/elements/github`, and the handful of `@/elements/lib/utils` imports
(a `lib/utils.ts` the registry never actually emits here) to the `cn` npm
package the primitive files already depend on directly. No component's
own logic changed, only which module a name resolves to.

**Not yet wired**: the mock/demo runtime the step 1 stand-up's `/next/
chat` route needs isn't a registry item - assistant-ui's docs site builds
it from `@assistant-ui/react`'s own `useLocalRuntime` plus a canned
`ChatModelAdapter`, which is data/glue Home writes itself, not a
component.

**The `@/kit/*` alias risk didn't apply here** - both `src/dashboard/`
and `src/elements/` were rewritten to plain relative imports at
vendoring time (see "A CLI/registry mismatch" above and the dashboard's
own import-path edits), so neither ever used the kit's own `@/*` alias
in the first place. No change was needed in Home's `vite.config.ts` or
`tsconfig.json` for this.

**A real version-skew risk did surface, and ui-v0.5.4 names it as a
gap rather than fixing it**: `src/elements/thread.aui.tsx` reads
`message.metadata.modality`, a field `@assistant-ui/core` added after
the `0.3.17` this package's own `@assistant-ui/react@0.15.18` was
built against, so the Elements can't actually be exercised at that
pin. Bumping `@assistant-ui/react` (tried as `0.5.1`, `0.5.2`, `0.5.3`
in turn) looked like the fix, but this package already ships its own
hand-built assistant-ui wrapper components (`src/assistant-ui/`,
predating this program) in production use by Home's real chat page,
and every file in this package shares ONE nested `@assistant-ui/react`
resolution - a consumer's own bundler resolves bare-package imports
inside `src/` starting from *this package's own* `node_modules`, not
the consumer's (the same reason `@/kit/*` needs its own "who's
asking" resolution, one level further out). Bumping it for the *new*
Elements silently moved the *existing* wrapper components' internal
React context to a different module instance than the one Home's own
`ChatPage.tsx` imports directly (left at `0.15.18`, since nothing
told it to move) - one React tree, two different
`AssistantRuntimeProvider` instances, invisible to `tsc` and to this
package's own tests, found only once a real consumer's full frontend
test suite ran end to end (18 failures, "requires an AuiProvider").
`0.5.3`'s own attempt also rippled `zod` into an unrelated consumer's
backend along the way (13 more failures there, unrelated to
assistant-ui entirely) before this deeper problem was even found.

There is no version of `@assistant-ui/react` this package can pin
today that serves both consumers (the existing wrappers, pinned to
wherever Home's shipped `ChatPage.tsx` already is, and the new
Elements, needing whatever version first shipped `modality`) without
a real, coordinated SDK upgrade - this package's wrappers, Home's own
import, and Home's full test suite bumped and re-verified together,
not a version bump inside a kit-vendoring patch. `ui-v0.5.4` reverts
to `0.15.18` (matching what's already shipped) and records this as a
named gap: `home`'s `/next/chat` row (docs/plans/shell-on-
shadcndashboard-2026-09-21.md's wiring table) is blocked on it, not on
anything wrong in `home` itself. See `CHANGELOG.md`'s `0.5.1` through
`0.5.4` entries for the full trail.

**Kit-side departures from the source (owner-ruled, 2026-09-21).** Three rules in `ui/src/tokens.css`, the kit's own layer, make fills transparent that the template draws: the hairline-grid wrappers (`bg-border` with `p-px`/`gap-px`, ui-v0.5.15), the sidebar panel's border (`[data-slot="sidebar-inner"]`) and the content panel's outline (`[data-slot="sidebar-inset"]`, both ui-v0.5.16). No vendored file is edited; each card keeps its own ring and the header its bottom border. The owner ruled it on a measured side-by-side with shadcndashboard's demo and shadcn's dashboard-01 block ("fewer lines"); the record is `.github/docs/DECISIONS.md`, 2026-09-21. An upstream merge keeps these rules and re-checks them against the new snapshot.

**Pieces with no data surface (found wiring Home, 2026-09-21).** These vendored views are demo compositions with their content hardcoded in place, so a consumer cannot bind data to them as shipped and instead composes the same structure from the template's primitives (Card, Table, Badge, the chart wrapper), mirroring the view's markup and naming the gap in its own program record: the modern dashboard's widgets (`views/dashboard/*`: no props, no fetch hook, the numbers are literals), `components/user-profile/index.tsx` (all local `useState` demo data), `DataTable`'s title (a literal "Employee Data Table", no prop), its search box and download icon (demo controls with no handler or prop) and its per-row action icons (no click handler), which is why Home composes its own table from the template's Table primitives (TABLES-01). An upstream merge re-checks each of these; if a newer snapshot adds a real prop or handler, the consumer's mirror retires in favour of the shipped part.

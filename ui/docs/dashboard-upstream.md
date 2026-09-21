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
`api/mocks` tree; the fake-data generator (`chance`); the "Buy Now" upsell
card and its banner image, including the promo footer inside the header's
profile sheet; the `isPro` nav badge rendering (the field stays possible
on `ChildItem`/`MenuItem` only insofar as nothing sets it - the sidebar
data below never does); one of the two icon systems - `@iconify/react`
goes, `lucide-react` stays (see "Icon substitutions"); `css/pages/app.css`
(calendar/demo-page rules, none of it reached by the kept views) and
`css/styles/style-lyra.css` (a demo-only component-class variant, not a
palette - Home's own Studio/Calm presets use the same body-class
mechanism with the design doc's own values, see globals.css); the
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

**Style presets**: `globals.css` keeps the template's `dark`/`style-<name>`
custom-variant mechanism. `:root`/`.dark` carry the navy/light palette
from `docs/design/home-pages-2026-09-20.md` (the same hex values already
shipped in `ui/tokens.css`, ui-v0.4.x) - one palette for both looks, since
the design doc's own ruling is "the same components", not a color
difference. `.style-calm`/`.style-studio` currently override the one
token already validated as differing (`--tile-radius`: 999px circle vs
12px square); later wiring rows add more as the design doc's other
per-look rules (rail, header, cards, type) get built for real.

## assistant-ui Elements (`ui/src/elements/`)

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

**A real version-skew risk did surface, and is what ui-v0.5.3 fixes**:
`@maipai/ui` is subpath-imported directly with no dist build, so a
consuming app's bundler resolves bare-package imports inside `src/`
(`@assistant-ui/react`, `lucide-react`, and so on) starting from *this
package's own* `node_modules`, not the consumer's - the same reason
`@/kit/*` needs its "who's asking" resolution, one level further out.
Concretely: `src/elements/thread.aui.tsx` reads
`message.metadata.modality`, a field `@assistant-ui/core` added after
the `0.3.17` `@assistant-ui/react@0.15.18` was originally built
against. Three things had to be true together before this actually
worked in a real consumer, not just in this package's own install:

1. `@assistant-ui/react` itself has to declare the newer `core` - a
   sibling `package.json` entry for `@assistant-ui/core` (tried in
   `ui-v0.5.2`) only changes what a *bare* `import "@assistant-ui/
   core"` resolves to; it can't reach into `@assistant-ui/react`'s own
   internal resolution of its own dependency. That internal resolution
   is exactly what `thread.aui.tsx` (a file inside `@assistant-ui/
   react`'s own dependency tree, not this package's) depends on.
   `0.5.2`'s fix only ever worked by accident, in this package's own
   non-workspace install, where bun's classic hoisting happened to let
   the sibling win; every real consumer is a bun *workspace*, where the
   isolated linker gives `@assistant-ui/react` its own private,
   hash-pinned dependency regardless of any sibling declaration - the
   same isolation that linker exists to provide, just working against
   this particular fix. So the actual fix is `ui-v0.5.1`'s original
   one: bump `@assistant-ui/react` itself (to `0.15.21`, which declares
   `^0.3.20` on its own).
2. That bump also moves `@assistant-ui/react`'s own `zod` dependency to
   `^4.6.5`. A consuming app that shares one bun workspace lockfile
   across a frontend and a backend (Home does) will see that ripple
   into the backend's own top-level `zod` resolution too, breaking
   anything there built against an older major/minor (`@modelcontextprotocol/
   sdk` and `@hono/zod-openapi` in Home's case - 13 unrelated test
   failures across the turn engine, safety boundaries, widgets and the
   Deno sandbox). The consumer's own fix is to pin its backend's `zod`
   to an *exact* version matching what it already had, forcing the
   isolated linker to keep it a separate, unaffected instance from
   whatever the frontend's `@assistant-ui/react` now needs - the same
   isolation mechanism that caused problem 1, deliberately used this
   time instead of fought.
3. This package's own dependents that aren't `react`'s own internals
   (this package's other files, or a consumer's own bare imports) don't
   need any change - they were never affected either way.

See `CHANGELOG.md`'s `0.5.1`, `0.5.2` and `0.5.3` entries for the full
trail (right diagnosis and wrong fix, then a fix that only worked by
local accident, then this one).

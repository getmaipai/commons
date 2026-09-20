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

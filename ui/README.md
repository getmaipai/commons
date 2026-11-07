# @maipai/ui

The shell contract and kit: tokens, layout primitives, the shell
(navigation, header, phone nav, command palette), settings and
permission renderers, and the UI-schema renderer. See
[../docs/dev.md](../docs/dev.md) for what landed at `ui-v0.1.0` and why,
and [docs/spec.md](docs/spec.md) for the approved design specification
this kit implements.

For the Wizard's responsive picture aside, see [docs/wizard.md](docs/wizard.md).

Since 2026-09-21 the kit also carries two upstream snapshots used
exactly as they ship, pinned and attributed in
[docs/dashboard-upstream.md](docs/dashboard-upstream.md) and
[../NOTICE](../NOTICE): `src/dashboard/` (shadcndashboard, MIT: the
application shell, the pages, its shadcn primitives on Base UI) and
`src/elements/` (assistant-ui's Elements, MIT: every element of the
catalog). Home's shell and every non-chat page compose from the first,
its chat from the second; the kit's own lint does not run inside
either folder, and neither is ever edited by hand. Looks are named
themes on the template's own style-variant mechanism (`ui.look`:
shadcn's seven base colors, `neutral` the default, plus `navy`), and
the only departures from the source are three kit-side rules in
`src/tokens.css` recorded in the upstream note.

## Language (I18N-K1)

The kit speaks the person's language through Lingui's global `i18n` from `@lingui/core`, a peer dependency Home shares, so there is one
mechanism and no second singleton. Kit code writes `i18n._({ id: "ui.Send message", message: "Send message" })` with
`import { i18n } from "@/kit/i18n"` (the id is `ui.` plus the English text, so a Home id can never shadow a kit id; call it while
rendering, never in a module-level constant). With no Home around, no locale active and no catalog loaded, the kit shows its English
from a private English instance and never throws. Home calls `await loadKitCatalog(locale)` (from `@maipai/ui/src/i18n`) once before
`i18n.activate(locale)`; it loads `locales/<locale>/messages.ts` (compiled from the `.po` beside it, chains in `src/kitLocales.ts`:
`en-GB` and `es` fall through to `en-US`) into the same locale id, and a mode locale such as `es-x-child` loads its base language.
Dates and numbers use `Intl` with `kitLocaleTag()`. Edit strings in source, then `bun run i18n:extract` and `bun run i18n:compile`;
`src/i18nLints.test.ts` fails on a new hardcoded string (`src/i18n-baseline.json` only shrinks, `src/i18n-allowlist.json` needs a
reason per entry). Spanish entries are written by the household's own model and carry `#, needs-review` until a person accepts them.

## Importing

No barrel export, the same convention `@maipai/spec` and `@maipai/core`
already use: a consumer imports the real file path under `src/`, e.g.
`import { Shell } from "@maipai/ui/src/Shell"` or
`import { getIcon } from "@maipai/ui/src/icons"`. `tsconfig.json`'s own
`@/kit/*` -> `./src/*` alias is internal to this workspace only; a
consumer's own `paths` entry (or none, since `file:` installs this as a
real package) resolves `@maipai/ui/src/*` directly.

## Lint

The kit ships its own ESLint flat config as `eslint.config.js`: jsx-a11y
recommended, the better-tailwindcss correctness rules with the token
entry pointed at `src/tokens.css`, and the kit's own import rules
(lucide only through `getIcon`/`icons`, `@radix-ui/*` only under
`src/ui/`, no other component library) plus no raw colors in JSX
`style` attributes. A consumer extends it in its own config with
`... (await import("@maipai/ui/eslint.config.js")).default` (the real
file path, matching this package's own no-barrel convention above - no
`exports` field means no subpath is ever accidentally blocked for
`bot`/`go`/any future consumer) and gets the same gate its CI must
pass.

## Pinning this workspace

A consumer adds `"@maipai/ui": "file:../../shared/ui"` to its `package.json` (adjusted for its own depth), checks out this repo at the tag it wants, and runs `bun install`; `bun` copies a self-contained package, so a bump is a new checkout plus `bun install`. The pinned tag is stated in the consumer's own dev docs and checked by its `check.sh` against this workspace's `package.json` version. There is no registry; this is the `@maipai/standards` pattern.

**Cutting a tag is two edits, not one** (found live, ui-v0.5.21: cut with the tag name bumped but `package.json`'s own `"version"` field left at the old value - a consumer's `check.sh` refused it immediately, correctly, since the two are meant to agree; the tag was deleted rather than patched, since nothing had a working pin to it yet). `ui-vX.Y.Z` and `package.json`'s `"version": "X.Y.Z"` move together, in the same commit, every time - check `git show <tag> -- package.json` before pushing a tag if there's any doubt.
**Player voiceover.** `Player`'s optional `voiceover` prop plays a spoken audio line over music, with an independent volume, trigger time, and optional first-lyric cutoff. See `PlayerVoiceover` in `src/primitives/Player.tsx` for its TypeScript contract.
Schema player hosts can supply that line with `MediaHost.voiceoverFor(item)` when they own the item's media element.

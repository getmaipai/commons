# @maipai/ui

The shell contract and kit: tokens, layout primitives, the shell
(navigation, header, phone nav, command palette), settings and
permission renderers, and the UI-schema renderer. See
[../docs/dev.md](../docs/dev.md) for what landed at `ui-v0.1.0` and why,
and [docs/spec.md](docs/spec.md) for the approved design specification
this kit implements.

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

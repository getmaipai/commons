# @maipai/ui

The shell contract and kit: tokens, layout primitives, the shell
(navigation, header, phone nav, command palette), settings and
permission renderers, and the UI-schema renderer. See
[../docs/dev.md](../docs/dev.md) for what landed at `ui-v0.1.0` and why,
and [docs/spec.md](docs/spec.md) for the approved design specification
this kit implements.

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

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

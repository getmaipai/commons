import { describe, expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { findClassShadows, findCssShadows, scanSurfaces, type SurfaceAllow } from "./surfaceLints"

// SURFACE-SYSTEM-01. A shadow and the radius that shapes it live on the same
// element and come from the surface tokens. See surfaceLints.ts and the level
// table in tokens.css.

/** The only places a shadow may stay off the surface tokens or apart from a radius. */
const ALLOW: SurfaceAllow[] = [
  { file: "src/tokens.css", match: /sidebar-menu-button.*color-mix/s, reason: "The active sidebar row's glow is a 1px inset ring plus a halo in the sidebar's own accent token; the radius is the row's own class, and it is an accent, not a surface." },
  { file: "src/tokens.css", match: /sidebar-inset.*var\(--hairline\)/s, reason: "An inset 1px hairline in the pro look (a border drawn inside, no outer shadow); the radius is the sidebar inset's own class." },
  { file: "src/dashboard/components/ui/sidebar.tsx", match: /shadow-\[0_0_0_1px_var\(--(?:sidebar-border|sidebar-accent)\)\]|bg-background shadow-\[0_0_0_1px/, reason: "Vendored shadcn sidebar menu-button outline variant: a 1px ring drawn with a shadow in a sidebar token colour; the radius is in the cva base string." },
  { file: "src/elements/ui/sidebar.tsx", match: /shadow-\[0_0_0_1px_var\(--(?:sidebar-border|sidebar-accent)\)\]|bg-background shadow-\[0_0_0_1px/, reason: "Vendored shadcn sidebar menu-button outline variant: a 1px ring drawn with a shadow in a sidebar token colour; the radius is in the cva base string." },
  { file: "src/dashboard/components/dashboards/modern/total-sales.tsx", match: /^h-auto! w-fit/, reason: "A className on a kit Button: the radius and surface come from the Button; this only restyles its 1px shadow with a token." },
  { file: "src/dashboard/layouts/full/vertical/sidebar/Sidebar.tsx", match: /^sidebar-box/, reason: "A flush, full-height sidebar gains its level-4 shadow while hovered in the collapsed rail; it has no corners to round." },
  { file: "src/elements/ui/button.tsx", match: /^border bg-background shadow-xs/, reason: "The outline variant of the vendored Button: the radius is in the cva base string of the same call." },
  { file: "src/elements/voice-conversation.tsx", match: /voice-accent/, reason: "The voice orb's speaking glow is a halo in the orb's own accent colour, not a surface shadow; the orb is a circle." },
]

describe("surface lint scanner", () => {
  test("flags a class string with a shadow and no radius", () => {
    const f = findClassShadows(`const a = "fixed inset-0 bg-background shadow-lg"; const b = "rounded-xl border shadow-md"; const c = "surface-dialog";`)
    expect(f.map((x) => [x.kind, x.line])).toEqual([["shadow-without-radius", 1]])
  })
  test("passes a shadow with a radius, a surface utility, shadow-none and shadow colour classes", () => {
    expect(findClassShadows(`x("rounded-md shadow-sm", "surface-menu hover:shadow-md", "shadow-none", "shadow-primary/20")`)).toEqual([])
  })
  test("ignores ids and words that only mention a shadow", () => {
    expect(findClassShadows(`x("setting.chat.option_label.shadow", "shadow", { family: "shadow" })`)).toEqual([])
  })
  test("flags an arbitrary shadow that reads no elevation token", () => {
    const kinds = findClassShadows(`x("rounded-md shadow-[0_8px_24px_black] ", "rounded-md shadow-[var(--elev-3-shadow)]")`).map((x) => x.kind)
    expect(kinds).toEqual(["shadow-off-tokens"])
  })
  test("flags a CSS box-shadow with no radius in the rule, or off the tokens", () => {
    const css = `[data-slot="dialog-content"] { box-shadow: var(--elevation-3); }\n.a { border-radius: 8px; box-shadow: 0 1px 2px black; }\n.b { border-radius: 8px; box-shadow: var(--elev-1-shadow); }\n.c { box-shadow: none; }\n@keyframes k { 50% { box-shadow: var(--elevation-2); } }`
    expect(findCssShadows(css).map((x) => [x.kind, x.line])).toEqual([
      ["css-shadow-without-radius", 1],
      ["css-shadow-off-tokens", 2],
    ])
  })
})

describe("kit surfaces", () => {
  test("no shadow sits off the surface tokens or apart from its radius", () => {
    const root = fileURLToPath(new URL(".", import.meta.url))
    const { findings, unused } = scanSurfaces(root, ALLOW)
    expect(findings.map((f) => `${f.file}:${f.line} ${f.kind} ${f.text}`)).toEqual([])
    expect(unused.map((u) => `${u.file} ${u.match}`)).toEqual([])
  })
})

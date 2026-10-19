import { describe, expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { findColors, listSourceFiles, scanKit, type AllowEntry } from "./fixedColors"

// NO-FIXED-COLORS-01. Every color the kit draws is a theme token (or a color-mix
// of tokens), so the person's look and mode (light, dark, every look including
// Neutral) change it. This gate fails on a color literal or a Tailwind palette
// class anywhere in ui/src outside the token definition files, where a literal
// is allowed only on the right of a `--name:` custom property.

/** The only places a fixed color may stay. Keyed by file and the matched text; a stale entry (nothing matches it any more) fails too. */
const ALLOW: AllowEntry[] = [
  {
    file: "src/ui/qr-code.tsx",
    match: /^#(?:ffffff|000000)$/,
    reason: "QR codes need a true white quiet zone and black modules to scan; the fallback applies only when a host sets no --qr-* token.",
  },
  {
    file: "src/ui/chart.tsx",
    match: /^#(?:ccc|fff)$/,
    reason: "Selectors that match Recharts' own default stroke attributes (stroke='#ccc', stroke='#fff') so they can be restyled; they paint nothing.",
  },
  {
    file: "src/dashboard/components/ui/chart.tsx",
    match: /^#(?:ccc|fff)$/,
    reason: "Same Recharts attribute selectors as ui/chart.tsx (vendored shadcn chart); they paint nothing.",
  },
  {
    file: "src/elements/image-editor-surface.tsx",
    match: /^#(?:000|fff)$/,
    reason: "The inpainting mask raster: black means keep, white means edit. Data sent to the model, not interface color.",
  },
  {
    file: "src/elements/AnswerBlockShowcase.tsx",
    match: /^hsl\($/,
    reason: "Showcase only: generated sample thumbnails so the gallery demo has pictures in different hues.",
  },
  {
    file: "src/elements/DataTableSelectionShowcase.tsx",
    match: /^#[0-9a-f]{6}$/i,
    reason: "Showcase only: the sample picture's gradient stops.",
  },
  {
    file: "src/elements/MediaViewerShowcase.tsx",
    match: /^#[0-9a-f]{6}$/i,
    reason: "Showcase only: sample photo gradients standing in for user photos.",
  },
  {
    file: "src/primitives/FileGridShowcase.tsx",
    match: /^#[0-9a-f]{6}$/i,
    reason: "Showcase only: sample photo gradient standing in for a user photo.",
  },
]

const uiRoot = fileURLToPath(new URL("./", import.meta.url))

describe("fixed colors in the kit", () => {
  const { violations, unusedAllow } = scanKit(uiRoot, ALLOW)

  test("the scan actually covers the kit", () => {
    expect(scanKit(uiRoot, []).violations.length).toBeGreaterThan(0)
    expect(listSourceFiles(uiRoot).length).toBeGreaterThan(300)
  })

  test("no color literal or palette class remains outside the token files and the allowlist", () => {
    expect(violations).toEqual([])
  })

  test("every allowlist entry is still needed and says why", () => {
    expect(unusedAllow.map((a) => `${a.file} ${a.match}`)).toEqual([])
    for (const a of ALLOW) expect(a.reason.length, `${a.file}`).toBeGreaterThanOrEqual(30)
  })
})

describe("the scanner", () => {
  const ts = { css: false }
  const kinds = (src: string, opts: { css: boolean; definitions?: boolean } = ts) => findColors(src, opts).map((f) => f.text)

  test("catches hex, color functions, named colors, palette classes and arbitrary values", () => {
    expect(kinds('const c = "#1a2b3c"')).toEqual(["#1a2b3c"])
    expect(kinds("const c = '#fff'")).toEqual(["#fff"])
    expect(kinds('style={{ background: "rgba(0,0,0,0.5)" }}')).toEqual(["rgba("])
    expect(kinds("color: oklch(0.5 0.1 200);", { css: true })).toEqual(["oklch("])
    expect(kinds("color: hsl(10 20% 30%);", { css: true })).toEqual(["hsl("])
    expect(kinds("background: white;", { css: true })).toEqual(["background: white"])
    expect(kinds("background: color-mix(in srgb, var(--a), black 25%);", { css: true })).toHaveLength(1)
    expect(kinds('className="bg-blue-500 text-slate-200/50"')).toEqual(["bg-blue-500", "text-slate-200/50"])
    expect(kinds('className="hover:bg-black/50 dark:text-white"')).toEqual(["bg-black/50", "text-white"])
    expect(kinds('className="bg-[#123456]"')).toContain("bg-[#123456]")
    expect(kinds('className="from-red-400 via-amber-300 to-emerald-600"')).toHaveLength(3)
  })

  test("passes theme tokens, relative colors, mixes of tokens and look-neutral classes", () => {
    expect(kinds('className="bg-background/70 text-foreground border-border text-status-ok-ink bg-primary/12 ring-ring/50"')).toEqual([])
    expect(kinds("color: color-mix(in srgb, var(--background) 60%, transparent);", { css: true })).toEqual([])
    expect(kinds("--x: oklch(from var(--background) min(l, 0.2) c h);", { css: true })).toEqual([])
    expect(kinds('const w = "white-space: nowrap"; const n = "bg-gradient-to-br"')).toEqual([])
    expect(kinds('href="https://example.com/#top" id="item#1a"')).toEqual([])
  })

  test("ignores comments", () => {
    expect(kinds("/* #fff and bg-red-500 */ const a = 1 // text-white")).toEqual([])
    expect(kinds("/* rgba(0,0,0,.5) */ a { color: var(--x); }", { css: true })).toEqual([])
  })

  test("a token definition file may hold a literal only on the right of a custom property", () => {
    const def = { css: true, definitions: true }
    expect(kinds(":root { --brand: #112233; --other: oklch(0.5 0.1 20); }", def)).toEqual([])
    expect(kinds(":root { --brand: #112233; }\n.a { background: #112233; }", def)).toEqual(["#112233"])
    expect(kinds(".a { box-shadow: 0 0 4px rgb(0 0 0 / 0.2); }", def)).toEqual(["rgb("])
  })

  test("reports the line of a violation", () => {
    expect(findColors("a\nb\nconst c = '#abcdef'", ts)[0]?.line).toBe(3)
  })

  test("an allowlisted literal passes and an unlisted one in the same file fails", () => {
    const allow: AllowEntry[] = [{ file: "x.tsx", match: /^#fff$/, reason: "fixture: a pure white quiet zone for the test" }]
    const allowed = (file: string, text: string) => allow.some((a) => a.file === file && a.match.test(text))
    expect(allowed("x.tsx", "#fff")).toBe(true)
    expect(allowed("x.tsx", "#fe0000")).toBe(false)
    expect(allowed("y.tsx", "#fff")).toBe(false)
  })
})

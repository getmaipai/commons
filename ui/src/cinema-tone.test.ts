import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/* CINEMA-NEUTRAL-01: the cinema page tone follows the active look. */
const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8")
const start = css.indexOf(':root:has([data-page-tone="cinema"]) {')
const end = css.indexOf("/* MEDIA-BOOKS-01")
const block = css.slice(start, end)

// Neutral look, dark theme, as computed in a browser (--background #0a0a0a).
const NEUTRAL_DARK = {
  page: "#080808",
  rail: "#050505",
  card: "#181919",
  pane: "#222222",
  fg: "#fafafa",
  mutedFg: "#b1b1b1",
  primary: "#e5e5e5",
}
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function lum(h: string): number {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe("cinema page tone", () => {
  test("the block exists and keeps its non-colour effects", () => {
    expect(start).toBeGreaterThan(0)
    expect(block).toContain("color-scheme: dark")
    expect(block).toContain("--progress-accent: var(--cinema-destructive)")
    expect(block).toContain("--art-eyebrow:")
  })

  test("no hard-coded navy hex remains in the cinema block", () => {
    for (const navy of ["#07111f", "#102238", "#142a43", "#294563", "#040a14", "#a9bed7", "#21a6ff", "#f4f8ff"]) {
      expect(block.toLowerCase()).not.toContain(navy)
    }
    const code = block.replace(/\/\*[\s\S]*?\*\//g, "")
    const hexes = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    expect(hexes).toEqual([])
    expect(code).not.toMatch(/\b(?:black|white)\b|(?<![\w-])(?:rgba?|hsla?)\(|oklch\((?!from )/)
  })

  test("the real tokens come from the look through the two stages, never from themselves", () => {
    expect(block).toContain("oklch(from var(--background)")
    expect(block).toContain("--background: var(--cinema-page);")
    expect(block).toContain("--cinema-page: oklch(from var(--cinema-base) calc(l * 0.8) c h);")
    expect(block).toContain("--cinema-rail: oklch(from var(--cinema-base) calc(l * 0.57) c h);")
    // Stage 2 sits on body's children: a token must not read itself.
    const stage2 = block.slice(block.indexOf("body > * {"))
    expect(stage2).not.toMatch(/--background:[^;]*var\(--background\)/)
    expect(stage2).not.toMatch(/--page:[^;]*var\(--page\)/)
  })

  test("Neutral dark stays neutral grey and readable", () => {
    for (const v of Object.values(NEUTRAL_DARK)) {
      const [r, g, b] = hex(v)
      expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(2)
    }
    expect(contrast(NEUTRAL_DARK.fg, NEUTRAL_DARK.page)).toBeGreaterThanOrEqual(7)
    for (const surface of [NEUTRAL_DARK.page, NEUTRAL_DARK.card, NEUTRAL_DARK.pane]) {
      expect(contrast(NEUTRAL_DARK.mutedFg, surface)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(NEUTRAL_DARK.page, NEUTRAL_DARK.primary)).toBeGreaterThanOrEqual(4.5)
    expect(lum(NEUTRAL_DARK.rail)).toBeLessThan(lum(NEUTRAL_DARK.page))
  })
})

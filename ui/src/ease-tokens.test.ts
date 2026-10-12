// EASE-OF-USE-01b: the ease token blocks are generated from spec/ease/presets.json
// (ui/scripts/gen-ease-tokens.ts). A preset changes only tokens, so these tests
// pin the generated block to the record, the rail to the target token, and the
// "more" contrast to its ratio.
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { MORE_CONTRAST_MIX, PRESETS_PATH, TOKENS_PATH, render } from "../scripts/gen-ease-tokens"

const css = readFileSync(TOKENS_PATH, "utf8")
const presets = JSON.parse(readFileSync(PRESETS_PATH, "utf8"))

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => ((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))(v / 255))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
const mix = (bg: string, fg: string, pct: number) => "#" + hex(bg).map((v, i) => Math.round(v + (hex(fg)[i]! - v) * (pct / 100)).toString(16).padStart(2, "0")).join("")
const block = (sel: string) => new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ""
const theme = (sel: string) => {
  const re = new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g")
  for (const m of css.matchAll(re)) {
    const bg = /--background:\s*(#[0-9a-f]{6})/i.exec(m[1]!)?.[1]
    const fg = /--foreground:\s*(#[0-9a-f]{6})/i.exec(m[1]!)?.[1]
    if (bg && fg) return { bg, fg }
  }
  return {}
}

describe("ease tokens", () => {
  test("the committed block is exactly what presets.json generates (parity)", () => {
    expect(css).toBe(render())
  })

  test("every text size, spacing, targets and motion value in presets.json has a block", () => {
    for (const k of Object.keys(presets.values.text_size)) expect(css).toContain(`html[data-ease-text="${k}"]`)
    for (const [k, { scale }] of Object.entries(presets.values.spacing) as [string, { scale: number }][]) if (scale !== 1) expect(css).toContain(`html[data-ease-spacing="${k}"]`)
    for (const [k, { min_px }] of Object.entries(presets.values.targets) as [string, { min_px: number }][]) {
      if (min_px > 48) expect(block(`html[data-ease-targets="${k}"]`)).toContain(`--target-min: ${min_px}px`)
    }
    expect(css).toContain('html[data-ease-motion="calm"]')
  })

  test("text size scales the root and the px type tokens by the record's scale", () => {
    const body = block('html[data-ease-text="140"]')
    expect(body).toContain("font-size: 22.4px")
    expect(body).toContain("--font-size-body: 18.9px")
    expect(body).toContain("--font-size-title: 42px")
  })

  test("standard targets keep today's 48 px floor and the 56 px rail", () => {
    const root = css.slice(css.indexOf("EASE-GENERATED:BEGIN"))
    expect(root).toContain("--target-min: 48px")
    expect(root).toContain("--rail-width: 56px")
  })

  test("the rail reads the target tokens, not a fixed size", () => {
    for (const f of ["AppRail.tsx", "RailProfileMenu.tsx"]) {
      const src = readFileSync(new URL(`./dashboard/layouts/full/vertical/rail/${f}`, import.meta.url), "utf8")
      expect(src, f).not.toMatch(/\bsize-10\b/)
      expect(src, f).toContain("--rail-button")
    }
    const rail = readFileSync(new URL("./dashboard/layouts/full/vertical/rail/AppRail.tsx", import.meta.url), "utf8")
    expect(rail).not.toMatch(/\bw-14\b/)
    expect(rail).toContain("--rail-width")
  })

  test("calm stops animation and mutes accent hues; the OS reduced-motion setting stops it too", () => {
    expect(block('html[data-ease-motion="calm"]')).toContain("--hue-violet: color-mix")
    expect(css).toMatch(/html\[data-ease-motion="calm"\] \*,[^}]*animation-duration: 0\.001ms !important/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html \*/)
  })

  test("more contrast puts secondary text at 7:1 or better on the light and dark pages", () => {
    for (const sel of [":root", ".dark"]) {
      const { bg, fg } = theme(sel)
      expect(bg && fg, `${sel} declares --background and --foreground`).toBeTruthy()
      expect(ratio(mix(bg!, fg!, MORE_CONTRAST_MIX), bg!), sel).toBeGreaterThanOrEqual(presets.values.contrast.more.ratio)
    }
  })
})

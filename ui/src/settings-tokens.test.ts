import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8")

function decl(name: string): string {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(css)
  if (!m) throw new Error(`${name} not declared in tokens.css`)
  return m[1]!.trim()
}

function mixPercent(name: string): number {
  const m = /color-mix\(in srgb, var\(--background\), var\(--foreground\) ([\d.]+)%\)/.exec(decl(name))
  if (!m) throw new Error(`${name} is not a background-to-foreground mix`)
  return Number(m[1]) / 100
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function mix(bg: string, fg: string, t: number): string {
  const b = hex(bg)
  const f = hex(fg)
  return "#" + b.map((v, i) => Math.round(v + (f[i]! - v) * t).toString(16).padStart(2, "0")).join("")
}
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
// The default Neutral Look now uses cool ink tones rather than literal
// monochrome. These samples keep the helper contrast check representative;
// the token recipe tests below carry the exact values for every theme.
const NEUTRAL_DARK = { bg: "#11151e", fg: "#f1f4fa" }
const SETTING_COLOR_NAMES = ["--settings-card", "--settings-card-border", "--settings-fill", "--settings-control", "--settings-control-border", "--settings-button", "--settings-switch-off", "--settings-helper", "--settings-arrow"]

describe("settings tokens", () => {
  for (const name of SETTING_COLOR_NAMES) {
    test(`${name} derives from the active background and foreground`, () => {
      expect(decl(name)).toContain("color-mix(in srgb, var(--background), var(--foreground)")
      expect(mixPercent(name)).toBeGreaterThan(0)
    })
  }

  test("sizes are the measured ones", () => {
    expect(decl("--settings-column-width")).toBe("260px")
    expect(decl("--settings-column-title-size")).toBe("18px")
    expect(decl("--settings-page-title-size")).toBe("28px")
    expect(decl("--settings-section-heading-size")).toBe("14px")
    expect(decl("--settings-content-max")).toBe("760px")
    expect(decl("--settings-content-top")).toBe("82px")
    expect(decl("--settings-row-text-max")).toBe("496px")
    expect(decl("--settings-card-radius")).toBe("12px")
    expect(decl("--settings-control-radius")).toBe("8px")
  })

  test("--switch-checked defaults to the theme primary", () => {
    expect(decl("--switch-checked")).toBe("var(--primary)")
  })

  test("colour tokens sit on :root and body so a look's body-level colours apply", () => {
    expect(css).toMatch(/:root,\s*body\s*\{\s*--settings-card:/)
  })

  test("every colour token is registered as a Tailwind colour", () => {
    for (const name of [...SETTING_COLOR_NAMES, "--settings-knob"]) {
      const short = name.replace("--", "")
      expect(css).toContain(`--color-${short}: var(${name});`)
    }
  })

  // Light mirrors dark's percentages, so check helper text on a card in
  // the kit's own light and dark roots and in Neutral light and dark.
  const palettes: Record<string, { bg: string; fg: string }> = {
    "kit light": { bg: "#f4f7fb", fg: "#0b1730" },
    "kit dark": { bg: "#07111f", fg: "#f4f8ff" },
    "neutral light": { bg: "#fafbfc", fg: "#10131b" },
    "neutral dark": NEUTRAL_DARK,
  }
  for (const [name, p] of Object.entries(palettes)) {
    test(`helper text reads 4.5:1 on the card and the active fill, ${name}`, () => {
      const helper = mix(p.bg, p.fg, mixPercent("--settings-helper"))
      for (const surface of ["--settings-card", "--settings-fill", "--settings-control"]) {
        const bgc = mix(p.bg, p.fg, mixPercent(surface))
        expect(contrast(helper, bgc)).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})

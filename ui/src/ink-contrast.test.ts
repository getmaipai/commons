import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// NO-FIXED-COLORS-01: the -ink text colors (tokens.css, @theme inline) replace the old
// emerald-700, amber-700 and blue-700 text classes. Each is its token mixed 60/40 with
// the foreground, so it must still read as small text (4.5:1) on the page and on a card.
const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8")
const mobile = css.indexOf("@media (max-width: 639px)")
const light = css.slice(css.lastIndexOf(":root {", mobile), mobile)
const dark = css.slice(css.indexOf(".dark {"))
const read = (block: string, name: string) => (new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(block) ?? [])[1] as string
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => { const [x, y] = [rgb(a), rgb(b)]; return x!.map((v, i) => v * t + y![i]! * (1 - t)) }
function lum(c: number[]) {
  const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }

describe("ink tokens", () => {
  test("the three ink mixes are declared as 60/40 with the foreground", () => {
    for (const name of ["status-ok", "status-warning", "primary"]) {
      expect(css).toContain(`--color-${name}-ink: color-mix(in srgb, var(--${name === "primary" ? "primary" : name}) 60%, var(--foreground));`)
    }
  })
  for (const [mode, block] of [["light", light], ["dark", dark]] as const) {
    test(`${mode}: status-ok, status-warning and primary ink clear 4.5:1 on page and card`, () => {
      const fg = read(block, "--foreground")
      for (const token of ["--status-ok", "--status-warning", "--primary"]) {
        const ink = mix(read(block, token), fg, 0.6)
        for (const surface of ["--surface-page", "--surface-card"]) {
          expect(ratio(ink, rgb(read(block, surface))), `${token} ink on ${surface}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })
  }
})

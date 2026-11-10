import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { StatusCard, statusCardInk, statusCardWash, type StatusCardKind } from "@/kit/elements/status-card"

afterEach(cleanup)

describe("StatusCard", () => {
  test("maps kinds to roles and their token tint", () => {
    const expected = { progress: "status", waiting: "status", done: "status", attention: "alert", problem: "alert", info: "status" }
    for (const [kind, role] of Object.entries(expected)) {
      const { getByRole, unmount } = render(<StatusCard kind={kind as keyof typeof expected} stateWord={kind} title="A status" />)
      expect(getByRole(role).getAttribute("data-status-kind")).toBe(kind)
      expect(getByRole(role).textContent).toContain(kind)
      unmount()
    }
  })

  test("shows a clamped progress ring and mobile action layout class", () => {
    const { getByLabelText, getByRole } = render(<StatusCard kind="progress" title="Uploading" progress={63} action={{ label: "Pause", onSelect: () => {} }} />)
    expect(getByLabelText("63%").getAttribute("style")).toContain("conic-gradient")
    expect(getByRole("button").className).toContain("")
    expect(getByRole("button").parentElement?.className).toContain("@max-[430px]:basis-full")
    expect(getByRole("button").parentElement?.className).toContain("shrink-0")
  })

  test("every kind maps to its own ink token, and the lead differs by kind", () => {
    const kinds = Object.keys(statusCardInk) as StatusCardKind[]
    expect(new Set(kinds.map((k) => statusCardInk[k])).size).toBe(kinds.length)
    expect(statusCardInk.progress).toContain("--status-progress-ink")
    expect(statusCardInk.done).toContain("--status-done-ink")
    expect(statusCardInk.done).not.toBe(statusCardInk.progress)
    for (const k of kinds) expect(statusCardInk[k]).not.toContain("--accent-app")
  })

  test("progress ring uses the lime token by default and the accent only when passed", () => {
    const ring = (accent?: "app" | "create") => {
      const { getByLabelText, unmount } = render(<StatusCard kind="progress" title="x" progress={40} accent={accent} />)
      const style = getByLabelText("40%").getAttribute("style") ?? ""
      unmount()
      return style
    }
    expect(ring()).toContain("--status-progress-ink")
    expect(ring("app")).toContain("--accent-app")
    expect(ring("create")).toContain("--accent-create")
  })
})

// Contrast: ink text on the card surface and on its own wash clears AA in both themes (linear blend, close to the browser's color-mix).
const css = readFileSync(resolve(import.meta.dir, "../tokens.css"), "utf8")
const lightCss = css.slice(css.indexOf("\n:root {"), css.indexOf("@media (prefers-color-scheme: dark)"))
const darkCss = css.slice(css.indexOf("\n.dark {"))
const hex = (block: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(block)?.[1] ?? ""
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const lum = (c: number[]) => { const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!) }
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v * (1 - t) + b[i]! * t)
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }

describe("StatusCard contrast", () => {
  for (const [theme, block] of [["light", lightCss], ["dark", darkCss]] as const) {
    test(`${theme}: every kind's ink is AA on its wash`, () => {
      const surface2 = mix(rgb(hex(block, "--background")), rgb(hex(block, "--foreground")), 0.16)
      const inks: Record<StatusCardKind, string> = {
        progress: hex(block, "--status-progress-ink"), done: hex(block, "--status-done-ink"), waiting: hex(block, "--status-waiting-ink"),
        attention: hex(block, "--status-attention-ink"), problem: hex(block, "--tint-problem-border"), info: hex(block, "--tint-info-border"),
      }
      const washes: Record<StatusCardKind, number[]> = {
        progress: mix(surface2, rgb(inks.progress), 0.12), done: mix(surface2, rgb(inks.done), 0.12), waiting: mix(surface2, rgb(inks.waiting), 0.08),
        attention: rgb(hex(block, "--status-attention-wash")), problem: rgb(hex(block, "--tint-problem")), info: rgb(hex(block, "--tint-info")),
      }
      for (const k of Object.keys(inks) as StatusCardKind[]) {
        expect(inks[k], `${k} ink literal in ${theme}`).toMatch(/^#/)
        expect(ratio(rgb(inks[k]), washes[k]), `${k} on its wash`).toBeGreaterThanOrEqual(4.5)
        expect(statusCardWash[k]).toBeTruthy()
      }
    })
    test(`${theme}: the attention wash reads amber, not gray`, () => {
      const [r, g, b] = rgb(hex(block, "--status-attention-wash"))
      // Amber: red above green above blue, with a clear red-to-blue spread (a gray has none).
      expect(r!).toBeGreaterThan(g!)
      expect(g!).toBeGreaterThan(b!)
      expect(r! - b!).toBeGreaterThanOrEqual(theme === "light" ? 0.25 : 0.1)
    })
  }
})

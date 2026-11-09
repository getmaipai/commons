// PRESS-01: the press-scale token and its users, and the locale-aware tile number. The CSS is pinned as text (no layout engine
// runs here) and the components by their rendered classes.
import { afterEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { cleanup, render } from "@testing-library/react"
import { i18n as lingui } from "@lingui/core"
import { loadKitCatalog } from "@/kit/i18n"
import { formatTileNumber } from "@/kit/format"
import { PRESS } from "@/kit/utils"
import { Button } from "@/kit/ui/button"
import { ClimateTile } from "@/kit/elements/climate-tile"
import { CoverTile } from "@/kit/elements/cover-tile"
import { LockTile } from "@/kit/elements/lock-tile"
import { SceneTile } from "@/kit/elements/scene-tile"

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")
const PRESSED = "active:scale-[var(--press-scale)]"

afterEach(() => {
  cleanup()
  ;(lingui as unknown as { _locale: string })._locale = ""
})

describe("press-scale token", () => {
  test("one scale, duration and easing, collapsing under reduced motion", () => {
    expect(css).toMatch(/--press-scale:\s*0\.96;/)
    expect(css).toMatch(/--press-duration:\s*150ms;/)
    expect(css).toMatch(/--press-ease:\s*cubic-bezier\(/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:root:root\{ --press-scale: 1; --press-duration: 0ms; \}/)
    // The collapse rule comes after the definition, or the root value would win.
    expect(css.indexOf("--press-scale: 1;")).toBeGreaterThan(css.indexOf("--press-scale: 0.96;"))
  })

  test("shelf cards share the token", () => {
    expect(css).toContain("--media-press-scale: var(--press-scale);")
  })

  test("the shared class and the Button read the tokens, not numbers", () => {
    expect(PRESS).toContain(PRESSED)
    expect(PRESS).toContain("duration-[var(--press-duration)]")
    expect(PRESS).toContain("ease-[var(--press-ease)]")
    expect(render(<Button>Go</Button>).getByRole("button").className).toContain(PRESSED)
  })

  test("the tile buttons carry the shared press class", () => {
    const cover = render(<CoverTile name="Blind" room="Den" position={50} onOpen={() => {}} onStop={() => {}} onClose={() => {}} />)
    expect(cover.getByRole("button", { name: "Stop Blind" }).className).toContain(PRESSED)
    cleanup()
    expect(render(<SceneTile name="Movie" room="Den" onActivate={() => {}} />).getByRole("button", { name: "Movie" }).className).toContain(PRESSED)
    cleanup()
    const climate = render(<ClimateTile name="Hall" room="Up" mode="heat" current={20} target={21} min={10} max={30} onTarget={() => {}} />)
    expect(climate.getByRole("button", { name: "Raise Hall" }).className).toContain(PRESSED)
    cleanup()
    const lock = render(<LockTile name="Door" room="Entry" locked onConfirm={() => {}} />)
    expect(lock.getByRole("button", { name: /hold to unlock/i }).className).toContain(PRESSED)
  })
})

describe("formatTileNumber", () => {
  test("decimals and the unit join follow the language", async () => {
    expect(formatTileNumber(21.5, { unit: "°" })).toBe("21.5°")
    expect(formatTileNumber(1234.56, { unit: "kWh" })).toBe("1,234.6 kWh")
    expect(formatTileNumber(21.25, { maximumFractionDigits: 2 })).toBe("21.25")
    await loadKitCatalog("es")
    lingui.activate("es")
    expect(formatTileNumber(21.5, { unit: "°" })).toBe("21,5°")
    expect(formatTileNumber(Number.NaN)).toBe("Sin reportar")
  })

  test("the climate tile shows its setpoint in the active language", async () => {
    await loadKitCatalog("es")
    lingui.activate("es")
    const v = render(<ClimateTile name="Hall" room="Up" mode="heat" current={20.5} target={21.5} min={10} max={30} onTarget={() => {}} />)
    expect(v.getByText("21,5°")).toBeTruthy()
  })
})

import { afterEach, describe, expect, test } from "bun:test"
import { render } from "@testing-library/react"
import { i18n as lingui } from "@lingui/core"
import { i18n, loadKitCatalog, kitLocaleTag } from "@/kit/i18n"
import { kitChain } from "@/kit/kitLocales"
import { formatBytes, formatDuration } from "@/kit/format"
import { dayHeading, formatRelative } from "@/kit/relativeTime"
import { BatchBar } from "@/kit/primitives/BatchBar"

// I18N-K1. The kit renders English with nothing set up, follows Home's active locale once loadKitCatalog has run, and falls
// back to English for anything a catalog does not have.

afterEach(() => {
  // Lingui keeps the last activated locale; an empty id is the "nothing active" state the kit must survive.
  ;(lingui as unknown as { _locale: string })._locale = ""
})

const SEND = { id: "ui.Not reported", message: "Not reported" }
const NOW = new Date("2026-11-07T12:00:00Z")

describe("no provider and no catalog loaded", () => {
  test("a message is its English text, with placeholders and plurals filled in", () => {
    expect(i18n._(SEND)).toBe("Not reported")
    expect(i18n._({ id: "ui.{count} selected", message: "{count} selected", values: { count: 3 } })).toBe("3 selected")
    expect(i18n._({ id: "ui.{count, plural, one {# source} other {# sources}}", message: "{count, plural, one {# source} other {# sources}}", values: { count: 1 } })).toBe("1 source")
  })

  test("a component renders its English", () => {
    const { getByRole, getByText } = render(<BatchBar count={2} onExit={() => {}}>{null}</BatchBar>)
    expect(getByRole("toolbar").getAttribute("aria-label")).toBe("Batch actions")
    expect(getByText("2 selected")).toBeTruthy()
    expect(getByText("Done")).toBeTruthy()
  })

  test("formatters give the English words", () => {
    expect(formatBytes(null)).toBe("Not reported")
    expect(formatDuration(90)).toBe("1m")
    expect(formatRelative("2026-11-07T11:30:00Z", NOW)).toBe("30m")
    expect(formatRelative("2026-11-07T11:59:50Z", NOW)).toBe("now")
    expect(formatRelative("2026-11-06T11:59:00Z", NOW)).toBe("Yesterday")
    expect(formatRelative("2026-11-04T09:00:00Z", NOW)).toBe("3d")
    expect(formatRelative("2026-10-01T09:00:00Z", NOW)).toBe("Oct 1")
    expect(dayHeading("2026-11-07", NOW)).toBe("Today")
  })
})

describe("with Home's locale active", () => {
  test("es shows Spanish after loadKitCatalog, and a component follows it", async () => {
    await loadKitCatalog("es")
    lingui.activate("es")
    expect(i18n._(SEND)).not.toBe("Not reported")
    const { getByRole } = render(<BatchBar count={2} onExit={() => {}}>{null}</BatchBar>)
    expect(getByRole("toolbar").getAttribute("aria-label")).not.toBe("Batch actions")
    expect(kitLocaleTag()).toBe("es")
  })

  test("formatRelative speaks three locales", async () => {
    const at = "2026-11-07T11:30:00Z"
    for (const locale of ["en-US", "en-GB", "es"]) {
      await loadKitCatalog(locale)
      lingui.activate(locale)
      const got = {
        minutes: formatRelative(at, NOW),
        yesterday: formatRelative("2026-11-06T11:59:00Z", NOW),
        old: formatRelative("2026-10-01T09:00:00Z", NOW),
        today: dayHeading("2026-11-07", NOW),
      }
      if (locale === "es") {
        expect(got.minutes).not.toBe("30m")
        expect(got.yesterday).toBe("Ayer")
        expect(got.old).toBe("1 oct")
        expect(got.today).toBe("Hoy")
      } else {
        expect(got.minutes).toBe("30m")
        expect(got.yesterday).toBe("Yesterday")
        expect(got.old).toBe(locale === "en-GB" ? "1 Oct" : "Oct 1")
      }
    }
  })

  test("a mode locale (es-x-child) loads the base language, and en-GB falls back to en-US for entries it does not hold", async () => {
    expect(kitChain("es-x-child")).toEqual(["es", "en-US"])
    expect(kitChain("en-GB")).toEqual(["en-GB", "en-US"])
    expect(kitChain("fr")).toEqual(["en-US"])
    await loadKitCatalog("es-x-child")
    lingui.activate("es-x-child")
    expect(i18n._(SEND)).not.toBe("Not reported")
    expect(kitLocaleTag()).toBe("es")
    await loadKitCatalog("en-GB")
    lingui.activate("en-GB")
    expect(i18n._(SEND)).toBe("Not reported")
  })

  test("an id no catalog holds shows its English message, never the id", async () => {
    await loadKitCatalog("es")
    lingui.activate("es")
    expect(i18n._({ id: "ui.Never extracted", message: "Never extracted" })).toBe("Never extracted")
  })

  test("a failed catalog load leaves the kit in English and does not throw", async () => {
    const broken = { load: () => { throw new Error("boom") } } as unknown as Parameters<typeof loadKitCatalog>[1]
    const original = console.error
    console.error = () => {}
    await expect(loadKitCatalog("es", broken)).resolves.toBeUndefined()
    console.error = original
  })
})

import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")

const block = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ""
}

const value = (body: string, name: string) =>
  new RegExp(`(?:^|\\n)\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*([^;]+);`).exec(body)?.[1]?.trim()

describe("PRO look gate", () => {
  test("attribute absence preserves the existing type, radius, sidebar and settings tokens", () => {
    const theme = block("@theme")
    expect(value(theme, "--font-size-title")).toBe("30px")
    expect(value(theme, "--font-weight-title")).toBe("600")
    expect(value(theme, "--font-size-section")).toBe("18px")
    expect(value(theme, "--font-weight-section")).toBe("600")
    expect(value(theme, "--font-size-body")).toBe("13.5px")
    expect(value(theme, "--font-weight-body")).toBe("500")
    expect(value(theme, "--font-size-supporting")).toBe("12px")
    expect(value(theme, "--radius-card")).toBe("16px")
    expect(css).toContain("--settings-card-radius: 12px;")
    expect(css).toContain("--settings-card: color-mix(in srgb, var(--background), var(--foreground) 10.4%);")
    expect(css).toContain("--settings-card: color-mix(in srgb, var(--background), var(--foreground) 2.2%);")
    // The rail uses --app-rail-bg with --sidebar as its fallback. These are
    // the pre-gate light and dark sidebar values in the existing theme blocks.
    expect(css).toContain("--sidebar: #eaf0f7;")
    expect(css).toContain("--sidebar: #0a1a2e;")
    const inset = block('[data-slot="sidebar-inset"]')
    expect(inset).toContain("outline-color: transparent")
    expect(value(inset, "background")).toBeUndefined()
    expect(value(inset, "border-radius")).toBeUndefined()
    expect(value(inset, "box-shadow")).toBeUndefined()
  })

  test("attribute absence preserves the existing art token values", () => {
    const art = css.slice(css.indexOf(":root {", css.indexOf("MEDIA-PLAYER-01")), css.indexOf("}", css.indexOf(":root {", css.indexOf("MEDIA-PLAYER-01"))));
    expect(value(art, "--art-foreground")).toBe("var(--foreground)")
    expect(value(art, "--art-track")).toBe("color-mix(in srgb, var(--foreground) 30%, transparent)")
    expect(value(art, "--art-scrim")).toBe("linear-gradient(to top, color-mix(in srgb, var(--background) 78%, transparent), transparent)")
    expect(value(art, "--art-overlay")).toBe("color-mix(in srgb, var(--background) 62%, transparent)")
  })

  test("the gate applies the phone and desktop values, including the inset surface", () => {
    const phone = block("html[data-pro-look] body")
    expect(value(phone, "--font-size-title")).toBe("34px")
    expect(value(phone, "--font-size-section")).toBe("22px")
    expect(value(phone, "--font-size-body")).toBe("17px")
    expect(value(phone, "--font-size-supporting")).toBe("14px")
    expect(value(phone, "--font-weight-title")).toBe("700")
    expect(value(phone, "--font-weight-section")).toBe("600")
    expect(value(phone, "--font-weight-body")).toBe("400")
    expect(value(phone, "--radius-card")).toBe("20px")
    expect(value(phone, "--sidebar")).toBe("var(--surface-0)")
    expect(value(phone, "--settings-card")).toBe("var(--surface-1)")
    expect(value(phone, "--settings-card-radius")).toBe("var(--radius-card)")

    const desktop = /@media \(min-width: 720px\) \{\s*html\[data-pro-look\] body \{([^}]*)\}/.exec(css)?.[1] ?? ""
    expect(value(desktop, "--font-size-title")).toBe("40px")
    expect(value(desktop, "--font-size-section")).toBe("24px")
    expect(value(desktop, "--font-size-body")).toBe("15px")
    expect(value(desktop, "--font-size-supporting")).toBe("13px")
    expect(value(desktop, "--radius-card")).toBe("16px")

    const inset = block('html[data-pro-look] [data-slot="sidebar-inset"]')
    expect(value(inset, "background")).toBe("var(--surface-1)")
    expect(value(inset, "border-radius")).toBe("var(--radius-card)")
    expect(value(inset, "box-shadow")).toBe("inset 0 0 0 1px var(--hairline)")
  })

  test("all seven semantic text utilities are registered in the Tailwind theme", () => {
    const inlineTheme = css.slice(css.indexOf("@theme inline {"))
    const roles = ["title", "section", "row", "body", "supporting", "badge", "hero"] as const
    for (const role of roles) {
      expect(inlineTheme).toContain(`--text-${role}: var(--font-size-${role});`)
      const lineHeight = ["title", "section", "hero"].includes(role) ? "title" : "body"
      expect(inlineTheme).toContain(`--text-${role}--line-height: var(--line-height-${lineHeight});`)
    }
    expect(css).not.toContain("text-pro-look-")
  })
})

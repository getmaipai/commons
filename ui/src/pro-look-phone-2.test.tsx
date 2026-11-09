import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { Section } from "./primitives/Section"
import { CompanionCard } from "./elements/companion-card"

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")

describe("PRO-LOOK-PHONE-2", () => {
  test("Section flat variant drops the card and accent bar; default markup unchanged", () => {
    const flat = renderToStaticMarkup(<Section heading="Voice" variant="flat">x</Section>)
    expect(flat).not.toContain("border-border")
    expect(flat).not.toContain("border-primary")
    expect(flat).toContain("text-section")
    const def = renderToStaticMarkup(<Section heading="Voice">x</Section>)
    expect(def).toContain("rounded-xl border border-border bg-card p-5")
    expect(def).toContain("border-l-2")
  })
  test("CompanionCard exposes slots the PRO look flattens", () => {
    const html = renderToStaticMarkup(<CompanionCard name="Nova" />)
    expect(html).toContain('data-slot="companion-card"')
    expect(html).toContain('data-slot="companion-card-heading"')
    expect(css).toContain('html[data-pro-look] [data-slot="companion-card"] { border-width: 0;')
  })
  test("CSS gates the look rules and exposes the phone nav offset", () => {
    expect(css).toContain(":root { --phone-nav-offset: 0px; }")
    expect(css).toContain('html[data-pro-look] [data-slot="global-mini-player"] { bottom: var(--phone-nav-offset); }')
    expect(css).toContain('html[data-pro-look] [data-slot="settings-column"] { flex: 1 1 auto; min-height: 100%; }')
    expect(css).toContain('html[data-pro-look] [data-slot="section"]:not([data-variant="card"])')
    expect(css).toContain('html[data-pro-look] [data-slot="data-table-mobile-sort"] { flex-wrap: nowrap; overflow-x: auto;')
    expect(css).toContain('html[data-pro-look] [data-slot="data-table-card-row"] { gap: 0.125rem; }')
    expect(css).toContain('[data-slot="tabs-list"][data-variant="pill"]:not([data-scroll="false"])')
  })
  test("ghost icon-only row actions stay in the PRO look", () => {
    expect(css).toContain('html[data-pro-look] [data-slot="row-action"] [data-slot="row-action-label"] { display: none; }')
  })
})

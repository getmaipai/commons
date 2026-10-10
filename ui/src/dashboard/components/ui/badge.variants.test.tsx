// Additive Badge variants (RULE9-COMMONS-VARIANTS-01): the default look is
// unchanged, and each variant adds only its own classes.
import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Badge } from "./badge"
import { Badge as KitBadge, badgeVariants as kitVariants } from "../../../ui/badge"
import { badgeVariants } from "./badge"

afterEach(cleanup)

const cls = (el: HTMLElement) => el.className.split(/\s+/)

describe("Badge tone", () => {
  test("a Badge that sets none renders the pre-variant classes", () => {
    const c = cls(render(<Badge variant="secondary">x</Badge>).getByText("x"))
    expect(c).toContain("bg-secondary")
    expect(c).toContain("text-secondary-foreground")
    expect(c.some((k) => k.includes("hue-"))).toBe(false)
  })

  test("explicit defaults equal omitted props", () => {
    expect(badgeVariants({ tone: "default" })).toBe(badgeVariants({}))
    expect(kitVariants({ tone: "default" })).toBe(kitVariants({}))
  })

  test("tone=success and tone=warning replace the variant fill (dashboard)", () => {
    const ok = cls(render(<Badge variant="secondary" tone="success">ok</Badge>).getByText("ok"))
    expect(ok).toContain("bg-[color:var(--hue-teal)]")
    expect(ok).not.toContain("bg-secondary")
    const warn = cls(render(<Badge variant="secondary" tone="warning">w</Badge>).getByText("w"))
    expect(warn).toContain("bg-[color:var(--hue-orange)]")
    expect(warn).toContain("text-foreground")
    expect(warn).not.toContain("text-secondary-foreground")
  })

  test("tone works the same on the kit badge", () => {
    const c = cls(render(<KitBadge variant="secondary" tone="warning">k</KitBadge>).getByText("k"))
    expect(c).toContain("bg-[color:var(--hue-orange)]")
    expect(c).not.toContain("bg-secondary")
  })
})

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

describe("Badge placement", () => {
  test("default adds no positioning classes", () => {
    expect(badgeVariants({ placement: "inline" })).toBe(badgeVariants({}))
    const c = cls(render(<Badge>x</Badge>).getByText("x"))
    expect(c).not.toContain("absolute")
  })

  test("placement=corner pins to the top-end corner (dashboard and kit)", () => {
    const d = cls(render(<Badge placement="corner">d</Badge>).getByText("d"))
    expect(d).toEqual(expect.arrayContaining(["absolute", "-top-1", "-end-1"]))
    const k = cls(render(<KitBadge placement="corner">k</KitBadge>).getByText("k"))
    expect(k).toEqual(expect.arrayContaining(["absolute", "-top-1", "-end-1"]))
  })

  test("placement combines with tone", () => {
    const c = cls(render(<Badge tone="warning" placement="corner">c</Badge>).getByText("c"))
    expect(c).toEqual(expect.arrayContaining(["absolute", "bg-[color:var(--hue-orange)]"]))
  })
})

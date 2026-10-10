// Additive SelectTrigger variants (RULE9-COMMONS-VARIANTS-01): the default look
// is unchanged, and each variant adds only its own classes.
import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Select, SelectTrigger, SelectValue } from "./select"
import * as Kit from "../../../ui/select"

afterEach(cleanup)

const trigger = () => {
  const el = document.body.querySelector<HTMLElement>("[data-slot='select-trigger']")
  expect(el).not.toBeNull()
  return (el as HTMLElement).className.split(/\s+/)
}

describe("dashboard SelectTrigger touch size and full width", () => {
  const draw = (props: Record<string, unknown>) =>
    render(<Select><SelectTrigger {...props}><SelectValue /></SelectTrigger></Select>)

  test("a trigger that sets neither renders the pre-variant classes", () => {
    draw({})
    const c = trigger()
    expect(c).toContain("w-fit")
    expect(c).toContain("data-[size=default]:h-8")
    expect(c).not.toContain("w-full")
    expect(c).not.toContain("min-h-12")
  })

  test("explicit defaults equal omitted props", () => {
    draw({ size: "default", width: "fit" })
    const explicit = trigger().join(" ")
    cleanup()
    draw({})
    expect(explicit).toBe(trigger().join(" "))
  })

  test("size=touch grows with content and keeps the 48px floor", () => {
    draw({ size: "touch" })
    expect(trigger()).toEqual(expect.arrayContaining(["h-auto", "min-h-12"]))
  })

  test("width=full replaces w-fit", () => {
    draw({ width: "full" })
    const c = trigger()
    expect(c).toContain("w-full")
    expect(c).not.toContain("w-fit")
  })
})

describe("kit SelectTrigger full width", () => {
  const draw = (props: Record<string, unknown>) =>
    render(<Kit.Select><Kit.SelectTrigger {...props}><Kit.SelectValue /></Kit.SelectTrigger></Kit.Select>)

  test("default stays content-width and 48px", () => {
    draw({})
    const c = trigger()
    expect(c).toContain("w-fit")
    expect(c).toContain("data-[size=default]:h-12")
    expect(c).not.toContain("w-full")
  })

  test("width=full replaces w-fit", () => {
    draw({ width: "full" })
    const c = trigger()
    expect(c).toContain("w-full")
    expect(c).not.toContain("w-fit")
  })
})

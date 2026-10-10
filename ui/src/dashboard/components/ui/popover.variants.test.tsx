// Additive PopoverContent variants (RULE9-COMMONS-VARIANTS-01): the default
// look is unchanged, and each variant adds only its own classes.
import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import * as Kit from "../../../ui/popover"

afterEach(cleanup)

const content = () => {
  const el = document.body.querySelector<HTMLElement>("[data-slot='popover-content']")
  expect(el).not.toBeNull()
  return (el as HTMLElement).className.split(/\s+/)
}

describe("dashboard PopoverContent no-padding and auto-width", () => {
  const draw = (props: Record<string, unknown>) =>
    render(
      <Popover open>
        <PopoverTrigger>t</PopoverTrigger>
        <PopoverContent {...props}>x</PopoverContent>
      </Popover>,
    )

  test("a popover that sets neither renders the pre-variant classes", () => {
    draw({})
    const c = content()
    expect(c).toContain("w-72")
    expect(c).toContain("p-2.5")
    expect(c).not.toContain("p-0")
    expect(c).not.toContain("w-auto")
  })

  test("explicit defaults equal omitted props", () => {
    draw({ padding: "default", width: "default" })
    const explicit = content().join(" ")
    cleanup()
    draw({})
    expect(explicit).toBe(content().join(" "))
  })

  test("padding=none replaces the inner padding", () => {
    draw({ padding: "none" })
    const c = content()
    expect(c).toContain("p-0")
    expect(c).not.toContain("p-2.5")
  })

  test("width=auto replaces w-72", () => {
    draw({ width: "auto" })
    const c = content()
    expect(c).toContain("w-auto")
    expect(c).not.toContain("w-72")
  })
})

describe("kit PopoverContent no-padding and auto-width", () => {
  const draw = (props: Record<string, unknown>) =>
    render(
      <Kit.Popover open>
        <Kit.PopoverTrigger>t</Kit.PopoverTrigger>
        <Kit.PopoverContent {...props}>x</Kit.PopoverContent>
      </Kit.Popover>,
    )

  test("defaults keep w-72 and p-4", () => {
    draw({})
    const c = content()
    expect(c).toEqual(expect.arrayContaining(["w-72", "p-4"]))
  })

  test("padding=none and width=auto replace them", () => {
    draw({ padding: "none", width: "auto" })
    const c = content()
    expect(c).toEqual(expect.arrayContaining(["p-0", "w-auto"]))
    expect(c).not.toContain("w-72")
    expect(c).not.toContain("p-4")
  })
})

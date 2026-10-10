// Additive DialogContent variants (RULE9-COMMONS-VARIANTS-01): the default look
// is unchanged, and each variant adds only its own classes.
import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Dialog, DialogContent } from "./dialog"
import * as KitDialog from "../../../ui/dialog"

afterEach(cleanup)

const content = () => {
  const el = document.body.querySelector<HTMLElement>("[data-slot='dialog-content']")
  expect(el).not.toBeNull()
  return (el as HTMLElement).className.split(/\s+/)
}

describe("dashboard DialogContent size and scroll", () => {
  test("a dialog that sets neither renders the pre-variant classes", () => {
    render(<Dialog open><DialogContent>x</DialogContent></Dialog>)
    const c = content()
    expect(c).toContain("sm:max-w-sm")
    expect(c).not.toContain("max-h-screen")
    expect(c).not.toContain("overflow-y-auto")
  })

  test("explicit defaults equal omitted props", () => {
    render(<Dialog open><DialogContent size="default" scroll="none">x</DialogContent></Dialog>)
    const explicit = content().join(" ")
    cleanup()
    render(<Dialog open><DialogContent>x</DialogContent></Dialog>)
    expect(explicit).toBe(content().join(" "))
  })

  test("size=lg and size=xl replace the sm width", () => {
    render(<Dialog open><DialogContent size="lg">x</DialogContent></Dialog>)
    const lg = content()
    expect(lg).toContain("sm:max-w-lg")
    expect(lg).not.toContain("sm:max-w-sm")
    cleanup()
    render(<Dialog open><DialogContent size="xl">x</DialogContent></Dialog>)
    expect(content()).toContain("sm:max-w-2xl")
  })

  test("scroll=viewport caps the height and scrolls", () => {
    render(<Dialog open><DialogContent scroll="viewport">x</DialogContent></Dialog>)
    expect(content()).toEqual(expect.arrayContaining(["max-h-screen", "overflow-y-auto"]))
  })
})

describe("kit DialogContent size and scroll", () => {
  const K = KitDialog
  const render1 = (props: Record<string, unknown>) =>
    render(<K.Dialog open><K.DialogContent {...props}>x</K.DialogContent></K.Dialog>)

  test("defaults keep sm:max-w-lg and add no scroll classes", () => {
    render1({})
    const c = content()
    expect(c).toContain("sm:max-w-lg")
    expect(c).not.toContain("max-h-screen")
  })

  test("size=sm and size=xl change the default variant width", () => {
    render1({ size: "sm" })
    expect(content()).toContain("sm:max-w-sm")
    cleanup()
    render1({ size: "xl" })
    expect(content()).toContain("sm:max-w-2xl")
  })

  test("scroll=viewport caps the height and scrolls", () => {
    render1({ scroll: "viewport" })
    expect(content()).toEqual(expect.arrayContaining(["max-h-screen", "overflow-y-auto"]))
  })

  test("the command variant's size=lg is unchanged", () => {
    render1({ variant: "command", size: "lg" })
    expect(content()).toContain("sm:max-w-3xl")
  })
})

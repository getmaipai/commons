import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { StatusCard } from "@/kit/elements/status-card"

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
})

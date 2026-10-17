// MEDIA-POLISH-01: the additive `pill` TabsList variant. The default and line
// variants keep their classes; pill adds only its own.
import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { Tabs, TabsList, TabsTrigger, tabsListVariants } from "./tabs"

afterEach(cleanup)

const cls = (el: HTMLElement) => el.className.split(/\s+/)

describe("TabsList pill", () => {
  test("explicit default equals omitted, and default and line carry no pill classes", () => {
    expect(tabsListVariants({ variant: "default" })).toBe(tabsListVariants({}))
    expect(tabsListVariants({})).not.toContain("overflow-x-auto")
    expect(tabsListVariants({ variant: "line" })).not.toContain("overflow-x-auto")
  })

  test("pill is a transparent row that scrolls sideways, marked for its triggers", () => {
    const { getByRole } = render(
      <Tabs defaultValue="home">
        <TabsList variant="pill" aria-label="Sections">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    const list = getByRole("tablist", { name: "Sections" })
    expect(list.getAttribute("data-variant")).toBe("pill")
    expect(cls(list)).toContain("overflow-x-auto")
    expect(cls(list)).toContain("bg-transparent")
    expect(cls(list)).not.toContain("bg-muted")
    const tab = getByRole("tab", { name: "Home" })
    expect(cls(tab)).toContain("group-data-[variant=pill]/tabs-list:rounded-full!")
    expect(cls(tab)).toContain("group-data-[variant=pill]/tabs-list:data-active:bg-foreground!")
  })
})

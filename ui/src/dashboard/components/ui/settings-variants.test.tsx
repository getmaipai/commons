import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Button } from "./button"
import { Input } from "./input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "./item"
import { Select, SelectTrigger, SelectValue } from "./select"
import {
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "./sidebar"
import { Switch } from "./switch"
import { defaultMarkup } from "./settings-variants.fixture"

afterEach(cleanup)

describe("defaults are unchanged (KIT-SET-01)", () => {
  const before = JSON.parse(
    readFileSync(resolve(import.meta.dir, "settings-default-markup.json"), "utf8")
  ) as Record<string, string>
  const after = defaultMarkup()

  test("the fixture covers every part that gained a variant", () => {
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort())
    expect(Object.keys(before).length).toBeGreaterThan(60)
  })

  for (const name of Object.keys(before)) {
    test(`${name} renders the markup it had before`, () => {
      expect(after[name]).toBe(before[name]!)
    })
  }
})

describe("new Item variants", () => {
  test("ItemGroup variant=card is the settings card", () => {
    const el = render(<ItemGroup variant="card" />).container.firstElementChild!
    expect(el.className).toContain("gap-0")
    expect(el.className).not.toContain("gap-4")
    expect(el.className).toContain("overflow-hidden")
    expect(el.className).toContain("border-settings-card-border")
    expect(el.className).toContain("bg-settings-card")
    expect(el.className).toContain("rounded-[var(--settings-card-radius)]")
    expect(el.getAttribute("data-variant")).toBe("card")
  })

  test("Item size=setting is a 60 px row with 12 x 16 padding and no wrap", () => {
    const el = render(<Item size="setting" />).container.firstElementChild!
    expect(el.getAttribute("data-size")).toBe("setting")
    expect(el.className).toContain("min-h-[60px]")
    expect(el.className).toContain("px-4")
    expect(el.className).toContain("py-3")
    expect(el.className).toContain("gap-4")
    expect(el.className).toContain("flex-nowrap")
    expect(el.className).toContain("rounded-none")
    expect(el.className).not.toContain("flex-wrap ")
    expect(el.className).not.toContain("rounded-lg")
  })

  test("a setting row reads title 14/20 and helper 13/16 at the helper tone, actions to the right", () => {
    const { getByText } = render(
      <Item size="setting">
        <ItemContent>
          <ItemTitle>Title</ItemTitle>
          <ItemDescription clamp={false}>Helper</ItemDescription>
        </ItemContent>
        <ItemActions>Act</ItemActions>
      </Item>
    )
    expect(getByText("Title").className).toContain("leading-5")
    const helper = getByText("Helper").className
    expect(helper).toContain("text-[13px]")
    expect(helper).toContain("leading-4")
    expect(helper).toContain("text-settings-helper")
    expect(helper).not.toContain("text-sm")
    expect(getByText("Act").className).toContain("ml-auto")
  })

  test("ItemContent in a setting row is capped at the row-text token", () => {
    const { container } = render(
      <Item size="setting">
        <ItemContent />
      </Item>
    )
    const content = container.querySelector("[data-slot=item-content]")!
    expect(content.className).toContain("max-w-(--settings-row-text-max)")
    expect(content.className).toContain("gap-0")
    cleanup()
    const plain = render(<ItemContent />).container.firstElementChild!
    expect(plain.className).not.toContain("settings-row-text-max")
  })

  test("ItemDescription clamp=false drops the two-line clamp; default keeps it", () => {
    const off = render(<ItemDescription clamp={false}>x</ItemDescription>).container.firstElementChild!
    expect(off.className).not.toContain("line-clamp-2")
    cleanup()
    const on = render(<ItemDescription>x</ItemDescription>).container.firstElementChild!
    expect(on.className).toContain("line-clamp-2")
  })

  test("ItemSeparator variant=inset insets 16 px each side in the card border colour", () => {
    const el = render(<ItemSeparator variant="inset" />).container.firstElementChild!
    expect(el.className).toContain("mx-4")
    expect(el.className).toContain("my-0")
    expect(el.className).not.toContain("my-2")
    expect(el.className).toContain("bg-settings-card-border")
    expect(el.className).toContain("data-horizontal:w-[calc(100%-2rem)]")
  })
})

describe("Switch size=md", () => {
  test("is 32 x 20 with a 16 px knob and the --switch-checked track", () => {
    const { container } = render(<Switch size="md" defaultChecked />)
    const root = container.querySelector("[data-slot=switch]")!
    expect(root.getAttribute("data-size")).toBe("md")
    expect(root.className).toContain("h-5")
    expect(root.className).toContain("w-8")
    expect(root.className).toContain("data-checked:bg-[color:var(--switch-checked)]")
    expect(root.className).not.toContain("data-checked:bg-primary")
    expect(root.className).toContain("data-unchecked:bg-settings-switch-off")
    const thumb = container.querySelector("[data-slot=switch-thumb]")!
    expect(thumb.className).toContain("size-4")
    expect(thumb.className).toContain("data-checked:translate-x-[13px]")
    expect(thumb.className).toContain("bg-settings-knob")
  })
})

describe("size=row controls are 28 px with an 8 px radius", () => {
  test("Button", () => {
    const el = render(<Button variant="secondary" size="row">Change</Button>).getByRole("button")
    expect(el.className).toContain("h-7")
    expect(el.className).toContain("rounded-[var(--settings-control-radius)]")
    expect(el.className).toContain("px-2.5")
    expect(el.className).toContain("bg-settings-button")
    expect(el.className).not.toMatch(/(^| )bg-secondary( |$)/)
    expect(el.className).toContain("pointer-coarse:before:-inset-2.5")
  })

  test("Button row keeps its variant fill when it is not secondary", () => {
    const el = render(<Button size="row">Go</Button>).getByRole("button")
    expect(el.className).toContain("bg-primary")
    expect(el.className).not.toContain("bg-settings-button")
  })

  test("Input", () => {
    const el = render(<Input size="row" />).getByRole("textbox")
    expect(el.className).toContain("h-7")
    expect(el.className).not.toContain("h-8")
    expect(el.className).toContain("bg-settings-control")
    expect(el.className).toContain("border-settings-control-border")
    expect(el.getAttribute("data-size")).toBe("row")
  })

  test("SelectTrigger", () => {
    const el = render(
      <Select>
        <SelectTrigger size="row">
          <SelectValue />
        </SelectTrigger>
      </Select>
    ).getByRole("combobox")
    expect(el.getAttribute("data-size")).toBe("row")
    expect(el.className).toContain("h-7")
    expect(el.className).toContain("bg-settings-control")
    expect(el.className).toContain("border-settings-control-border")
    expect(el.className).toContain("rounded-[var(--settings-control-radius)]")
  })
})

describe("sidebar settings variants", () => {
  test("SidebarInput variant=pill is 36 px, fully rounded, filled, no border", () => {
    const el = render(<SidebarInput variant="pill" aria-label="Search" />).getByRole("textbox")
    expect(el.className).toContain("h-9")
    expect(el.className).not.toContain("h-8")
    expect(el.className).toContain("rounded-full")
    expect(el.className).toContain("bg-settings-fill")
    expect(el.className).toContain("border-transparent")
    expect(el.getAttribute("data-variant")).toBe("pill")
  })

  test("SidebarMenuButton size=settings is 30 px with the 8 px radius and the active fill", () => {
    const { getByText } = render(
      <SidebarProvider keyboardShortcut={false}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="settings" isActive>
              General
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>
    )
    const el = getByText("General")
    expect(el.getAttribute("data-size")).toBe("settings")
    expect(el.getAttribute("data-active")).not.toBeNull()
    expect(el.className).toContain("h-[30px]")
    expect(el.className).toContain("rounded-[var(--settings-control-radius)]")
    expect(el.className).toContain("data-active:bg-settings-fill")
    expect(el.className).toContain("data-active:font-normal")
    expect(el.className).not.toContain("rounded-md")
  })
})

describe("SidebarProvider keyboardShortcut", () => {
  function Probe({ label }: { label: string }) {
    const { open } = useSidebar()
    return <span data-testid={label}>{open ? "open" : "closed"}</span>
  }

  test("Cmd+B toggles a default provider and leaves a keyboardShortcut={false} one alone", () => {
    const { getByTestId } = render(
      <>
        <SidebarProvider>
          <Probe label="rail" />
        </SidebarProvider>
        <SidebarProvider keyboardShortcut={false}>
          <Probe label="settings" />
        </SidebarProvider>
      </>
    )
    expect(getByTestId("rail").textContent).toBe("open")
    fireEvent.keyDown(window, { key: "b", metaKey: true })
    expect(getByTestId("rail").textContent).toBe("closed")
    expect(getByTestId("settings").textContent).toBe("open")
  })

  test("a string picks another key", () => {
    const { getByTestId } = render(
      <SidebarProvider keyboardShortcut="j">
        <Probe label="p" />
      </SidebarProvider>
    )
    fireEvent.keyDown(window, { key: "b", metaKey: true })
    expect(getByTestId("p").textContent).toBe("open")
    fireEvent.keyDown(window, { key: "j", ctrlKey: true })
    expect(getByTestId("p").textContent).toBe("closed")
  })
})

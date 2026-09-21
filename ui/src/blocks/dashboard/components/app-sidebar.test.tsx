import { describe, expect, test, afterEach } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar, ungroupedNav } from "./app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/kit/ui/sidebar";
import type { NavEntry } from "@/kit/nav";

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
});

describe("ungroupedNav", () => {
  test("wraps a flat entry list under one label, resolving each entry's icon", () => {
    const entries: NavEntry[] = [{ to: "/", icon: "home", label: "Home" }];
    const groups = ungroupedNav(entries);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("Navigation");
    expect(groups[0]!.items[0]!.title).toBe("Home");
    expect(groups[0]!.items[0]!.url).toBe("/");
  });

  test("honors a custom label", () => {
    const groups = ungroupedNav([{ to: "/", icon: "home", label: "Home" }], "Apps");
    expect(groups[0]!.label).toBe("Apps");
  });
});

describe("AppSidebar", () => {
  test("marks the entry matching the current path active without the caller computing it", () => {
    const groups = ungroupedNav([
      { to: "/", icon: "home", label: "Home" },
      { to: "/apps", icon: "layout-grid", label: "Apps" },
    ]);
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <SidebarProvider>
          <AppSidebar groups={groups} brand={<span>Brand</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(getByRole("link", { name: "Apps" })).toHaveAttribute("data-active", "true");
    expect(getByRole("link", { name: "Home" })).not.toHaveAttribute("data-active", "true");
  });

  test("renders the footer slot only when given", () => {
    const groups = ungroupedNav([{ to: "/", icon: "home", label: "Home" }]);
    const { queryByText, rerender } = render(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar groups={groups} brand={<span>Brand</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(queryByText("Footer content")).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar groups={groups} brand={<span>Brand</span>} footer={<span>Footer content</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(queryByText("Footer content")).toBeInTheDocument();
  });

  // `Sidebar`'s isMobile branch renders through `Sheet` (Radix
  // Dialog.Root, no DOM output of its own) wrapping `SheetContent` - a
  // code review caught the landmark role/aria-label AppSidebar passes
  // down being spread onto `Sheet` instead of `SheetContent`, silently
  // lost on every phone-width render. Exercising the actual mobile
  // Sheet open state (nothing did before) so this can't slip back.
  test("the landmark role/label still reach the real DOM on phone width", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const groups = ungroupedNav([{ to: "/", icon: "home", label: "Home" }]);
    const { getByRole } = render(
      <MemoryRouter>
        <SidebarProvider>
          <SidebarTrigger />
          <AppSidebar groups={groups} brand={<span>Brand</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    act(() => {
      fireEvent.pointerDown(getByRole("button", { name: /collapse navigation|expand navigation/i }), { button: 0, pointerId: 1 });
      fireEvent.click(getByRole("button", { name: /collapse navigation|expand navigation/i }));
    });
    const nav = document.body.querySelector('[data-slot="sidebar"]');
    expect(nav).toHaveAttribute("role", "navigation");
    expect(nav).toHaveAttribute("aria-label", "Main navigation");
  });

  // Found live (a real household's own report, 2026-09-20, step 5b's
  // restart verification): a collapsed rail showed one stray letter per
  // row instead of an icon-only look - nav-main.tsx's own title `<span>`
  // had no `group-data-[collapsible=icon]:hidden`, so sidebar.tsx's own
  // `[&>span:last-child]:truncate` clipped it to whatever sliver fit the
  // collapsed button instead of hiding it. happy-dom never computes real
  // layout (no CSS engine), so this can only assert the class is present,
  // not that the text is actually invisible on screen - the real visual
  // check is scripts/screenshot.ts's own captureShellRail, home/.
  test("a nav item's label carries the collapsed-rail hidden class, and the link keeps a real accessible name", () => {
    const groups = ungroupedNav([{ to: "/", icon: "home", label: "Home" }]);
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <SidebarProvider open={false}>
          <AppSidebar groups={groups} brand={<span>Brand</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(getByText("Home")).toHaveClass("group-data-[collapsible=icon]:hidden");
    // The first fix (hiding the label span) shipped its own regression:
    // the icon alone carries no text, and SidebarMenuButton's `tooltip`
    // is hover/focus-only, never wired to aria-label - a real household
    // sweep at tablet width (which defaults to collapsed,
    // defaultRailOpen()'s own <1280px threshold) caught every nav link
    // with no discernible name before `aria-label` was added below.
    expect(getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  // ui-v0.4.4: the brand button's own `pl-4!` (16px, "the tile's left
  // edge sits at x 16") lost silently to `data-[slot=sidebar-menu-
  // button]:p-1!`, a shorthand also on the button - both `!important`,
  // but a code review's own compiled-CSS check found the real
  // mechanism was specificity, not source order: the variant form
  // compiles to a compound selector (specificity 0,2,0) that
  // deterministically beats the plain `pl-4!` (0,1,0), so the tile
  // rendered clipped at x 0 in two shipped captures (ui-v0.4.2,
  // ui-v0.4.3) before a live pixel measurement caught it. happy-dom
  // computes no real cascade, so the only thing worth asserting here is
  // the fact that actually matters: the button's own padding tokens are
  // exactly the four this fix intends (three longhand sides for the
  // expanded row, the one deliberate collapsed-row override) and
  // nothing else - any OTHER padding-shorthand token, bare or under a
  // variant (`p-1!`, `data-[slot=...]:p-1!`, `px-2!`, and so on),
  // reintroduces exactly this bug and fails this test before it ships
  // to another live capture, whether or not it happens to share a name
  // with the deliberate collapsed override.
  test("the brand button's own padding is exactly the four intended tokens, no shorthand fighting pl-4!", () => {
    const groups = ungroupedNav([{ to: "/", icon: "home", label: "Home" }]);
    const { getByText } = render(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar groups={groups} brand={<span>Brand</span>} />
        </SidebarProvider>
      </MemoryRouter>,
    );
    const brandButton = getByText("Brand");
    // Only `!important` padding tokens matter here: a plain (non-
    // important) shorthand like the primitive's own base `p-2` always
    // loses to an `!important` longhand regardless of specificity, so
    // it's not part of the bug class this test guards - only two
    // `!important` rules both targeting the same side can collide the
    // way the old `data-[slot=...]:p-1!` and `pl-4!` did.
    const importantPaddingTokens = brandButton.className.split(/\s+/).filter((c) => /(^|:)p[trblxy]?-\d+!$/.test(c));
    expect(new Set(importantPaddingTokens)).toEqual(new Set(["py-1!", "pr-1!", "pl-4!", "group-data-[collapsible=icon]:p-2!"]));
  });
});

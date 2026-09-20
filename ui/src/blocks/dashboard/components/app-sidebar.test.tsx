import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar, ungroupedNav } from "./app-sidebar";
import { SidebarProvider } from "@/kit/ui/sidebar";
import type { NavEntry } from "@/kit/nav";

afterEach(cleanup);

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
});

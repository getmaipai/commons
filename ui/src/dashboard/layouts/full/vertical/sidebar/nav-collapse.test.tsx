import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "../../../../components/ui/sidebar";
import NavCollapse from "./nav-collapse";

afterEach(cleanup);

function renderMenu(status?: "amber" | "red") {
  return render(<MemoryRouter initialEntries={["/chat"]}><SidebarProvider><NavCollapse menu={[{ heading: "Home", items: [{ name: "Chat", url: "/chat" }] }]} sidebarItemStatus={status ? () => ({ badge: status, title: "Chat can't reach Brain right now.", ariaLabel: "Chat: not working" }) : undefined} /></SidebarProvider></MemoryRouter>);
}

describe("sidebar app status badge slot", () => {
  test.each([["amber", "bg-[var(--hue-yellow)]"], ["red", "bg-destructive"]] as const)("shows the %s dot through SidebarMenuBadge", (severity, color) => {
    const view = renderMenu(severity);
    const link = view.getByRole("link", { name: "Chat: not working" });
    expect(link.getAttribute("href")).toBe("/chat");
    expect(link.getAttribute("title")).toBe("Chat can't reach Brain right now.");
    expect(view.container.querySelector('[data-slot="sidebar-menu-badge"]')?.className).toContain(color);
  });

  test("renders nothing for a healthy app and leaves the link available", () => {
    const view = renderMenu();
    expect(view.getByRole("link", { name: "Chat" }).getAttribute("href")).toBe("/chat");
    expect(view.container.querySelector('[data-slot="sidebar-menu-badge"]')).toBeNull();
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout, { resolveInitialSidebarOpen } from "./FullLayout";
import { TooltipProvider } from "../../components/ui/tooltip";
import { navItemTooltip } from "./vertical/sidebar/nav-items";
import { renderToStaticMarkup } from "react-dom/server";

afterEach(() => {
  cleanup();
  document.cookie = "sidebar_state=; path=/; max-age=0";
});

function renderLayout(defaultSidebarOpen = true) {
  return render(
    <MemoryRouter initialEntries={["/next"]}>
      <TooltipProvider>
        <Routes>
          <Route path="/next" element={<FullLayout defaultSidebarOpen={defaultSidebarOpen} showSidebarTriggerInMenu showHeaderSidebarTrigger={false} />}>
            <Route index element={<div>Page</div>} />
          </Route>
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("SHELL-FOLD-01 menu defaults", () => {
  test("with no stored choice, Home can start folded", () => {
    expect(resolveInitialSidebarOpen("", false)).toBe(false);
    const { container } = renderLayout(false);
    expect(container.querySelector('[data-slot="sidebar"][data-state="collapsed"]')).not.toBeNull();
  });

  test("stored open wins over folded default", () => {
    expect(resolveInitialSidebarOpen("session=abc; sidebar_state=true", false)).toBe(true);
  });

  test("stored folded wins over open default", () => {
    expect(resolveInitialSidebarOpen("sidebar_state=false", true)).toBe(false);
  });

  test("the relocated trigger is in the menu and can be focused", () => {
    const { getByRole, container } = renderLayout(false);
    const trigger = getByRole("button", { name: "Toggle app menu" });
    expect(container.querySelector('[data-slot="sidebar"]')?.contains(trigger)).toBe(true);
    expect(trigger.tabIndex).toBeGreaterThanOrEqual(0);
    expect(container.querySelector("header [data-slot=sidebar-trigger]")?.className).toContain("md:hidden");
  });

  test("every folded menu icon has its item name as accessible name", () => {
    const { getByRole } = renderLayout(false);
    for (const name of ["Home", "Chat", "Library", "Family"]) {
      expect(getByRole("link", { name })).toBeTruthy();
    }
  });

  test("each folded icon tooltip starts with its name, including entries with a status sentence", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/next"]}>
        <TooltipProvider>
          <Routes>
            <Route path="/next" element={<FullLayout defaultSidebarOpen={false} showSidebarTriggerInMenu showHeaderSidebarTrigger={false} sidebarItemStatus={(item) => item.name === "Chat" ? { title: "Chat has outside services with no recent use.", ariaLabel: "Chat: degraded" } : undefined} />}>
              <Route index element={<div>Page</div>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );
    for (const name of ["Home", "Chat", "Library", "Family"]) {
      const item = getByRole("link", { name: new RegExp(`^${name}(?:\\b|:)`) });
      expect(item.getAttribute("aria-label")?.startsWith(name)).toBe(true);
      if (name === "Chat") {
        expect(item.getAttribute("aria-label")).toBe("Chat: degraded");
      }
    }
    const status = "Chat has outside services with no recent use.";
    for (const name of ["Home", "Chat", "Library", "Family", "Settings", "Help"]) {
      const title = name === "Chat" ? status : undefined;
      const tooltipMarkup = renderToStaticMarkup(navItemTooltip(name, title));
      const tooltipText = tooltipMarkup.replace(/<[^>]+>/g, "");
      expect(tooltipText.startsWith(name)).toBe(true);
      if (title) expect(tooltipText).toContain(title);
    }
  });

  test("phone retains a header trigger for the off-canvas sheet", () => {
    const { getByRole, container } = renderLayout(false);
    const headerTrigger = container.querySelector("header [data-slot=sidebar-trigger]");
    const menuTrigger = getByRole("button", { name: "Toggle app menu" });
    expect(headerTrigger).not.toBeNull();
    expect(container.querySelector('[data-slot="sidebar"]')?.contains(menuTrigger)).toBe(true);
  });
});

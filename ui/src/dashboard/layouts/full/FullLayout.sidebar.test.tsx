import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout, { resolveInitialSidebarOpen } from "./FullLayout";
import { TooltipProvider } from "../../components/ui/tooltip";

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
    expect(container.querySelector("header [data-slot=sidebar-trigger]")).toBeNull();
  });

  test("every folded menu icon has its item name as accessible name", () => {
    const { getByRole } = renderLayout(false);
    for (const name of ["Home", "Chat", "Library", "Family"]) {
      expect(getByRole("link", { name })).toBeTruthy();
    }
  });
});

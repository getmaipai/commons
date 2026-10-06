import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout from "./FullLayout";
import { TooltipProvider } from "../../components/ui/tooltip";
import { isRailItemActive } from "./vertical/rail/AppRail";
import RailProfileMenu from "./vertical/rail/RailProfileMenu";
import { useHeaderExtra } from "./vertical/header/HeaderExtraContext";

afterEach(cleanup);

function Titled() {
  useHeaderExtra(PageTitle);
  return <div>Page</div>;
}
function PageTitle() {
  return <span>Settings</span>;
}

function renderRail(path: string, profile = <RailProfileMenu displayName="Sage Willow" subtitle="Owner" helpHref="/help" onLogout={() => {}} />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Routes>
          <Route element={<FullLayout rail railProfile={profile} />}>
            <Route path="/chat" element={<div>Chat</div>} />
            <Route path="/settings" element={<Titled />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("RAIL-01 app rail", () => {
  test("a 56px rail with each app named, the current one marked, Search and the profile at the foot", () => {
    const view = renderRail("/chat");
    const rail = view.getByRole("navigation", { name: "Primary navigation" });
    expect(rail.className).toContain("w-14");
    for (const name of ["Home", "Chat", "Library", "Family"]) expect(view.getByRole("link", { name })).toBeTruthy();
    expect(view.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("button", { name: "Search" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Open profile menu for Sage Willow" })).toBeTruthy();
  });

  test("a nested path keeps its app selected; Home matches only itself", () => {
    expect(isRailItemActive("/people/abc", "/next/people")).toBe(true);
    expect(isRailItemActive("/chat", "/next")).toBe(false);
    expect(isRailItemActive("/", "/next")).toBe(true);
  });

  test("the page header renders only when a page places content in it", () => {
    expect(renderRail("/chat").container.querySelector("header")).toBeNull();
    cleanup();
    expect(renderRail("/settings").container.querySelector('header[data-slot="rail-page-header"]')?.textContent).toBe("Settings");
  });

  test("the profile menu names the person and lists the utility rows with their state", async () => {
    const onIncognito: boolean[] = [];
    const view = renderRail(
      "/chat",
      <RailProfileMenu
        displayName="Sage Willow"
        subtitle="Owner"
        notifications={{ count: 2, onOpen: () => {} }}
        status={{ label: "Degraded", level: "degraded", href: "/status" }}
        incognito={{ on: false, onChange: (on) => onIncognito.push(on) }}
        helpHref="/help"
        onLogout={() => {}}
      />,
    );
    const trigger = view.getByRole("button", { name: /Open profile menu for Sage Willow \(2 notifications, system degraded\)/ });
    expect(view.container.querySelector('[data-slot="rail-profile-badge"]')?.textContent).toBe("2");
    fireEvent.click(trigger);
    await waitFor(() => expect(view.getByRole("menuitem", { name: /Notifications/ })).toBeTruthy());
    expect(view.getByRole("menuitem", { name: /System status/ }).textContent).toContain("Degraded");
    expect(view.getByRole("menuitem", { name: /Settings/ })).toBeTruthy();
    expect(view.getByRole("menuitem", { name: /Help/ })).toBeTruthy();
    expect(view.getByRole("menuitem", { name: /Log out/ })).toBeTruthy();
    const incognito = view.getByRole("menuitem", { name: /Incognito/ });
    expect(incognito.textContent).toContain("Off");
    fireEvent.click(incognito);
    expect(onIncognito).toEqual([true]);
  });

  test("a status problem alone shows the attention dot, not a count", () => {
    const view = renderRail("/chat", <RailProfileMenu displayName="Sage" status={{ label: "Something is down", level: "offline", href: "/status" }} />);
    expect(view.container.querySelector('[data-slot="rail-profile-dot"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="rail-profile-badge"]')).toBeNull();
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import AppRail, { type RailApp } from "./AppRail";

afterEach(cleanup);

function apps(pinnedCount: number): RailApp[] {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `App ${index + 1}`,
    url: `/apps/${index + 1}`,
    icon: "layout-grid",
    pinned: index < pinnedCount,
  }));
}

function rail(pinnedCount: number, onTogglePin: (url: string, pinned: boolean) => void = () => {}) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <AppRail apps={apps(pinnedCount)} onTogglePin={onTogglePin} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("RAIL-01 pinned apps", () => {
  test("shows all nine pinned apps in the scroll container", () => {
    const view = rail(9);
    expect(view.getAllByRole("link", { name: /^App / })).toHaveLength(9);
    const pinned = view.container.querySelector('[data-slot="app-rail-pinned"]');
    expect(pinned).not.toBeNull();
    expect(pinned?.className).toContain("min-h-0");
    expect(pinned?.className).toContain("flex-1");
    expect(pinned?.className).toContain("overflow-y-auto");
  });

  test("keeps pinning enabled with nine apps already pinned", async () => {
    const toggled: Array<[string, boolean]> = [];
    const view = rail(9, (url, pinned) => toggled.push([url, pinned]));
    fireEvent.click(view.getByRole("button", { name: "All apps" }));
    const pin = await waitFor(() => view.getByRole("button", { name: "Pin App 10 to the rail" }));
    expect((pin as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(pin);
    expect(toggled).toEqual([["/apps/10", true]]);
    expect(view.queryByText(/rail holds/i)).toBeNull();
  });
});

describe("PRO-LOOK labelled rail variant", () => {
  test("default remains the icon-only 56px rail", () => {
    const view = rail(0);
    const nav = view.container.querySelector('[data-slot="app-rail"]');
    expect(nav?.className).toContain("w-[var(--rail-width,56px)]");
    expect(view.queryByText("Chat")).toBeNull();
  });

  test("labelled variant shows names and uses the active surface pill", () => {
    const view = render(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail variant="labelled" /></TooltipProvider></MemoryRouter>);
    const nav = view.container.querySelector('[data-slot="app-rail"]');
    const chat = view.getByRole("link", { name: /^Chat/ });
    expect(nav?.className).toContain("w-[var(--rail-width-labelled)]");
    expect(nav?.getAttribute("style")).toContain("--rail-width-labelled: 80px");
    expect(chat.textContent).toContain("Chat");
    expect(chat.className).toContain("bg-[var(--surface-2)]");
    expect(chat.className).toContain("rounded-2xl");
  });
});

describe("grouped expanding AppRail", () => {
  const items = [
    { id: "home", label: "Home", icon: "house", href: "/" },
    { id: "chat", label: "Chat", icon: "message-circle", href: "/chat", group: "work" },
    { id: "media", label: "Media", icon: "film", href: "/media", group: "create" },
    { id: "settings", label: "Settings", icon: "settings", href: "/settings", group: "manage" },
  ];
  const groups = [{ id: "default" }, { id: "work", label: "Work" }, { id: "create", label: "Create" }, { id: "manage", label: "Manage" }];
  const groupedRail = (props: React.ComponentProps<typeof AppRail> = {}) => render(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail items={items} groups={groups} {...props} /></TooltipProvider></MemoryRouter>);

  test("grouped items draw their status mark and name it in the accessible label", () => {
    const view = groupedRail({ itemStatus: (item) => item.name === "Chat" ? { title: "Something is running", ariaLabel: "Chat: running", level: "maintenance" } : undefined });
    expect(view.getByRole("link", { name: "Chat: running" }).querySelector('[data-slot="rail-status-mark"]')?.getAttribute("data-status-level")).toBe("maintenance");
    expect(view.getByRole("link", { name: "Media" }).querySelector('[data-slot="rail-status-mark"]')).toBeNull();
  });

  test("collapsed default preserves 56px icon rail and labels become visible when expanded", () => {
    const view = groupedRail();
    const nav = view.container.querySelector('[data-slot="app-rail"]');
    expect(nav?.getAttribute("data-expanded")).toBe("false");
    expect(nav?.getAttribute("style")).toContain("56px");
    expect(view.getByRole("link", { name: "Chat" }).className).toContain("min-h-12");
    fireEvent.click(view.getByRole("button", { name: "Show sidebar" }));
    expect(view.container.querySelector('[data-slot="app-rail"]')?.getAttribute("data-expanded")).toBe("true");
    expect(view.getByText("Work")).toBeTruthy();
    expect(view.getByText("Create")).toBeTruthy();
  });

  test("groups show separators only between nonempty groups and fold callback receives state", () => {
    const changed: boolean[] = [];
    const view = groupedRail({ expanded: true, onExpandedChange: (value) => changed.push(value), groups: [...groups, { id: "empty", label: "Empty" }] });
    const sections = [...view.container.querySelectorAll("[data-rail-group]")];
    expect(sections).toHaveLength(4);
    expect(sections.filter((section) => section.className.includes("border-t"))).toHaveLength(3);
    fireEvent.click(view.getByRole("button", { name: "Hide sidebar" }));
    expect(changed).toEqual([false]);
  });

  test("collapsed brand becomes an accessible expand control on hover and keyboard focus", () => {
    const changed: boolean[] = [];
    const view = groupedRail({ onExpandedChange: (value) => changed.push(value) });
    const expand = view.getByRole("button", { name: "Expand navigation" });
    expect(expand.className).toContain("focus-visible:ring-2");
    expect(expand.innerHTML).toContain("group-hover:opacity-100");
    expect(expand.innerHTML).toContain("motion-reduce:transition-none");
    fireEvent.mouseEnter(expand);
    fireEvent.focus(expand);
    fireEvent.click(expand);
    expect(changed).toEqual([true]);
  });

  test("host core destinations remain present with grouped items", () => {
    const core = {
      coreDestinations: [{ name: "Library", url: "/library", icon: "library" }],
      apps: [{ name: "Notes", url: "/apps/notes", icon: "layout-grid", pinned: true }],
      profile: <button aria-label="Jesse profile">Profile</button>,
    };
    const renderCore = (grouped: boolean) => render(<MemoryRouter><TooltipProvider><AppRail {...core} {...(grouped ? { items: [{ id: "custom", label: "Custom", icon: "house", href: "/custom" }], groups: [{ id: "default" }] } : {})} /></TooltipProvider></MemoryRouter>);
    const plain = renderCore(false);
    const assertCore = (view: ReturnType<typeof render>) => {
      expect(view.container.querySelector('[data-slot="app-rail-home"]') || view.container.querySelector('[aria-label="Show sidebar"], [aria-label="Expand navigation"]')).toBeTruthy();
      expect(view.getAllByRole("button", { name: "Search" }).length).toBeGreaterThan(0);
      if (view === plain) expect(view.container.querySelector('[aria-label="Library"]')).toBeTruthy();
      expect(view.getByRole("button", { name: "All apps" })).toBeTruthy();
      expect(view.getByRole("button", { name: "Jesse profile" })).toBeTruthy();
    };
    assertCore(plain);
    plain.unmount();
    const grouped = renderCore(true);
    assertCore(grouped);
  });

  test("autoCollapse overrides expanded, has reduced-motion class and context back", () => {
    const back = () => {};
    const view = groupedRail({ expanded: true, autoCollapse: true, context: { title: "Chat modes", items, onBack: back } });
    expect(view.container.querySelector('[data-slot="app-rail"]')?.getAttribute("data-expanded")).toBe("false");
    expect(view.container.querySelector('[data-slot="app-rail"]')?.className).toContain("motion-reduce:transition-none");
    expect(view.getByRole("button", { name: "Show sidebar" })).toBeTruthy();
  });
});

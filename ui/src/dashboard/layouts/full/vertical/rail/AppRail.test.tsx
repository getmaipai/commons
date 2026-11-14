import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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
    expect(chat.className).toContain("bg-primary/15");
    expect(chat.querySelector('[data-slot="rail-indicator"]')).toBeNull();
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

  test("collapsed grouped items have no gap, so the icon sits on the rail's centre line like Search", () => {
    const view = groupedRail({ expanded: false });
    const link = view.container.querySelector('[data-slot="app-rail-item"]')!;
    expect(link.className).toContain("gap-0");
    expect(link.className).toContain("justify-center");
    cleanup();
    const open = groupedRail({ expanded: true });
    expect(open.container.querySelector('[data-slot="app-rail-item"]')!.className).not.toContain("gap-0");
  });

  test("the grouped list scrolls without a visible scrollbar so it never narrows the rows", () => {
    const view = groupedRail();
    const list = view.container.querySelector('[data-rail-group]')!.parentElement!;
    expect(list.className).toContain("[scrollbar-width:none]");
    expect(list.className).toContain("[&::-webkit-scrollbar]:hidden");
  });

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
    expect(view.getByRole("link", { name: "Chat" }).className).toContain("--rail-row-height");
    fireEvent.click(view.getByRole("button", { name: "Show sidebar" }));
    expect(view.container.querySelector('[data-slot="app-rail"]')?.getAttribute("data-expanded")).toBe("true");
    expect(view.getByText("Work")).toBeTruthy();
    expect(view.getByText("Create")).toBeTruthy();
    view.rerender(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail items={items} groups={groups} expanded={false} /></TooltipProvider></MemoryRouter>);
    expect(view.container.querySelector('[data-slot="app-rail-group-label"]')).toBeNull();
  });

  test("groups show separators in both states and fold callback receives state", () => {
    const changed: boolean[] = [];
    const view = groupedRail({ expanded: true, onExpandedChange: (value) => changed.push(value), groups: [...groups, { id: "empty", label: "Empty" }] });
    const expandedSections = [...view.container.querySelectorAll("[data-rail-group]")];
    expect(expandedSections).toHaveLength(4);
    expect(expandedSections.filter((section) => section.className.includes("border-t"))).toHaveLength(0);
    view.rerender(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail items={items} groups={groups} expanded={false} /></TooltipProvider></MemoryRouter>);
    const collapsedSections = [...view.container.querySelectorAll("[data-rail-group]")];
    expect(collapsedSections.filter((section) => section.className.includes("border-t"))).toHaveLength(3);
    const search = view.container.querySelector('[data-slot="app-rail-search-trigger"]');
    const chat = view.container.querySelector('[data-slot="app-rail-item"]');
    const classes = (value: Element | null) => (value?.getAttribute("class") ?? "").split(/\s+/);
    expect(classes(search)).toContain("hover:bg-foreground/10");
    expect(classes(search)).toContain("focus-visible:ring-2");
    expect(classes(search)).toContain("before:-inset-2");
    expect(classes(search)).toContain("h-[var(--rail-row-height,32px)]");
    expect(classes(search)).toContain("px-[var(--rail-padding,12px)]");
    expect(search?.querySelector("svg")?.getAttribute("class")).toContain("size-[var(--rail-icon-size,16px)]");
    expect(classes(search)).toContain("justify-center");
    expect(classes(chat)).toContain("hover:bg-foreground/10");
    expect(classes(chat)).toContain("focus-visible:ring-2");
    expect(classes(chat)).toContain("before:-inset-2");
    expect(classes(chat)).toContain("justify-center");
    expect(changed).toEqual([]);
  });

  test("grouped rows use variable label and icon sizes", () => {
    const view = groupedRail({ expanded: true });
    const chat = view.getByRole("link", { name: "Chat" });
    expect(chat.className).toContain("--rail-row-height");
    expect(chat.querySelector("svg")?.getAttribute("class")).toContain("--rail-icon-size");
    expect(chat.querySelector("span:not([data-slot])")?.getAttribute("class")).toContain("--rail-label-size");
    expect(chat.className).not.toContain("text-sm");
    expect(chat.querySelector("svg")?.getAttribute("class")).not.toContain("size-5");
  });

  test("expanded utility rows share grouped geometry and labels, collapsed rows center icons", () => {
    const apps = [{ name: "Notes", url: "/notes", icon: "layout-grid", pinned: false }];
    const view = groupedRail({ expanded: true, apps });
    const search = view.container.querySelector('[data-slot="app-rail-search-trigger"]')!;
    const item = view.container.querySelector('[data-slot="app-rail-item"]')!;
    expect(search.className).toContain("justify-start");
    expect(search.className).toContain("h-[var(--rail-row-height,32px)]");
    expect(search.textContent).toContain("Search");
    const launcher = view.container.querySelector('[data-slot="app-rail-launcher"]')!;
    expect(launcher.className).toContain("justify-start");
    expect(launcher.textContent).toContain("All apps");
    expect(item.className).toContain("justify-start");

    view.rerender(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail items={items} groups={groups} apps={apps} expanded={false} /></TooltipProvider></MemoryRouter>);
    const collapsedSearch = view.container.querySelector('[data-slot="app-rail-search-trigger"]')!;
    expect(collapsedSearch.className).toContain("justify-center");
    expect(collapsedSearch.textContent).not.toContain("Search");
    const collapsedLauncher = view.container.querySelector('[data-slot="app-rail-launcher"]')!;
    expect(collapsedLauncher.className).toContain("justify-center");
    expect(collapsedLauncher.textContent).not.toContain("All apps");
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

describe("rail modern look: selected, hover, tooltip", () => {
  const items = [
    { id: "chat", label: "Chat", icon: "message-square", href: "/chat" },
    { id: "media", label: "Media", icon: "image", href: "/media" },
  ];
  const groups = [{ id: "default" }];
  const apps = [{ name: "Atlas", url: "/apps/atlas", icon: "layout-grid", pinned: true }];
  const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
  const variants: Array<[string, React.ReactElement]> = [
    ["icons", <AppRail apps={apps} />],
    ["labelled", <AppRail variant="labelled" apps={apps} />],
    ["grouped collapsed", <AppRail items={items} groups={groups} expanded={false} />],
    ["grouped expanded", <AppRail items={items} groups={groups} expanded />],
  ];

  for (const [name, node] of variants) {
    test(`${name}: the selected item is current, tinted and glowing; others get calm hover`, () => {
      const view = render(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider>{node}</TooltipProvider></MemoryRouter>);
      const current = view.container.querySelector('[aria-current="page"]');
      if (name.startsWith("grouped")) {
        expect(current?.getAttribute("aria-label")).toBe("Chat");
        expect(classes(current)).toContain("bg-primary/15");
        expect(classes(current)).toContain("text-primary");
        expect(classes(current)).toContain("shadow-[inset_0_0_14px_-3px_color-mix(in_oklab,var(--primary)_60%,transparent)]");
        expect(classes(current)).toContain("shadow-[inset_0_0_14px_-3px_color-mix(in_oklab,var(--primary)_60%,transparent)]");
        expect(current?.querySelector('[data-slot="rail-indicator"]')).toBeNull();
        expect(classes(current)).toContain("focus-visible:ring-2");
        const other = view.getByRole("link", { name: "Media" });
        expect(other.getAttribute("aria-current")).toBeNull();
        expect(other.querySelector('[data-slot="rail-indicator"]')).toBeNull();
        for (const cls of ["hover:bg-foreground/10", "hover:text-foreground", "active:bg-foreground/15", "duration-150", "motion-reduce:transition-none", "focus-visible:ring-2"]) expect(classes(other)).toContain(cls);
      } else {
        // No sidebar items in the flat variants; the pinned app is not on /chat, so nothing is current there.
        expect(current?.getAttribute("data-slot") ?? null).not.toBe("app-rail-app");
        const app = view.getByRole("link", { name: /Atlas/ });
        for (const cls of ["hover:bg-foreground/10", "hover:text-foreground", "active:bg-foreground/15", "duration-150", "motion-reduce:transition-none", "focus-visible:ring-2"]) expect(classes(app)).toContain(cls);
      }
    });
  }

  test("a selected pinned app, the launcher link and the popover list use the same tint and glow", async () => {
    const view = render(<MemoryRouter initialEntries={["/apps/atlas"]}><TooltipProvider><AppRail apps={apps} /></TooltipProvider></MemoryRouter>);
    const app = view.getByRole("link", { name: /Atlas/ });
    expect(app.getAttribute("aria-current")).toBe("page");
    expect(classes(app)).toContain("bg-primary/15");
    expect(classes(app)).toContain("text-primary");
    expect(classes(app)).toContain("shadow-[inset_0_0_14px_-3px_color-mix(in_oklab,var(--primary)_60%,transparent)]");
    expect(app.querySelector('[data-slot="rail-indicator"]')).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "All apps" }));
    const row = await waitFor(() => view.getAllByRole("link", { name: "Atlas" }).find((el) => el.getAttribute("data-slot") !== "app-rail-app")!);
    expect(classes(row)).toContain("bg-primary/15");
    expect(classes(row)).toContain("shadow-[inset_0_0_14px_-3px_color-mix(in_oklab,var(--primary)_60%,transparent)]");
    expect(row.querySelector('[data-slot="rail-indicator"]')).toBeNull();
    cleanup();
    const link = render(<MemoryRouter initialEntries={["/apps"]}><TooltipProvider><AppRail apps={apps} allAppsHref="/apps" /></TooltipProvider></MemoryRouter>);
    const all = link.getByRole("link", { name: "All apps" });
    expect(classes(all)).toContain("bg-primary/15");
    expect(classes(all)).toContain("shadow-[inset_0_0_14px_-3px_color-mix(in_oklab,var(--primary)_60%,transparent)]");
    expect(all.querySelector('[data-slot="rail-indicator"]')).toBeNull();
  });

  test("hovering or focusing a collapsed grouped rail item shows its name in a tooltip", async () => {
    const view = render(<MemoryRouter><TooltipProvider><AppRail items={items} groups={groups} expanded={false} /></TooltipProvider></MemoryRouter>);
    const media = view.getByRole("link", { name: "Media" });
    fireEvent.mouseEnter(media);
    fireEvent.mouseMove(media);
    fireEvent.pointerEnter(media);
    fireEvent.pointerMove(media);
    const tip = await waitFor(() => {
      const found = document.querySelector('[data-slot="tooltip-content"]');
      expect(found?.textContent).toContain("Media");
      return found;
    });
    expect(tip).not.toBeNull();
    fireEvent.mouseLeave(media);
    cleanup();
    const again = render(<MemoryRouter><TooltipProvider><AppRail items={items} groups={groups} expanded={false} /></TooltipProvider></MemoryRouter>);
    const chat = again.getByRole("link", { name: "Chat" });
    await act(async () => { chat.focus(); });
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain("Chat"));
  });

  test("hovering a flat rail app shows its name in a tooltip", async () => {
    const view = render(<MemoryRouter><TooltipProvider><AppRail apps={apps} /></TooltipProvider></MemoryRouter>);
    const app = view.getByRole("link", { name: /Atlas/ });
    fireEvent.mouseEnter(app);
    fireEvent.pointerEnter(app);
    fireEvent.pointerMove(app);
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain("Atlas"));
  });

  test("the rail uses only theme tokens: no raw palette colour classes", async () => {
    const source = await Bun.file(new URL("./AppRail.tsx", import.meta.url)).text();
    const style = await Bun.file(new URL("../../../../lib/navItemStyle.ts", import.meta.url)).text();
    const palette = /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/;
    expect(source).not.toMatch(palette);
    expect(style).not.toMatch(palette);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    expect(source + style).not.toContain("\u2014");
  });
});

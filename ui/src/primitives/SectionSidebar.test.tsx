import { afterEach, describe, expect, jest, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { SidebarProvider } from "../dashboard/components/ui/sidebar";
import { SectionSidebar, SectionSidebarDrawerSections, SectionSidebarShowButton, type SectionSidebarProps } from "./SectionSidebar";
import { SectionSidebarShowcase } from "./SectionSidebarShowcase";

afterEach(cleanup);

const screen = new Proxy({} as ReturnType<typeof within>, { get: (_t, key) => (within(document.body) as never)[key as never] });

const groups: SectionSidebarProps["groups"] = [
  { id: "library", items: [{ id: "today", label: "Today", icon: "newspaper", href: "/apps/news", active: true }, { id: "saved", label: "Saved", icon: "bookmark", href: "/apps/news/saved" }] },
  { id: "topics", label: "Topics", items: [{ id: "world", label: "World", icon: "globe", href: "/apps/news/channel", kind: "topic" }, { id: "bbc", label: "BBC", media: "/api/plugins/news/favicon/bbc", href: "/apps/news/channel" }] },
];

function column(over: Partial<SectionSidebarProps> = {}) {
  return render(
    <SidebarProvider keyboardShortcut={false}>
      <SectionSidebar groups={groups} {...over} />
    </SidebarProvider>,
  );
}

describe("SectionSidebar", () => {
  test("draws groups of link rows with labels, the current one marked, and a group label only when it has one", () => {
    const { container } = column();
    const today = screen.getByRole("link", { name: "Today" });
    expect(today.getAttribute("aria-current")).toBe("page");
    expect(today.getAttribute("href")).toBe("/apps/news");
    expect(screen.getByRole("link", { name: "Saved" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Topics")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="sidebar-group-label"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "World" }).getAttribute("data-kind")).toBe("topic");
  });

  test("a row with a picture draws it, hidden from assistive tech, in place of an icon", () => {
    const { container } = column();
    const img = container.querySelector('a[href="/apps/news/channel"] img') as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/api/plugins/news/favicon/bbc");
    expect(img.getAttribute("aria-hidden")).toBe("true");
  });

  test("a click on a row reaches the host's handler", () => {
    const onClick = mock((e: { preventDefault: () => void }) => e.preventDefault());
    column({ groups: [{ id: "g", items: [{ id: "a", label: "Alpha", href: "/a", onClick }] }] });
    fireEvent.click(screen.getByRole("link", { name: "Alpha" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("the search box reports typing, Enter submits, and Escape clears", () => {
    const onChange = mock((_v: string) => {});
    const onSubmit = mock(() => {});
    column({ search: { value: "oil", onChange, onSubmit, label: "Search News" } });
    const box = screen.getByRole("searchbox", { name: "Search News" });
    expect(box.getAttribute("placeholder")).toBe("Search News");
    fireEvent.change(box, { target: { value: "oils" } });
    expect(onChange).toHaveBeenCalledWith("oils");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  test("a title, header slot and the slot under the search draw only when given", () => {
    column({ title: "News", headerTop: <button type="button">Hide sidebar</button>, afterSearch: <p>Recent searches</p>, search: { value: "", onChange: () => {}, label: "Search News" } });
    expect(screen.getByRole("heading", { name: "News" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeTruthy();
    expect(screen.getByText("Recent searches")).toBeTruthy();
    cleanup();
    column();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  test("the host's sidebar props reach the column (its id, data attributes and classes)", () => {
    const { container } = column({ sidebarProps: { id: "news-column", "data-slot": "news-column", className: "w-72" } });
    const side = container.querySelector("#news-column") as HTMLElement;
    expect(side.getAttribute("data-slot")).toBe("news-column");
    expect(side.className).toContain("w-72");
  });

  test("recent searches draw as chips under the field and a chosen one reaches the host", () => {
    const onRecent = mock((_label: string) => {});
    column({ search: { value: "", onChange: () => {}, label: "Search News", recents: [{ key: "a", label: "oil prices" }, { key: "b", label: "eclipse" }], onRecent } });
    const list = screen.getByRole("list", { name: "Recent searches" });
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["oil prices", "eclipse"]);
    fireEvent.click(within(list).getByRole("button", { name: "eclipse" }));
    expect(onRecent).toHaveBeenCalledWith("eclipse");
    cleanup();
    column({ search: { value: "", onChange: () => {}, label: "Search News", recents: [] } });
    expect(screen.queryByRole("list", { name: "Recent searches" })).toBeNull();
  });

  test("standalone brings its own provider, hides below the lg breakpoint and takes the settings column's look", () => {
    const { container } = render(<SectionSidebar standalone groups={groups} sidebarProps={{ id: "app-column" }} />);
    const provider = container.querySelector('[data-slot="section-sidebar"]') as HTMLElement;
    expect(provider.className).toContain("hidden");
    expect(provider.className).toContain("lg:block");
    // Pinned to the viewport by default: the box stretches the row and the column inside sticks, one viewport tall.
    expect(provider.className).toContain("self-stretch");
    const pin = container.querySelector('[data-slot="section-sidebar-pin"]') as HTMLElement;
    expect(pin.parentElement).toBe(provider);
    for (const cls of ["sticky", "top-0", "h-svh", "max-h-svh"]) expect(pin.className).toContain(cls);
    const side = container.querySelector("#app-column") as HTMLElement;
    expect(side.className).toContain("w-(--settings-column-width)");
    expect(side.className).toContain("bg-settings-column");
    expect(within(container).getByRole("link", { name: "Today" })).toBeTruthy();
  });

  describe("collapsible (APP-SIDEBAR-01)", () => {
    const footer = [{ id: "settings", label: "News settings", icon: "settings", href: "/settings?tab=news" }];
    const standalone = (over: Partial<SectionSidebarProps> = {}) =>
      render(<SectionSidebar standalone title="News" groups={groups} footer={footer} onCollapsedChange={() => {}} {...over} />);

    test("without the new props nothing extra draws", () => {
      const { container } = column();
      expect(container.querySelector('[data-slot="section-sidebar-toggle"]')).toBeNull();
      expect(container.querySelector('[data-slot="section-sidebar-footer"]')).toBeNull();
    });

    test("the footer draws its rows under the groups and a click reaches the host", () => {
      const onClick = mock((e: { preventDefault: () => void }) => e.preventDefault());
      const { container } = standalone({ footer: [{ ...footer[0]!, onClick }] });
      const foot = container.querySelector('[data-slot="section-sidebar-footer"]') as HTMLElement;
      fireEvent.click(within(foot).getByRole("link", { name: "News settings" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("the collapse button is labelled, reports aria-expanded, names the column and asks the host to collapse", () => {
      const onCollapsedChange = mock((_c: boolean) => {});
      const { container } = standalone({ onCollapsedChange });
      const button = screen.getByRole("button", { name: "Hide sidebar" });
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelector(`#${CSS.escape(button.getAttribute("aria-controls")!)}`)).toBeTruthy();
      fireEvent.click(button);
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    test("the button works from the keyboard (a native button) and its words can be replaced", () => {
      standalone({ collapseLabels: { hide: "Hide News" } });
      const button = screen.getByRole("button", { name: "Hide News" }) as HTMLButtonElement;
      expect(button.tagName).toBe("BUTTON");
      expect(button.type).toBe("button");
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    test("the state is controlled: the kit keeps none of its own", () => {
      const onCollapsedChange = mock((_c: boolean) => {});
      const view = standalone({ collapsed: false, collapsedStyle: "rail", onCollapsedChange });
      fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
      expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeTruthy();
      view.rerender(<SectionSidebar standalone title="News" groups={groups} collapsed collapsedStyle="rail" onCollapsedChange={onCollapsedChange} />);
      expect(screen.getByRole("button", { name: "Show sidebar" }).getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(screen.getByRole("button", { name: "Show sidebar" }));
      expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    });

    test("the rail is icon-only: labels stay as accessible names, titles, no group labels, no title, a dot for new items", () => {
      const withDot = [{ id: "g", label: "Topics", items: [{ id: "a", label: "Saved", icon: "bookmark", href: "/s", trailing: <span>3</span>, dot: true }, { id: "b", label: "World", icon: "globe", href: "/w" }] }];
      const { container } = standalone({ collapsed: true, collapsedStyle: "rail", groups: withDot, search: { value: "", onChange: () => {}, label: "Search News" } });
      const saved = screen.getByRole("link", { name: "Saved" });
      expect(saved.getAttribute("title")).toBe("Saved");
      expect(saved.textContent).toBe("Saved");
      expect(within(saved).queryByText("3")).toBeNull();
      expect(container.querySelector('[data-slot="section-sidebar-dot"]')).toBeTruthy();
      expect(screen.queryByText("Topics")).toBeNull();
      expect(screen.queryByRole("heading", { name: "News" })).toBeNull();
      expect(screen.queryByRole("searchbox")).toBeNull();
      expect(screen.getByRole("link", { name: "News settings" })).toBeTruthy();
      expect(container.querySelector('[data-state="rail"]')).toBeTruthy();
    });

    test("in the rail the search button expands the column", () => {
      const onCollapsedChange = mock((_c: boolean) => {});
      standalone({ collapsed: true, collapsedStyle: "rail", onCollapsedChange, search: { value: "", onChange: () => {}, label: "Search News" } });
      fireEvent.click(screen.getByRole("button", { name: "Search News" }));
      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });

    test("hidden style: closed column is inert and out of the accessibility tree; the edge zone peeks it and Escape closes it", async () => {
      const { container } = standalone({ collapsed: true });
      const box = container.querySelector('[data-slot="section-sidebar-box"]') as HTMLElement;
      expect(box.getAttribute("data-state")).toBe("closed");
      const side = container.querySelector('[data-collapsed="hidden"]') as HTMLElement;
      expect(side.hasAttribute("inert")).toBe(true);
      expect(side.getAttribute("aria-hidden")).toBe("true");
      fireEvent.pointerEnter(container.querySelector('[data-slot="section-sidebar-peek-zone"]') as HTMLElement, { pointerType: "mouse" });
      await new Promise((r) => setTimeout(r, 200));
      expect(box.getAttribute("data-state")).toBe("peek");
      expect(side.hasAttribute("inert")).toBe(false);
      expect(screen.getByRole("button", { name: "Keep sidebar open" })).toBeTruthy();
      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(box.getAttribute("data-state")).toBe("closed");
    });

    test("hidden style: keep open docks the column through the host", async () => {
      const onCollapsedChange = mock((_c: boolean) => {});
      const { container } = standalone({ collapsed: true, onCollapsedChange });
      fireEvent.pointerEnter(container.querySelector('[data-slot="section-sidebar-peek-zone"]') as HTMLElement, { pointerType: "mouse" });
      await new Promise((r) => setTimeout(r, 200));
      fireEvent.click(screen.getByRole("button", { name: "Keep sidebar open" }));
      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });

    test("a touch pointer never peeks", async () => {
      const { container } = standalone({ collapsed: true });
      fireEvent.pointerEnter(container.querySelector('[data-slot="section-sidebar-peek-zone"]') as HTMLElement, { pointerType: "touch" });
      await new Promise((r) => setTimeout(r, 200));
      expect(container.querySelector('[data-state="closed"]')).toBeTruthy();
    });

    test("body replaces groups, headerActions sit beside the title and compact density tightens the rows", () => {
      const { container } = standalone({ groups: undefined, body: <p>Conversation list</p>, headerActions: <button type="button">Chat settings</button>, density: "compact", footer: undefined });
      expect(screen.getByText("Conversation list")).toBeTruthy();
      const header = container.querySelector('[data-slot="section-sidebar-header"]') as HTMLElement;
      expect(within(header).getByRole("button", { name: "Chat settings" })).toBeTruthy();
      cleanup();
      const compact = standalone({ density: "compact" });
      expect(within(compact.container).getByRole("link", { name: "Today" }).className).toContain("h-9");
    });

    test("the show button and the drawer sections", () => {
      const onClick = mock(() => {});
      render(<SectionSidebarShowButton onClick={onClick} />);
      const show = screen.getByRole("button", { name: "Show sidebar" });
      expect(show.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(show);
      expect(onClick).toHaveBeenCalledTimes(1);
      cleanup();
      const { container } = render(<SectionSidebarDrawerSections groups={groups} footer={footer} />);
      expect(within(container).getAllByRole("link").map((a) => a.textContent)).toEqual(["Today", "Saved", "World", "BBC", "News settings"]);
      expect(within(container).getByRole("link", { name: "Today" }).getAttribute("aria-current")).toBe("page");
    });

    test("the showcase draws both states", () => {
      const { container } = render(<SectionSidebarShowcase />);
      expect(container.querySelectorAll('[data-slot="section-sidebar-toggle"]')).toHaveLength(2);
    });
  });
  describe("Chat parity (same peek, pin and viewport pinning as Chat's column)", () => {
    const standalone = (over: Partial<SectionSidebarProps> = {}) =>
      render(<SectionSidebar standalone title="News" groups={groups} onCollapsedChange={() => {}} {...over} />);
    const zoneOf = (c: HTMLElement) => c.querySelector('[data-slot="section-sidebar-peek-zone"]') as HTMLElement;
    const boxOf = (c: HTMLElement) => c.querySelector('[data-slot="section-sidebar-box"]') as HTMLElement;
    const hidden = (over: Partial<SectionSidebarProps> = {}) =>
      render(<SectionSidebar standalone title="News" groups={groups} collapsed onCollapsedChange={() => {}} {...over} />);
    const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });
    const withTimers = (run: () => void) => {
      jest.useFakeTimers();
      try { run(); } finally { jest.useRealTimers(); }
    };

    test("the standalone column is pinned to the viewport with or without collapse, with its own scroll", () => {
      for (const view of [render(<SectionSidebar standalone groups={groups} />), render(<SectionSidebar standalone groups={groups} onPinnedChange={() => {}} />)]) {
        const pin = view.container.querySelector('[data-slot="section-sidebar-pin"]') as HTMLElement;
        expect(pin.className).toContain("sticky");
        expect(pin.className).toContain("h-svh");
        expect(view.container.querySelector('[data-slot="sidebar-content"]')!.className).toContain("overflow-auto");
        view.unmount();
      }
    });

    test("the collapse animation is Chat's: a 200 ms linear width slide on a box that keeps the panel at full width, no motion under reduced motion", () => {
      const { container, rerender } = standalone({ collapsed: true });
      const box = boxOf(container);
      for (const cls of ["transition-[width]", "duration-200", "ease-linear", "motion-reduce:transition-none", "w-1.5"]) expect(box.className).toContain(cls);
      const panel = container.querySelector('[data-slot="section-sidebar-panel"]') as HTMLElement;
      expect(panel.className).toContain("invisible");
      expect(panel.className).toContain("w-(--settings-column-width)");
      rerender(<SectionSidebar standalone title="News" groups={groups} collapsed={false} onCollapsedChange={() => {}} />);
      expect(boxOf(container).className).toContain("w-(--settings-column-width)");
    });

    test("the peek slides in as Chat's does (translate and fade, motion-safe only) and the keyframes exist", () => {
      withTimers(() => {
        const { container } = hidden();
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        const panel = container.querySelector('[data-slot="section-sidebar-panel"]') as HTMLElement;
        expect(panel.className).toContain("motion-safe:animate-[section-sidebar-peek-in_160ms_ease-out]");
        expect(panel.className).toContain("shadow-xl");
      });
      const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
      expect(css).toContain("@keyframes section-sidebar-peek-in");
      expect(css).toMatch(/section-sidebar-peek-in[\s\S]{0,120}translateX\(-12px\)/);
    });

    test("hover intent: the pointer must rest 120 ms; passing across the edge does nothing", () => {
      withTimers(() => {
        const { container } = hidden();
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(100);
        fireEvent.pointerLeave(zoneOf(container), { pointerType: "mouse" });
        advance(500);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(119);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
        advance(1);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
      });
    });

    test("the peek closes 150 ms after the pointer leaves it, and coming back cancels that", () => {
      withTimers(() => {
        const { container } = hidden();
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        const panel = container.querySelector('[data-slot="section-sidebar-panel"]') as HTMLElement;
        fireEvent.pointerLeave(panel, { pointerType: "mouse" });
        advance(149);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        fireEvent.pointerEnter(panel, { pointerType: "mouse" });
        advance(500);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        fireEvent.pointerLeave(panel, { pointerType: "mouse" });
        advance(150);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
      });
    });

    test("no peek closes while a row menu is open; it closes once the menu is gone", () => {
      withTimers(() => {
        const { container } = hidden({ headerActions: <button type="button" aria-haspopup="menu" aria-expanded="true">Row menu</button> });
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        fireEvent.pointerLeave(container.querySelector('[data-slot="section-sidebar-panel"]') as HTMLElement, { pointerType: "mouse" });
        advance(1000);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        screen.getByRole("button", { name: "Row menu" }).setAttribute("aria-expanded", "false");
        advance(150);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
      });
    });

    test("Escape closes the peek, but not while a menu is open or a typed search is being cleared", () => {
      withTimers(() => {
        const { container } = hidden({
          search: { value: "oil", onChange: () => {}, label: "Search News" },
          headerActions: <button type="button" aria-haspopup="menu" aria-expanded="false">Row menu</button>,
        });
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        const menu = screen.getByRole("button", { name: "Row menu" });
        menu.setAttribute("aria-expanded", "true");
        fireEvent.keyDown(menu, { key: "Escape" });
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        menu.setAttribute("aria-expanded", "false");
        fireEvent.keyDown(menu, { key: "Escape" });
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
      });
    });

    test("a click on a link inside the peek closes it", () => {
      withTimers(() => {
        const { container } = hidden();
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        fireEvent.click(screen.getByRole("link", { name: "Saved" }));
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
      });
    });

    test("touch never peeks, on the zone or the panel", () => {
      withTimers(() => {
        const { container } = hidden();
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "touch" });
        advance(1000);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
      });
    });

    test("pin: the control inside the peek is a pin button; `pinned` and `onPinnedChange` model the same state as collapsed", () => {
      withTimers(() => {
        const onPinnedChange = mock((_p: boolean) => {});
        const { container, rerender } = render(<SectionSidebar standalone title="News" groups={groups} pinned={false} onPinnedChange={onPinnedChange} />);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        const pin = screen.getByRole("button", { name: "Keep sidebar open" });
        expect(pin.querySelector("svg")).toBeTruthy();
        fireEvent.click(pin);
        expect(onPinnedChange).toHaveBeenCalledWith(true);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
        rerender(<SectionSidebar standalone title="News" groups={groups} pinned onPinnedChange={onPinnedChange} />);
        expect(boxOf(container).getAttribute("data-state")).toBe("open");
        fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
        expect(onPinnedChange).toHaveBeenLastCalledWith(false);
      });
    });

    test("pinned wins over collapsed, and collapsed/onCollapsedChange still work alone", () => {
      const onCollapsedChange = mock((_c: boolean) => {});
      const { container } = standalone({ collapsed: true, pinned: true, onCollapsedChange });
      expect(boxOf(container).getAttribute("data-state")).toBe("open");
      fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    test("the show button peeks the column it controls on hover or keyboard focus and a click still pins", () => {
      withTimers(() => {
        const onClick = mock(() => {});
        const { container } = render(
          <>
            <SectionSidebarShowButton onClick={onClick} controls="news-column" />
            <SectionSidebar standalone groups={groups} collapsed onCollapsedChange={() => {}} sidebarProps={{ id: "news-column" }} />
          </>,
        );
        const show = screen.getByRole("button", { name: "Show sidebar" });
        fireEvent.pointerEnter(show, { pointerType: "mouse" });
        advance(120);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        fireEvent.pointerLeave(show, { pointerType: "mouse" });
        advance(150);
        expect(boxOf(container).getAttribute("data-state")).toBe("closed");
        fireEvent.focus(show);
        advance(120);
        expect(boxOf(container).getAttribute("data-state")).toBe("peek");
        fireEvent.click(show);
        expect(onClick).toHaveBeenCalledTimes(1);
      });
    });

    test("the closed column does not trap focus: it is inert and the edge zone is not focusable", () => {
      const { container } = hidden();
      expect(container.querySelector('[data-collapsed="hidden"]')!.hasAttribute("inert")).toBe(true);
      expect(zoneOf(container).getAttribute("tabindex")).toBeNull();
      expect(zoneOf(container).getAttribute("aria-hidden")).toBe("true");
    });

    test("while hidden or peeking the column sits above the page's sticky bars", () => {
      withTimers(() => {
        const { container } = hidden();
        const pin = container.querySelector('[data-slot="section-sidebar-pin"]') as HTMLElement;
        expect(pin.className).toContain("z-20");
        fireEvent.pointerEnter(zoneOf(container), { pointerType: "mouse" });
        advance(120);
        expect(pin.className).toContain("z-30");
      });
    });
  });

  // The compact column is Chat's: a 24px collapse button with a tooltip that names the shortcut, announced with aria-keyshortcuts.
  test("the compact collapse button is 24px and announces its keyboard shortcut", () => {
    const { container } = column({ density: "compact", standalone: true, onCollapsedChange: () => {}, collapseShortcut: { label: "⌘B", keys: "Meta+B Control+B" } });
    const toggle = container.querySelector('[data-slot="section-sidebar-toggle"]') as HTMLButtonElement;
    expect(toggle.className).toContain("size-6");
    expect(toggle.getAttribute("aria-keyshortcuts")).toBe("Meta+B Control+B");
  });

  test("the compact column draws its primary action as Chat's New chat row, first under the header", () => {
    const { container } = column({ density: "compact", primaryAction: { label: "New chat", href: "/apps/news/new" } });
    const row = container.querySelector('[data-slot="section-sidebar-primary"]') as HTMLAnchorElement;
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("href")).toBe("/apps/news/new");
    expect(row.textContent).toBe("New chat");
    expect(row.className).toContain("h-9");
  });

  test("the compact column opens its search field from a header icon, as Chat's does", () => {
    const { container } = column({ density: "compact", search: { value: "", onChange: () => {}, label: "Search News" } });
    expect(container.querySelector('input[type="search"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Search News" }));
    expect((container.querySelector('input[type="search"]') as HTMLInputElement).getAttribute("aria-label")).toBe("Search News");
  });

  test("compact search and the body slot draw the thread list inside the column scroll area", () => {
    const { container } = column({
      density: "compact",
      body: <div data-testid="thread-list">Recent conversations</div>,
      search: { value: "", onChange: () => {}, label: "Search conversations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search conversations" }));
    const content = container.querySelector('[data-slot="sidebar-content"]') as HTMLElement;
    expect(content.className).toContain("overflow-auto");
    expect(within(content).getByTestId("thread-list").textContent).toBe("Recent conversations");
    expect(container.querySelector('[data-slot="section-sidebar-header"]')?.contains(screen.getByRole("searchbox"))).toBe(false);
  });
});

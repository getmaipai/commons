import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
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
    expect(provider.className).toContain("lg:flex");
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
});

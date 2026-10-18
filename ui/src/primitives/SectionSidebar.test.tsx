import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { SidebarProvider } from "../dashboard/components/ui/sidebar";
import { SectionSidebar, type SectionSidebarProps } from "./SectionSidebar";

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
});

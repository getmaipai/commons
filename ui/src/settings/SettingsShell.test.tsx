import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { SettingsShell, type SettingsShellProps } from "./SettingsShell";
import { SidebarProvider, useSidebar } from "../dashboard/components/ui/sidebar";
import { ADMIN, ADULT, CHILD, REGISTRY, area } from "./settingsFixtures";

afterEach(cleanup);

function shell(over: Partial<SettingsShellProps> = {}) {
  const onNavigate = mock(() => {});
  const onSearchChange = mock((_q: string) => {});
  const view = render(
    <SettingsShell
      area={area("chat")}
      viewer={ADULT}
      registry={REGISTRY}
      honouredBy="home"
      activeSection="general"
      onNavigate={onNavigate}
      sectionHref={(id) => `/settings/chat/${id}`}
      searchQuery=""
      onSearchChange={onSearchChange}
      {...over}
    >
      <div>content</div>
    </SettingsShell>,
  );
  return { view, onNavigate, onSearchChange };
}

const column = (c: HTMLElement) => c.querySelector("[data-slot=settings-column]") as HTMLElement;
const content = (c: HTMLElement) => c.querySelector("[data-slot=settings-content]") as HTMLElement;

describe("SettingsShell column", () => {
  test("a titled 288 px column: the area title, a pill search, the groups in order", () => {
    const { view } = shell();
    const col = column(view.container);
    expect(col.className).toContain("lg:w-(--settings-column-width)");
    expect(view.getByRole("heading", { level: 2 }).textContent).toBe("Chat settings");
    const search = view.getByRole("searchbox", { name: "Search" });
    expect(search.getAttribute("data-variant")).toBe("pill");
    const labels = [...col.querySelectorAll("[data-slot=sidebar-group-label]")].map((e) => e.textContent);
    expect(labels).toEqual(["Chat", "Related"]);
  });

  test("the open row is the one marked data-active and aria-current", () => {
    const { view } = shell({ activeSection: "personalization" });
    const rows = [...column(view.container).querySelectorAll("[data-slot=sidebar-menu-button]")];
    const active = rows.filter((r) => r.hasAttribute("data-active"));
    expect(active).toHaveLength(1);
    expect(active[0]!.textContent).toBe("Personalization");
    expect(active[0]!.getAttribute("aria-current")).toBe("page");
    expect(active[0]!.getAttribute("data-size")).toBe("settings");
  });

  test("only the sections the viewer may see are drawn", () => {
    const names = (v: ReturnType<typeof shell>["view"]) =>
      [...column(v.container).querySelectorAll("[data-slot=sidebar-menu-button]")].map((r) => r.textContent);
    const adult = shell().view;
    expect(names(adult)).toContain("Skills");
    expect(names(adult)).not.toContain("Household chat");
    cleanup();
    const child = shell({ viewer: CHILD }).view;
    expect(names(child)).not.toContain("Skills");
    cleanup();
    const admin = shell({ viewer: ADMIN }).view;
    expect(names(admin)).toContain("Household chat");
  });

  test("an arrow row carries the arrow and describes itself as opening another page", () => {
    const { view } = shell();
    const voice = view.getByText("Voice").closest("a")!;
    expect(voice.getAttribute("data-kind")).toBe("link");
    expect(voice.querySelector("svg.text-settings-arrow")).not.toBeNull();
    const desc = voice.getAttribute("aria-describedby")!;
    expect(view.container.querySelector(`#${CSS.escape(desc)}`)!.textContent).toBe("Opens another page");
    const general = within(column(view.container)).getByText("General").closest("a")!;
    expect(general.getAttribute("aria-describedby")).toBeNull();
    expect(general.querySelector("svg.text-settings-arrow")).toBeNull();
  });

  test("the accessible description is host copy when given", () => {
    const { view } = shell({ labels: { opensAnotherPage: "Opens a different page" } });
    const voice = view.getByText("Voice").closest("a")!;
    const desc = voice.getAttribute("aria-describedby")!;
    expect(view.container.querySelector(`#${CSS.escape(desc)}`)!.textContent).toBe("Opens a different page");
  });

  test("an additive backLink slot is rendered at the top of the docked column", () => {
    const { view } = shell({ layout: "docked", backLink: <a href="/chat">← Back to app</a> });
    const col = column(view.container);
    const back = col.querySelector('[data-slot="settings-back-link"]')!;
    expect(back.textContent).toBe("← Back to app");
    expect(back.compareDocumentPosition(view.getByRole("searchbox")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.getByRole("link", { name: "← Back to app" }).getAttribute("href")).toBe("/chat");
  });
});

describe("SettingsShell navigation", () => {
  test("a click on a section asks the host to open it, with the real href", () => {
    const { view, onNavigate } = shell();
    const link = view.getByText("Personalization").closest("a")!;
    expect(link.getAttribute("href")).toBe("/settings/chat/personalization");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith({ kind: "section", sectionId: "personalization", href: "/settings/chat/personalization" });
  });

  test("an arrow row navigates with its href, {self} resolved to the viewer", () => {
    const { view, onNavigate } = shell();
    fireEvent.click(view.getByText("Memories").closest("a")!);
    const call = (onNavigate.mock.calls[0] as unknown[])[0] as { kind: string; href: string };
    expect(call.kind).toBe("link");
    expect(call.href).toBe("/people/p1?tab=memories");
  });

  test("a modified click is left to the browser (new tab)", () => {
    const { view, onNavigate } = shell();
    fireEvent.click(view.getByText("Personalization").closest("a")!, { metaKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe("SettingsShell search and title", () => {
  test("typing reports the query; Escape clears it", () => {
    const { view, onSearchChange } = shell({ searchQuery: "photo" });
    const box = view.getByRole("searchbox", { name: "Search" });
    fireEvent.change(box, { target: { value: "photos" } });
    expect(onSearchChange).toHaveBeenCalledWith("photos");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(onSearchChange).toHaveBeenLastCalledWith("");
  });

  test("the page title is the open section; a query makes it Results (host copy allowed)", () => {
    const open = shell({ activeSection: "personalization" }).view;
    expect(open.getByRole("heading", { level: 1 }).textContent).toBe("Personalization");
    cleanup();
    const results = shell({ searchQuery: "x" }).view;
    expect(results.getByRole("heading", { level: 1 }).textContent).toBe("Results");
    cleanup();
    const custom = shell({ searchQuery: "x", labels: { results: "Search results" } }).view;
    expect(custom.getByRole("heading", { level: 1 }).textContent).toBe("Search results");
  });

  test("the content slot shows the children", () => {
    const { view } = shell();
    expect(content(view.container).textContent).toContain("content");
  });
});

describe("SettingsShell layout: two panes from lg, a drill-in below", () => {
  test("with a section open: both panes from lg; on a phone only the content, with a back row", () => {
    const onBack = mock(() => {});
    const { view } = shell({ onBack });
    expect(column(view.container).className).toContain("hidden lg:flex");
    expect(content(view.container).className).toContain("block");
    expect(content(view.container).className).not.toContain("hidden");
    const back = view.container.querySelector("[data-slot=settings-back]") as HTMLElement;
    expect(back.className).toContain("lg:hidden");
    expect(back.textContent).toBe("Chat settings");
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalled();
  });

  test("with no section open: on a phone only the column; from lg both", () => {
    const { view } = shell({ activeSection: undefined });
    expect(column(view.container).className).toContain("flex");
    expect(column(view.container).className).not.toContain("hidden");
    expect(content(view.container).className).toContain("hidden lg:block");
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Chat settings");
  });

  test("while searching on a phone: the search field stays, the section list gives way to the results", () => {
    const { view } = shell({ searchQuery: "photo" });
    expect(column(view.container).className).not.toContain("hidden lg:flex");
    expect(content(view.container).className).not.toContain("hidden");
    const list = column(view.container).querySelector("[data-slot=sidebar-content]") as HTMLElement;
    expect(list.className).toContain("hidden lg:flex");
  });

  test("the content pane is a 728 px centred column with the page-title top room", () => {
    const { view } = shell();
    const inner = content(view.container).firstElementChild as HTMLElement;
    expect(inner.className).toContain("max-w-(--settings-content-max)");
    expect(inner.className).toContain("mx-auto");
    expect(inner.className).toContain("lg:pt-(--settings-content-top)");
  });

  test("docked layout escapes the workspace gutter and stays aligned after the 56 px app rail", () => {
    const { view } = shell({ layout: "docked" });
    const root = view.container.querySelector('[data-slot="settings-shell"]') as HTMLElement;
    expect(root.getAttribute("data-layout")).toBe("docked");
    expect(root.className).toContain("lg:fixed");
    expect(root.className).toContain("lg:left-14");
    expect(root.className).toContain("lg:w-auto");
    expect(content(view.container).firstElementChild?.className).toContain("max-w-(--settings-content-max)");
  });

  test("a collapsible dock toggles from the column and content header and supports peek", () => {
    const onToggle = mock(() => {});
    const onPointerEnter = mock(() => {});
    const { view, rerender } = (() => {
      const base = shell({
        layout: "docked",
        collapsible: { collapsed: false, onToggle, onPeekEnter: onPointerEnter },
      });
      return { ...base, rerender: (props: Partial<SettingsShellProps>) => base.view.rerender(
        <SettingsShell area={area("chat")} viewer={ADULT} registry={REGISTRY} activeSection="general" onNavigate={() => {}} searchQuery="" onSearchChange={() => {}} {...props}><div>content</div></SettingsShell>,
      ) };
    })();
    const openControl = view.getByRole("button", { name: "Hide settings sidebar" });
    fireEvent.click(openControl);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender({ layout: "docked", collapsible: { collapsed: true, onToggle, onPeekEnter: onPointerEnter } });
    expect(view.getByRole("button", { name: "Show settings sidebar" })).toBeTruthy();
    const zone = view.container.querySelector('[data-slot="settings-sidebar-hover-zone"]')!;
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    expect(onPointerEnter).toHaveBeenCalledTimes(1);

    rerender({ layout: "docked", collapsible: { collapsed: true, peek: true, onToggle, onPeekEnter: onPointerEnter } });
    expect(column(view.container).getAttribute("data-state")).toBe("peek");
  });
});

describe("SettingsShell keyboard", () => {
  function Probe({ id }: { id: string }) {
    const { open } = useSidebar();
    return <span data-testid={id}>{open ? "open" : "closed"}</span>;
  }

  test("the shell's own SidebarProvider does not take the app rail's Cmd+B", () => {
    const view = render(
      <SidebarProvider>
        <Probe id="rail" />
        <SettingsShell
          area={area("chat")}
          viewer={ADULT}
          activeSection="general"
          onNavigate={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
        >
          <Probe id="settings" />
        </SettingsShell>
      </SidebarProvider>,
    );
    expect(view.getByTestId("rail").textContent).toBe("open");
    expect(view.getByTestId("settings").textContent).toBe("open");
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(view.getByTestId("rail").textContent).toBe("closed");
    expect(view.getByTestId("settings").textContent).toBe("open");
  });
});

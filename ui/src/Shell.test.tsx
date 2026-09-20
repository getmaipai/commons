import { describe, expect, test, afterEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Shell } from "./Shell";
import type { NavEntry } from "./nav";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const ENTRIES: NavEntry[] = [
  { to: "/", icon: "home", label: "Home" },
  { to: "/apps", icon: "layout-grid", label: "Apps" },
];

function renderShell(props: Partial<Parameters<typeof Shell>[0]> = {}) {
  return render(
    <MemoryRouter>
      <Shell nav={ENTRIES} brand={<span>Brand</span>} {...props}>
        <p>page content</p>
      </Shell>
    </MemoryRouter>,
  );
}

describe("Shell", () => {
  test("a grouped NavGroup[] nav carries each item's real icon into the phone nav, not a generic fallback", () => {
    const groups = [
      {
        label: "Apps",
        items: [
          { title: "Chat", url: "/chat", icon: "message-circle" as const },
          { title: "People", url: "/people", icon: "users" as const },
        ],
      },
    ];
    const { container } = renderShell({ nav: groups });
    // The phone bottom bar (always in the DOM; only hidden by a CSS
    // class happy-dom doesn't apply layout for) renders each entry's
    // own icon - if flatEntries() dropped it, every link below would
    // carry the "box" fallback's lucide class instead.
    const phoneNav = container.querySelector('nav[aria-label="Primary"]')!;
    expect(phoneNav.querySelector(".lucide-message-circle")).not.toBeNull();
    expect(phoneNav.querySelector(".lucide-users")).not.toBeNull();
    expect(phoneNav.querySelector(".lucide-box")).toBeNull();
  });

  test("renders every nav entry and the page content", () => {
    const { getAllByText, getByText } = renderShell();
    expect(getAllByText("Home").length).toBeGreaterThan(0);
    expect(getAllByText("Apps").length).toBeGreaterThan(0);
    expect(getByText("page content")).toBeInTheDocument();
  });

  test("renders headerTitle and headerActions where given", () => {
    const { getByText } = renderShell({ headerTitle: <span>Overview</span>, headerActions: <button type="button">Notifications</button> });
    expect(getByText("Overview")).toBeInTheDocument();
    expect(getByText("Notifications")).toBeInTheDocument();
  });

  test("toggling the rail persists the new state to its own storage key", () => {
    const { getByRole } = renderShell({ railStorageKey: "test:rail" });
    expect(localStorage.getItem("test:rail")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Toggle Sidebar" }));
    const stored = localStorage.getItem("test:rail");
    expect(stored === "expanded" || stored === "collapsed").toBe(true);
  });

  test("two shells with different storage keys never share a rail preference", () => {
    const { getByRole, unmount } = renderShell({ railStorageKey: "test:rail-a" });
    fireEvent.click(getByRole("button", { name: "Toggle Sidebar" }));
    unmount();
    expect(localStorage.getItem("test:rail-b")).toBeNull();
  });

  test("without a search config, no command palette dialog exists and Cmd+K does nothing", () => {
    const { queryByRole } = renderShell();
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("with a search config, Cmd+K opens the command palette", () => {
    const { getByRole } = renderShell({
      search: {
        groups: [],
        query: "",
        onQueryChange: () => {},
        onSelect: () => {},
      },
    });
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(getByRole("dialog")).toBeInTheDocument();
  });

  test("Cmd+K toggles the palette closed again on a second press", () => {
    const { queryByRole } = renderShell({
      search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
    });
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(queryByRole("dialog")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("selecting a search result calls onSelect and closes the palette", () => {
    const onSelect = mock(() => {});
    const { getByRole, getByText, queryByRole } = renderShell({
      search: {
        groups: [{ heading: "Apps", items: [{ id: "app:chat", label: "Chat", icon: "message-circle", to: "/chat" }] }],
        query: "",
        onQueryChange: () => {},
        onSelect,
      },
    });
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(getByText("Chat"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });
});

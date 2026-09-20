import { describe, expect, test, afterEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Shell } from "./Shell";
import type { NavEntry } from "./nav";
import { usePhoneMode } from "@/kit/blocks/phone/PhoneMode";

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

  // A code review (2026-09-20) caught this prop's own threading as
  // uncovered: PhoneNav.test.tsx only ever exercises `max` by
  // rendering PhoneNav directly, never through Shell, so a later
  // Shell.tsx edit that dropped `max={phoneNavMax}` from its own
  // <PhoneNav> call would pass PhoneNav's own suite while silently
  // reverting every Shell consumer's phone tab bar to the default
  // five-entry cut.
  test("phoneNavMax reaches the phone tab bar's own max, not just PhoneNav's own default", () => {
    const fiveEntries: NavEntry[] = [
      { to: "/", icon: "home", label: "Home" },
      { to: "/chat", icon: "message-circle", label: "Chat" },
      { to: "/apps", icon: "layout-grid", label: "Apps" },
      { to: "/people", icon: "users", label: "People" },
      { to: "/settings", icon: "settings", label: "Settings" },
    ];
    const { container } = renderShell({ nav: fiveEntries, phoneNavMax: 4 });
    // Scoped to the phone tab bar itself, not the whole document: the
    // desktop rail (always in the DOM alongside it, per the first test
    // above's own comment) renders every entry regardless of
    // phoneNavMax, so an unscoped query would find "People" there even
    // if the phone bar's own max were broken.
    const phoneNav = container.querySelector('nav[aria-label="Primary"]')!;
    // max=4 folds the last two of five under More - People, the fourth
    // real entry, is the one that tips over (shown = first 3, plus
    // More in the fourth slot).
    expect(phoneNav.textContent).not.toContain("People");
    expect(phoneNav.textContent).toContain("More");
  });

  test("renders headerTitle and headerActions where given", () => {
    const { getByText } = renderShell({ headerTitle: <span>Overview</span>, headerActions: <button type="button">Notifications</button> });
    expect(getByText("Overview")).toBeInTheDocument();
    expect(getByText("Notifications")).toBeInTheDocument();
  });

  test("toggling the rail persists the new state to its own storage key", () => {
    const { getByRole } = renderShell({ railStorageKey: "test:rail" });
    expect(localStorage.getItem("test:rail")).toBeNull();
    fireEvent.click(getByRole("button", { name: /collapse navigation|expand navigation/i }));
    const stored = localStorage.getItem("test:rail");
    expect(stored === "expanded" || stored === "collapsed").toBe(true);
  });

  test("two shells with different storage keys never share a rail preference", () => {
    const { getByRole, unmount } = renderShell({ railStorageKey: "test:rail-a" });
    fireEvent.click(getByRole("button", { name: /collapse navigation|expand navigation/i }));
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

  test("without a search config, no header search button exists either", () => {
    const { queryByRole } = renderShell();
    expect(queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  // A phone has no Cmd+K - without a real button, search would exist on
  // desktop and vanish on phone (owner ruling, 2026-09-20, on Home's own
  // adoption: "one product, every screen" forbids exactly that).
  test("with a search config, clicking the header search button opens the palette", () => {
    const { getByRole, queryByRole } = renderShell({
      search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
    });
    expect(queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Search..." }));
    expect(getByRole("dialog")).toBeInTheDocument();
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

  // Regression: PhoneModeContext existed with no product ever providing
  // it - a page's usePhoneMode() call (things-page/ThingsTable's own
  // phone layout switch) read `false` unconditionally on every screen
  // size, found wiring the Apps page before it shipped.
  test("provides PhoneModeContext to children, live across a resize", () => {
    function Probe() {
      const phone = usePhoneMode();
      return <p>phone: {String(phone)}</p>;
    }
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    const { getByText } = render(
      <MemoryRouter>
        <Shell nav={ENTRIES} brand={<span>Brand</span>}><Probe /></Shell>
      </MemoryRouter>,
    );
    expect(getByText("phone: false")).toBeInTheDocument();
    act(() => {
      Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
      window.dispatchEvent(new Event("resize"));
    });
    expect(getByText("phone: true")).toBeInTheDocument();
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

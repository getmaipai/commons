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

  // The phone header fold (owner reference, "The phone composition,"
  // 2026-09-20): given both phone-only props, phone width hides the
  // regular header entirely - the desktop title, the header actions,
  // and the visible search field - in favor of whatever the two new
  // props render.
  test("at phone width, phoneHeaderTitle/phoneHeaderActions replace headerTitle/headerActions/search", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { getByText, queryByText, queryByRole } = renderShell({
      headerTitle: <span>Overview</span>,
      headerActions: <button type="button">Notifications</button>,
      phoneHeaderTitle: <span>Phone wordmark</span>,
      phoneHeaderActions: () => <button type="button">Avatar menu</button>,
      search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
    });
    expect(getByText("Phone wordmark")).toBeInTheDocument();
    expect(getByText("Avatar menu")).toBeInTheDocument();
    expect(queryByText("Overview")).not.toBeInTheDocument();
    expect(queryByText("Notifications")).not.toBeInTheDocument();
    expect(queryByRole("button", { name: "Search..." })).not.toBeInTheDocument();
  });

  // A phone still has no Cmd+K, and the visible search field this
  // widget replaces is gone - the render prop's own openSearch is the
  // only way left to reach the palette on phone, so it has to actually
  // work, not just exist.
  test("the phone header's own openSearch actually opens the command palette", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { getByRole, getByText, queryByRole } = renderShell({
      phoneHeaderTitle: <span>Phone wordmark</span>,
      phoneHeaderActions: (openSearch) => (
        <button type="button" onClick={openSearch}>
          Search
        </button>
      ),
      search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
    });
    expect(queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(getByText("Search"));
    expect(getByRole("dialog")).toBeInTheDocument();
  });

  // Given only one of the pair, or neither, the fold never half-applies
  // - a product mid-migration (or one that hasn't adopted it at all)
  // keeps today's header on every screen size rather than getting a
  // phone title with no way to reach headerActions, or vice versa.
  test("giving only one of phoneHeaderTitle/phoneHeaderActions falls back to the regular header on phone", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { getByText, queryByText } = renderShell({
      headerTitle: <span>Overview</span>,
      headerActions: <button type="button">Notifications</button>,
      phoneHeaderTitle: <span>Phone wordmark</span>,
    });
    expect(getByText("Overview")).toBeInTheDocument();
    expect(getByText("Notifications")).toBeInTheDocument();
    expect(queryByText("Phone wordmark")).not.toBeInTheDocument();
  });

  // A code review: openSearch only does anything once search is also
  // given (it opens the same CommandPalette search configures, which
  // isn't even mounted without it) - a caller that wires a menu row to
  // it without search gets a silent no-op, so this warns instead.
  test("phoneHeaderActions without search warns; with search, it doesn't", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      renderShell({ phoneHeaderTitle: <span>Phone wordmark</span>, phoneHeaderActions: () => <button type="button">Avatar menu</button> });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("openSearch will have nothing to open"));
      warn.mockClear();
      cleanup();
      renderShell({
        phoneHeaderTitle: <span>Phone wordmark</span>,
        phoneHeaderActions: () => <button type="button">Avatar menu</button>,
        search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      console.warn = original;
    }
  });

  // A fix-hunk re-review: phoneHeaderActions given alone (phoneHeaderTitle
  // omitted) is the documented-inert case - phoneHeaderActions is never
  // invoked, openSearch is never reachable, so the warning above
  // describing a problem with openSearch doesn't apply here at all.
  test("phoneHeaderActions given alone (no phoneHeaderTitle) never warns", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      renderShell({ phoneHeaderActions: () => <button type="button">Avatar menu</button> });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      console.warn = original;
    }
  });

  // A fix-hunk re-review: a render prop is almost always passed as a
  // fresh inline closure, and a real `search` config is almost always a
  // fresh object literal too - depending on either by reference would
  // re-run the warning effect (and risk re-warning) on every render, not
  // once per real presence change.
  test("a parent re-render with new phoneHeaderActions/search identities doesn't re-warn", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const warn = mock(() => {});
    const original = console.warn;
    console.warn = warn;
    try {
      const { rerender } = renderShell({
        phoneHeaderTitle: <span>Phone wordmark</span>,
        phoneHeaderActions: () => <button type="button">Avatar menu one</button>,
        search: { groups: [], query: "", onQueryChange: () => {}, onSelect: () => {} },
      });
      expect(warn).not.toHaveBeenCalled();
      rerender(
        <MemoryRouter>
          <Shell
            nav={ENTRIES}
            brand={<span>Brand</span>}
            phoneHeaderTitle={<span>Phone wordmark</span>}
            phoneHeaderActions={() => <button type="button">Avatar menu two</button>}
            search={{ groups: [], query: "new query", onQueryChange: () => {}, onSelect: () => {} }}
          >
            <p>page content</p>
          </Shell>
        </MemoryRouter>,
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      console.warn = original;
    }
  });

  // A code review: the phone branch's own gate (the JS `phone` tier,
  // width < 720) and this button's own visibility (the CSS `sm:` break,
  // 640px) disagree in the 640-719px range - rendering it in both
  // header branches, gated only by its own CSS class either way, keeps
  // a viewport in that gap able to toggle the rail regardless of which
  // branch renders (happy-dom doesn't apply layout, so this checks the
  // button exists in the DOM, the same way the phone-bar test above
  // already does for the same reason).
  test("the rail toggle exists in the phone header branch too, not just the regular one", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { getByRole } = renderShell({
      phoneHeaderTitle: <span>Phone wordmark</span>,
      phoneHeaderActions: () => <button type="button">Avatar menu</button>,
    });
    expect(getByRole("button", { name: /collapse navigation|expand navigation/i })).toBeInTheDocument();
  });

  // At desktop width, the phone-only props are inert even when given -
  // the fold is phone-only by design, not a general header override.
  test("at desktop width, phoneHeaderTitle/phoneHeaderActions are ignored even if given", () => {
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true });
    const { getByText, queryByText } = renderShell({
      headerTitle: <span>Overview</span>,
      headerActions: <button type="button">Notifications</button>,
      phoneHeaderTitle: <span>Phone wordmark</span>,
      phoneHeaderActions: () => <button type="button">Avatar menu</button>,
    });
    expect(getByText("Overview")).toBeInTheDocument();
    expect(getByText("Notifications")).toBeInTheDocument();
    expect(queryByText("Phone wordmark")).not.toBeInTheDocument();
    expect(queryByText("Avatar menu")).not.toBeInTheDocument();
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

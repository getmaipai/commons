import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PhoneNav } from "./PhoneNav";
import type { NavEntry } from "./nav";

afterEach(cleanup);

// `@testing-library/dom`'s global `screen` singleton is computed once at
// module-load time, before Bun's test preload has necessarily finished
// registering happy-dom's globals, so every query here comes from
// render()'s own returned queries (see settings/SettingField.test.tsx).

const FIVE_ENTRIES: NavEntry[] = [
  { to: "/", icon: "home", label: "Home" },
  { to: "/apps", icon: "layout-grid", label: "Apps" },
  { to: "/chat", icon: "message-circle", label: "Chat" },
  { to: "/people", icon: "users", label: "People" },
  { to: "/settings", icon: "settings", label: "Settings" },
];

const SIX_ENTRIES: NavEntry[] = [...FIVE_ENTRIES, { to: "/privacy", icon: "shield-check", label: "Privacy" }];

describe("PhoneNav", () => {
  test("renders every entry directly when there are five or fewer, no More button", () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <PhoneNav entries={FIVE_ENTRIES} />
      </MemoryRouter>,
    );
    for (const entry of FIVE_ENTRIES) expect(getByText(entry.label)).toBeInTheDocument();
    expect(queryByText("More")).not.toBeInTheDocument();
  });

  test("shows only the first four plus a More button once there are six entries", () => {
    const { getByText, queryByRole } = render(
      <MemoryRouter>
        <PhoneNav entries={SIX_ENTRIES} />
      </MemoryRouter>,
    );
    for (const entry of SIX_ENTRIES.slice(0, 4)) expect(getByText(entry.label)).toBeInTheDocument();
    expect(getByText("More")).toBeInTheDocument();
    expect(queryByRole("link", { name: /Settings/ })).not.toBeInTheDocument();
  });

  test("opening More reveals the overflowed entries", () => {
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <PhoneNav entries={SIX_ENTRIES} />
      </MemoryRouter>,
    );
    fireEvent.click(getByText("More"));
    expect(getByRole("link", { name: /Settings/ })).toBeInTheDocument();
    expect(getByRole("link", { name: /Privacy/ })).toBeInTheDocument();
  });

  // Home's own "Home, Chat, Apps, More" (owner ruling, "Navigation,
  // corrected," 2026-09-20): three real destinations, not the kit's
  // own default four, before folding the rest under More.
  test("a caller-supplied max shrinks the shown count, without changing the default for anyone else", () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <PhoneNav entries={FIVE_ENTRIES} max={4} />
      </MemoryRouter>,
    );
    for (const entry of FIVE_ENTRIES.slice(0, 3)) expect(getByText(entry.label)).toBeInTheDocument();
    expect(getByText("More")).toBeInTheDocument();
    expect(queryByText("People")).not.toBeInTheDocument();
  });

  // A code review (2026-09-20) caught `max <= 0` as reachable and
  // wrong before this test existed: `entries.slice(0, max - 1)` with a
  // negative end index counts from the array's END, not "zero items" -
  // max=0 would have shown almost everything directly instead of
  // folding it all under More. Clamped to 1 (PhoneNav.tsx's own
  // `safeMax`).
  test("a max of zero or less clamps to showing nothing directly, everything under More", () => {
    const { queryByText, getByText } = render(
      <MemoryRouter>
        <PhoneNav entries={FIVE_ENTRIES} max={0} />
      </MemoryRouter>,
    );
    for (const entry of FIVE_ENTRIES) expect(queryByText(entry.label)).not.toBeInTheDocument();
    expect(getByText("More")).toBeInTheDocument();
  });

  test("a max at or above the entry count shows everything directly, no More button", () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <PhoneNav entries={FIVE_ENTRIES} max={5} />
      </MemoryRouter>,
    );
    for (const entry of FIVE_ENTRIES) expect(getByText(entry.label)).toBeInTheDocument();
    expect(queryByText("More")).not.toBeInTheDocument();
  });

  test("marks the active entry with aria-current", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PhoneNav entries={FIVE_ENTRIES} />
      </MemoryRouter>,
    );
    expect(getByRole("link", { name: /Apps/ })).toHaveAttribute("aria-current", "page");
    expect(getByRole("link", { name: /^Home$/ })).not.toHaveAttribute("aria-current");
  });

  test("keeps the default bar classes and Primary label", () => {
    const { getByRole } = render(<MemoryRouter><PhoneNav entries={FIVE_ENTRIES} /></MemoryRouter>);
    const nav = getByRole("navigation", { name: "Primary" });
    expect(nav).not.toHaveClass("px-2");
    expect(nav).toHaveClass("fixed", "inset-x-0", "bottom-0", "border-t", "bg-background", "sm:hidden");
  });

  test("floating variant uses inset card styling, custom label and active fill", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PhoneNav entries={FIVE_ENTRIES} variant="floating" label="News sections" />
      </MemoryRouter>,
    );
    const nav = getByRole("navigation", { name: "News sections" });
    expect(nav).toHaveClass("inset-x-3", "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]", "rounded-full", "bg-card", "shadow-lg", "sm:hidden");
    expect(getByRole("link", { name: /Apps/ })).toHaveClass("bg-muted", "text-foreground");
  });

  test("optional PRO surface, inset, active pill and label modes", () => {
    const { getByRole, queryByText, rerender } = render(<MemoryRouter initialEntries={["/apps"]}><PhoneNav entries={SIX_ENTRIES} variant="floating" surface="glass" inset="pro" activePill="wide" labels="primary" /></MemoryRouter>);
    const nav = getByRole("navigation");
    expect(nav).toHaveClass("bg-[var(--surface-glass)]", "backdrop-blur-[var(--glass-blur)]", "shadow-[var(--shadow-glass)]", "ring-1", "inset-x-4", "h-[68px]");
    expect(nav.style.getPropertyValue("--phone-nav-height")).toBe("68px");
    expect(queryByText("Gallery")).not.toBeInTheDocument();
    expect(nav.querySelector('a[href="/apps"]')).toHaveClass("bg-[var(--surface-2)]", "ring-[var(--hairline)]", "text-foreground");
    expect(getByRole("link", { name: "Apps" })).toBeInTheDocument(); // icon-only entries keep an accessible name
    expect(getByRole("button", { name: "More" })).toBeInTheDocument();
    rerender(<MemoryRouter><PhoneNav entries={FIVE_ENTRIES} variant="floating" labels="primary" /></MemoryRouter>);
    expect(getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  test("default classes and computed nav height remain the old values", () => {
    const { getByRole } = render(<MemoryRouter><PhoneNav entries={FIVE_ENTRIES} variant="floating" /></MemoryRouter>);
    const nav = getByRole("navigation");
    expect(nav).toHaveClass("inset-x-3", "max-h-16", "bg-card", "shadow-lg");
    expect(nav.style.getPropertyValue("--phone-nav-height")).toBe("5rem");
    expect(getByRole("link", { name: "Home" })).toHaveClass("bg-muted");
  });

  test("docked variant is the flush bar with the floating entries", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PhoneNav entries={FIVE_ENTRIES} variant="docked" />
      </MemoryRouter>,
    );
    const nav = getByRole("navigation");
    const activeLink = getByRole("link", { name: /Apps/ });
    expect(nav).toHaveClass("fixed", "inset-x-0", "bottom-0", "border-t", "bg-background", "sm:hidden");
    expect(nav).not.toHaveClass("rounded-full", "shadow-lg");
    expect(nav).not.toHaveAttribute("data-floating");
    // The entries and their active pill sit inside the screen edge (equal 0.5rem margins), never touching it.
    expect(nav).toHaveClass("px-2");
    expect(activeLink).toHaveClass("bg-muted", "text-foreground", "text-xs", "py-1");
  });

  test("draws trailing last and keeps it out of More when entries overflow", () => {
    const trailing: NavEntry = { to: "/search", icon: "search", label: "Search" };
    const { getByRole, getByText } = render(
      <MemoryRouter>
        <PhoneNav entries={SIX_ENTRIES} trailing={trailing} max={5} />
      </MemoryRouter>,
    );
    const links = getByRole("navigation").querySelectorAll("a");
    expect(links[links.length - 1]).toHaveAttribute("href", "/search");
    expect(getByText("More")).toBeInTheDocument();
  });

  test("exact entries are inactive on subpaths while non-exact entries stay active", () => {
    const entries: NavEntry[] = [
      { to: "/apps/news", icon: "newspaper", label: "Today", exact: true },
      { to: "/apps/books", icon: "book", label: "Books" },
    ];
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps/books/detail"]}>
        <PhoneNav entries={entries} />
      </MemoryRouter>,
    );
    expect(getByRole("link", { name: /Today/ })).not.toHaveAttribute("aria-current");
    expect(getByRole("link", { name: /Books/ })).toHaveAttribute("aria-current", "page");
  });

  test("more entries live under a last three-dot button, after the trailing item", () => {
    const { getByText, getByRole, queryByText, container } = render(
      <MemoryRouter>
        <PhoneNav variant="floating" entries={FIVE_ENTRIES.slice(0, 3)} trailing={{ to: "/search", icon: "search", label: "Search" }} more={[{ to: "/settings/news", icon: "settings", label: "News settings" }]} />
      </MemoryRouter>,
    );
    const labels = Array.from(container.querySelectorAll("nav a, nav button")).map((el) => el.textContent);
    expect(labels).toEqual(["Home", "Apps", "Chat", "Search", "More"]);
    expect(queryByText("News settings")).not.toBeInTheDocument();
    fireEvent.click(getByText("More"));
    expect(getByRole("link", { name: "News settings" })).toBeInTheDocument();
  });

  test("a more entry takes one slot, so a full row folds its last entry under More too", () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <PhoneNav entries={FIVE_ENTRIES} more={[{ to: "/s", icon: "settings", label: "Prefs" }]} />
      </MemoryRouter>,
    );
    expect(queryByText("Settings")).not.toBeInTheDocument();
    fireEvent.click(getByText("More"));
    expect(getByText("Settings")).toBeInTheDocument();
    expect(getByText("Prefs")).toBeInTheDocument();
  });

  describe("leading", () => {
    const back = (over: Partial<{ onClick: () => void; disabled: boolean }> = {}) => ({ label: "Back", onClick: () => {}, ...over });

    test("renders as the first item, before the entries", () => {
      const { container } = render(
        <MemoryRouter>
          <PhoneNav entries={FIVE_ENTRIES.slice(0, 3)} leading={back()} />
        </MemoryRouter>,
      );
      const labels = Array.from(container.querySelectorAll("nav a, nav button")).map((el) => el.textContent);
      expect(labels).toEqual(["Back", "Home", "Apps", "Chat"]);
      expect(container.querySelector("nav button")?.getAttribute("type")).toBe("button");
    });

    test("calls onClick", () => {
      let n = 0;
      const { getByRole } = render(
        <MemoryRouter>
          <PhoneNav entries={FIVE_ENTRIES.slice(0, 2)} leading={back({ onClick: () => { n += 1; } })} />
        </MemoryRouter>,
      );
      fireEvent.click(getByRole("button", { name: "Back" }));
      expect(n).toBe(1);
    });

    test("disabled sets the attribute and does not call onClick", () => {
      let n = 0;
      const { getByRole } = render(
        <MemoryRouter>
          <PhoneNav entries={FIVE_ENTRIES.slice(0, 2)} leading={back({ disabled: true, onClick: () => { n += 1; } })} />
        </MemoryRouter>,
      );
      const btn = getByRole("button", { name: "Back" });
      expect(btn).toBeDisabled();
      expect(btn.className).toContain("disabled:opacity-40");
      fireEvent.click(btn);
      expect(n).toBe(0);
    });

    test("takes a slot: with max=5, leading plus four entries fit, five fold the last two under More", () => {
      const four = render(
        <MemoryRouter>
          <PhoneNav variant="floating" max={5} entries={FIVE_ENTRIES.slice(0, 4)} leading={back()} />
        </MemoryRouter>,
      );
      expect(Array.from(four.container.querySelectorAll("nav a, nav button")).map((el) => el.textContent)).toEqual(["Back", "Home", "Apps", "Chat", "People"]);
      cleanup();
      const { container, getByText, queryByText } = render(
        <MemoryRouter>
          <PhoneNav variant="floating" max={5} entries={FIVE_ENTRIES} leading={back()} />
        </MemoryRouter>,
      );
      const labels = Array.from(container.querySelectorAll("nav a, nav button")).map((el) => el.textContent);
      expect(labels).toEqual(["Back", "Home", "Apps", "Chat", "More"]);
      expect(queryByText("People")).not.toBeInTheDocument();
      fireEvent.click(getByText("More"));
      expect(getByText("People")).toBeInTheDocument();
      expect(getByText("Settings")).toBeInTheDocument();
    });

    test("hides the label (aria-label only) when labels is primary and the row is crowded", () => {
      const { getByRole, queryByText } = render(
        <MemoryRouter>
          <PhoneNav labels="primary" variant="floating" entries={FIVE_ENTRIES} leading={back()} />
        </MemoryRouter>,
      );
      expect(queryByText("Back")).not.toBeInTheDocument();
      expect(getByRole("button", { name: "Back" })).toBeInTheDocument();
    });

    test("without leading nothing changes: no extra button and the same fold", () => {
      const { container } = render(
        <MemoryRouter>
          <PhoneNav variant="floating" entries={FIVE_ENTRIES} />
        </MemoryRouter>,
      );
      const labels = Array.from(container.querySelectorAll("nav a, nav button")).map((el) => el.textContent);
      expect(labels).toEqual(["Home", "Apps", "Chat", "People", "Settings"]);
    });
  });
});

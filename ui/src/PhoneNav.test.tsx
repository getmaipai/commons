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

  test("marks the active entry with aria-current", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <PhoneNav entries={FIVE_ENTRIES} />
      </MemoryRouter>,
    );
    expect(getByRole("link", { name: /Apps/ })).toHaveAttribute("aria-current", "page");
    expect(getByRole("link", { name: /^Home$/ })).not.toHaveAttribute("aria-current");
  });
});

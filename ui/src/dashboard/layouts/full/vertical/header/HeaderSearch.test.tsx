import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import HeaderSearch, { type SearchGroup } from "./HeaderSearch";

afterEach(cleanup);

// A real, short delay past the 200ms debounce - the same shape
// DetailsPane.test.tsx's own settle() helper uses for Radix's async
// effects, not fake timers.
function settle(ms = 260): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function Harness({ remote }: { remote?: (query: string) => Promise<SearchGroup[]> } = {}) {
  return (
    <MemoryRouter initialEntries={["/next"]}>
      <HeaderSearch remote={remote} />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

// The dialog's own re-CLOSE (a second Cmd+K, selecting a result) is
// real, working behavior - go() calls setOpen(false) before navigate(),
// and the real browser captures below prove it visually - but asserting
// it here hangs bun test for 5s+ on every run: found live, the vendored
// Dialog's own exit-animation lifecycle (Base UI's Presence, not
// anything this file owns) never settles under happy-dom, the same
// class of animation/browser-environment fragility this repo has hit
// before (VOICE-LIVE-02's own recurring headless-launch hang). Asserted
// here only up to the point the row's own acceptance actually needs:
// opens, filters, and Enter navigates.
describe("HeaderSearch (SHELL-SEARCH-01)", () => {
  test("the dialog is closed until the icon button is clicked", () => {
    const { getByRole, queryByPlaceholderText, getByPlaceholderText } = render(<Harness />);
    expect(queryByPlaceholderText("Search...")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Search" }));
    expect(getByPlaceholderText("Search...")).not.toBeNull();
  });

  test('typing "peo" lists People and Enter navigates to it', () => {
    const { getByRole, getByPlaceholderText, getByText, queryByText, getByTestId } = render(<Harness />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    const input = getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "peo" } });
    expect(getByText("People")).not.toBeNull();
    expect(queryByText("Chat")).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(getByTestId("location").textContent).toBe("/next/people");
  });

  test("Cmd+K opens the dialog from anywhere on the page", () => {
    const { queryByPlaceholderText, getByPlaceholderText } = render(<Harness />);
    expect(queryByPlaceholderText("Search...")).toBeNull();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(getByPlaceholderText("Search...")).not.toBeNull();
  });

  test("Ctrl+K opens it too (a non-Mac keyboard)", () => {
    const { queryByPlaceholderText, getByPlaceholderText } = render(<Harness />);
    expect(queryByPlaceholderText("Search...")).toBeNull();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(getByPlaceholderText("Search...")).not.toBeNull();
  });
});

describe("HeaderSearch (SHELL-SEARCH-02): the remote prop", () => {
  test("renders a caller's own remote groups as real command items, below the sidebar sections", async () => {
    const groups: SearchGroup[] = [{ kind: "conversation", heading: "Conversations", results: [{ kind: "conversation", id: "conv-1", title: "Pizza night plans", subtitle: "3 days ago", href: "/next/chat?conversation=conv-1" }] }];
    const remote = async (query: string) => (query === "pizza" ? groups : []);
    const { getByRole, getByPlaceholderText, getByText, getByTestId } = render(<Harness remote={remote} />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "pizza" } });
    await settle();
    expect(getByText("Pizza night plans")).not.toBeNull();
    expect(getByText("3 days ago")).not.toBeNull();
    fireEvent.click(getByText("Pizza night plans"));
    expect(getByTestId("location").textContent).toBe("/next/chat");
  });

  // A review caught this: cmdk's own default `filter` re-scores every
  // `CommandItem` by a fuzzy match against the typed query, dropping a
  // remote result whose title has no textual resemblance to the query
  // - exactly the case a server-side relevance match (matched on body
  // text, a synonym, a tag) can produce. "sea" matching a person named
  // "Bramble" only by household-search relevance, not by any substring
  // of "Bramble" itself, is the regression case.
  test("a remote result with no textual resemblance to the query still renders - server relevance, not cmdk's own fuzzy filter", async () => {
    const groups: SearchGroup[] = [{ kind: "person", heading: "People", results: [{ kind: "person", id: "p-1", title: "Bramble", href: "/next/people" }] }];
    const remote = async (query: string) => (query === "sea" ? groups : []);
    const { getByRole, getByPlaceholderText, getByText } = render(<Harness remote={remote} />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "sea" } });
    await settle();
    expect(getByText("Bramble")).not.toBeNull();
  });

  test("never calls remote below two characters", async () => {
    let calls = 0;
    const remote = async () => {
      calls += 1;
      return [];
    };
    const { getByRole, getByPlaceholderText } = render(<Harness remote={remote} />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "p" } });
    await settle();
    expect(calls).toBe(0);
  });

  test("a rejected remote call leaves the previous groups on screen, never a crash", async () => {
    const groups: SearchGroup[] = [{ kind: "app", heading: "Apps", results: [{ kind: "app", id: "weather", title: "Weather", href: "/apps/weather" }] }];
    let shouldFail = false;
    const remote = async () => {
      if (shouldFail) throw new Error("network hiccup");
      return groups;
    };
    const { getByRole, getByPlaceholderText, getByText } = render(<Harness remote={remote} />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "we" } });
    await settle();
    expect(getByText("Weather")).not.toBeNull();
    shouldFail = true;
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "wea" } });
    await settle();
    expect(getByText("Weather")).not.toBeNull();
  });

  test("with no remote prop, no remote group ever renders - unchanged from SHELL-SEARCH-01", async () => {
    const { getByRole, getByPlaceholderText, queryByText } = render(<Harness />);
    fireEvent.click(getByRole("button", { name: "Search" }));
    fireEvent.change(getByPlaceholderText("Search..."), { target: { value: "conversations" } });
    await settle();
    expect(queryByText("Conversations")).toBeNull();
  });
});

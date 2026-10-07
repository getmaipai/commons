import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import * as search from "./thread-search";
import { ThreadSearch, type SearchableThread } from "./thread-search";

afterEach(cleanup);

const threads: SearchableThread[] = [
  { id: "a", title: "Trip plan", group: "Today", preview: "flights to Lisbon" },
  { id: "b", title: "Tax notes", group: "Yesterday", preview: "receipts" },
  { id: "c", title: "Lisbon hotels", group: "Today", preview: "", pinned: true },
  { id: "d", title: "Recipes", group: "Yesterday", preview: "pasta" },
];

const ids = (list: readonly SearchableThread[]) => list.map((t) => t.id);

describe("matchThreads", () => {
  test("an empty query keeps every thread, pinned first then by group", () => {
    expect(ids(search.matchThreads(threads, ""))).toEqual(["c", "a", "b", "d"]);
  });

  test("matches title and preview, case-insensitively", () => {
    expect(ids(search.matchThreads(threads, "LISBON"))).toEqual(["c", "a"]);
  });

  test("a thread with no preview matches on its title alone", () => {
    const bare: SearchableThread[] = [{ id: "x", title: "Plain", group: "Today" }];
    expect(ids(search.matchThreads(bare, "plain"))).toEqual(["x"]);
    expect(ids(search.matchThreads(bare, "undefined"))).toEqual([]);
  });

  test("groupThreads splits pinned from day groups in first-seen order", () => {
    const grouped = search.groupThreads(search.matchThreads(threads, ""));
    expect(ids(grouped.pinned)).toEqual(["c"]);
    expect(grouped.groups.map((g) => g.group)).toEqual(["Today", "Yesterday"]);
    expect(ids(grouped.groups[1]?.threads ?? [])).toEqual(["b", "d"]);
  });
});

describe("ThreadSearch inputOnly", () => {
  test("renders the search input and no rows, headings or empty state", () => {
    const { getByRole, queryByText } = render(
      <ThreadSearch threads={threads} query="zzz" activeId="a" inputOnly />,
    );
    expect(getByRole("textbox", { name: "Search threads" })).toBeTruthy();
    expect(queryByText("Trip plan")).toBeNull();
    expect(queryByText("Today")).toBeNull();
    expect(queryByText(/No thread matches/)).toBeNull();
  });

  test("the default still renders results and the empty state", () => {
    const { getByText, rerender } = render(
      <ThreadSearch threads={threads} query="" activeId="a" />,
    );
    expect(getByText("Trip plan")).toBeTruthy();
    rerender(<ThreadSearch threads={threads} query="zzz" activeId="a" />);
    expect(getByText(/No thread matches/)).toBeTruthy();
  });

  test("compact inputOnly uses the kit geometry while default remains unchanged", () => {
    const { container, rerender } = render(
      <ThreadSearch threads={threads} query="" activeId="a" inputOnly density="compact" />,
    );
    const field = container.querySelector("[data-slot='thread-search'] > div");
    expect(field?.className).toContain("h-9");
    expect(field?.className).toContain("rounded-[8px]");
    expect(field?.querySelector("svg")?.getAttribute("class")).toContain("size-4");
    expect(field?.querySelector("input")?.getAttribute("class")).toContain("text-[14px]");

    rerender(<ThreadSearch threads={threads} query="" activeId="a" inputOnly />);
    const defaultField = container.querySelector("[data-slot='thread-search'] > div");
    expect(defaultField?.className).not.toContain("h-9");
    expect(defaultField?.className).toContain("rounded-xl");
    expect(defaultField?.querySelector("svg")?.getAttribute("class")).toContain("size-3.5");
    expect(defaultField?.querySelector("input")?.getAttribute("class")).toContain("text-[13px]");
  });
});

describe("ThreadSearch onMatchesChange", () => {
  test("reports the ordered matching ids, in both modes", () => {
    for (const inputOnly of [true, false]) {
      const onMatchesChange = mock((_ids: string[]) => {});
      render(
        <ThreadSearch
          threads={threads}
          query="lisbon"
          activeId="a"
          inputOnly={inputOnly}
          onMatchesChange={onMatchesChange}
        />,
      );
      expect(onMatchesChange).toHaveBeenLastCalledWith(["c", "a"]);
      cleanup();
    }
  });

  test("fires again when the query changes, not on an unrelated re-render", () => {
    const onMatchesChange = mock((_ids: string[]) => {});
    const { rerender } = render(
      <ThreadSearch threads={threads} query="" activeId="a" onMatchesChange={onMatchesChange} />,
    );
    const calls = onMatchesChange.mock.calls.length;
    rerender(
      <ThreadSearch threads={[...threads]} query="" activeId="b" onMatchesChange={onMatchesChange} />,
    );
    expect(onMatchesChange.mock.calls.length).toBe(calls);
    rerender(
      <ThreadSearch threads={threads} query="tax" activeId="b" onMatchesChange={onMatchesChange} />,
    );
    expect(onMatchesChange).toHaveBeenLastCalledWith(["b"]);
  });
});

describe("ThreadSearch preview", () => {
  test("shows a supplied preview and renders no empty line without one", () => {
    const list: SearchableThread[] = [
      { id: "p", title: "With", group: "Today", preview: "the preview line" },
      { id: "q", title: "Without", group: "Today" },
    ];
    const { getByText, container } = render(
      <ThreadSearch threads={list} query="" activeId="p" />,
    );
    expect(getByText("the preview line")).toBeTruthy();
    const without = getByText("Without").closest("div");
    expect(without?.querySelectorAll("span.truncate").length).toBe(1);
    expect(container.textContent).not.toContain("undefined");
  });
});

describe("ThreadSearch keyboard", () => {
  const box = (utils: ReturnType<typeof render>) =>
    utils.getByRole("textbox", { name: "Search threads" });

  test("Enter opens the first result in display order", () => {
    const onSelect = mock((_id: string) => {});
    const utils = render(
      <ThreadSearch threads={threads} query="lisbon" activeId="b" onSelect={onSelect} inputOnly />,
    );
    fireEvent.keyDown(box(utils), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  test("Enter with no results selects nothing", () => {
    const onSelect = mock((_id: string) => {});
    const utils = render(
      <ThreadSearch threads={threads} query="zzz" activeId="a" onSelect={onSelect} />,
    );
    fireEvent.keyDown(box(utils), { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("Escape clears a non-empty query", () => {
    const onQueryChange = mock((_q: string) => {});
    const utils = render(
      <ThreadSearch threads={threads} query="tax" activeId="a" onQueryChange={onQueryChange} />,
    );
    fireEvent.keyDown(box(utils), { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  test("Escape on an empty query does nothing", () => {
    const onQueryChange = mock((_q: string) => {});
    const utils = render(
      <ThreadSearch threads={threads} query="" activeId="a" onQueryChange={onQueryChange} />,
    );
    fireEvent.keyDown(box(utils), { key: "Escape" });
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  test("arrow keys still step through the matches", () => {
    const onSelect = mock((_id: string) => {});
    const utils = render(
      <ThreadSearch threads={threads} query="" activeId="c" onSelect={onSelect} inputOnly />,
    );
    fireEvent.keyDown(box(utils), { key: "ArrowDown" });
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  test("compact mode keeps ordered Enter, arrow and Escape behavior", () => {
    const onSelect = mock((_id: string) => {});
    const onQueryChange = mock((_q: string) => {});
    const utils = render(
      <ThreadSearch
        threads={threads}
        query="lisbon"
        activeId="c"
        onSelect={onSelect}
        onQueryChange={onQueryChange}
        inputOnly
        density="compact"
      />,
    );
    fireEvent.keyDown(box(utils), { key: "ArrowDown" });
    expect(onSelect).toHaveBeenLastCalledWith("a");
    fireEvent.keyDown(box(utils), { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("c");
    fireEvent.keyDown(box(utils), { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledWith("");
  });
});

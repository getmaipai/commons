// Regression for `computeThreadListGroups` (thread-list.aui.tsx): the
// pure grouping logic behind `useThreadListGroups`, extracted specifically
// so this bug class - a prior version silently dropped every unpinned,
// dateless thread once anything was pinned - has something codifying it,
// the way `search/SearchResultGroups.test.tsx` already does for its own
// sibling grouping function. No assistant-ui runtime needed: this
// function takes plain data in and returns plain data out.
import { describe, expect, test } from "bun:test";
import { computeThreadListGroups, type ThreadListGroupableItem } from "@/assistant-ui/thread-list-groups";

function items(entries: Record<string, ThreadListGroupableItem>): Map<string, ThreadListGroupableItem> {
  return new Map(Object.entries(entries));
}

describe("computeThreadListGroups", () => {
  test("an unpinned, dateless thread is never dropped once something else is pinned", () => {
    // The exact bug a code review caught: the early "flat mode" return
    // used to fire whenever no UNPINNED thread had a date, discarding
    // every unpinned index in the process once anything qualified for a
    // non-null groups array.
    const result = computeThreadListGroups(
      ["pinned-1", "unpinned-no-date"],
      items({
        "pinned-1": { title: "Pinned thread", lastMessageAt: new Date("2026-09-20T12:00:00Z"), custom: { pinned: true } },
        "unpinned-no-date": { title: "Fresh unpinned thread" },
      }),
      "",
      false,
      true,
    );
    expect(result.groups).not.toBeNull();
    const allIndices = result.groups!.flatMap((g) => g.indices);
    expect(allIndices.sort()).toEqual([0, 1]);
    expect(result.filteredIndices.sort()).toEqual([0, 1]);
  });

  test("pinned threads land in their own group ahead of every date group", () => {
    const result = computeThreadListGroups(
      ["old-pinned", "today-unpinned"],
      items({
        "old-pinned": { title: "Old but pinned", lastMessageAt: new Date("2020-01-01T00:00:00Z"), custom: { pinned: true } },
        "today-unpinned": { title: "New and unpinned", lastMessageAt: new Date() },
      }),
      "",
      false,
      true,
    );
    expect(result.groups!.map((g) => g.label)).toEqual(["Pinned", "Today"]);
    // Both groups' own full contents, not just the first (a code
    // review): a pinned thread appearing in both its own group AND its
    // date group - a duplicate render with a duplicate React key - would
    // still pass a check that only ever looked at group 0.
    expect(result.groups![0]!.indices).toEqual([0]);
    expect(result.groups![1]!.indices).toEqual([1]);
  });

  test("pinnable=false ignores custom.pinned entirely - no Pinned group, no control to explain it", () => {
    const result = computeThreadListGroups(
      ["stale-pinned-flag"],
      items({ "stale-pinned-flag": { title: "Has stale pinned data", lastMessageAt: new Date(), custom: { pinned: true } } }),
      "",
      false,
      false,
    );
    expect(result.groups!.every((g) => g.label !== "Pinned")).toBe(true);
  });

  test("groups is null only when nothing is pinned and nothing has a date", () => {
    const result = computeThreadListGroups(
      ["a", "b"],
      items({ a: { title: "First" }, b: { title: "Second" } }),
      "",
      false,
      true,
    );
    expect(result.groups).toBeNull();
    expect(result.filteredIndices).toEqual([0, 1]);
  });

  test("title search filters out non-matching threads", () => {
    const result = computeThreadListGroups(
      ["garden", "shopping"],
      items({
        garden: { title: "Weekend garden plans", lastMessageAt: new Date() },
        shopping: { title: "Shopping list ideas", lastMessageAt: new Date() },
      }),
      "garden",
      false,
      false,
    );
    expect(result.filteredIndices).toEqual([0]);
  });

  test("skipFilter keeps every thread regardless of the query - a server-filtered caller isn't re-filtered by title", () => {
    const result = computeThreadListGroups(
      ["message-body-match"],
      items({ "message-body-match": { title: "Tuesday", lastMessageAt: new Date() } }),
      "compost",
      true,
      false,
    );
    expect(result.filteredIndices).toEqual([0]);
  });
});

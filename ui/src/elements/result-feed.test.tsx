// VIDEO-UI-04 (K10): the ResultFeed Element draws entries in the order given, grouped, with a filter bar.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ResultFeed, feedDayLabel, groupFeedEntries, type ResultFeedEntry } from "./result-feed";

afterEach(cleanup);

const entry = (key: string, words: string, day: string | undefined, status = "ready"): ResultFeedEntry => ({
  key,
  words,
  day,
  tags: ["Anime"],
  references: [{ label: "Start frame", thumb: "/t.png" }],
  player: { status, prompt: words, src: status === "ready" ? "/a.mp4" : undefined, error: "Nope." } as ResultFeedEntry["player"],
});

describe("ResultFeed", () => {
  test("keeps the given order and puts a DayDivider with a count before each day", () => {
    const view = render(<ResultFeed entries={[entry("1", "one", "Today"), entry("2", "two", "Today"), entry("3", "three", "Yesterday")]} />);
    expect(view.getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual(["one", "two", "three"]);
    expect(view.getAllByRole("separator").map((s) => s.getAttribute("aria-label"))).toEqual(["Today, 2 clips", "Yesterday, 1 clip"]);
  });

  test("an entry in each status draws the player's own state", () => {
    const view = render(<ResultFeed grouping="none" entries={["queued", "generating", "ready", "failed", "cancelled"].map((s) => entry(s, `w ${s}`, undefined, s))} />);
    expect(view.getAllByRole("article").map((a) => a.getAttribute("data-status"))).toEqual(["queued", "generating", "ready", "failed", "cancelled"]);
    expect(view.getByText("Waiting its turn")).toBeTruthy();
    expect(view.getByText("Nope.")).toBeTruthy();
    expect(view.getByText("Stopped. Nothing was kept.")).toBeTruthy();
    expect(view.container.querySelectorAll("video").length).toBe(1);
    expect(view.queryAllByRole("separator").length).toBe(0);
  });

  test("grouping by words gathers equal words under the first one's place", () => {
    const groups = groupFeedEntries([entry("1", "a", "Today"), entry("2", "b", "Today"), entry("3", "a", "Yesterday")], "words");
    expect(groups.map((g) => [g.label, g.entries.map((e) => e.key)])).toEqual([["a", ["1", "3"]], ["b", ["2"]]]);
  });

  test("the filter bar's toggle and select report their changes", () => {
    const onToggle = mock(() => {});
    const view = render(
      <ResultFeed
        entries={[]}
        empty={<p>Nothing yet.</p>}
        filters={[
          { kind: "toggle", id: "fav", label: "Favorites only", value: false, onValueChange: onToggle },
          { kind: "select", id: "type", label: "Type", value: "all", options: [{ value: "all", label: "All" }, { value: "video", label: "Videos" }], onValueChange: () => {} },
        ]}
      />,
    );
    fireEvent.click(view.getByRole("switch", { name: "Favorites only" }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(view.getByRole("combobox", { name: "Type" })).toBeTruthy();
    expect(view.getByText("Nothing yet.")).toBeTruthy();
  });

  test("feedDayLabel says Today, Yesterday, then the date", () => {
    const now = new Date(2026, 10, 2, 15, 0);
    expect(feedDayLabel(new Date(2026, 10, 2, 1, 0), now)).toBe("Today");
    expect(feedDayLabel(new Date(2026, 10, 1, 23, 0), now)).toBe("Yesterday");
    expect(feedDayLabel(new Date(2026, 9, 30), now)).toMatch(/Oct/);
    expect(feedDayLabel(new Date(2025, 9, 30), now)).toMatch(/2025/);
  });
});

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

  test("headingStyle eyebrow draws the day headings and filter labels as uppercase tracked text; default keeps the dividers (VIDEO-STUDIO-03)", () => {
    const entries = [entry("1", "one", "Today"), entry("2", "two", "Yesterday")];
    const filters = [{ kind: "toggle" as const, id: "fav", label: "Favorites", value: false, onValueChange: () => {} }];
    const base = render(<ResultFeed entries={entries} filters={filters} />);
    expect(base.getAllByRole("separator")).toHaveLength(2);
    expect(base.container.querySelector("[data-slot=result-feed-group-heading]")).toBeNull();
    expect(base.getByText("Favorites").className).not.toContain("uppercase");
    cleanup();
    const view = render(<ResultFeed entries={entries} filters={filters} headingStyle="eyebrow" />);
    expect(view.queryAllByRole("separator")).toHaveLength(0);
    const heads = view.getAllByRole("heading", { level: 3 });
    expect(heads.map((h) => h.textContent)).toEqual(["Today, 1 clip", "Yesterday, 1 clip"]);
    for (const h of heads) { expect(h.className).toContain("uppercase"); expect(h.className).toContain("tracking-widest"); }
    expect(view.getByText("Favorites").className).toContain("uppercase");
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

// VIDEO-UI-14 (items 2 and 6): the media look and the one View button.
describe("ResultFeed media look", () => {
  const mediaEntries = () => ["a", "b", "c"].map((k) => ({ ...entry(k, `words ${k}`, "Today"), tags: ["Anime", "Dolly in"] }));

  test("the default look is unchanged when look is left out or default", () => {
    const base = render(<ResultFeed entries={mediaEntries()} />).container.innerHTML;
    cleanup();
    expect(render(<ResultFeed entries={mediaEntries()} look="default" filtersPresentation="inline" />).container.innerHTML).toBe(base);
    expect(base).not.toContain("result-feed-grid");
  });

  test("the newest entry is wide, the rest sit in a grid keyed on the pane's own width", () => {
    const view = render(<ResultFeed look="media" entries={mediaEntries()} />);
    const section = view.container.querySelector("[data-slot=result-feed]")!;
    expect(section.className).toContain("@container");
    const grid = view.container.querySelector("[data-slot=result-feed-grid]")!;
    // Two columns from the pane's 42 rem (each at least 320 px with the gap), one below it; a window media query is never used.
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("@2xl:grid-cols-2");
    expect(grid.className).not.toMatch(/(^|\s)(sm|md|lg|xl):grid-cols/);
    const entries = view.getAllByRole("article");
    expect(entries[0]!.getAttribute("data-first")).toBe("true");
    expect(entries[0]!.className).toContain("@2xl:col-span-2");
    expect(entries[1]!.className).not.toContain("col-span");
    expect(entries.slice(1).some((e) => e.hasAttribute("data-first"))).toBe(false);
  });

  test("the words show once per entry, as the feed's own paragraph under the player", () => {
    const view = render(<ResultFeed look="media" entries={mediaEntries()} />);
    for (const article of view.getAllByRole("article")) {
      expect(article.querySelectorAll("[data-slot=result-feed-words]").length).toBe(1);
      const text = article.textContent ?? "";
      expect(text.split(article.getAttribute("aria-label")!).length - 1).toBe(1);
      const words = article.querySelector("[data-slot=result-feed-words]")!;
      const player = article.querySelector("[data-slot=video-player]")!;
      expect(player.compareDocumentPosition(words) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  test("tags and the Start frame chip move onto the picture, with no tag list of the feed's own", () => {
    const view = render(<ResultFeed look="media" entries={mediaEntries()} />);
    const first = view.getAllByRole("article")[0]!;
    expect(first.querySelector("[data-slot=result-feed-tags]")).toBeNull();
    const badges = [...first.querySelectorAll("[data-slot=video-player-badges] li")].map((li) => li.textContent);
    expect(badges).toEqual(["Start frame", "Anime", "Dolly in"]);
  });

  test("every entry state draws in the media look and keeps its visible status parts", () => {
    const statuses = ["queued", "generating", "draft", "ready", "failed", "cancelled"];
    const view = render(<ResultFeed look="media" grouping="none" entries={statuses.map((s) => ({ ...entry(s, `w ${s}`, undefined, s), player: { status: s, prompt: `w ${s}`, src: s === "ready" ? "/a.mp4" : undefined, still: "/s.jpg", error: "Nope.", onStop: () => {}, onRetry: () => {}, onRender: () => {}, onFavorite: () => {} } as ResultFeedEntry["player"] }))} />);
    expect(view.getAllByRole("article").map((a) => a.getAttribute("data-status"))).toEqual(statuses);
    expect(view.getByText("Waiting its turn")).toBeTruthy();
    expect(view.getAllByRole("button", { name: "Stop" }).length).toBe(2);
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(view.getByText("Nope.")).toBeTruthy();
    expect(view.getByText("Stopped. Nothing was kept.")).toBeTruthy();
    expect(view.container.querySelectorAll("video").length).toBe(1);
    expect(view.container.querySelectorAll("[data-slot=video-player-still]").length).toBe(1);
    // No entry prints its words twice, whatever its state.
    for (const article of view.getAllByRole("article")) expect(article.querySelectorAll("[data-slot=result-feed-words]").length).toBe(1);
    expect(view.container.querySelectorAll("p.line-clamp-2.text-xs").length).toBe(0);
  });
});

describe("ResultFeed filters_presentation popover", () => {
  const filters = (onFav: (next: boolean) => void = () => {}) => [
    { kind: "toggle" as const, id: "fav", label: "Favorites only", value: true, onValueChange: onFav },
    { kind: "toggle" as const, id: "words", label: "Group by words", value: false, onValueChange: () => {} },
    { kind: "select" as const, id: "type", label: "Type", value: "all", options: [{ value: "all", label: "All" }, { value: "video", label: "Videos" }], onValueChange: () => {} },
  ];

  test("one View button replaces the three controls and opens them in a dialog", () => {
    const calls: boolean[] = [];
    const view = render(<ResultFeed entries={[]} filtersPresentation="popover" filters={filters((v) => calls.push(v))} />);
    expect(view.queryByRole("switch")).toBeNull();
    expect(view.queryByRole("combobox")).toBeNull();
    const button = view.getByRole("button", { name: /^View/ });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(view.container.querySelector("[data-slot=result-feed-view-count]")!.textContent).toBe("1");
    fireEvent.click(button);
    expect(view.getByRole("switch", { name: "Favorites only" })).toBeTruthy();
    expect(view.getByRole("switch", { name: "Group by words" })).toBeTruthy();
    expect(view.getByRole("combobox", { name: "Type" })).toBeTruthy();
    fireEvent.click(view.getByRole("switch", { name: "Favorites only" }));
    expect(calls).toEqual([false]);
  });

  test("inline stays the default and draws the three controls", () => {
    const view = render(<ResultFeed entries={[]} filters={filters()} />);
    expect(view.getAllByRole("switch").length).toBe(2);
    expect(view.getByRole("combobox", { name: "Type" })).toBeTruthy();
    expect(view.queryByRole("button", { name: /^View/ })).toBeNull();
  });
});

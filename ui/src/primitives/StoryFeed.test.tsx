import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import feedBlock from "@maipai/spec/fixtures/answer-block/valid-story_feed.json";
import { StoryFeed, type StoryFeedData } from "@/kit/primitives/StoryFeed";

afterEach(cleanup);

const data = feedBlock.props as unknown as StoryFeedData;

describe("StoryFeed", () => {
  test("draws the hero, the featured stories, a shelf and the rows from the block's props", () => {
    const { container, getByText } = render(<StoryFeed data={data} />);
    expect(container.querySelector('[data-slot="story-feed"]')?.getAttribute("data-layout")).toBe("today");
    expect(container.querySelector('[data-tier="hero"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-tier="featured"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-tier="shelf"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="story-rows"] li')).toHaveLength(1);
    expect(getByText("Headline 1")).toBeTruthy();
    expect(getByText("Today")).toBeTruthy();
  });

  test("the hero is the lead: its picture is the large one and its card spans two grid rows", () => {
    const { container } = render(<StoryFeed data={data} />);
    const hero = container.querySelector('[data-tier="hero"]')!;
    expect(hero.className).toContain("lg:col-span-8");
    expect(hero.className).toContain("lg:row-span-2");
    expect(hero.querySelector("img")?.getAttribute("src")).toBe(data.hero!.image!.w1280);
  });

  test("a story with no picture draws a plain tile, never a broken image", () => {
    const { container } = render(<StoryFeed data={{ ...data, hero: { ...data.hero!, image: undefined } }} />);
    expect(container.querySelector('[data-tier="hero"] img')).toBeNull();
    expect(container.querySelector('[data-tier="hero"] [data-empty]')).not.toBeNull();
  });

  test("opening a story fires `open` with the story's own ids", () => {
    const onAction = mock(() => {});
    const { getByText } = render(<StoryFeed data={data} onAction={onAction} />);
    fireEvent.click(getByText("Headline 1"));
    expect(onAction).toHaveBeenCalledWith("open", { story_id: data.hero!.story_id, item_id: data.hero!.item_id });
  });

  test("Follow shows only when the page declared it, and fires with the channel and the new value", () => {
    const channel = { ...data, layout: "channel" as const, header: { title: "Science", channel: { kind: "topic" as const, key: "science", followed: false } } };
    const onAction = mock(() => {});
    const without = render(<StoryFeed data={channel} onAction={onAction} />);
    expect(without.queryByText("Follow")).toBeNull();
    cleanup();
    const { getByText } = render(<StoryFeed data={channel} onAction={onAction} available={["open", "follow"]} />);
    fireEvent.click(getByText("Follow"));
    expect(onAction).toHaveBeenCalledWith("follow", { channel_kind: "topic", channel_key: "science", on: true });
  });

  test("a card with no declared menu action has no menu; with Save declared the menu offers it", () => {
    const none = render(<StoryFeed data={data} onAction={() => {}} />);
    expect(none.queryByLabelText(/More for/)).toBeNull();
    cleanup();
    const some = render(<StoryFeed data={data} onAction={() => {}} available={["open", "save"]} />);
    expect(some.getAllByLabelText(/More for/).length).toBeGreaterThan(0);
  });

  test("a story with no outbound address offers no Open on site", () => {
    const noUrl = { ...data, hero: { ...data.hero!, open_url: undefined } };
    const { container } = render(<StoryFeed data={noUrl} onAction={() => {}} available={["open", "open_site"]} />);
    expect(container.querySelector("a[href]")).toBeNull();
  });

  test("an opened story keeps the card at full strength and mutes its headline and source line; a saved one says so", () => {
    const marked = { ...data, hero: { ...data.hero!, opened: true, saved: true } };
    const { container, getByText } = render(<StoryFeed data={marked} />);
    const card = container.querySelector('[data-tier="hero"]')!;
    expect(card.hasAttribute("data-opened")).toBe(true);
    expect(card.className).not.toContain("opacity");
    expect(getByText("Headline 1").hasAttribute("data-opened")).toBe(true);
    expect(getByText("Headline 1").className).toContain("text-muted-foreground");
    expect(card.querySelector('[data-slot="story-source"]')?.hasAttribute("data-opened")).toBe(true);
    expect(getByText("Saved")).toBeTruthy();
  });

  test("an empty feed shows the empty state", () => {
    const { getByText } = render(<StoryFeed data={{ layout: "today", as_of: data.as_of }} />);
    expect(getByText("No stories yet")).toBeTruthy();
  });

  test("the rows layout draws thumbnail rows only", () => {
    const { container } = render(<StoryFeed data={{ layout: "rows", rows: [data.hero!, ...data.featured!], as_of: data.as_of }} />);
    expect(container.querySelector('[data-slot="story-grid"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="story-row"]')).toHaveLength(3);
  });
});

describe("StoryFeed thumbnail rows keep the Item's own padding", () => {
  test("does not strip the row's padding or gap, so the picture sits inside the border with space before the title (verification pass)", () => {
    const { container } = render(<StoryFeed data={data} />);
    const row = container.querySelector('[data-slot="story-row"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.className).not.toMatch(/\bgap-0\b/);
    expect(row.className).not.toMatch(/\bpy-0\b/);
  });
});

describe("StoryFeed shelf channel buttons", () => {
  test("a shelf channel button fires open_channel with the channel ids, and is hidden when the page does not map it", () => {
    const shelved = { ...data, shelves: [{ title: "From your channels", stories: data.hero ? [data.hero] : [], channels: [{ kind: "topic", key: "science", label: "Science" }] }] } as unknown as StoryFeedData;
    const onAction = mock(() => {});
    const on = render(<StoryFeed data={shelved} onAction={onAction} available={["open", "open_channel"]} />);
    fireEvent.click(on.getByText("Science"));
    expect(onAction).toHaveBeenCalledWith("open_channel", { channel_kind: "topic", channel_key: "science" });
    cleanup();
    const off = render(<StoryFeed data={shelved} onAction={() => {}} available={["open"]} />);
    expect(off.queryByText("Science")).toBeNull();
  });
});

describe("StoryFeed look (NEWS-LOOK-02)", () => {
  const rowsData = (rows: Array<Partial<NonNullable<StoryFeedData["rows"]>[number]>>): StoryFeedData => ({
    layout: "rows",
    rows: rows.map((row, i) => ({ ...data.hero!, story_id: `story-r${i}a1b2c`, item_id: `news-r${i}a1b2c`, title: `Row ${i}`, group: undefined, kicker: undefined, ...row })),
    as_of: data.as_of,
  });

  test("the dateline sits under the title in the muted small style", () => {
    const { container } = render(<StoryFeed data={data} />);
    const dateline = container.querySelector('[data-slot="story-dateline"]')!;
    expect(dateline.textContent).toBe(data.header!.dateline!);
    expect(dateline.className).toContain("text-muted-foreground");
    expect(dateline.className).toContain("text-xs");
  });

  test("filter chips fire `filter` with the chip's id and mark the selected one pressed", () => {
    const onAction = mock(() => {});
    const { getByRole } = render(<StoryFeed data={data} onAction={onAction} available={["open", "filter"]} />);
    expect(getByRole("tab", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("tab", { name: "World" }).getAttribute("aria-pressed")).toBe("false");
    const science = getByRole("tab", { name: "Science" });
    fireEvent.pointerDown(science, { button: 0 });
    fireEvent.mouseDown(science, { button: 0 });
    fireEvent.click(science);
    expect(onAction).toHaveBeenCalledWith("filter", { filter_id: "science" });
  });

  test("the All chip's empty id is what a click fires", () => {
    const onAction = mock(() => {});
    const moved = { ...data, filters: [{ id: "", label: "All" }, { id: "world", label: "World", selected: true }] };
    const { getByRole } = render(<StoryFeed data={moved} onAction={onAction} available={["filter"]} />);
    const all = getByRole("tab", { name: "All" });
    fireEvent.pointerDown(all, { button: 0 });
    fireEvent.mouseDown(all, { button: 0 });
    fireEvent.click(all);
    expect(onAction).toHaveBeenCalledWith("filter", { filter_id: "" });
  });

  test("the chips are hidden when the page did not map `filter`", () => {
    const { queryByRole, container } = render(<StoryFeed data={data} onAction={() => {}} available={["open"]} />);
    expect(queryByRole("tab", { name: "World" })).toBeNull();
    expect(container.querySelector('[data-slot="story-filters"]')).toBeNull();
  });

  test("consecutive rows with one group draw under one heading with a muted count", () => {
    const { container, getAllByRole } = render(
      <StoryFeed data={rowsData([{ group: "This morning" }, { group: "This morning" }, { group: "Last night" }, { group: "This morning" }])} />,
    );
    const headings = getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["This morning 2", "Last night 1", "This morning 1"]);
    expect(headings[0]!.querySelector("span")?.className).toContain("text-muted-foreground");
    expect(container.querySelectorAll('[data-slot="story-group"]')).toHaveLength(3);
  });

  test("rows with no group draw without a heading", () => {
    const { container, queryAllByRole } = render(<StoryFeed data={rowsData([{}, {}])} />);
    expect(queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="story-row"]')).toHaveLength(2);
  });

  test("a kicker draws above the headline on a card and on a row, in the kicker token", () => {
    const card = render(<StoryFeed data={data} />);
    const kicker = card.container.querySelector('[data-tier="hero"] [data-slot="story-kicker"]')!;
    expect(kicker.textContent).toBe(data.hero!.kicker!);
    expect(kicker.className).toContain("text-kicker");
    expect(kicker.compareDocumentPosition(card.getByText("Headline 1")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    const row = render(<StoryFeed data={rowsData([{ kicker: "Science" }, {}])} />);
    expect(row.container.querySelectorAll('[data-slot="story-row"] [data-slot="story-kicker"]')).toHaveLength(1);
  });

  test("the hero picture ratio is the --story-hero-ratio token, 16 / 9 by default", () => {
    const { container } = render(<StoryFeed data={data} />);
    const frame = container.querySelector('[data-tier="hero"] [data-slot="story-image"]') as HTMLElement;
    expect(frame.getAttribute("style")).toContain("var(--story-hero-ratio, 16 / 9)");
  });

  test("a row keeps the picture beside the title: no wrapping, a shrinkable text column, a three-line title, a 112 px 16:9 thumbnail", () => {
    const { container } = render(<StoryFeed data={rowsData([{}])} />);
    const row = container.querySelector('[data-slot="story-row"]') as HTMLElement;
    expect(row.className).toContain("flex-nowrap");
    expect(row.className).not.toMatch(/(^|\s)flex-wrap(\s|$)/);
    const [media, content] = Array.from(row.children) as HTMLElement[];
    expect(media!.getAttribute("data-slot")).toBe("item-media");
    expect(media!.className).toContain("w-28");
    expect(media!.className).toContain("aspect-video");
    expect(content!.getAttribute("data-slot")).toBe("item-content");
    expect(content!.className).toContain("min-w-0");
    expect(content!.querySelector('[data-slot="item-title"]')!.className).toContain("line-clamp-3");
  });
});

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

  test("an opened story is dimmed and a saved one says so", () => {
    const marked = { ...data, hero: { ...data.hero!, opened: true, saved: true } };
    const { container, getByText } = render(<StoryFeed data={marked} />);
    expect(container.querySelector('[data-tier="hero"]')?.hasAttribute("data-opened")).toBe(true);
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

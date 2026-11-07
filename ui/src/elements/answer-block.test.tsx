import { afterEach, describe, expect, test, setSystemTime } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AnswerBlockView } from "./answer-block";
import afterParagraph from "@maipai/spec/fixtures/answer-block/valid-after-paragraph.json";
import { ANSWER_BLOCK_FIXTURES, AnswerBlockInlineShowcase, INLINE_REPLY } from "./AnswerBlockShowcase";

afterEach(cleanup);

const fixture = (kind: keyof typeof ANSWER_BLOCK_FIXTURES) => ANSWER_BLOCK_FIXTURES[kind];

describe("AnswerBlockView renders each v1 kind with its Element", () => {
  test("spec_sheet", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("spec_sheet")} />);
    expect(container.querySelector('[data-slot="spec-sheet"]')).not.toBeNull();
    expect(getByText("6.3 in OLED")).toBeTruthy();
    expect(getByText("4700 mAh")).toBeTruthy();
  });

  test("data_table", () => {
    const { container, getAllByText } = render(<AnswerBlockView block={fixture("data_table")} />);
    expect(container.querySelector('[data-slot="data-table"]')).not.toBeNull();
    expect(getAllByText("Chana masala").length).toBeGreaterThan(0);
    expect(getAllByText("$14.50").length).toBeGreaterThan(0);
  });

  test("chart", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("chart")} />);
    expect(container.querySelector('[data-slot="chart"]')).not.toBeNull();
    expect(getByText("12.4 kWh")).toBeTruthy();
    expect(container.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(7);
  });

  test("timeline shows every event", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("timeline")} />);
    expect(container.querySelector('[data-slot="timeline"]')).not.toBeNull();
    expect(getByText("Left the depot")).toBeTruthy();
    expect(getByText("Due at the door")).toBeTruthy();
  });

  test("todo_list", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("todo_list")} />);
    expect(container.querySelector('[data-slot="todo-list"]')).not.toBeNull();
    expect(getByText("Before we leave")).toBeTruthy();
    expect(getByText("Book taxi")).toBeTruthy();
  });

  test("image_gallery resolves hub image ids and reports opens", () => {
    const opened: string[][] = [];
    const { container } = render(
      <AnswerBlockView
        block={fixture("image_gallery")}
        resolveImageSrc={(src) => `data:image/gif;base64,R0lGODlhAQABAAAAACw=#${src}`}
        onImageOpen={(blockId, imageId) => opened.push([blockId, imageId])}
      />,
    );
    expect(container.querySelector('[data-slot="image-gallery"]')).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toEndWith("#hubimg-4f2a9c01");
    fireEvent.click(container.querySelector("button")!);
    expect(opened).toEqual([["blk-g8h9i0", "p1"]]);
  });

  test("image_gallery Edit reports the block and image id", () => {
    const edited: string[][] = [];
    const { getAllByRole } = render(
      <AnswerBlockView
        block={fixture("image_gallery")}
        resolveImageSrc={(src) => `data:image/gif;base64,R0lGODlhAQABAAAAACw=#${src}`}
        onImageEdit={(blockId, imageId) => edited.push([blockId, imageId])}
      />,
    );
    fireEvent.click(getAllByRole("button", { name: "Edit picture" })[0]!);
    expect(edited).toEqual([["blk-g8h9i0", "p1"]]);
  });

  test("schedule_card reports toggles with the block id", () => {
    const toggled: string[] = [];
    const { container } = render(
      <AnswerBlockView block={fixture("schedule_card")} onScheduleToggle={(id) => toggled.push(id)} />,
    );
    expect(container.querySelector('[data-slot="schedule-card"]')).not.toBeNull();
    fireEvent.click(container.querySelector("button")!);
    expect(toggled).toEqual(["blk-s2c3h4"]);
  });

  test("comparison", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("comparison")} />);
    expect(container.querySelector('[data-slot="comparison-card"]')).not.toBeNull();
    expect(getByText("Smaller home, mostly floors.")).toBeTruthy();
  });

  test("media_card renders a cover, facts and actions without route data", () => {
    const actions: string[] = [];
    const { container, getByText } = render(<AnswerBlockView block={fixture("media_card")} resolveImageSrc={(src) => `/api/answer-image/${src}`} onAction={(_id, action) => actions.push(action)} />);
    expect(container.querySelector('[data-slot="media-card"]')).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/answer-image/hubimg-4f2a9c01");
    expect(getByText("Jo Lee")).toBeTruthy();
    fireEvent.click(getByText("open app"));
    expect(actions).toEqual(["open_app"]);
  });

  test("band renders a portrait, members and the first single, and reports actions without route data", () => {
    const actions: string[] = [];
    const { container, getByText } = render(<AnswerBlockView block={fixture("band")} resolveImageSrc={(src) => `/api/answer-image/${src}`} onAction={(_id, action) => actions.push(action)} />);
    expect(container.querySelector('[data-slot="band"]')).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/answer-image/hubimg-4f2a9c01");
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(getByText("Lantern Hollow")).toBeTruthy();
    expect(getByText("Nova Reed")).toBeTruthy();
    expect(getByText("Salt on the Glass")).toBeTruthy();
    expect(getByText("Inspired by a song that was playing")).toBeTruthy();
    fireEvent.click(getByText("make album"));
    fireEvent.click(getByText("discard"));
    expect(actions).toEqual(["make_album", "discard"]);
  });

  test("band shows only what it was given and is read-only without a handler", () => {
    const block = { ...fixture("band"), props: { name: "Cedar Quill", actions: ["keep"] } };
    const { container, getByText } = render(<AnswerBlockView block={block} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector('[data-slot="band-single"]')).toBeNull();
    expect((getByText("keep") as HTMLButtonElement).disabled).toBe(true);
  });

  test("a band with a remote image url falls back to its alt sentence", () => {
    const bad = { ...fixture("band"), props: { ...fixture("band").props, portrait: { src: "https://example.com/x.png", alt: "x" } } };
    const { container } = render(<AnswerBlockView block={bad} />);
    expect(container.querySelector('[data-slot="band"]')).toBeNull();
    expect(container.textContent).toContain("Lantern Hollow");
  });

  test("confirmation reports its data action", () => {
    const actions: string[] = [];
    const { container, getByText } = render(<AnswerBlockView block={fixture("confirmation")} onAction={(_id, action) => actions.push(action)} />);
    expect(container.querySelector('[data-slot="confirmation"]')).not.toBeNull();
    fireEvent.click(getByText("Undo"));
    expect(actions).toEqual(["undo"]);
  });

  test("countdown reaches its own expired state without motion", () => {
    const { container, getByText } = render(<AnswerBlockView block={{ ...fixture("countdown"), props: { ...fixture("countdown").props, endsAt: "2000-01-01T00:00:00Z" } }} />);
    expect(container.querySelector('[data-slot="countdown"]')?.hasAttribute("data-expired")).toBe(true);
    expect(getByText("Time is up")).toBeTruthy();
  });
});

describe("AnswerBlockView weather_card", () => {
  test("weather_card renders the hero and one column per day", () => {
    const { container, getByText } = render(<AnswerBlockView block={fixture("weather_card")} />);
    expect(container.querySelector('[data-slot="weather-card"]')?.getAttribute("data-class")).toBe("partly-cloudy");
    expect(getByText("Springfield")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="weather-day"]')).toHaveLength(3);
  });
  describe("sunrise, sunset and wind_speed (WEATHER-SCENE-07 UI half)", () => {
    const base = fixture("weather_card") as { props: Record<string, unknown> };
    const withSun = (extra: Record<string, unknown>) => ({ ...base, props: { ...base.props, ...extra } });
    const sky = (block: unknown) => { const v = render(<AnswerBlockView block={block} />); const el = v.container.querySelector<HTMLElement>("[data-slot=weather-sky]")!; return { v, el }; };
    afterEach(() => setSystemTime());
    test("the phase follows the sunrise and sunset, not is_day", () => {
      const times = { sunrise: "2026-10-17T07:00", sunset: "2026-10-17T18:00" };
      setSystemTime(new Date("2026-10-17T12:00:00")); const noon = sky(withSun({ ...times, current: { ...(base.props.current as object), is_day: false } }));
      expect(noon.el.dataset.phase).toBe("day"); noon.v.unmount();
      setSystemTime(new Date("2026-10-17T03:00:00")); const night = sky(withSun({ ...times, current: { ...(base.props.current as object), is_day: true } }));
      expect(night.el.dataset.phase).toBe("night"); night.v.unmount();
    });
    test("a block without the times still renders from is_day", () => {
      const day = sky(withSun({ current: { ...(base.props.current as object), is_day: true } }));
      expect(day.el.dataset.phase).toBe("day"); day.v.unmount();
      const night = sky(withSun({ current: { ...(base.props.current as object), is_day: false } }));
      expect(night.el.dataset.phase).toBe("night"); night.v.unmount();
    });
    test("wind_speed reaches the sky as wind and never lands on the DOM", () => {
      const calm = sky(withSun({ wind_speed: 0 })); const calmDuration = calm.el.querySelector<HTMLElement>('[data-fx="cloud"]')!.style.getPropertyValue("--d"); calm.v.unmount();
      const windy = sky(withSun({ wind_speed: 30 })); const windyDuration = windy.el.querySelector<HTMLElement>('[data-fx="cloud"]')!.style.getPropertyValue("--d");
      expect(parseFloat(windyDuration)).toBeLessThan(parseFloat(calmDuration));
      expect(windy.v.container.querySelector("[wind_speed], [wind-speed]")).toBeNull();
    });
  });
});

describe("AnswerBlockView fallback", () => {
  test("an unknown kind renders alt, not an Element", () => {
    const block = { ...fixture("spec_sheet"), kind: "hologram", alt: "A hologram." };
    const { container, getByText } = render(<AnswerBlockView block={block} />);
    expect(getByText("A hologram.")).toBeTruthy();
    expect(container.querySelector("[data-fallback]")).not.toBeNull();
    expect(container.querySelector('[data-slot="spec-sheet"]')).toBeNull();
  });

  test("invalid props render alt", () => {
    const block = { ...fixture("chart"), alt: "Use was steady.", props: { label: "x" } };
    const { container, getByText } = render(<AnswerBlockView block={block} />);
    expect(getByText("Use was steady.")).toBeTruthy();
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  test("never throws on junk, and shows nothing when there is no alt", () => {
    for (const junk of [null, undefined, 7, "x", [], {}, { kind: "chart", props: null }]) {
      const { container } = render(<AnswerBlockView block={junk} />);
      expect(container.textContent).toBe("");
      cleanup();
    }
  });

  test("a block that throws while read falls back to alt", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      // A hostile getter: validation itself throws, and that must still fall back.
      const block = {
        ...fixture("spec_sheet"),
        alt: "Specs.",
        get props(): never {
          throw new Error("boom");
        },
      };
      const { getByText } = render(<AnswerBlockView block={block} />);
      expect(getByText("Specs.")).toBeTruthy();
    } finally {
      console.error = originalError;
    }
  });
});

// GENUI-13b: the dispatcher ignores placement. An envelope field (`after_paragraph` included) is never forwarded to an
// Element as a prop and never reaches the DOM; where a block sits in a reply is message-part order, not the kit's job.
describe("AnswerBlockView ignores placement (GENUI-13b)", () => {
  // React's generated ids differ between two renders; the comparison is on everything else.
  const html = (node: React.ReactElement): string => {
    const { container } = render(node);
    const out = container.innerHTML.replace(/[«:]r[0-9a-z]+[»:]/g, "ID");
    cleanup();
    return out;
  };

  for (const kind of Object.keys(ANSWER_BLOCK_FIXTURES) as Array<keyof typeof ANSWER_BLOCK_FIXTURES>) {
    test(`${kind}: the same markup with or without after_paragraph, whatever its value`, () => {
      const plain = html(<AnswerBlockView block={fixture(kind)} />);
      for (const n of [0, 1, 9]) {
        expect(html(<AnswerBlockView block={{ ...fixture(kind), after_paragraph: n }} />)).toBe(plain);
      }
    });
  }

  test("no envelope field becomes an attribute of the block", () => {
    const { container } = render(<AnswerBlockView block={{ ...fixture("spec_sheet"), after_paragraph: 3 }} />);
    const root = container.querySelector('[data-slot="answer-block"]');
    expect(root).not.toBeNull();
    const names = Array.from(container.querySelectorAll("*")).flatMap((el) => el.getAttributeNames());
    expect(names.filter((name) => /paragraph|producer|provenance|min.?band|hlc/i.test(name))).toEqual([]);
    expect(
      Array.from(root!.attributes)
        .map((a) => a.name)
        .sort(),
    ).toEqual(["data-kind", "data-slot"]);
  });

  test("a block with after_paragraph still validates and renders its Element (the field is part of the record)", () => {
    const { container } = render(<AnswerBlockView block={afterParagraph} />);
    expect(container.querySelector('[data-slot="spec-sheet"]')).not.toBeNull();
    expect(container.querySelector("[data-fallback]")).toBeNull();
  });
});

describe("the inline story: a block between two paragraphs", () => {
  test("renders text, the block, then text, in that order", () => {
    const { container } = render(<AnswerBlockInlineShowcase />);
    const story = container.querySelector('[data-story="inline-block"]')!;
    const kids = Array.from(story.children);
    expect(kids.map((el) => (el.matches("p") ? "text" : el.getAttribute("data-slot")))).toEqual([
      "text",
      "answer-block",
      "text",
    ]);
    expect(kids[0]!.textContent).toContain("how the two phones compare");
    expect(kids[0]!.textContent).toContain("details are in the sheet");
    expect(kids[2]!.textContent).toContain("Both are on sale");
    // The text on either side is the reply, cut at the block's own `after_paragraph` and nowhere else.
    expect(afterParagraph.after_paragraph).toBe(2);
    expect(kids[0]!.textContent + "\n\n" + kids[2]!.textContent).toBe(INLINE_REPLY);
  });
});

describe("AnswerBlockView compact", () => {
  test("compact reaches the weather card and leaves the day strip out", () => {
    const { container } = render(<AnswerBlockView block={fixture("weather_card")} compact />);
    expect(container.querySelector('[data-slot="weather-card"]')?.getAttribute("data-variant")).toBe("compact");
    expect(container.querySelectorAll('[data-slot="weather-day"]')).toHaveLength(0);
  });
});


describe("AnswerBlockView wide", () => {
  test("wide reaches the weather card, which draws hourly", () => {
    const block = fixture("weather_card") as { props: Record<string, unknown> };
    const withHours = { ...block, props: { ...block.props, hourly: [{ time: "2026-10-17T21:00", temp: 41, pop: 60 }] } };
    const { container } = render(<AnswerBlockView block={withHours} wide />);
    expect(container.querySelector('[data-slot="weather-card"]')?.getAttribute("data-variant")).toBe("wide");
    expect(container.querySelectorAll('[data-slot="weather-hour"]')).toHaveLength(1);
    cleanup();
    const plain = render(<AnswerBlockView block={withHours} />);
    expect(plain.container.querySelector('[data-slot="weather-card"]')?.getAttribute("data-variant")).toBe("full");
  });
});

describe("AnswerBlockView story_feed and article (NEWS-01)", () => {
  test("story_feed draws the story feed primitive; article draws the article view", () => {
    const feed = render(<AnswerBlockView block={fixture("story_feed")} />);
    expect(feed.container.querySelector('[data-slot="story-feed"]')).not.toBeNull();
    expect(feed.getByText("Headline 1")).toBeTruthy();
    cleanup();
    const article = render(<AnswerBlockView block={fixture("article")} />);
    expect(article.container.querySelector('[data-slot="article-view"]')).not.toBeNull();
    expect(article.container.querySelector("h2#h1")?.textContent).toBe("What happened");
  });

  test("with no news handler the blocks are read-only; with one, a story's open fires with its ids", () => {
    const readOnly = render(<AnswerBlockView block={fixture("story_feed")} />);
    expect(readOnly.queryAllByLabelText(/More for/)).toHaveLength(0);
    cleanup();
    const fired: Array<[string, Record<string, unknown>]> = [];
    const { getByText } = render(
      <AnswerBlockView block={fixture("story_feed")} news={{ available: ["open"], onAction: (a, ids) => fired.push([a, ids]) }} />,
    );
    fireEvent.click(getByText("Headline 1"));
    expect(fired).toEqual([["open", { story_id: "story-1a1b2c", item_id: "news-1d4e5f" }]]);
  });

  test("a story_feed with five featured stories or an unknown layout falls back to its alt sentence", () => {
    const block = fixture("story_feed") as unknown as { props: Record<string, unknown>; alt: string };
    const five = { ...block, props: { ...block.props, featured: Array.from({ length: 5 }, () => (block.props.hero as object)) } };
    const { getByText, container } = render(<AnswerBlockView block={five} />);
    expect(getByText(block.alt)).toBeTruthy();
    expect(container.querySelector('[data-slot="story-feed"]')).toBeNull();
    cleanup();
    const layout = render(<AnswerBlockView block={{ ...block, props: { ...block.props, layout: "grid" } }} />);
    expect(layout.getByText(block.alt)).toBeTruthy();
  });
});

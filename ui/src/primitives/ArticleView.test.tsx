import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import articleBlock from "@maipai/spec/fixtures/answer-block/valid-article.json";
import { ArticleView, type ArticleViewData } from "@/kit/primitives/ArticleView";

afterEach(cleanup);

const data = articleBlock.props as unknown as ArticleViewData;
const childCopy = (): ArticleViewData => ({
  ...data,
  open_url: undefined,
  blocks: data.blocks.map((block) =>
    block.type === "paragraph" ? { ...block, inlines: block.inlines.map((i) => (i.type === "link" ? { type: "link" as const, text: i.text } : i)) } : block,
  ),
});

describe("ArticleView", () => {
  test("draws the kicker, headline, byline, picture, Key points and every block type in the fixture", () => {
    const { container, getByText } = render(<ArticleView data={data} />);
    expect(getByText("World")).toBeTruthy();
    expect(getByText("Headline 1")).toBeTruthy();
    expect(container.querySelector("header")?.textContent).toContain("Example Wire");
    expect(container.querySelector('[data-slot="article-provider"]')?.textContent).toBe("Example Wire");
    expect(container.querySelector("article")?.className).toContain("mx-auto");
    expect(container.querySelector("header")?.textContent).toContain("3 sources");
    expect(container.querySelector('[data-slot="key-points"]')?.textContent).toContain("Three things happened.");
    expect(container.querySelector("h2#h1")?.textContent).toBe("What happened");
    expect(container.querySelector("blockquote")?.textContent).toContain("A short quote.");
    expect(container.querySelector("figure img")?.getAttribute("src")).toContain("/api/plugins/news/images/");
    expect(container.querySelector('[data-slot="also-covering"]')).not.toBeNull();
  });

  test("the lead picture's frame carries its own ratio and a height cap, and the pinned picture covers it", () => {
    const { container } = render(<ArticleView data={data} />);
    const frame = container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
    expect(Number(frame.style.getPropertyValue("--ratio"))).toBeCloseTo(16 / 9, 5);
    expect(frame.style.maxHeight).toContain("--article-lead-max-h");
    expect(frame.querySelector("img")!.className).toContain("absolute");
  });

  test("a teen or adult copy keeps its outbound link, opened in a new tab without the referrer", () => {
    const { getByText } = render(<ArticleView data={data} />);
    const link = getByText("a source") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://example.com/source");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("a child's copy renders every link as plain text and offers no Open on site", () => {
    const { container, getByText } = render(<ArticleView data={childCopy()} available={["open_site", "listen"]} onAction={() => {}} />);
    expect(container.querySelector("a[href]")).toBeNull();
    expect(getByText("a source").tagName).toBe("SPAN");
    expect(container.textContent).not.toContain("Open on");
  });

  test("a book link draws through renderTargetLink, and as plain text without it (Reference)", () => {
    const withTarget: ArticleViewData = { ...data, blocks: [{ type: "paragraph", inlines: [{ type: "link", text: "Other page", target: { book: "wiki", path: "Other" } }] }] };
    const drawn = render(<ArticleView data={withTarget} renderTargetLink={(t, text) => <a href={`/reference/${t.book}/${t.path}`}>{text}</a>} />);
    expect(drawn.getByText("Other page").getAttribute("href")).toBe("/reference/wiki/Other");
    cleanup();
    const plain = render(<ArticleView data={withTarget} />);
    expect(plain.getByText("Other page").tagName).toBe("SPAN");
  });

  test("the action row shows only the declared actions and fires them with the story's ids", () => {
    const onAction = mock(() => {});
    const none = render(<ArticleView data={data} onAction={onAction} />);
    expect(none.queryByText("Listen")).toBeNull();
    cleanup();
    const { getByText } = render(<ArticleView data={data} onAction={onAction} available={["listen", "save"]} ids={{ story_id: "story-1", item_id: "news-1" }} />);
    fireEvent.click(getByText("Listen"));
    fireEvent.click(getByText("Save"));
    expect(onAction).toHaveBeenCalledWith("listen", { story_id: "story-1", item_id: "news-1" });
    expect(onAction).toHaveBeenCalledWith("save", { story_id: "story-1", item_id: "news-1", on: true });
  });

  test("Key points is offered only while there are none; the footer slot and the description draw (Reference)", () => {
    const noPoints: ArticleViewData = { ...data, key_points: undefined, description: "From a book", saved: false };
    const { getByText, queryByText } = render(<ArticleView data={noPoints} onAction={() => {}} available={["summarize"]} footer={<span>Licence · Snapshot today</span>} />);
    expect(getByText("Key points")).toBeTruthy();
    expect(getByText("From a book")).toBeTruthy();
    expect(getByText("Licence · Snapshot today")).toBeTruthy();
    cleanup();
    const has = render(<ArticleView data={data} onAction={() => {}} available={["summarize"]} />);
    expect(has.queryAllByText("Key points").length).toBe(1);
    expect(queryByText("zzz")).toBeNull();
  });

  test("the heading ids the table of contents scrolls to are on the headings", () => {
    const { container } = render(<ArticleView data={{ ...data, blocks: [{ type: "heading", level: 3, id: "sec-two", text: "Two" }] }} />);
    expect(container.querySelector("h3#sec-two")?.className).toContain("scroll-mt-6");
  });
});

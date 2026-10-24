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
    const article = container.querySelector('[data-slot="article-view"]')!;
    const column = container.querySelector('[data-slot="article-column"]')!;
    const toolbar = container.querySelector('[data-slot="article-toolbar"]')!;
    const provider = container.querySelector('[data-slot="article-provider"]')!;
    const stickyHeader = container.querySelector('[data-slot="article-sticky-header"]')!;
    expect(article.contains(toolbar)).toBe(true);
    expect(article.contains(provider)).toBe(true);
    expect(stickyHeader.contains(toolbar)).toBe(true);
    expect(stickyHeader.contains(provider)).toBe(true);
    expect(column.contains(toolbar)).toBe(false);
    expect(column.contains(provider)).toBe(false);
    expect(column.className).toContain("max-w-[72ch]");
    expect(column.className).toContain("mx-auto");
    expect(container.querySelector('[data-slot="article-body"]')!.className).not.toContain("max-w-[72ch]");
    expect(container.querySelector('[data-slot="article-body"]')!.className).not.toContain("mx-auto");
    expect(article.className).not.toContain("max-w-prose");
    expect(stickyHeader.className).toContain("sticky");
    expect(provider.className).not.toContain("sticky");
    expect(column.contains(container.querySelector("header"))).toBe(true);
    expect(column.contains(container.querySelector('[data-slot="article-body"]'))).toBe(true);
    expect(container.querySelector("header")?.textContent).toContain("3 sources");
    expect(container.querySelector('[data-slot="key-points"]')?.textContent).toContain("Three things happened.");
    expect(container.querySelector("h2#h1")?.textContent).toBe("What happened");
    expect(container.querySelector("blockquote")?.textContent).toContain("A short quote.");
    expect(container.querySelector("figure img")?.getAttribute("src")).toContain("/api/plugins/news/images/");
    expect(container.querySelector('[data-slot="also-covering"]')).not.toBeNull();
  });

  test("controls and full-width shaded publisher header stay in a pinned stack", () => {
    const withIcon = { ...data, sourceIconUrl: "/api/favicon?domain=example.com" };
    const view = render(<ArticleView data={withIcon} onBack={() => {}} />);
    const provider = view.container.querySelector('[data-slot="article-provider"]')!;
    expect(provider.className).toContain("bg-muted");
    expect(provider.className).toContain("min-h-16");
    expect(provider.querySelector('[data-slot="safe-image-fallback"]')).not.toBeNull();
    const toolbar = view.container.querySelector('[data-slot="article-toolbar"]')!;
    const stickyHeader = view.container.querySelector('[data-slot="article-sticky-header"]')!;
    expect(stickyHeader.className).toContain("sticky");
    expect(stickyHeader.className).toContain("top-0");
    expect(stickyHeader.className).toContain("z-30");
    expect(stickyHeader.className).not.toContain("mx-");
    expect(toolbar.className).toContain("h-14");
    expect(toolbar.className).toContain("bg-background");
    expect(toolbar.className).toContain("px-3");
    expect(provider.className).not.toMatch(/md:px|lg:px/);
    expect(view.container.querySelector('[data-slot="article-view"]')!.className).not.toContain("px-4");
    expect(view.container.querySelector('[data-slot="article-column"]')!.className).toContain("px-4");
    expect(toolbar.querySelectorAll("button").length).toBeGreaterThan(0);
    for (const button of toolbar.querySelectorAll("button")) {
      expect(button.className).not.toMatch(/backdrop-blur|shadow/);
    }
    cleanup();
    const loaded = render(<ArticleView data={{ ...withIcon, sourceIconUrl: "https://example.com/favicon.ico" }} onBack={() => {}} />);
    const loadedProvider = loaded.container.querySelector('[data-slot="article-provider"]')!;
    fireEvent.error(loadedProvider.querySelector("img")!);
    expect(loadedProvider.querySelector('[data-slot="safe-image-fallback"] svg')).not.toBeNull();
    cleanup();
    const missing = render(<ArticleView data={data} />);
    expect(missing.container.querySelector('[data-slot="article-provider"] [data-slot="safe-image-fallback"] svg')).not.toBeNull();
  });

  test("the lead picture is centered in the article column; its frame carries a ratio and height cap", () => {
    const { container } = render(<ArticleView data={data} />);
    const frame = container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
    expect(frame.className).toContain("mx-auto");
    expect(frame.className).toContain("w-full");
    expect(frame.className).toContain("max-w-[1100px]");
    expect(frame.className).toContain("mx-auto");
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

  test("a child's copy renders every link as plain text and offers no Open original", () => {
    const { container, getByText } = render(<ArticleView data={childCopy()} available={["open_site", "listen"]} onAction={() => {}} />);
    expect(container.querySelector("a[href]")).toBeNull();
    expect(getByText("a source").tagName).toBe("SPAN");
    expect(container.textContent).not.toContain("Open original");
  });

  test("a book link draws through renderTargetLink, and as plain text without it (Reference)", () => {
    const withTarget: ArticleViewData = { ...data, blocks: [{ type: "paragraph", inlines: [{ type: "link", text: "Other page", target: { book: "wiki", path: "Other" } }] }] };
    const drawn = render(<ArticleView data={withTarget} renderTargetLink={(t, text) => <a href={`/reference/${t.book}/${t.path}`}>{text}</a>} />);
    expect(drawn.getByText("Other page").getAttribute("href")).toBe("/reference/wiki/Other");
    cleanup();
    const plain = render(<ArticleView data={withTarget} />);
    expect(plain.getByText("Other page").tagName).toBe("SPAN");
  });

  test("the toolbar shows only the declared actions: Save fires from the bookmark, Listen and Key points sit under More", () => {
    const onAction = mock(() => {});
    const none = render(<ArticleView data={data} onAction={onAction} />);
    expect(none.queryByLabelText("Save")).toBeNull();
    expect(none.queryByLabelText("More")).toBeNull();
    cleanup();
    const view = render(<ArticleView data={{ ...data, key_points: undefined }} onAction={onAction} available={["listen", "save", "summarize"]} ids={{ story_id: "story-1", item_id: "news-1" }} />);
    fireEvent.click(view.getByLabelText("Save"));
    expect(onAction).toHaveBeenCalledWith("save", { story_id: "story-1", item_id: "news-1", on: true });
    expect(view.getByLabelText("More")).toBeTruthy();
    expect(view.container.querySelector('[data-slot="article-toolbar"]')).not.toBeNull();
  });

  test("Back is drawn only when the page gave a way back, and calls it; the text size menu is always there", () => {
    const withoutBack = render(<ArticleView data={data} />);
    expect(withoutBack.queryByLabelText("Back")).toBeNull();
    expect(withoutBack.getByLabelText("Text size")).toBeTruthy();
    cleanup();
    const onBack = mock(() => {});
    const withBack = render(<ArticleView data={data} onBack={onBack} />);
    fireEvent.click(withBack.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("the text size button steps Default, Larger, Smaller and the body follows", () => {
    const { container, getByLabelText } = render(<ArticleView data={data} />);
    const size = () => container.querySelector('[data-slot="article-body"]')!.getAttribute("data-text-size");
    expect(size()).toBe("medium");
    fireEvent.click(getByLabelText("Text size"));
    expect(size()).toBe("large");
    fireEvent.click(getByLabelText("Text size"));
    expect(size()).toBe("small");
    fireEvent.click(getByLabelText("Text size"));
    expect(size()).toBe("medium");
  });

  test("the body reads in a serif at the default size and keeps a readable measure inside the wide article frame", () => {
    const { container } = render(<ArticleView data={data} />);
    const body = container.querySelector('[data-slot="article-body"]')!;
    expect(body.className).toContain("font-serif");
    expect(body.getAttribute("data-text-size")).toBe("medium");
    expect(container.querySelector('[data-slot="article-column"]')!.className).toContain("max-w-[72ch]");
    expect(body.className).not.toContain("max-w-[72ch]");
  });

  test("the description and the footer slot draw (Reference), and a saved story shows the filled bookmark", () => {
    const noPoints: ArticleViewData = { ...data, key_points: undefined, description: "From a book", saved: true };
    const { container, getByText, getByLabelText } = render(<ArticleView data={noPoints} onAction={() => {}} available={["save"]} footer={<span>Licence · Snapshot today</span>} />);
    expect(getByText("From a book")).toBeTruthy();
    expect(getByText("Licence · Snapshot today")).toBeTruthy();
    expect(container.querySelector('[data-slot="article-column"]')!.contains(getByText("Licence · Snapshot today"))).toBe(true);
    expect(getByLabelText("Saved").getAttribute("aria-pressed")).toBe("true");
  });

  test("the heading ids the table of contents scrolls to are on the headings", () => {
    const { container } = render(<ArticleView data={{ ...data, blocks: [{ type: "heading", level: 3, id: "sec-two", text: "Two" }] }} />);
    expect(container.querySelector("h3#sec-two")?.className).toContain("scroll-mt-6");
  });
});

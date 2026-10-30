import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import articleBlock from "@maipai/spec/fixtures/answer-block/valid-article.json";
import { ArticleSpeechContext, ArticleView, type ArticleViewData } from "@/kit/primitives/ArticleView";

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
    expect(stickyHeader.contains(provider)).toBe(false);
    expect(column.contains(toolbar)).toBe(false);
    expect(column.contains(provider)).toBe(false);
    expect(article.contains(provider)).toBe(true);
    expect(column.className).toContain("max-w-[72ch]");
    expect(column.className).toContain("mx-auto");
    expect(container.querySelector('[data-slot="article-body"]')!.className).not.toContain("max-w-[72ch]");
    expect(container.querySelector('[data-slot="article-body"]')!.className).not.toContain("mx-auto");
    expect(article.className).not.toContain("max-w-prose");
    expect(stickyHeader.className).toContain("sticky");
    expect(provider.className).toContain("sticky");
    expect(column.contains(container.querySelector("header"))).toBe(true);
    expect(column.contains(container.querySelector('[data-slot="article-body"]'))).toBe(true);
    expect(container.querySelector("header")?.textContent).toContain("3 sources");
    expect(container.querySelector('[data-slot="key-points"]')?.textContent).toContain("Three things happened.");
    expect(container.querySelector("h2#h1")?.textContent).toBe("What happened");
    expect(container.querySelector("blockquote")?.textContent).toContain("A short quote.");
    expect(container.querySelector("figure img")?.getAttribute("src")).toContain("/api/plugins/news/images/");
    expect(container.querySelector('[data-slot="also-covering"]')).not.toBeNull();
  });

  test("exposes phone reader slots and hides sharing and Open original without an outlet URL", () => {
    const { container, queryByLabelText, queryByText } = render(<ArticleView data={childCopy()} available={["open_site", "save", "listen"]} onAction={() => {}} />);
    expect(container.querySelector('[data-slot="article-actions"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="article-title"]')?.textContent).toBe(data.title);
    expect(container.querySelector('[data-slot="article-dek"]')?.textContent).toBe(data.description);
    expect(queryByLabelText("Share")).toBeNull();
    expect(queryByText("Open original")).toBeNull();
  });

  test("controls stay pinned flush at the top, overlaying the start of the article, whose publisher row pins under them", () => {
    const withIcon = { ...data, sourceIconUrl: "/api/favicon?domain=example.com" };
    const view = render(<ArticleView data={withIcon} onBack={() => {}} />);
    const provider = view.container.querySelector('[data-slot="article-provider"]')!;
    expect(provider.className).toContain("h-14")
    expect(provider.className).toContain("bg-muted");
    expect(provider.querySelector('[data-slot="safe-image-fallback"]')).not.toBeNull();
    const toolbar = view.container.querySelector('[data-slot="article-toolbar"]')!;
    const stickyHeader = view.container.querySelector('[data-slot="article-sticky-header"]')!;
    expect(stickyHeader.className).toContain("sticky");
    expect(stickyHeader.className).toContain("top-0");
    expect(stickyHeader.className).toContain("z-30");
    expect(stickyHeader.className).toContain("-mb-14");
    expect(stickyHeader.className).not.toContain("mx-");
    expect(toolbar.className).toContain("h-14");
    expect(toolbar.className).toContain("bg-transparent");
    expect(toolbar.className).toContain("px-0");
    expect(provider.className).toContain("w-full");
    expect(provider.className).toContain("px-4");
    expect(provider.className).not.toMatch(/-mx-|pt-14/);
    expect(view.container.querySelector('[data-slot="article-view"]')!.className).not.toContain("px-4");
    expect(view.container.querySelector('[data-slot="article-column"]')!.className).toContain("px-4");
    expect(view.container.querySelector('[data-slot="article-column"]')!.className).not.toContain("-mt-14");
    expect(view.container.querySelector('[data-slot="article-column"]')!.className).toContain("pt-6");
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

  test("the toolbar shows only the declared actions: Save fires from the bookmark, Listen and Discuss are buttons under the headline, and Key points ask for themselves", () => {
    const onAction = mock(() => {});
    const none = render(<ArticleView data={data} onAction={onAction} />);
    expect(none.queryByLabelText("Save")).toBeNull();
    expect(none.queryByLabelText("More")).toBeNull();
    cleanup();
    const view = render(<ArticleView data={{ ...data, key_points: undefined }} onAction={onAction} available={["listen", "save", "summarize"]} ids={{ story_id: "story-1", item_id: "news-1" }} />);
    fireEvent.click(view.getByLabelText("Save"));
    expect(onAction).toHaveBeenCalledWith("save", { story_id: "story-1", item_id: "news-1", on: true });
    expect(view.container.querySelector('[data-slot="article-toolbar"]')).not.toBeNull();
    expect(view.queryByLabelText("More")).toBeNull();
    fireEvent.click(view.getByText("Listen"));
    expect(onAction).toHaveBeenCalledWith("listen", { story_id: "story-1", item_id: "news-1" });
    expect(view.queryByRole("button", { name: "Key points" })).toBeNull();
    expect(onAction).toHaveBeenCalledWith("summarize", { story_id: "story-1", item_id: "news-1" });
    expect(view.getByText("Writing the key points…")).not.toBeNull();
    expect(view.queryByText("Discuss")).toBeNull();
    cleanup();
    const discuss = render(<ArticleView data={data} onAction={onAction} available={["discuss", "open_site"]} ids={{ story_id: "story-1" }} />);
    fireEvent.click(discuss.getByText("Discuss"));
    expect(onAction).toHaveBeenCalledWith("discuss", { story_id: "story-1" });
    expect(discuss.queryByText("Listen")).toBeNull();
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

  test("Listen, Key points and Discuss live in a sticky right rail that ends with the article, and the hub note is gone", () => {
    const { container } = render(<ArticleView data={data} onAction={() => {}} available={["listen", "discuss"]} />);
    const rail = container.querySelector('[data-slot="article-rail"]')!;
    expect(rail.className).toContain("lg:sticky");
    expect(rail.contains(container.querySelector('[data-slot="article-assist"]'))).toBe(true);
    expect(rail.contains(container.querySelector('[data-slot="key-points"]'))).toBe(true);
    expect(container.querySelector('[data-slot="article-column"]')!.contains(rail)).toBe(true);
    expect(container.textContent).not.toContain("Written on this hub");
  });

  test("a story with no key points asks for them once on open; one that has them asks for nothing", () => {
    const onAction = mock(() => {});
    const view = render(<ArticleView data={{ ...data, key_points: undefined }} onAction={onAction} available={["summarize"]} ids={{ item_id: "news-1" }} />);
    view.rerender(<ArticleView data={{ ...data, key_points: undefined }} onAction={onAction} available={["summarize"]} ids={{ item_id: "news-1" }} />);
    expect(onAction).toHaveBeenCalledTimes(1);
    cleanup();
    const done = mock(() => {});
    render(<ArticleView data={data} onAction={done} available={["summarize"]} />);
    expect(done).not.toHaveBeenCalled();
  });

  test("the pinned source row swaps the publisher for the story title once the headline scrolls under it", async () => {
    const { container } = render(<ArticleView data={data} />);
    const provider = container.querySelector('[data-slot="article-provider"]')!;
    const title = container.querySelector('[data-slot="article-title"]')!;
    const place = (el: Element, bottom: number) => { (el as HTMLElement).getBoundingClientRect = () => ({ bottom, top: bottom - 40 } as DOMRect); };
    const { act } = await import("@testing-library/react");
    expect(provider.textContent).toBe("Example Wire");
    place(provider, 120);
    place(title, 90);
    act(() => { document.dispatchEvent(new Event("scroll")); });
    expect(provider.getAttribute("data-condensed")).toBe("true");
    expect(provider.textContent).toBe(data.title);
    place(title, 300);
    act(() => { document.dispatchEvent(new Event("scroll")); });
    expect(provider.textContent).toBe("Example Wire");
  });

  test("Key points read as a lead and a short list, and the rest wait behind Show all", () => {
    const text = "Lead line of the story.\n• One\n• Two\n• Three\n• Four\n• Five";
    const { container, getByRole, queryByRole } = render(<ArticleView data={{ ...data, key_points: { text, band: "adult" } }} />);
    const section = container.querySelector('[data-slot="key-points"]')!;
    expect(section.querySelectorAll("li")).toHaveLength(3);
    expect(section.textContent).toContain("Lead line of the story.");
    fireEvent.click(getByRole("button", { name: "Show all 5" }));
    expect(section.querySelectorAll("li")).toHaveLength(5);
    expect(queryByRole("button", { name: "Show fewer" })).toBeTruthy();
  });

  test("Save answers at once: the icon fills and the button reads Saved before the page answers", () => {
    const onAction = mock(() => {});
    const { getByRole } = render(<ArticleView data={{ ...data, saved: false }} onAction={onAction} available={["save"]} ids={{ item_id: "i1", story_id: "s1" }} />);
    fireEvent.click(getByRole("button", { name: "Save" }));
    const saved = getByRole("button", { name: "Saved" });
    expect(saved.getAttribute("aria-pressed")).toBe("true");
    expect(saved.querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
    expect(onAction).toHaveBeenCalledWith("save", expect.objectContaining({ on: true }));
  });

  test("Listen says it is starting, then listening, for the story being read", () => {
    const ids = { item_id: "i1", story_id: "s1" };
    const view = (phase: "loading" | "playing" | null, storyId: string | null = "s1") => (
      <ArticleSpeechContext.Provider value={{ storyId, phase, progress: 0 }}>
        <ArticleView data={data} onAction={() => {}} available={["listen"]} ids={ids} />
      </ArticleSpeechContext.Provider>
    );
    const { getByRole, rerender } = render(view(null));
    expect(getByRole("button", { name: "Listen" })).toBeTruthy();
    rerender(view("loading"));
    expect(getByRole("button", { name: "Starting…" }).getAttribute("aria-busy")).toBe("true");
    rerender(view("playing"));
    expect(getByRole("button", { name: "Listening" })).toBeTruthy();
    rerender(view("playing", "another-story"));
    expect(getByRole("button", { name: "Listen" })).toBeTruthy();
  });

  test("the right column sits at the far right: the article column is no longer centred at a fixed width", () => {
    const { container } = render(<ArticleView data={data} onAction={() => {}} available={["listen"]} />);
    const column = container.querySelector('[data-slot="article-column"]')!;
    expect(column.className).toContain("lg:max-w-none");
  });
});

// READER-00: the reader a Kiwix book needs (infobox, hatnote, contents with the section being read, folding sections on a
// phone, and a link preview through the kit hover-card).
describe("ArticleView reader parts", () => {
  const reader = (extra: Partial<ArticleViewData> = {}): ArticleViewData => ({
    title: "Aspen",
    description: "Wikipedia (English)",
    hatnote: "For other uses, see Aspen (disambiguation).",
    infobox: { title: "Aspen", rows: [{ label: "Kingdom", value: "Plantae" }, { label: "Family", value: "Salicaceae" }] },
    contents: [{ id: "Overview", title: "Overview", level: 2 }, { id: "Uses", title: "Uses", level: 2 }],
    blocks: [
      { type: "paragraph", inlines: [{ type: "text", text: "Aspens are trees." }] },
      { type: "heading", level: 2, id: "Overview", text: "Overview" },
      { type: "paragraph", inlines: [{ type: "link", text: "Populus", target: { book: "wiki", path: "Populus" } }] },
      { type: "heading", level: 2, id: "Uses", text: "Uses" },
      { type: "paragraph", inlines: [{ type: "text", text: "Pulp and board." }] },
    ],
    ...extra,
  });
  const phone = (matches: boolean) => { window.matchMedia = ((query: string) => ({ matches: matches && query.includes("max-width"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia; };

  test("draws the hatnote under the headline and the infobox in the rail with its title and rows", () => {
    const { container } = render(<ArticleView data={reader()} />);
    expect(container.querySelector('[data-slot="article-hatnote"]')?.textContent).toBe("For other uses, see Aspen (disambiguation).");
    const rail = container.querySelector('[data-slot="article-rail"]')!;
    const box = rail.querySelector('[data-slot="article-infobox"]')!;
    expect(box.textContent).toContain("Aspen");
    expect(box.querySelector("th[scope=row]")?.textContent).toBe("Kingdom");
    expect(box.textContent).toContain("Salicaceae");
  });

  test("an article without the new fields draws none of them", () => {
    const { container } = render(<ArticleView data={data} />);
    for (const slot of ["article-hatnote", "article-infobox", "article-contents"]) expect(container.querySelector(`[data-slot="${slot}"]`)).toBeNull();
  });

  test("contents link to each heading id and mark the section being read", () => {
    const { container } = render(<ArticleView data={reader()} />);
    const nav = container.querySelector('[data-slot="article-contents"]')!;
    const links = Array.from(nav.querySelectorAll("a")) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#Overview", "#Uses"]);
    const tops: Record<string, number> = { Overview: -300, Uses: 40 };
    for (const [id, top] of Object.entries(tops)) container.querySelector(`#${id}`)!.getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 0, width: 0, height: 20, x: 0, y: top, toJSON() {} });
    fireEvent.scroll(document);
    expect(links[1]!.getAttribute("aria-current")).toBe("true");
    expect(links[0]!.getAttribute("aria-current")).toBeNull();
  });

  test("foldSections folds every section on a phone except the lead, and a tap opens one", () => {
    phone(true);
    const { container, getByText } = render(<ArticleView data={reader({ foldSections: true })} />);
    expect(getByText("Aspens are trees.")).toBeTruthy();
    expect(container.querySelector('[data-slot="article-section"][data-state="closed"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="article-section"]').length).toBe(2);
    fireEvent.click(container.querySelector('#Overview button')!);
    expect(container.querySelector('[data-slot="article-section"][data-state="open"]')).not.toBeNull();
  });

  test("foldSections folds nothing on a wide screen", () => {
    phone(false);
    const { container } = render(<ArticleView data={reader({ foldSections: true })} />);
    expect(container.querySelectorAll('[data-slot="article-section"]').length).toBe(0);
    expect(container.querySelector("#Overview")).not.toBeNull();
  });

  test("a book link gets a preview trigger only when loadPreview is given, and nothing loads before it opens", () => {
    const loadPreview = mock(async () => ({ title: "Populus", summary: "Populus is a genus of trees." }));
    const renderTargetLink = (_t: { book: string; path: string }, text: string) => <a href="#x">{text}</a>;
    const plain = render(<ArticleView data={reader()} renderTargetLink={renderTargetLink} />);
    expect(plain.container.querySelector('[data-slot="hover-card-trigger"]')).toBeNull();
    plain.unmount();
    const { container } = render(<ArticleView data={reader()} renderTargetLink={renderTargetLink} loadPreview={loadPreview} />);
    expect(container.querySelector('[data-slot="hover-card-trigger"]')).not.toBeNull();
    expect(loadPreview).not.toHaveBeenCalled();
  });

  test("hovering a book link opens a card that loads the summary once", async () => {
    const loadPreview = mock(async () => ({ title: "Populus", summary: "Populus is a genus of trees." }));
    const renderTargetLink = (_t: { book: string; path: string }, text: string) => <a href="#x">{text}</a>;
    const { container, findByText } = render(<ArticleView data={reader()} renderTargetLink={renderTargetLink} loadPreview={loadPreview} />);
    const trigger = container.querySelector('[data-slot="hover-card-trigger"]')!;
    fireEvent.pointerEnter(trigger); fireEvent.mouseEnter(trigger); fireEvent.focus(trigger.querySelector("a")!);
    expect(await findByText("Populus is a genus of trees.", {}, { timeout: 2000 })).toBeTruthy();
    expect(loadPreview).toHaveBeenCalledTimes(1);
    expect(loadPreview).toHaveBeenCalledWith({ book: "wiki", path: "Populus" });
  });
});

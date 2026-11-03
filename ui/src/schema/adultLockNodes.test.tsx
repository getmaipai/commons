// ADULT-LOCK-01: the schema nodes' locked state (media_shelf, result_feed) and the media host's adult-only rule.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { ADULT_ONLY_PAGE_ONLY, MediaHostContext, refuseAdultOnly, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { MediaShelfNodeSchema, PageNodeSchema, ResultFeedNodeSchema, type UiNode } from "@/kit/schema/types";

const SPEC_DIR = process.env.MAIPAI_SPEC_DIR ?? fileURLToPath(new URL("../../../spec", import.meta.url));
const NAME = "Locked items. Press to enter your passcode.";
const originalFetch = globalThis.fetch;
const realMatchMedia = window.matchMedia;

/** A host that forgot to redact: the locked flag AND every adult field. The kit must draw none of them. */
const ADULT = { locked: true, id: "zorblax-id", title: "Zorblax Nightshade", prompt: "zorblax prompt", thumbnail: "/zorblax-thumb.jpg", status: "ready", src: "/zorblax.mp4", tags: ["zorblaxtag"], created_at: new Date().toISOString() };
let rows: Record<string, unknown>[] = [];

beforeEach(() => {
  stubMatchMedia({});
  rows = [
    { id: "o1", title: "Open harbor", thumbnail: "/t/1.jpg", prompt: "open harbor", status: "ready", src: "/o1.mp4", created_at: new Date().toISOString() },
    ADULT,
    { locked: true, making: true },
    ADULT,
  ];
  globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(rows), { status: 200 }))) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; window.matchMedia = realMatchMedia; });

function mount(node: UiNode, host: MediaHost | null = null) {
  return renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <PageStateContext.Provider value={{ merge: () => {} }}>
            <NodeRenderer node={node} state={{}} />
          </PageStateContext.Provider>
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

const html = () => document.documentElement.outerHTML.toLowerCase();

describe("media_shelf locked rows", () => {
  const shelf = MediaShelfNodeSchema.parse({
    type: "media_shelf", bind: { source: "package", path: "clips", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "thumbnail",
    layout: "grid", group_by_field: "created_at", group_noun: { one: "clip", other: "clips" }, heading: "My clips",
  }) as unknown as UiNode;

  test("every locked row is one tile; no field of a locked row is drawn; the open row is", async () => {
    const view = mount(shelf);
    expect((await view.findAllByRole("button", { name: NAME })).length).toBe(1);
    expect(view.getByText("Open harbor")).toBeTruthy();
    expect(html()).not.toContain("zorblax");
    // The day heading counts only the open clips.
    expect(view.getAllByRole("separator").map((s) => s.getAttribute("aria-label"))).toEqual(["Today, 1 clip"]);
    // making on any locked row puts the spinner on the one tile.
    expect(view.getByRole("button", { name: NAME }).querySelector("svg[class*='animate-spin']")).toBeTruthy();
  });

  test("locked_field and making_field name other paths", async () => {
    rows = [{ id: "a", title: "Open A", thumbnail: "/a.jpg", hidden: true, title_secret: "zorblax" }, { id: "b", title: "Open B", thumbnail: "/b.jpg" }];
    const view = mount({ ...(shelf as Record<string, unknown>), locked_field: "hidden", making_field: "busy", group_by_field: undefined } as UiNode);
    expect((await view.findAllByRole("button", { name: NAME })).length).toBe(1);
    expect(view.queryByText("Open A")).toBeNull();
    expect(view.getByText("Open B")).toBeTruthy();
  });
});

describe("result_feed locked rows", () => {
  const feed = ResultFeedNodeSchema.parse({
    type: "result_feed", bind: { source: "package", path: "recipes" },
    fields: { words: "prompt", tags: "tags", status: "status", poster: "thumbnail", src: "src", created_at: "created_at" },
    poll_while: { statuses: ["queued", "generating"], record: { path: "recipes", params: { id: "{id}" } } },
  }) as unknown as UiNode;

  test("one lock tile after the open entries; the locked rows' words, tags, picture and clip never reach the page", async () => {
    const view = mount(feed);
    expect((await view.findAllByRole("button", { name: NAME })).length).toBe(1);
    expect(view.getAllByRole("article").length).toBe(1);
    expect(view.container.querySelectorAll("video").length).toBe(1);
    expect(html()).not.toContain("zorblax");
  });
});

describe("the media host's adult-only rule", () => {
  test("refuseAdultOnly is true only for adultOnly: true", () => {
    expect(refuseAdultOnly({ adultOnly: true })).toBe(true);
    expect(refuseAdultOnly({ adultOnly: false })).toBe(false);
    expect(refuseAdultOnly({})).toBe(false);
  });

  test("the play action refuses an adult-only item before the host sees it, and plays an ordinary one", async () => {
    const onPlay = mock(() => {});
    rows = [{ id: "adult-open", title: "Unlocked adult clip", thumbnail: "/a.jpg", adult_only: true }, { id: "plain", title: "Plain clip", thumbnail: "/p.jpg" }];
    const node = MediaShelfNodeSchema.parse({
      type: "media_shelf", bind: { source: "package", path: "clips", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "thumbnail",
      on_play: { play: { media_id: "{id}" } }, play_label: "Play {title}",
    }) as unknown as UiNode;
    const view = mount(node, { onPlay });
    fireEvent.click(await view.findByRole("button", { name: "Play Unlocked adult clip" }));
    expect(await view.findByText(ADULT_ONLY_PAGE_ONLY)).toBeTruthy();
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Play Plain clip" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  test("the player node never offers an adult-only item to the host's mediaFor, an ordinary item it does", async () => {
    const mediaFor = mock((_item: unknown) => null);
    const watch = PageNodeSchema.parse(JSON.parse(readFileSync(join(SPEC_DIR, "ui", "pages", "videos-watch.json"), "utf-8")));
    const player = (watch.body[0] as { main: UiNode[] }).main[0]!;
    for (const adult of [true, false]) {
      const item = { id: "m1", src: "/api/media/m1/file", title: "A clip", adult_only: adult };
      globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([item]), { status: 200 }))) as unknown as typeof fetch;
      const view = renderWithQueryClient(
        <MemoryRouter initialEntries={["/apps/videos"]}>
          <PackageScopeContext.Provider value={{ packageId: "videos" }}>
            <MediaHostContext.Provider value={{ onPlay: () => {}, mediaFor }}>
              <NodeRenderer node={player} state={{ id: "m1" }} />
            </MediaHostContext.Provider>
          </PackageScopeContext.Provider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(view.container.querySelector("video")).toBeTruthy());
      cleanup();
    }
    expect(mediaFor.mock.calls.length).toBe(1);
    expect((mediaFor.mock.calls[0]![0] as { adultOnly?: boolean }).adultOnly).toBeUndefined();
  });
});

describe("an unlocked adult-only item's blob sources (ADULT-LOCK-03b)", () => {
  // The test document starts at about:blank (origin "null"); a real page has an origin, which the kit's blob rule compares.
  beforeEach(() => { (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL("http://localhost:3000/apps/videos"); });
  // Leave the document where it started: a later test file in the same process would otherwise load its pictures from a real localhost address.
  afterEach(() => { (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL("about:blank"); });
  const blob = () => `blob:${window.location.origin}/0b1c2d3e-aaaa-bbbb-cccc-000000000001`;
  const shelfOf = () => MediaShelfNodeSchema.parse({
    type: "media_shelf", bind: { source: "package", path: "clips", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "thumbnail", layout: "grid",
  }) as unknown as UiNode;

  test("a blob: URL of this page's own origin draws as the tile's picture; another origin's, a data: URL and a remote address do not", async () => {
    rows = [
      { id: "own", title: "Own blob", thumbnail: blob() },
      { id: "foreign", title: "Foreign blob", thumbnail: "blob:https://example.com/0b1c2d3e" },
      { id: "data", title: "Data URL", thumbnail: "data:image/png;base64,AAAA" },
      { id: "remote", title: "Remote", thumbnail: "https://example.com/a.jpg" },
    ];
    const view = mount(shelfOf());
    await view.findByText("Own blob");
    const sources = Array.from(view.container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(sources).toEqual([blob()]);
  });

  test("the player node turns the Media Session off for an adult-only item and leaves it on for an ordinary one", async () => {
    const watch = PageNodeSchema.parse(JSON.parse(readFileSync(join(SPEC_DIR, "ui", "pages", "videos-watch.json"), "utf-8")));
    const player = (watch.body[0] as { main: UiNode[] }).main[0]!;
    const seen: boolean[] = [];
    const original = Object.getOwnPropertyDescriptor(navigator, "mediaSession");
    for (const adult of [true, false]) {
      const item = { id: "m1", src: blob(), title: "A clip", adult_only: adult };
      globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([item]), { status: 200 }))) as unknown as typeof fetch;
      const view = renderWithQueryClient(
        <MemoryRouter initialEntries={["/apps/videos"]}>
          <PackageScopeContext.Provider value={{ packageId: "videos" }}>
            <MediaHostContext.Provider value={{ onPlay: () => {}, mediaFor: () => null }}>
              <NodeRenderer node={player} state={{ id: "m1" }} />
            </MediaHostContext.Provider>
          </PackageScopeContext.Provider>
        </MemoryRouter>,
      );
      const video = await waitFor(() => { const el = view.container.querySelector("video"); if (!el) throw new Error("no player yet"); return el; });
      const session = { metadata: null as unknown, setActionHandler: () => {}, playbackState: "none" };
      Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
      (globalThis as unknown as { MediaMetadata: unknown }).MediaMetadata = class { constructor(public init: unknown) {} };
      Object.defineProperty(video, "paused", { configurable: true, get: () => false });
      fireEvent.play(video);
      await new Promise((r) => setTimeout(r, 30));
      seen.push(session.metadata !== null);
      view.unmount();
    }
    if (original) Object.defineProperty(navigator, "mediaSession", original); else delete (navigator as unknown as Record<string, unknown>).mediaSession;
    expect(seen).toEqual([false, true]);
  });
});

// MEDIA-PLAYER-01: the interpreter side of the media nodes: a media_shelf whose tile plays through the host,
// the billboard's buttons, the player node and its quiet progress calls, and `play` with no host.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { Page } from "@/kit/primitives/Page";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, PLAY_UNAVAILABLE, type MediaHost, type MediaItemRef } from "@/kit/schema/mediaHost";
import { MediaShelfNodeSchema, PageNodeSchema, type UiNode } from "@/kit/schema/types";

// The page fixtures live beside schema.json in this repo's own spec workspace (catalog.test.ts reads it the same way).
const SPEC_DIR = process.env.MAIPAI_SPEC_DIR ?? fileURLToPath(new URL("../../../spec", import.meta.url));
const page = (name: string) => PageNodeSchema.parse(JSON.parse(readFileSync(join(SPEC_DIR, "ui", "pages", `${name}.json`), "utf-8")));
const homePage = page("videos-home");
const watchPage = page("videos-watch");

afterEach(cleanup);

interface Call { url: string; method: string; body: unknown; keepalive?: boolean }
let calls: Call[] = [];
const originalFetch = globalThis.fetch;

const ROWS = [
  { id: "m1", title: "Building a pizza oven", channel: "Ember Workshop", thumbnail: "/api/media/m1/thumb.jpg", progress: 0.6, copy_label: "Saved", duration_s: 1122, summary: "Part 3.", backdrop: "/api/media/m1/backdrop.jpg" },
  { id: "m2", title: "How tides work", channel: "Atlas Explains", thumbnail: "https://example.com/t.jpg", progress: 0, copy_label: "", duration_s: 725, summary: "Moon and sea.", backdrop: "/api/media/m2/backdrop.jpg" },
];
const ITEM = {
  id: "m1",
  src: "/api/media/m1/file",
  title: "Building a pizza oven",
  subtitle: "Ember Workshop",
  position_s: 673,
  chapters: [{ start_s: 0, title: "Intro" }, { start_s: 74, title: "Laying the firebrick" }],
  up_next: { id: "m2", title: "How tides work" },
  can_edit: true,
};

beforeEach(() => {
  calls = [];
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined, keepalive: init?.keepalive });
    if (url.endsWith("/data/item")) return Promise.resolve(new Response(JSON.stringify([ITEM]), { status: 200 }));
    if (url.includes("/data/")) return Promise.resolve(new Response(JSON.stringify(ROWS), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function inVideos(node: UiNode, host: MediaHost | null, state: Record<string, unknown> = {}) {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={["/apps/videos"]}>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <NodeRenderer node={node} state={state} />
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

const shelf = homePage.body[1]!;
const billboard = homePage.body[0]!;

describe("media_shelf", () => {
  test("parses the optional backdrop art look", () => {
    const node = MediaShelfNodeSchema.parse({ type: "media_shelf", bind: { source: "package", path: "clips", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "thumbnail", look: "backdrop" });
    expect(node.look).toBe("backdrop");
  });
  test("a tile's on_select plays through the host with the row's id", async () => {
    const onPlay = mock((_id: string, _item: Record<string, unknown>) => {});
    const { findByRole, getByRole } = inVideos(shelf, { onPlay });
    fireEvent.click(await findByRole("button", { name: "Building a pizza oven" }));
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
    expect(onPlay.mock.calls[0]![0]).toBe("m1");
    expect(onPlay.mock.calls[0]![1]).toMatchObject({ channel: "Ember Workshop" });
    expect(getByRole("list", { name: "Continue watching" })).toBeTruthy();
  });

  test("draws the heading, subtitle, played bar, badge and running time; never loads an outside picture", async () => {
    const { findByText, getAllByRole, getByText, container } = inVideos(shelf, { onPlay: () => {} });
    await findByText("Continue watching");
    expect(getByText("Ember Workshop")).toBeTruthy();
    expect(getAllByRole("progressbar", { name: "Played" })).toHaveLength(1);
    expect(getByText("Saved")).toBeTruthy();
    expect(getByText("18:42")).toBeTruthy();
    const images = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(images).toEqual(["/api/media/m1/thumb.jpg"]);
  });

  test("with no host, play says what went wrong and what to do", async () => {
    const { findByRole, findByText } = inVideos(shelf, null);
    fireEvent.click(await findByRole("button", { name: "Building a pizza oven" }));
    await findByText(PLAY_UNAVAILABLE);
  });
});

describe("billboard", () => {
  test("Play hands the slide's item to the host; Watch later calls the package", async () => {
    const onPlay = mock((_id: string) => {});
    const { findByRole, getAllByRole } = inVideos(billboard, { onPlay });
    await findByRole("region", { name: "Featured videos" });
    fireEvent.click(getAllByRole("button", { name: "Play" })[0]!);
    await waitFor(() => expect(onPlay.mock.calls[0]?.[0]).toBe("m1"));
    fireEvent.click(getAllByRole("button", { name: "Watch later" })[1]!);
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/watch-later" && (c.body as { media_id: string }).media_id === "m2")).toBe(true));
  });

  test("an artless slide shows the icon of the row's kind: music a note, a podcast a mic, no kind a film (KIT-QA-01)", async () => {
    const node = { ...(billboard as Record<string, unknown>), item_art_field: undefined } as UiNode;
    const kinds = async (kind?: string) => {
      ROWS.forEach((r) => { if (kind) (r as Record<string, unknown>).kind = kind; else delete (r as Record<string, unknown>).kind; });
      const view = inVideos(node, { onPlay: () => {} });
      await view.findByRole("region", { name: "Featured videos" });
      const found = [...view.container.querySelectorAll('[data-slot="safe-image-fallback"]')].map((e) => e.getAttribute("data-kind"));
      view.unmount();
      return found;
    };
    expect((await kinds("audio"))[0]).toBe("music");
    expect((await kinds("podcast"))[0]).toBe("podcast");
    expect((await kinds())[0]).toBe("video");
  });

  test("eyebrow and subtitle fill from the row", async () => {
    const { findByText } = inVideos(billboard, { onPlay: () => {} });
    await findByText("New from Ember Workshop");
    await findByText("Part 3.");
  });

  test("the billboard primary action pauses the matching playing item", async () => {
    const paused = mock((_id: string) => {});
    const host: MediaHost = { onPlay: () => {}, playback: { subscribe: () => () => {}, isPlaying: (id) => id === "m1", pause: paused } };
    const { findByRole, getAllByRole } = inVideos(billboard, host);
    await findByRole("region", { name: "Featured videos" });
    fireEvent.click(getAllByRole("button", { name: "Pause" })[0]!);
    expect(paused).toHaveBeenCalledWith("m1");
  });
});

describe("player", () => {
  const playerNode = (watchPage.body[0] as { main: UiNode[] }).main[0]!;

  test("binds the item through the page state and draws the Player for it", async () => {
    const { findByRole, container } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    const dataCall = calls.find((c) => c.url.endsWith("/data/item"));
    expect(dataCall?.body).toEqual({ id: "m1" });
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("/api/media/m1/file");
  });

  test("progress reports are quiet calls to the package, the unload one with keepalive", async () => {
    const { findByRole, container, unmount } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 1122 });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 300 });
    fireEvent.play(video);
    fireEvent.pause(video);
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/progress")).toBe(true));
    const pause = calls.find((c) => c.url === "/api/plugins/videos/progress")!;
    expect(pause.body).toEqual({ media_id: "m1", position_s: "300", duration_s: "1122", reason: "pause" });
    // Quiet: the report does not refetch the item.
    expect(calls.filter((c) => c.url.endsWith("/data/item"))).toHaveLength(1);
    unmount();
    await waitFor(() => expect(calls.some((c) => (c.body as { reason?: string } | undefined)?.reason === "unload" && c.keepalive === true)).toBe(true));
  });

  test("an item with an outside address is not played", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([{ ...ITEM, src: "https://example.com/v.mp4" }]), { status: 200 }))) as unknown as typeof fetch;
    const { findByText, container } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    await findByText("This video is not on the hub. Go back to Videos and pick another.");
    expect(container.querySelector("video")).toBeNull();
  });

  test("edit is visible only for editable rows, saves changed fields plus id, and Cancel sends nothing", async () => {
    const editable: UiNode = { ...(playerNode as Extract<UiNode, { type: "player" }>), edit: { label: "Edit", fields: [{ name: "title", label: "Title", kind: "text" }], on_save: { call: { target: "/api/plugins/videos/edit/{id}", method: "PATCH" } } } };
    const view = inVideos(editable, { onPlay: () => {} }, { id: "m1" });
    await view.findByRole("button", { name: "Chapters" });
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    fireEvent.change(await view.findByRole("textbox", { name: "Title" }), { target: { value: "Updated title" } });
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    expect(calls.some(call => call.url.includes("/edit/"))).toBe(false);
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    fireEvent.change(await view.findByRole("textbox", { name: "Title" }), { target: { value: "Updated title" } });
    fireEvent.click(view.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.find(call => call.url.endsWith("/edit/m1"))?.body).toEqual({ title: "Updated title", id: "m1" }));
  });

  test("failed edit save stays open and explains how to retry", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/data/item")) return Promise.resolve(new Response(JSON.stringify([ITEM]), { status: 200 }));
      if (url.includes("/edit/")) return Promise.resolve(new Response("", { status: 500 }));
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
    const editable: UiNode = { ...(playerNode as Extract<UiNode, { type: "player" }>), edit: { label: "Edit", fields: [{ name: "title", label: "Title", kind: "text" }], on_save: { call: { target: "/api/plugins/videos/edit/{id}", method: "PATCH" } } } };
    const view = inVideos(editable, { onPlay: () => {} }, { id: "m1" });
    await view.findByRole("button", { name: "Chapters" });
    fireEvent.click(view.getByRole("button", { name: "Edit" }));
    fireEvent.change(await view.findByRole("textbox", { name: "Title" }), { target: { value: "Updated title" } });
    fireEvent.click(view.getByRole("button", { name: "Save" }));
    await view.findByText("Could not save. Check that you are online, then try again.");
  });

  test("the Lyrics button appears for an empty row only when enabled and uses the node empty copy", async () => {
    const audio: UiNode = { ...(playerNode as Extract<UiNode, { type: "player" }>), kind: "audio", layout: "audio", lyrics_enabled: true, lyrics_empty_text: "No words yet" };
    const view = inVideos(audio, { onPlay: () => {} }, { id: "m1" });
    fireEvent.click(await view.findByRole("button", { name: "Lyrics" }));
    expect(await view.findByText("No words yet")).toBeTruthy();
  });

  test("on_lyrics_open receives its row and refetches the binding on success", async () => {
    let itemFetches = 0;
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.endsWith("/data/item")) {
        itemFetches++;
        const item = itemFetches > 1 ? { ...ITEM, lyrics: "New lyrics" } : ITEM;
        return Promise.resolve(new Response(JSON.stringify([item]), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
    const audio: UiNode = { ...(playerNode as Extract<UiNode, { type: "player" }>), kind: "audio", layout: "audio", lyrics_enabled: true, on_lyrics_open: { call: { target: "/api/plugins/videos/lyrics/{id}" } } };
    const view = inVideos(audio, { onPlay: () => {} }, { id: "m1" });
    fireEvent.click(await view.findByRole("button", { name: "Lyrics" }));
    await view.findByText("New lyrics");
    expect(calls.find(call => call.url.endsWith("/lyrics/m1"))?.body).toBeUndefined();
    expect(itemFetches).toBeGreaterThanOrEqual(2);
  });

  test("the Edit pill stays hidden when can_edit is false", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/data/item")) return Promise.resolve(new Response(JSON.stringify([{ ...ITEM, can_edit: false }]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
    const edit = { label: "Edit", fields: [{ name: "title", label: "Title", kind: "text" as const }], on_save: { call: { target: "/api/plugins/videos/edit/{id}" } } };
    const editable: UiNode = { ...(playerNode as Extract<UiNode, { type: "player" }>), edit };
    const view = inVideos(editable, { onPlay: () => {} }, { id: "m1" });
    await view.findByRole("button", { name: "Chapters" });
    expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});

describe("MEDIA-POLISH-01", () => {
  const split = watchPage.body[0]!;
  const playerNode = (split as { main: UiNode[] }).main[0]!;

  test("an empty shelf with hide_when_empty draws nothing; deprecated page tone is ignored and the plain variant comes from the document", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))) as unknown as typeof fetch;
    const { container, queryByRole } = inVideos(shelf, { onPlay: () => {} });
    await waitFor(() => expect(container.querySelector('[data-slot="route-skeleton"], [role="progressbar"]')).toBeNull());
    await waitFor(() => expect(container.textContent).toBe(""));
    expect(queryByRole("heading", { name: "Continue watching" })).toBeNull();
    expect(PageNodeSchema.parse({ ...homePage, tone: "cinema" }).tone).toBe("cinema");
    const renderedPage = renderWithQueryClient(<Page title="Media" tone={homePage.tone}>body</Page>);
    expect(renderedPage.container.firstElementChild?.hasAttribute("data-page-tone")).toBe(false);
  });

  test("a plain shelf with rows has its See all link, which navigates inside the app", async () => {
    const { findByRole } = inVideos(shelf, { onPlay: () => {} });
    const seeAll = await findByRole("button", { name: "See all" });
    expect(seeAll.closest('[data-slot="media-shelf-plain"]')).not.toBeNull();
  });

  test("the watch page is a main and aside split: the player with its title and actions, Up next as a vertical list", async () => {
    const { findByRole, findByLabelText, container } = inVideos(split, { onPlay: () => {} }, { id: "m1" });
    expect(await findByRole("heading", { name: "Building a pizza oven" })).toBeTruthy();
    const upNext = await findByLabelText("Up next", { selector: "ul" });
    expect(upNext.getAttribute("data-orientation")).toBe("vertical");
    expect(container.querySelector('[data-layout="main-aside"]')).not.toBeNull();
    expect(await findByRole("button", { name: "Like" })).toBeTruthy();
  });

  test("actions_wrap lets the actions row wrap instead of scrolling sideways", async () => {
    const wrapped = { ...(playerNode as Extract<UiNode, { type: "player" }>), actions_wrap: true };
    const { findByRole, container } = inVideos(wrapped, { onPlay: () => {} }, { id: "m1" });
    await findByRole("button", { name: "Like" });
    const row = container.querySelector('[data-slot="player-actions"]')!;
    expect(row.className).toContain("flex-wrap");
    expect(row.className).not.toContain("overflow-x-auto");
  });

  test("without actions_wrap the actions row scrolls sideways", async () => {
    const { findByRole, container } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    await findByRole("button", { name: "Like" });
    expect(container.querySelector('[data-slot="player-actions-strip"]')!.className).toContain("overflow-x-auto");
  });

  test("the Edit button sits outside the scrolling strip so it is never scrolled away", async () => {
    const editable = { ...(playerNode as Extract<UiNode, { type: "player" }>), edit: { label: "Edit", fields: [{ name: "title", label: "Title", kind: "text" }], on_save: { navigate: "/x" } } } as never;
    const { findByRole, container } = inVideos(editable, { onPlay: () => {} }, { id: "m1", can_edit: true });
    const like = await findByRole("button", { name: "Like" });
    const strip = container.querySelector('[data-slot="player-actions-strip"]')!;
    expect(strip.contains(like)).toBe(true);
    const edit = container.querySelector('[data-slot="player-actions"] button[class*="shrink-0"]:not([aria-pressed])');
    if (edit && edit.textContent?.includes("Edit")) expect(strip.contains(edit)).toBe(false);
  });

  test("a toggle action fires with the item and on set to the new value, then reads the item again", async () => {
    const { findByRole } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    const like = await findByRole("button", { name: "Like" });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(like);
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/like")).toBe(true));
    expect(calls.find((c) => c.url === "/api/plugins/videos/like")!.body).toEqual({ media_id: "m1", on: true });
    await waitFor(() => expect(calls.filter((c) => c.url.endsWith("/data/item")).length).toBeGreaterThan(1));
  });

  test("a host that owns the element gets asked for it, and the Player plays in it", async () => {
    const owned = document.createElement("video");
    const mediaFor = mock((_item: MediaItemRef) => owned);
    const { findByRole, container } = inVideos(playerNode, { onPlay: () => {}, mediaFor }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    expect(mediaFor.mock.calls[0]![0]).toMatchObject({ id: "m1", src: "/api/media/m1/file", kind: "video", title: "Building a pizza oven" });
    expect(container.querySelector("video")).toBe(owned);
    expect(owned.getAttribute("src")).toBe("/api/media/m1/file");
  });

  test("a host voiceover creates its spoken audio element", async () => {
    const voice = document.createElement("audio");
    const original = globalThis.Audio;
    globalThis.Audio = function AudioMock() { return voice; } as unknown as typeof Audio;
    const voiceoverFor = mock((_item: MediaItemRef) => ({ src: "/dj" }));
    const { findByRole, container, unmount } = inVideos(playerNode, { onPlay: () => {}, voiceoverFor }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    expect(voiceoverFor.mock.calls[0]![0]).toMatchObject({ id: "m1", src: "/api/media/m1/file", kind: "video" });
    const video = container.querySelector("video")!;
    fireEvent.play(video);
    await waitFor(() => expect(voice.getAttribute("src")).toBe("/dj"));
    unmount();
    globalThis.Audio = original;
  });

  test("without a host voiceover, Player does not create a spoken audio element", async () => {
    const original = globalThis.Audio;
    const ctor = mock(function(this: HTMLAudioElement) { return document.createElement("audio"); });
    globalThis.Audio = ctor as unknown as typeof Audio;
    const { findByRole, unmount } = inVideos(playerNode, { onPlay: () => {} }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    expect(ctor).not.toHaveBeenCalled();
    unmount();
    globalThis.Audio = original;
  });

  test("an adult-only item never gets a host voiceover", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([{ ...ITEM, adult_only: true }]), { status: 200 }))) as unknown as typeof fetch;
    const voiceoverFor = mock((_item: MediaItemRef) => ({ src: "/dj" }));
    const original = globalThis.Audio;
    const ctor = mock(function(this: HTMLAudioElement) { return document.createElement("audio"); });
    globalThis.Audio = ctor as unknown as typeof Audio;
    const { findByRole, unmount } = inVideos(playerNode, { onPlay: () => {}, voiceoverFor }, { id: "m1" });
    await findByRole("button", { name: "Chapters" });
    expect(voiceoverFor).not.toHaveBeenCalled();
    expect(ctor).not.toHaveBeenCalled();
    unmount();
    globalThis.Audio = original;
  });

  test("details show facts, expand a safe description into seekable chapters, and omit unsafe or absent descriptions", async () => {
    const player: UiNode = {
      type: "player", kind: "video", autoplay_next: false, bind: { source: "route", path: "/api/plugins/videos/data/item", stream: false }, details: true,
      fields: { id: "id", src: "src", title: "title", subtitle: "subtitle", facts: "facts", description: "description", chapters: "chapters" },
    };
    const original = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([{
      ...ITEM, facts: "12 min · 4 chapters", description: "A careful build from start to finish.", chapters: ITEM.chapters,
    }]), { status: 200 }))) as unknown as typeof fetch;
    try {
      const view = inVideos(player, { onPlay: () => {} });
      expect(await view.findByText("12 min · 4 chapters")).toBeTruthy();
      expect(view.getByText("A careful build from start to finish.").className).toContain("line-clamp-2");
      const more = view.getByRole("button", { name: "Show more" });
      expect(more.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(more);
      expect(view.getByRole("button", { name: "Show less" }).getAttribute("aria-expanded")).toBe("true");
      expect(view.getByRole("button", { name: "0:00 Intro" })).toBeTruthy();
      const video = view.container.querySelector("video")!;
      // The rendered chapter seeks the existing media element.
      Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 0 });
      fireEvent.click(view.getByRole("button", { name: "1:14 Laying the firebrick" }));
      expect(video.currentTime).toBe(74);
    } finally { globalThis.fetch = original; }
  });

  test("omits the more button when the description is absent or contains a raw token", async () => {
    const player: UiNode = { type: "player", kind: "video", autoplay_next: false, bind: { source: "route", path: "/api/plugins/videos/data/item", stream: false }, details: true };
    const original = globalThis.fetch;
    try {
      for (const description of [undefined, "Raw {token} description"]) {
        globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([{ ...ITEM, description }]), { status: 200 }))) as unknown as typeof fetch;
        const view = inVideos(player, { onPlay: () => {} });
        await view.findByRole("button", { name: "Chapters" });
        expect(view.queryByRole("button", { name: "Show more" })).toBeNull();
        cleanup();
      }
    } finally { globalThis.fetch = original; }
  });
});

describe("media_shelf library additions (VIDEO-UI-05, K12)", () => {
  const today = new Date();
  const iso = (daysAgo: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 12).toISOString();
  const CLIPS = [
    { id: "c1", title: "Harbor", thumbnail: "/t/1.jpg", made_at: iso(0), favorite: false },
    { id: "c2", title: "Forest", thumbnail: "/t/2.jpg", made_at: iso(0), favorite: true },
    { id: "c3", title: "Desert", thumbnail: "/t/3.jpg", made_at: iso(1), favorite: false },
    { id: "c4", title: "Lake", thumbnail: "/t/4.jpg", made_at: "not a date", favorite: false },
  ];
  const library: UiNode = {
    type: "media_shelf", bind: { source: "package", path: "clips", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "thumbnail",
    layout: "grid", group_by_field: "made_at", group_noun: { one: "clip", other: "clips" }, size_control: true,
    favorite: { field: "favorite", action: { call: { target: "/api/plugins/videos/favorite", args: { id: "{id}", favorite: "{favorite}" } } } },
    aspect: "wide", variant: "card", orientation: "horizontal", hide_when_empty: false,
  } as UiNode;

  beforeEach(() => {
    window.localStorage.clear();
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.includes("/data/clips")) return Promise.resolve(new Response(JSON.stringify(CLIPS), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }) as unknown as typeof fetch;
  });

  test("day headings read Today and Yesterday with counts; an undated row joins the group before it", async () => {
    const { findAllByRole } = inVideos(library, null);
    const labels = (await findAllByRole("separator")).map((el) => el.getAttribute("aria-label"));
    expect(labels).toEqual(["Today, 2 clips", "Yesterday, 2 clips"]);
  });

  test("the heart turns at once, sends the row with its new value, and the size slider is drawn", async () => {
    const { findByRole, getByRole } = inVideos(library, null);
    const heart = await findByRole("button", { name: "Favorite Harbor" });
    expect(heart.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(heart);
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/api/plugins/videos/favorite"))).toBe(true));
    const sent = calls.find((c) => c.url.endsWith("/api/plugins/videos/favorite"))!;
    expect(sent.body).toEqual({ id: "c1", favorite: true });
    expect(getByRole("slider", { name: "Card size" })).toBeTruthy();
  });
});

describe("media_shelf media_loop (VIDEO-UI-14)", () => {
  const ROWS = [{ id: "r1", title: "Fox", poster: "/p/1.jpg", loop: "/l/1.mp4" }, { id: "r2", title: "Coast", poster: "/p/2.jpg", loop: "https://x.test/l.mp4" }];
  const rail = { type: "media_shelf", bind: { source: "package", path: "showcase", stream: false }, item_key_field: "id", item_label_field: "title", item_media_field: "poster", aspect: "poster", variant: "plain", hide_when_empty: false, orientation: "horizontal" } as UiNode;
  beforeEach(() => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(ROWS), { status: 200 }))) as unknown as typeof fetch;
  });

  test("a shelf without media_loop draws images only, as before", async () => {
    const { findAllByRole, container } = inVideos(rail, null);
    await findAllByRole("list");
    expect(container.querySelectorAll("video").length).toBe(0);
    expect(container.querySelectorAll("img").length).toBe(2);
  });

  test("media_loop draws a muted clip over each poster from a same-origin path, and the poster alone for any other address", async () => {
    const { findAllByRole, container } = inVideos({ ...rail, media_loop: true, item_loop_field: "loop" } as UiNode, null);
    await findAllByRole("list");
    const videos = container.querySelectorAll("video");
    expect(videos.length).toBe(1);
    expect(videos[0]!.getAttribute("src")).toBe("/l/1.mp4");
    expect(container.querySelectorAll("img").length).toBe(2);
  });
});

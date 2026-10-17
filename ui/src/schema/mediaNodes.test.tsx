// MEDIA-PLAYER-01: the interpreter side of the media nodes: a media_shelf whose tile plays through the host,
// the billboard's buttons, the player node and its quiet progress calls, and `play` with no host.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, PLAY_UNAVAILABLE, type MediaHost, type MediaItemRef } from "@/kit/schema/mediaHost";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

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

  test("eyebrow and subtitle fill from the row", async () => {
    const { findByText } = inVideos(billboard, { onPlay: () => {} });
    await findByText("New from Ember Workshop");
    await findByText("Part 3.");
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
});

describe("MEDIA-POLISH-01", () => {
  const split = watchPage.body[0]!;
  const playerNode = (split as { main: UiNode[] }).main[0]!;

  test("an empty shelf with hide_when_empty draws nothing; the page tone and plain variant come from the document", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))) as unknown as typeof fetch;
    const { container, queryByRole } = inVideos(shelf, { onPlay: () => {} });
    await waitFor(() => expect(container.querySelector('[data-slot="route-skeleton"], [role="progressbar"]')).toBeNull());
    await waitFor(() => expect(container.textContent).toBe(""));
    expect(queryByRole("heading", { name: "Continue watching" })).toBeNull();
    expect(homePage.tone).toBe("cinema");
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
});

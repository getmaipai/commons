// MUSIC-KIT-01: the quick_tiles, top_result, category_tiles and track_rows nodes, and the media_shelf and player additions.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer, safeTileColor } from "@/kit/schema/NodeRenderer";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { PageNodeSchema, UiNodeSchema, type UiNode } from "@/kit/schema/types";

afterEach(cleanup);

const ROWS = [
  { id: "t1", title: "Morning Light", artist: "Marsh", cover: "/api/media/t1/cover", album_id: "a1", track_number: 1, duration_s: 222, playing: false, disc_label: "Disc 1", color: "#e0457b", kind_label: "Artist" },
  { id: "t2", title: "Low Tide", artist: "Marsh", cover: "https://example.com/x.jpg", album_id: "a1", track_number: 2, duration_s: 181, playing: true, disc_label: "Disc 2", color: "url(javascript:1)" },
];
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(ROWS), { status: 200 }))) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; });

const bind = { source: "package", path: "rows" };
const play = { play: { media_id: "{id}" } };
const parse = (n: unknown): UiNode => UiNodeSchema.parse(n);

function draw(node: UiNode) {
  const played: { id: string }[] = [];
  const host: MediaHost = { onPlay: (mediaId) => { played.push({ id: mediaId }); } };
  const view = renderWithQueryClient(
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "music" }}>
        <MediaHostContext.Provider value={host}>
          <NodeRenderer node={node} state={{}} />
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
  return { view, played };
}

describe("music block nodes", () => {
  test("the listen fixture parses", () => {
    const fixture = JSON.parse(readFileSync(new URL("../../../spec/ui/pages/music-listen.json", import.meta.url), "utf8"));
    const page = PageNodeSchema.parse(fixture);
    expect(page.body.map((n) => n.type)).toEqual(["quick_tiles", "media_shelf", "top_result", "category_tiles", "track_rows"]);
  });

  test("quick_tiles draws at most max tiles; the Play button plays the same row the tile selects", async () => {
    const { view, played } = draw(parse({ type: "quick_tiles", label: "Pick up", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover", max: 1, on_play: play, play_label: "Play {title}" }));
    await view.findByRole("list", { name: "Pick up" });
    expect(view.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(view.getByRole("button", { name: "Play Morning Light" }));
    await waitFor(() => expect(played.map((p) => p.id)).toEqual(["t1"]));
  });

  test("media_shelf on_play puts a Play button on each tile and card_radius tight, press_scale reach the kit", async () => {
    const { view, played } = draw(parse({ type: "media_shelf", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover", aspect: "square", card_radius: "tight", press_scale: true, on_play: play, play_label: "Play {title}" }));
    const button = await view.findByRole("button", { name: "Play Low Tide" });
    fireEvent.click(button);
    await waitFor(() => expect(played.map((p) => p.id)).toEqual(["t2"]));
    expect(view.container.innerHTML).toContain("--media-card-radius");
  });

  test("top_result draws the first row with its eyebrow and Play", async () => {
    const { view, played } = draw(parse({ type: "top_result", bind, item_label_field: "title", item_eyebrow_field: "{kind_label}", item_subtitle_field: "{artist}", item_media_field: "cover", art_shape: "circle", on_play: play }));
    await view.findByText("Morning Light");
    expect(view.getByText("Artist")).toBeTruthy();
    expect(view.queryByText("Low Tide")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Play Morning Light" }));
    await waitFor(() => expect(played.map((p) => p.id)).toEqual(["t1"]));
  });

  test("category_tiles selects with the row; an unsafe colour is dropped", async () => {
    const nav = parse({ type: "category_tiles", label: "Browse", bind, item_key_field: "id", item_label_field: "title", item_color_field: "color", on_select: { navigate: { to: "/apps/music/search", state: { q: "{title}" } } } });
    const { view } = draw(nav);
    await view.findByRole("list", { name: "Browse" });
    expect(view.container.innerHTML).toContain("#e0457b");
    expect(view.container.innerHTML).not.toContain("javascript");
    expect(safeTileColor("oklch(70% 0.1 200)")).toBe("oklch(70% 0.1 200)");
    expect(safeTileColor("red; background:url(x)")).toBeUndefined();
    expect(safeTileColor("var(--x)")).toBeUndefined();
  });

  test("track_rows shows numbers, running time and disc headings, marks the playing row and plays on press", async () => {
    const { view, played } = draw(parse({ type: "track_rows", label: "Tracks", bind, item_key_field: "id", item_label_field: "title", item_subtitle_field: "{artist}", item_number_field: "track_number", item_meta_field: "duration_s", item_group_field: "disc_label", item_highlight_field: "playing", on_play: play }));
    await view.findByRole("list", { name: "Tracks" });
    expect(view.getByText("3:42")).toBeTruthy();
    expect(view.getByText("Disc 2")).toBeTruthy();
    expect(view.getAllByRole("listitem").some((li) => li.getAttribute("aria-current") === "true")).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Play Low Tide" }));
    await waitFor(() => expect(played.map((p) => p.id)).toEqual(["t2"]));
  });

  test("a circle media_shelf draws a fixed artist-size circle with a centred name, and a category tile carries its colour on the tile (MUSIC-POLISH-01)", async () => {
    const { view } = draw(parse({ type: "media_shelf", heading: "Artists", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover", art_shape: "circle", variant: "plain" }));
    await view.findByRole("list", { name: "Artists" });
    expect(view.container.innerHTML).toContain("w-[var(--media-artist-size)]");
    expect(view.container.querySelector("li")?.className).toContain("text-center");
    const tiles = draw(parse({ type: "category_tiles", label: "Browse", bind, item_key_field: "id", item_label_field: "title", item_color_field: "color" }));
    await tiles.view.findByRole("list", { name: "Browse" });
    expect(tiles.view.container.querySelector("li[style*='--tile-color']")).toBeTruthy();
  });

  test("track_rows row_actions draw a quiet icon button per row that dispatches with the row (MUSIC-POLISH-01)", async () => {
    const { view } = draw(parse({ type: "track_rows", label: "Tracks", bind, item_key_field: "id", item_label_field: "title", on_play: play, row_actions: [{ icon: "x", label: "Remove", action: play }] }));
    await view.findByRole("list", { name: "Tracks" });
    const buttons = view.getAllByRole("button", { name: /^Remove: / });
    expect(buttons.length).toBeGreaterThan(0);
    expect(view.container.querySelector("[data-slot=track-actions]")).toBeTruthy();
  });

  test("track_rows without a meta field draws no end label (a child profile binds rows with no count)", async () => {
    const { view } = draw(parse({ type: "track_rows", label: "Tracks", bind, item_key_field: "id", item_label_field: "title", item_meta_field: "plays", on_play: play }));
    await view.findByRole("list", { name: "Tracks" });
    expect(view.container.querySelector("[data-slot=track-meta]")?.textContent ?? "").toBe("");
  });

  test("hide_when_empty draws nothing for no rows", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]", { status: 200 }))) as unknown as typeof fetch;
    const { view } = draw(parse({ type: "quick_tiles", label: "Pick up", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover", hide_when_empty: true }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(view.queryByRole("list")).toBeNull();
  });

  test("a play action with no host is refused quietly, like a shelf tile", async () => {
    const view = renderWithQueryClient(
      <MemoryRouter><PackageScopeContext.Provider value={{ packageId: "music" }}><NodeRenderer node={parse({ type: "track_rows", label: "Tracks", bind, item_key_field: "id", item_label_field: "title", on_play: play })} state={{}} /></PackageScopeContext.Provider></MemoryRouter>,
    );
    await view.findByRole("list", { name: "Tracks" });
    fireEvent.click(view.getByRole("button", { name: "Play Morning Light" }));
    await view.findByRole("status");
  });
});

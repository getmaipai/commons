import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { MediaHostContext } from "@/kit/schema/mediaHost";
import { MediaShelfNodeSchema, PageNodeSchema, PickerNodeSchema, UiNodeSchema, type UiNode } from "@/kit/schema/types";

const fixture = (name: string) => PageNodeSchema.parse(JSON.parse(readFileSync(new URL(`../../../spec/ui/pages/${name}.json`, import.meta.url), "utf8")));
const music = fixture("music-album");
const shows = fixture("shows-detail");
const rows = [
  { id: "t1", title: "First track", artist: "Artist", cover: "/art/first.jpg", portrait: "/art/artist.jpg", thumbnail: "/art/first.jpg", poster: "/art/poster.jpg", track_number: 0, duration_s: 194, playing: true, up_next: true, save_label: "Saved", flags: { current: true }, track: { number: 0 } },
  { id: "t2", title: "Second track", artist: "Artist", cover: "/art/second.jpg", track_number: 2, duration_s: "4:01", playing: false, save_label: "", flags: { current: "true" }, track: { number: 2 } },
];
const originalFetch = globalThis.fetch;
let calls: Array<{ url: string; body: Record<string, unknown> }>;
let saved: boolean;

beforeEach(() => {
  calls = [];
  saved = false;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, body });
    let result: unknown = rows;
    if (url.endsWith("/data/seasons")) result = { rows: [{ id: "s1", label: "Season 1" }, { id: "s2", label: "Season 2" }] };
    if (url.endsWith("/data/episodes")) result = [{ ...rows[0], title: body.season === "s1" ? "First season episode" : "Second season episode" }];
    if (url.endsWith("/save")) { saved = true; result = { ok: true }; }
    if (url.endsWith("/data/tracks")) result = rows.map((row) => row.id === "t2" && saved ? { ...row, save_label: "Saved" } : row);
    return Promise.resolve(new Response(JSON.stringify(result), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

function mount(node: UiNode, packageId = "music", initialState: Record<string, unknown> = { id: "album-1" }) {
  const onPlay = mock((_id: string, _row: Record<string, unknown>) => {});
  function Page() {
    const [state, setState] = useState(initialState);
    return (
      <PageStateContext.Provider value={{ merge: (patch) => setState((old) => ({ ...old, ...patch })) }}>
        <NodeRenderer node={node} state={state} />
      </PageStateContext.Provider>
    );
  }
  return {
    ...renderWithQueryClient(
      <MemoryRouter initialEntries={[`/apps/${packageId}?season=s1`]}>
        <PackageScopeContext.Provider value={{ packageId }}>
          <MediaHostContext.Provider value={{ onPlay }}><Page /></MediaHostContext.Provider>
        </PackageScopeContext.Provider>
      </MemoryRouter>,
    ),
    onPlay,
  };
}

describe("media variant node rendering", () => {
  test("the album's compact track rows render a leading zero, two lines and a trailing formatted duration", async () => {
    const { findByRole, container } = mount(music.body[1]!);
    const list = await findByRole("list", { name: "Tracks" });
    expect(list.getAttribute("data-density")).toBe("compact");
    const first = list.querySelector("li")!;
    expect(first.querySelector('[data-slot="media-shelf-index"]')!.textContent).toBe("0");
    expect(first.querySelector("button")!.className).toContain("w-[72px]");
    expect(first.querySelector(".line-clamp-2")!.textContent).toBe("First trackArtist");
    expect(first.querySelector('[data-slot="media-shelf-duration"]')!.textContent).toBe("3:14");
    expect(within(list).getByText("4:01")).toBeTruthy();
    expect(container.querySelector('[data-slot="media-tile-meta"]')).toBeNull();
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(first.querySelector("button")!.className).toContain("ring-[var(--media-current-ring)]");
    expect(list.querySelectorAll("li")[1]!.hasAttribute("aria-current")).toBe(false);
  });

  test("row Play and Save receive their own row; Save refetches its dynamic label without selecting the tile", async () => {
    const { findByRole, onPlay } = mount(music.body[1]!);
    const play = await findByRole("button", { name: "Play: Second track" });
    expect(play.className).toContain("size-[48px]");
    expect(play.parentElement!.closest("button")).toBeNull();
    fireEvent.click(play);
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
    expect(onPlay.mock.calls[0]).toEqual(["t2", rows[1]!]);
    const save = await findByRole("button", { name: "Save: Second track" });
    expect(save.className).toContain("min-h-[48px]");
    expect(save.textContent).toBe("Save");
    fireEvent.click(save);
    await waitFor(() => expect(calls.find((call) => call.url === "/api/plugins/music/save")?.body).toEqual({ media_id: "t2" }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect((await findByRole("button", { name: "Saved: Second track" })).textContent).toBe("Saved");
  });

  test("highlight and index read dotted paths, with only boolean true highlighted", async () => {
    const node = MediaShelfNodeSchema.parse({ ...music.body[1], item_highlight_field: "flags.current", item_index_field: "track.number" });
    const { findByRole } = mount(node);
    const list = await findByRole("list", { name: "Tracks" });
    expect(list.querySelectorAll('li[aria-current="true"]')).toHaveLength(1);
    expect(list.querySelector('[data-slot="media-shelf-index"]')!.textContent).toBe("0");
  });

  test("a row action without label_field fills its label and target from the row", async () => {
    const node = MediaShelfNodeSchema.parse({ ...music.body[1], row_actions: [{ icon: "bookmark", label: "Keep {title}", action: { call: { target: "/api/plugins/music/{id}/save", args: { number: "{track.number}" } } } }] });
    const { findByRole } = mount(node);
    const keep = await findByRole("button", { name: "Keep Second track: Second track" });
    expect(keep.textContent).toBe("Keep Second track");
    fireEvent.click(keep);
    await waitFor(() => expect(calls.find((call) => call.url === "/api/plugins/music/t2/save")?.body).toEqual({ number: "2" }));
  });

  for (const [page, i, heading, shape] of [[music, 2, "More albums", "aspect-square"], [shows, 3, "More shows", "aspect-[2/3]"]] as const) {
    test(`${heading} fixture renders a wrapping grid with its declared artwork`, async () => {
      const { findByRole } = mount(page.body[i]!, heading === "More albums" ? "music" : "shows");
      const grid = await findByRole("list", { name: heading });
      expect(grid.getAttribute("data-layout")).toBe("grid");
      expect(grid.className).toContain("grid-cols-2");
      expect(grid.querySelector("img")!.parentElement!.className).toContain(shape);
    });
  }

  test("the artists fixture renders circular artwork through art_shape", async () => {
    const { findByRole } = mount(music.body[3]!);
    const list = await findByRole("list", { name: "Artists" });
    expect(list.querySelector("img")!.parentElement!.className).toContain("rounded-full");
    expect(list.querySelector("img")!.parentElement!.className).toContain("aspect-square");
  });

  test("empty grids hide the heading as well as the empty state", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]"))) as unknown as typeof fetch;
    const { container } = mount(music.body[2]!);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toBe(""));
  });

  test("bound season pills select from page state and choosing another season refetches episodes with its key", async () => {
    const { findByRole, findByText, getByRole, onPlay } = mount(shows, "shows", { id: "show-1", season: "s2" });
    const list = await findByRole("tablist", { name: "Seasons" });
    expect(list.getAttribute("data-variant")).toBe("pill");
    const second = await findByRole("tab", { name: "Season 2" });
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(second.className).toContain("min-h-[48px]");
    await findByText("Second season episode");
    expect(calls.find((call) => call.url.endsWith("/data/seasons"))?.body).toEqual({ show_id: "show-1" });
    fireEvent.click(getByRole("tab", { name: "Season 1" }));
    await findByText("First season episode");
    expect(getByRole("tab", { name: "Season 1" }).getAttribute("aria-selected")).toBe("true");
    expect(calls.some((call) => call.url.endsWith("/data/episodes") && call.body.season === "s1")).toBe(true);
    const episode = getByRole("list", { name: "Episodes" }).querySelector("li")!;
    expect(episode.getAttribute("aria-current")).toBe("true");
    fireEvent.click(getByRole("button", { name: "Play: First season episode" }));
    await waitFor(() => expect(onPlay.mock.calls[0]?.[0]).toBe("t1"));
  });

  test("a pill picker also supports fixed leading options without a binding", () => {
    const { getByRole } = mount(PickerNodeSchema.parse({ type: "picker", variant: "pill", state: "season", label: "Seasons", leading: [{ value: "s1", label: "Season 1" }, { value: "s2", label: "Season 2" }] }), "shows", { season: "s2" });
    expect(getByRole("tab", { name: "Season 2" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(getByRole("tab", { name: "Season 1" }));
    expect(getByRole("tab", { name: "Season 1" }).getAttribute("aria-selected")).toBe("true");
    expect(calls).toHaveLength(0);
  });

  test("a confirmed row action keeps its row fields through the confirmation", async () => {
    const node = MediaShelfNodeSchema.parse({ ...music.body[1], row_actions: [{ icon: "bookmark", label: "Save", action: { confirm: { prompt: "Save {title}?", on_confirm: { call: { target: "/api/plugins/music/save", args: { media_id: "{id}" } } } } } }] });
    const { findByRole } = mount(node);
    fireEvent.click(await findByRole("button", { name: "Save: First track" }));
    const dialog = await findByRole("alertdialog", { name: "Save First track?" });
    expect(calls.some((call) => call.url.endsWith("/save"))).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(calls.find((call) => call.url.endsWith("/save"))?.body).toEqual({ media_id: "t1" }));
  });
});

describe("media variant interpreter schemas", () => {
  test("both new page fixtures keep their new fields through Zod parsing", () => {
    expect(music.body[1]).toMatchObject({ density: "compact", item_index_field: "track_number", item_highlight_field: "playing" });
    expect(music.body[3]).toMatchObject({ layout: "grid", art_shape: "circle" });
    expect(shows.body[1]).toMatchObject({ variant: "pill" });
  });

  test("new enum, field and row action constraints reject malformed nodes", () => {
    for (const patch of [
      { layout: "masonry" }, { art_shape: "oval" }, { density: "tiny" },
      { item_index_field: 1 }, { item_highlight_field: true },
      { row_actions: [{ icon: "play", label: "Play" }] },
      { row_actions: Array.from({ length: 3 }, () => ({ icon: "play", label: "Play", action: { play: { media_id: "{id}" } } })) },
    ]) expect(UiNodeSchema.safeParse({ ...music.body[1], ...patch }).success).toBe(false);
    expect(PickerNodeSchema.safeParse({ type: "picker", state: "season", label: "Seasons", variant: "chips" }).success).toBe(false);
  });
});

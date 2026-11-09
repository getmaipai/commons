import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { ActionSchema, CreationHeaderNodeSchema, MediaShelfNodeSchema, PageNodeSchema, PlayerNodeSchema, SearchNodeSchema, TrackRowsNodeSchema, type UiNode } from "@/kit/schema/types";
import { hubLink } from "@/kit/schema/shareLink";

const page = PageNodeSchema.parse(JSON.parse(readFileSync(new URL("../../../spec/ui/pages/media-parity.json", import.meta.url), "utf8")));
const originalFetch = globalThis.fetch;
let calls: Array<{ url: string; body: Record<string, unknown> }>;
const library = [
  { id: "a1", title: "Alpha", creator: "Ana", cover: "/art/a.jpg", creator_avatar: "/art/ana.jpg", badge: "Saved", pinned: true, artist_id: "ar1" },
  { id: "b1", title: "Beta", creator: "Bo", cover: "/art/b.jpg", pinned: false, artist_id: "ar2" },
  { id: "c1", title: "Gamma", creator: "Cy", cover: "/art/c.jpg", pinned: true, artist_id: "ar3" },
];

beforeEach(() => {
  calls = [];
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, body });
    let result: unknown = library;
    if (url.endsWith("/data/transcript")) result = { rows: [{ start_s: 0, text: "Hello there" }, { start_s: 30, text: "Second paragraph" }] };
    if (url.endsWith("/data/header")) result = { title: "Mix", art: "/art/a.jpg", creator: { label: "Made at home" } };
    if (url.endsWith("/data/recent-searches")) result = { rows: [{ key: "a", label: "alpha" }] };
    if (url.endsWith("/data/episode")) result = { id: "e1", src: "/media/e1.mp3", title: "Episode", subtitle: "Show", poster: "/art/a.jpg", description: "About" };
    return Promise.resolve(new Response(JSON.stringify(result), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

function mount(node: UiNode, initialState: Record<string, unknown> = {}) {
  function Page() {
    const [state, setState] = useState(initialState);
    return (
      <PageStateContext.Provider value={{ merge: (patch) => setState((old) => ({ ...old, ...patch })) }}>
        <div data-testid="state">{JSON.stringify(state)}</div>
        <NodeRenderer node={node} state={state} />
      </PageStateContext.Provider>
    );
  }
  return renderWithQueryClient(<MemoryRouter initialEntries={["/apps/music"]}><PackageScopeContext.Provider value={{ packageId: "music" }}><Page /></PackageScopeContext.Provider></MemoryRouter>);
}

describe("PARITY-01 schema parsing", () => {
  test("the shared fixture parses and every new field survives the kit schemas", () => {
    expect(page.body).toHaveLength(4);
    const [search, header, shelf, player] = [page.body[0], page.body[1], page.body[2], page.body[3]] as unknown as [ReturnType<typeof SearchNodeSchema.parse>, ReturnType<typeof CreationHeaderNodeSchema.parse>, ReturnType<typeof MediaShelfNodeSchema.parse>, ReturnType<typeof PlayerNodeSchema.parse>];
    expect(search.type_chips?.options).toHaveLength(3);
    expect(header.backdrop).toBe("art_gradient");
    expect(shelf.sort?.state).toBe("sort");
    expect(shelf.chips?.options[2]?.value).toBe("playlists");
    expect(shelf.pinned_field).toBe("pinned");
    expect(shelf.row_actions).toHaveLength(3);
    expect(player.skip).toEqual({ back: 15, forward: 30 });
    expect(player.details_show).toContain("transcript");
  });
  test("row actions allow three, not four, and share must be a hub route", () => {
    const action = { icon: "play", label: "x", action: { navigate: { to: "/a" } } };
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    expect(() => MediaShelfNodeSchema.parse({ ...shelf, row_actions: [action, action, action] })).not.toThrow();
    expect(() => MediaShelfNodeSchema.parse({ ...shelf, row_actions: [action, action, action, action] })).toThrow();
    expect(() => TrackRowsNodeSchema.parse({ type: "track_rows", bind: { source: "package", path: "x" }, label: "T", item_key_field: "id", item_label_field: "t", on_play: { navigate: { to: "/a" } }, row_actions: [action, action, action] })).not.toThrow();
    expect(() => ActionSchema.parse({ share: { to: "/apps/music/album?id=1" } })).not.toThrow();
    expect(() => ActionSchema.parse({ share: { to: "https://example.com" } })).toThrow();
  });
  test("hubLink builds a full address from a route", () => {
    expect(hubLink("/apps/music/album?id=1", "https://hub.example.com")).toBe("https://hub.example.com/apps/music/album?id=1");
  });
});

describe("media_shelf controls", () => {
  const shelf = page.body[2]!;
  test("pinned rows come first in their own row and the rest follow", async () => {
    const view = mount(shelf);
    const pinned = await view.findByRole("list", { name: "Pinned" });
    expect(within(pinned).getAllByRole("listitem")).toHaveLength(2);
    expect(within(pinned).getByText("Alpha")).toBeTruthy();
    const main = await view.findByRole("list", { name: "Your library" });
    expect(within(main).queryByText("Alpha")).toBeNull();
    expect(within(main).getByText("Beta")).toBeTruthy();
  });
  test("the avatar draws beside the caption and three row actions show", async () => {
    const view = mount(shelf);
    const main = await view.findByRole("list", { name: "Your library" });
    await waitFor(() => expect(within(main).getAllByRole("button", { name: /Play next/ })).toHaveLength(1));
    expect(within(main).getAllByRole("button", { name: /Go to artist|Share/ })).toHaveLength(2);
    expect(view.container.querySelectorAll('[data-slot="shelf-avatar-caption"]')).toHaveLength(1);
    cleanup();
    const withAvatar = mount({ ...shelf, pinned_field: undefined } as UiNode);
    await withAvatar.findByRole("list", { name: "Your library" });
    expect(withAvatar.container.querySelectorAll('[data-slot="shelf-avatar-caption"]')).toHaveLength(1);
  });
  test("the sort select and filter chips write page state and the next call carries it", async () => {
    const view = mount(shelf);
    await view.findByRole("list", { name: "Your library" });
    const chips = view.getByRole("group", { name: "Filter" });
    expect(within(chips).getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(chips).getByRole("button", { name: "Albums" }));
    await waitFor(() => expect(view.getByTestId("state").textContent).toContain('"library_kind":"albums"'));
    await waitFor(() => expect(calls.some((call) => call.body.kind === "albums")).toBe(true));
    expect(within(view.getByRole("group", { name: "Filter" })).getByRole("button", { name: "Albums" }).getAttribute("aria-pressed")).toBe("true");
    expect(view.getByRole("combobox", { name: "Sort by" })).toBeTruthy();
  });
  test("the controls stay when a filter matches nothing", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]"))) as unknown as typeof fetch;
    const view = mount(shelf);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(await view.findByRole("group", { name: "Filter" })).toBeTruthy();
  });
});

describe("search type chips, header backdrop, share and transcript", () => {
  test("type chips write their page-state key; the first option is the default", async () => {
    const view = mount(page.body[0]!);
    const group = await view.findByRole("group", { name: "Result type" });
    expect(within(group).getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(group).getByRole("button", { name: "Songs" }));
    await waitFor(() => expect(view.getByTestId("state").textContent).toContain('"kind":"songs"'));
    fireEvent.click(within(group).getByRole("button", { name: "All" }));
    await waitFor(() => expect(view.getByTestId("state").textContent).not.toContain("kind"));
  });
  test("creation_header with backdrop draws the static art gradient behind it, none by default", async () => {
    const view = mount(page.body[1]!);
    await view.findByRole("heading", { name: "Mix" });
    expect(view.container.querySelector('[data-slot="art-gradient"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="art-gradient"]')!.getAttribute("aria-hidden")).toBe("true");
    cleanup();
    const plain = mount({ ...page.body[1]!, backdrop: undefined } as UiNode);
    await plain.findByRole("heading", { name: "Mix" });
    expect(plain.container.querySelector('[data-slot="art-gradient"]')).toBeNull();
  });
  test("the share action copies a hub link when there is no share sheet", async () => {
    const writeText = mock((_t: string) => Promise.resolve());
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");
    Object.defineProperty(globalThis.navigator, "clipboard", { configurable: true, value: { writeText } });
    const originalShare = Object.getOwnPropertyDescriptor(globalThis.navigator, "share");
    Object.defineProperty(globalThis.navigator, "share", { configurable: true, value: undefined });
    try {
      const view = mount(page.body[2]!);
      const main = await view.findByRole("list", { name: "Your library" });
      fireEvent.click(await within(main).findByRole("button", { name: "Share: Beta" }));
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      expect(writeText.mock.calls[0]![0]).toMatch(/\/apps\/music\/album\?id=b1$/);
    } finally {
      if (original) Object.defineProperty(globalThis.navigator, "clipboard", original);
      else delete (globalThis.navigator as unknown as Record<string, unknown>).clipboard;
      if (originalShare) Object.defineProperty(globalThis.navigator, "share", originalShare);
      else delete (globalThis.navigator as unknown as Record<string, unknown>).share;
    }
  });
  test("the player details show a Transcript button that opens the reader fed by transcript_bind", async () => {
    const view = mount(page.body[3]!, { id: "e1" });
    const open = await view.findByRole("button", { name: "Transcript" });
    fireEvent.click(open);
    expect(await within(document.body).findByRole("button", { name: "Second paragraph" })).toBeTruthy();
    expect(calls.some((call) => call.url.endsWith("/data/transcript"))).toBe(true);
  });
});

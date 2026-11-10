// CLIPS-FEED-01 (spec 0.1.355): the `clip_feed` node maps the page's bound rows to the kit ClipFeed and runs its actions.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext } from "@/kit/schema/packageScope";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
const proto = HTMLMediaElement.prototype as unknown as { play: () => Promise<void>; pause: () => void };
const realPlay = proto.play;
const realPause = proto.pause;
let plays: string[] = [];
beforeEach(() => {
  stubMatchMedia({});
  plays = [];
  proto.play = function (this: HTMLVideoElement) { plays.push(this.getAttribute("src") ?? ""); return Promise.resolve(); };
  proto.pause = () => {};
});
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; proto.play = realPlay; proto.pause = realPause; });

const rows = [
  { id: "c1", file: { url: "/m/1.mp4" }, poster: { url: "/p/1.jpg" }, title: "Blue Hour", made_by: "By nova", duration_s: 12, liked: false },
  { id: "c2", file: { url: "https://elsewhere.example.com/x.mp4" }, poster: { url: "/p/2.jpg" }, title: "Not local", duration_s: 5 },
  { id: "c3", file: { url: "/m/3.mp4" }, poster: { url: "/p/3.jpg" }, title: "Third", duration_s: 9, liked: true },
];
const calls: Array<{ url: string; method: string; body: unknown }> = [];
const answer = (data: unknown) => {
  calls.length = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    if (url.includes("/data/clips")) return Promise.resolve(new Response(JSON.stringify(data)));
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  }) as unknown as typeof fetch;
};
const feed = (extra: Record<string, unknown> = {}) => PageNodeSchema.parse({
  type: "page", id: "p", title: "P",
  body: [{
    type: "clip_feed",
    bind: { source: "package", path: "clips" },
    item_fields: { src: "file.url", poster: "poster.url", title: "title", subtitle: "made_by", duration_s: "duration_s", id: "id", liked: "liked" },
    actions: {
      like: { call: { target: "/api/plugins/clips/like/{id}", method: "PATCH", args: { liked: "{liked}" } } },
      remake: { starts: "video", navigate: { to: "/apps/clips/make?from={id}" } },
    },
    empty_state: { type: "empty_state", icon: "film", text: "No clips yet." },
    ...extra,
  }],
}).body[0] as UiNode;
const draw = (node: UiNode, host: MediaHost | null = null) =>
  renderWithQueryClient(
    <MemoryRouter initialEntries={["/apps/clips"]}>
      <PackageScopeContext.Provider value={{ packageId: "clips" } as never}>
        <MediaHostContext.Provider value={host}><NodeRenderer node={node} /></MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );

describe("clip_feed node", () => {
  test("draws the bound rows, skipping a clip whose file is not same-origin", async () => {
    answer(rows);
    const view = draw(feed());
    await view.findByText("Blue Hour");
    expect(view.getAllByRole("group")).toHaveLength(2);
    expect(view.queryByText("Not local")).toBeNull();
    expect(view.getByText("By nova")).toBeTruthy();
    await waitFor(() => expect(plays).toContain("/m/1.mp4"));
  });
  test("start_id opens on that clip", async () => {
    answer(rows);
    const view = draw(feed({ start_id: "c3" }));
    await view.findByText("Third");
    expect(view.container.querySelector("[data-slot=clip-feed-stage][data-active=true] h2")!.textContent).toBe("Third");
  });
  test("Like calls the action with the row and the new typed value", async () => {
    answer(rows);
    const view = draw(feed());
    fireEvent.click(await view.findByRole("button", { name: "Like" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const sent = calls.find((c) => c.method === "PATCH")!;
    expect(sent.url).toContain("/api/plugins/clips/like/c1");
    expect(sent.body).toEqual({ liked: true });
  });
  test("Make another navigates with the row", async () => {
    answer(rows);
    const view = draw(feed({ actions: { remake: { navigate: { to: "/apps/clips/make?from={id}" } } } }));
    fireEvent.click(await view.findByRole("button", { name: "Make another" }));
    // a navigate inside the package's own app is accepted without a call
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.filter((c) => c.method !== "POST" || !c.url.includes("/data/clips"))).toEqual([]);
  });
  test("Make another is disabled with the host's notice while video is unavailable", async () => {
    answer(rows);
    const host = { onPlay: () => {}, makingNotice: (kind: string) => (kind === "video" ? "Video is not ready yet." : undefined) } as unknown as MediaHost;
    const view = draw(feed(), host);
    const button = (await view.findByRole("button", { name: "Make another" })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(view.getByText("Video is not ready yet.")).toBeTruthy();
  });
  test("autoplay_field false (a child band) means no autoplay and a Play button", async () => {
    answer(rows.map((r) => ({ ...r, autoplay: false })));
    const view = draw(feed({ autoplay_field: "autoplay" }));
    await view.findByText("Blue Hour");
    await new Promise((r) => setTimeout(r, 20));
    expect(plays).toEqual([]);
    expect(view.container.querySelector("[data-slot=clip-feed-play]")).not.toBeNull();
  });
  test("autoplay: false on the node does the same", async () => {
    answer(rows);
    const view = draw(feed({ autoplay: false }));
    await view.findByText("Blue Hour");
    await new Promise((r) => setTimeout(r, 20));
    expect(plays).toEqual([]);
  });
  test("no rows: the status card from empty_state and a Close button", async () => {
    answer([]);
    const view = draw(feed());
    await view.findByText("No clips yet.");
    expect(view.getByRole("button", { name: "Close" })).toBeTruthy();
  });
  test("Close runs on_close", async () => {
    answer(rows);
    const view = draw(feed({ on_close: { call: { target: "/api/plugins/clips/closed", method: "POST" } } }));
    fireEvent.click(await view.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(calls.some((c) => c.url.includes("/api/plugins/clips/closed"))).toBe(true));
  });
});

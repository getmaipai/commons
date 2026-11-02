// VIDEO-UI-04 (K9, K10): the result_feed node. A running entry follows its job without a reload (fake timers), a hidden tab
// catches up when shown, and only running rows' own records are read.
import { afterEach, beforeEach, describe, expect, jest, mock, test } from "bun:test";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { FEED_POLL_INTERVAL_MS } from "@/kit/schema/feedPolling";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PackageScopeContext, PageStateContext } from "@/kit/schema/packageScope";
import { ResultFeedNodeSchema, type UiNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
interface Call { url: string; body: Record<string, unknown> }

let calls: Call[] = [];
let server: Row[] = [];
const originalFetch = globalThis.fetch;

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

beforeEach(() => {
  jest.useFakeTimers();
  calls = [];
  setVisibility("visible");
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ url: String(input), body });
    const url = String(input);
    if (url.endsWith("/data/recipes") && body.scope === "job") return Promise.resolve(new Response(JSON.stringify(server.find((r) => r.id === body.id) ?? null), { status: 200 }));
    if (url.endsWith("/data/recipes")) return Promise.resolve(new Response(JSON.stringify(server), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  setVisibility("visible");
  globalThis.fetch = originalFetch;
});

const feed = ResultFeedNodeSchema.parse({
  type: "result_feed",
  bind: { source: "package", path: "recipes", params: { scope: "feed", favorites: "$state.favorites_only" } },
  fields: { words: "prompt", tags: "tags", references: "references", status: "status", progress: "percent", poster: "still", src: "src", favorite: "favorite", created_at: "created_at" },
  filters: [
    { kind: "toggle", state: "favorites_only", label: "Favorites only" },
    { kind: "toggle", state: "group_by_words", label: "Group by words", group: true },
    { kind: "select", state: "type", label: "Type", options: [{ value: "all", label: "All" }, { value: "video", label: "Videos" }] },
  ],
  handlers: {
    stop: { call: { target: "/api/plugins/videos/actions/cancel", args: { id: "{id}" } } },
    retry: { starts: "video", call: { target: "/api/plugins/videos/actions/another", args: { id: "{id}" } } },
  },
  actions: [{ label: "Make it Max", starts: "video", action: { call: { target: "/api/plugins/videos/actions/max", args: { id: "{id}" } } } }],
  poll_while: { statuses: ["queued", "generating"], record: { path: "recipes", params: { scope: "job", id: "{id}" } } },
}) as unknown as UiNode;

const now = new Date().toISOString();
const queued = (id = "a", extra: Row = {}): Row => ({ id, prompt: `a fox ${id}`, status: "queued", percent: null, tags: ["Anime"], references: [{ label: "Start frame", thumb: "/t.png" }], created_at: now, ...extra });

function Harness({ host = null, node = feed }: { host?: MediaHost | null; node?: UiNode }) {
  const [state, setState] = useState<Row>({});
  return (
    <MemoryRouter>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <PageStateContext.Provider value={{ merge: (patch) => setState((prev) => ({ ...prev, ...patch })) }}>
            <NodeRenderer node={node} state={state} />
          </PageStateContext.Provider>
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>
  );
}

/** Advances fake time and lets promises and React Query's scheduler settle. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(0);
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}
const jobReads = () => calls.filter((c) => c.body.scope === "job");

describe("result_feed poll_while", () => {
  test("an entry moves from queued to a percent to done without a reload, then polling stops", async () => {
    server = [queued()];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    expect(view.getByText("Waiting its turn")).toBeTruthy();
    expect(jobReads().length).toBe(0);

    server = [queued("a", { status: "generating", percent: 40 })];
    await advance(FEED_POLL_INTERVAL_MS);
    expect(view.getByText(/40%/)).toBeTruthy();
    expect(view.queryByText("Waiting its turn")).toBeNull();

    server = [{ ...queued("a"), status: "ready", percent: 100, src: "/api/plugins/videos/assets/a.mp4", still: "/p.png" }];
    await advance(FEED_POLL_INTERVAL_MS);
    expect(view.container.querySelector("video")).toBeTruthy();
    expect(view.queryByText(/40%/)).toBeNull();

    const reads = jobReads().length;
    expect(reads).toBe(2);
    await advance(FEED_POLL_INTERVAL_MS * 4);
    expect(jobReads().length).toBe(reads);
  });

  test("only the running rows' own records are read, by id", async () => {
    server = [queued("a"), { ...queued("b"), status: "ready", src: "/b.mp4" }, queued("c")];
    renderWithQueryClient(<Harness />);
    await advance(0);
    await advance(FEED_POLL_INTERVAL_MS);
    expect(jobReads().map((c) => c.body.id).sort()).toEqual(["a", "c"]);
  });

  test("nothing is polled when no row is running", async () => {
    server = [{ ...queued("a"), status: "ready", src: "/a.mp4" }];
    renderWithQueryClient(<Harness />);
    await advance(0);
    await advance(FEED_POLL_INTERVAL_MS * 5);
    expect(jobReads().length).toBe(0);
  });

  test("a hidden tab waits, and catches up the moment it is shown", async () => {
    server = [queued()];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    setVisibility("hidden");
    server = [queued("a", { status: "generating", percent: 55 })];
    await advance(FEED_POLL_INTERVAL_MS * 3);
    expect(jobReads().length).toBe(0);
    expect(view.queryByText(/55%/)).toBeNull();
    setVisibility("visible");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await advance(0);
    expect(jobReads().length).toBe(1);
    expect(view.getByText(/55%/)).toBeTruthy();
  });

  test("a failed read keeps what the feed has and the next tick tries again", async () => {
    server = [queued()];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    const real = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
    await advance(FEED_POLL_INTERVAL_MS);
    expect(view.getByText("Waiting its turn")).toBeTruthy();
    globalThis.fetch = real;
    server = [queued("a", { status: "generating", percent: 10 })];
    await advance(FEED_POLL_INTERVAL_MS);
    expect(view.getByText(/10%/)).toBeTruthy();
  });
});

describe("result_feed entries", () => {
  test("words, tags, a Start frame chip and a day heading draw for each entry", async () => {
    server = [queued("a"), queued("b")];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    expect(view.getAllByText("Start frame").length).toBe(2);
    expect(view.getAllByText("Anime").length).toBe(2);
    expect(view.getByRole("separator", { name: "Today, 2 clips" })).toBeTruthy();
    expect(view.getAllByRole("article").length).toBe(2);
  });

  test("a handler runs its action with the row; Stop calls cancel with the id", async () => {
    server = [queued("a")];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    await act(async () => { fireEvent.click(view.getByRole("button", { name: /Stop/ })); });
    await advance(0);
    const cancel = calls.find((c) => c.url === "/api/plugins/videos/actions/cancel");
    expect(cancel?.body).toEqual({ id: "a" });
  });

  test("K8: while the host says video is not ready, a starts handler does nothing and a starts action is disabled with the notice", async () => {
    server = [{ ...queued("a"), status: "ready", src: "/a.mp4" }, { ...queued("b"), status: "failed", error: "No." }];
    const host = { onPlay: () => {}, makingNotice: (kind: string) => (kind === "video" ? "Video is not ready yet." : undefined) } as unknown as MediaHost;
    const view = renderWithQueryClient(<Harness host={host} />);
    await advance(0);
    const max = view.getByRole("button", { name: "Make it Max" }) as HTMLButtonElement;
    expect(max.disabled).toBe(true);
    // K8: the reason shows as visible notice text on the entry, and the built-in Try again is disabled through controls.retry.
    expect(view.getAllByText("Video is not ready yet.").length).toBeGreaterThan(0);
    expect((view.getByRole("button", { name: /Try again/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    const ok = renderWithQueryClient(<Harness />);
    await advance(0);
    expect((ok.getAllByRole("button", { name: "Make it Max" })[0] as HTMLButtonElement).disabled).toBe(false);
    expect((ok.getByRole("button", { name: /Try again/ }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { fireEvent.click(ok.getByRole("button", { name: /Try again/ })); });
    await advance(0);
    expect(calls.some((c) => c.url.endsWith("/actions/another"))).toBe(true);
  });

  test("a draft entry draws the still, its three built-in actions, Favorite, the icons row and the pane width", async () => {
    server = [{ ...queued("d"), status: "draft", still: "/still.png", favorite: true }];
    const node = {
      ...(feed as object),
      handlers: {
        render: { starts: "video", call: { target: "/api/plugins/videos/actions/render", args: { draft: "{id}" } } },
        another_still: { starts: "picture", call: { target: "/api/plugins/videos/actions/still", args: { draft: "{id}" } } },
        edit_words: { navigate: { to: "/create" } },
        favorite: { call: { target: "/api/plugins/videos/actions/favorite", args: { id: "{id}" } } },
      },
      actions_variant: "icons",
      actions_inline: 2,
    } as unknown as UiNode;
    const host = { onPlay: () => {}, makingNotice: (kind: string) => (kind === "video" ? "Video is not ready yet." : undefined) } as unknown as MediaHost;
    const view = renderWithQueryClient(<Harness node={node} host={host} />);
    await advance(0);
    const card = view.container.querySelector('[data-slot="video-player"]') as HTMLElement;
    expect(card.getAttribute("data-status")).toBe("draft");
    expect(card.className).toContain("max-w-3xl");
    expect(view.container.querySelector('[data-slot="video-player-still"] img')?.getAttribute("src")).toContain("still.png");
    // Render starts a video (disabled with the notice), Another still starts a picture (enabled).
    expect((view.getByRole("button", { name: "Make the video from this" }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.getAllByText("Video is not ready yet.").length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(view.getByRole("button", { name: "Another still" })); });
    await advance(0);
    expect(calls.find((c) => c.url.endsWith("/actions/still"))?.body).toEqual({ draft: "d" });
    const fav = view.getByRole("button", { name: "Favorite" });
    expect(fav.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { fireEvent.click(fav); });
    await advance(0);
    expect(calls.some((c) => c.url.endsWith("/actions/favorite"))).toBe(true);
  });

  test("Favorites only writes page state and the data call carries it; Group by words gathers equal words", async () => {
    server = [queued("a", { prompt: "same words" }), queued("b", { prompt: "same words" }), queued("c", { prompt: "other" })];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    await act(async () => { fireEvent.click(view.getByRole("switch", { name: "Favorites only" })); });
    await advance(0);
    expect(calls.some((c) => c.body.scope === "feed" && c.body.favorites === true)).toBe(true);
    await act(async () => { fireEvent.click(view.getByRole("switch", { name: "Group by words" })); });
    await advance(0);
    expect(view.getByRole("separator", { name: "same words" })).toBeTruthy();
    expect(view.getByRole("separator", { name: "other" })).toBeTruthy();
    expect(view.queryByRole("separator", { name: /Today/ })).toBeNull();
  });

  test("an empty feed keeps the filter bar and shows the empty text", async () => {
    server = [];
    const view = renderWithQueryClient(<Harness node={{ ...(feed as object), empty_state: { type: "empty_state", icon: "film", text: "Your clips show here." } } as unknown as UiNode} />);
    await advance(0);
    expect(view.getByText("Your clips show here.")).toBeTruthy();
    expect(view.getByRole("switch", { name: "Favorites only" })).toBeTruthy();
  });
});

describe("result_feed look and filters_presentation (VIDEO-UI-14)", () => {
  test("the schema defaults leave the node as it was, and the new values parse", () => {
    const parsed = ResultFeedNodeSchema.parse(feed);
    expect(parsed.look).toBe("default");
    expect(parsed.filters_presentation).toBe("inline");
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), look: "media", filters_presentation: "popover" }).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), look: "masonry" }).success).toBe(false);
  });

  test("look media puts the entry's tags on its picture and its words once, and popover keeps the filters behind View", async () => {
    server = [queued("a", { status: "ready", src: "/a.mp4", favorite: false }), queued("b", { status: "generating", percent: 30 })];
    const node = ResultFeedNodeSchema.parse({ ...(feed as object), look: "media", filters_presentation: "popover", actions_variant: "icons", handlers: { ...(feed as { handlers: object }).handlers, favorite: { call: { target: "/api/plugins/videos/actions/favorite", args: { id: "{id}" } } } } }) as unknown as UiNode;
    const view = renderWithQueryClient(<Harness node={node} />);
    await advance(0);
    const articles = view.getAllByRole("article");
    expect(articles.length).toBe(2);
    expect(articles[0]!.querySelectorAll("[data-slot=video-player-badges] li").length).toBe(2);
    expect(articles[0]!.querySelector("[data-slot=video-player-overlay-favorite]")).toBeTruthy();
    expect(articles[1]!.getAttribute("data-status")).toBe("generating");
    expect(view.getByRole("button", { name: "Stop" })).toBeTruthy();
    expect(view.queryByRole("switch", { name: "Favorites only" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: /^View/ }));
    expect(view.getByRole("switch", { name: "Favorites only" })).toBeTruthy();
  });
});

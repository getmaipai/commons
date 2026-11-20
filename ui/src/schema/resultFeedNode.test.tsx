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
  test("up to 24 actions pass the schema (the rest go in the More menu)", () => {
    const many = Array.from({ length: 24 }, (_, i) => ({ label: `Action ${i}`, action: { call: { target: "/api/plugins/videos/actions/x" } } }));
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), actions: many }).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), actions: [...many, many[0]] }).success).toBe(false);
  });

  test("show_when only draws a row action for a truthy dotted field", async () => {
    server = [queued("a", { flags: { nsfw: true }, status: "failed" }), queued("b", { flags: { nsfw: false }, status: "failed" })];
    const node = { ...(feed as object), actions: [
      { label: "Unmark as NSFW", show_when: "flags.nsfw", when: ["failed"], action: { call: { target: "/api/plugins/videos/actions/unmark" } } },
      { label: "Mark as NSFW", show_when: "flags.not_nsfw", when: ["failed"], action: { call: { target: "/api/plugins/videos/actions/mark" } } },
    ] } as unknown as UiNode;
    const view = renderWithQueryClient(<Harness node={node} />);
    await advance(0);
    const actionLabels = Array.from(view.container.querySelectorAll('[data-slot="video-player-actions"] button')).map((button) => button.textContent);
    expect(actionLabels.filter((label) => label?.includes("Unmark as NSFW"))).toHaveLength(1);
    expect(actionLabels.some((label) => label?.includes("Mark as NSFW"))).toBe(false);
  });

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
    expect(view.getByRole("button", { name: /^View/ })).toBeTruthy();
  });
});

describe("result_feed facts, overlay_actions and look stage (VIDEO-KIT-01)", () => {
  const withKeys = (extra: object) => ResultFeedNodeSchema.parse({
    ...(feed as object),
    fields: { ...(feed as { fields: object }).fields, facts: "facts" },
    handlers: { ...(feed as { handlers: object }).handlers, make_another: { starts: "video", call: { target: "/api/plugins/videos/actions/another", args: { id: "{id}" } } }, favorite: { call: { target: "/api/plugins/videos/actions/favorite", args: { id: "{id}" } } } },
    ...extra,
  }) as unknown as UiNode;
  const done = (id: string, extra: Row = {}) => queued(id, { status: "ready", src: `/${id}.mp4`, still: `/${id}.jpg`, favorite: false, facts: "Full HD · 5 s", ...extra });

  test("the schema keeps the node as it was, and takes look stage, overlay_actions and fields.facts", () => {
    const base = ResultFeedNodeSchema.parse(feed);
    expect(base.overlay_actions).toBeUndefined();
    expect(base.look).toBe("default");
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), look: "stage" }).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), overlay_actions: true }).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), overlay_actions: "yes" }).success).toBe(false);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), fields: { words: "w", status: "s", facts: "facts" } }).success).toBe(true);
    expect(ResultFeedNodeSchema.safeParse({ ...(feed as object), fields: { words: "w", status: "s", facts: 3 } }).success).toBe(false);
  });

  test("fields.facts draws the row's server line under its words, and a row without it draws none", async () => {
    server = [done("a"), done("b", { facts: undefined }), done("c", { facts: "" })];
    const view = renderWithQueryClient(<Harness node={withKeys({})} />);
    await advance(0);
    const lines = view.container.querySelectorAll("[data-slot=facts-line]");
    expect(lines.length).toBe(1);
    expect(lines[0]!.textContent).toBe("Full HD · 5 s");
    expect(view.getAllByRole("article")[0]!.contains(lines[0]!)).toBe(true);
  });

  test("no facts field leaves the feed with no facts line", async () => {
    server = [done("a")];
    const view = renderWithQueryClient(<Harness />);
    await advance(0);
    expect(view.container.querySelector("[data-slot=facts-line]")).toBeNull();
  });

  test("overlay_actions floats the finished row's actions on its picture", async () => {
    server = [done("a"), queued("b", { status: "generating", percent: 30 })];
    const view = renderWithQueryClient(<Harness node={withKeys({ overlay_actions: true })} />);
    await advance(0);
    const [ready, running] = view.getAllByRole("article");
    expect(ready!.querySelector("[data-slot=video-player-overlay-pills]")).toBeTruthy();
    expect(running!.querySelector("[data-slot=video-player-overlay-pills]")).toBeNull();
    cleanup();
    const plain = renderWithQueryClient(<Harness node={withKeys({})} />);
    await advance(0);
    expect(plain.container.querySelector("[data-slot=video-player-overlay-pills]")).toBeNull();
  });

  test("look stage draws a finished row as a MediaStage whose pills run the page's actions with the row; other rows keep the player", async () => {
    server = [done("a"), queued("b", { status: "generating", percent: 30 })];
    const view = renderWithQueryClient(<Harness node={withKeys({ look: "stage", actions: [{ label: "Make it Max", starts: "video", action: { call: { target: "/api/plugins/videos/actions/max", args: { id: "{id}" } } } }] })} />);
    await advance(0);
    const [ready, running] = view.getAllByRole("article");
    expect(ready!.querySelector("[data-slot=media-stage]")).toBeTruthy();
    expect(ready!.querySelector("[data-slot=media-stage-loop]")!.getAttribute("src")).toBe("/a.mp4");
    expect(ready!.querySelector("[data-slot=facts-line]")!.textContent).toBe("Full HD · 5 s");
    expect(running!.querySelector("[data-slot=media-stage]")).toBeNull();
    expect(view.getByRole("button", { name: "Stop" })).toBeTruthy();
    const names = [...ready!.querySelectorAll("[data-slot=media-stage-pill]")].map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Download", "Make it Max", "Make another", "Favorite"]);
    await act(async () => { fireEvent.click(view.getByRole("button", { name: "Make it Max" })); });
    await advance(0);
    expect(calls.find((c) => c.url === "/api/plugins/videos/actions/max")?.body).toEqual({ id: "a" });
  });

  test("look stage disables a starts action with the host's notice", async () => {
    server = [done("a")];
    const host = { makingNotice: (kind: string) => (kind === "video" ? "Video is not ready on this home yet." : null) } as unknown as MediaHost;
    const view = renderWithQueryClient(<Harness host={host} node={withKeys({ look: "stage" })} />);
    await advance(0);
    const pill = view.getByRole("button", { name: "Make another" }) as HTMLButtonElement;
    expect(pill.disabled).toBe(true);
    expect(pill.title).toBe("Video is not ready on this home yet.");
  });
});

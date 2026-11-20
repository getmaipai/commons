// UI-BLOCKS-01: the `media_stage` node maps the first bound row to the kit MediaStage, draws its `children` in the composer slot and runs the pills and error actions.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { calls, fixtureNode, hub, mountBlock } from "../../tests/blockHarness";
import { MediaStageNodeSchema, PageNodeSchema } from "@/kit/schema/types";
import type { MediaHost } from "@/kit/schema/mediaHost";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });

const stage = {
  id: "f1", still: { url: "/media/f1.jpg", position: "50% 30%" }, loop: { url: "/media/f1-loop.mp4" }, description: "Juniper and Atlas at a lighthouse at dusk",
  state: "idle", eyebrow: "New film", title: "What should we make today?", subtitle: "Describe a scene.", pill: "Draft", progress: null, error: null,
};
const node = (change: Record<string, unknown> = {}) => fixtureNode("media-stage.json", change);
const mount = (change: Record<string, unknown> = {}) => mountBlock(node(change), { state: { film: "f1" } });
const root = (view: ReturnType<typeof mount>) => view.container.querySelector('[data-slot="media-stage"]') as HTMLElement;
const drawWithHost = (change: Record<string, unknown>, host: Partial<MediaHost>) => mountBlock(node(change), { state: { film: "f1" }, host: host as MediaHost });

describe("media_stage node", () => {
  test("the example page parses (children are page nodes), and a stage with no children is fine", () => {
    const parsed = MediaStageNodeSchema.parse(node());
    expect((parsed as { children?: { type: string }[] }).children?.[0]?.type).toBe("prompt_bar");
    expect(MediaStageNodeSchema.safeParse({ ...parsed, children: undefined }).success).toBe(true);
    expect(MediaStageNodeSchema.safeParse({ ...parsed, children: [] }).success).toBe(false);
    expect(MediaStageNodeSchema.safeParse({ ...parsed, children: [{ type: "no_such_node" }] }).success).toBe(false);
    expect(MediaStageNodeSchema.safeParse({ ...parsed, pills: Array.from({ length: 7 }, () => parsed.pills![0]) }).success).toBe(false);
    expect(PageNodeSchema.safeParse({ type: "page", id: "p", title: "P", body: [{ ...parsed, size: "huge" }] }).success).toBe(false);
  });

  test("draws the bound picture, its description, the title block and the corner label; the page's params reach the call", async () => {
    hub({ stage: [stage] });
    const view = mount();
    expect(await view.findByRole("heading", { name: "What should we make today?" })).toBeTruthy();
    expect(view.getByText("New film")).toBeTruthy();
    expect(view.getByText("Describe a scene.")).toBeTruthy();
    expect(view.getByText("Draft")).toBeTruthy();
    expect(view.getByRole("img", { name: "Juniper and Atlas at a lighthouse at dusk" })).toBeTruthy();
    const still = view.container.querySelector<HTMLImageElement>('[data-slot="media-stage-still"]')!;
    expect(still.getAttribute("src")).toBe("/media/f1.jpg");
    expect(still.style.objectPosition).toBe("50% 30%");
    expect(root(view).getAttribute("data-size")).toBe("hero");
    expect(root(view).getAttribute("data-scrim")).toBe("strong");
    expect(root(view).getAttribute("data-state")).toBe("idle");
    const asked = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(asked[0]).toBe("/api/plugins/videos/data/stage");
    expect(JSON.parse(String(asked[1].body))).toEqual({ id: "f1" });
  });

  test("children are drawn in the composer slot by the page's own renderer, and they act", async () => {
    hub({ stage: [stage] });
    const view = mount();
    await view.findByRole("heading", { name: "What should we make today?" });
    const composer = view.container.querySelector('[data-slot="media-stage-composer"]')!;
    const box = composer.querySelector("textarea") as HTMLTextAreaElement;
    expect(box).not.toBeNull();
    expect(box.getAttribute("aria-label")).toBe("Describe your film");
    fireEvent.change(box, { target: { value: "A lighthouse at dusk" } });
    fireEvent.click(composer.querySelector('button[type="submit"]')!);
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/make")).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/make"))!.body).toEqual({ prompt: "A lighthouse at dusk" });
  });

  test("a stage with no children draws no composer", async () => {
    hub({ stage: [stage] });
    const view = mount({ children: undefined, size: "stage" });
    await view.findByRole("heading", { name: "What should we make today?" });
    expect(view.container.querySelector('[data-slot="media-stage-composer"]')).toBeNull();
  });

  test("pills are buttons: one navigates inside the app, one calls with the row's own fields", async () => {
    hub({ stage: [stage] });
    const view = mount({ pills: [{ label: "Library", icon: "folder", action: { navigate: { to: "/apps/videos/library" } } }, { label: "Duplicate", action: { call: { target: "/api/plugins/videos/duplicate/{id}" } } }] });
    fireEvent.click(await view.findByRole("button", { name: "Duplicate" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/duplicate/f1")).toBe(true));
    fireEvent.click(view.getByRole("button", { name: "Library" }));
    await waitFor(() => expect(view.where().path).toBe("/apps/videos/library"));
  });

  test("starts disables pills and error actions with the host notice, then enables them without it", async () => {
    hub({ stage: [stage] });
    const n = { pills: [{ label: "Make video", starts: "video", action: { call: { target: "/api/plugins/videos/make/{id}" } } }], error_actions: [{ label: "Retry video", starts: "video", action: { call: { target: "/api/plugins/videos/retry/{id}" } } }] };
    const busy = drawWithHost(n, { makingNotice: () => "Video is not ready yet." });
    const pill = await busy.findByRole("button", { name: "Make video" }) as HTMLButtonElement;
    expect(pill.disabled).toBe(true);
    expect(pill.title).toBe("Video is not ready yet.");
    cleanup();
    hub({ stage: [{ ...stage, state: "error" }] });
    const errorBusy = drawWithHost(n, { makingNotice: () => "Video is not ready yet." });
    const errorAction = await errorBusy.findByRole("button", { name: "Retry video" }) as HTMLButtonElement;
    expect(errorAction.disabled).toBe(true);
    cleanup();
    hub({ stage: [stage] });
    const available = drawWithHost(n, { makingNotice: () => undefined });
    expect((await available.findByRole("button", { name: "Make video" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("state looping plays the loop (a same-origin file); idle and paused keep the still only", async () => {
    hub({ stage: [{ ...stage, state: "looping" }] });
    const looping = mount();
    await waitFor(() => expect(looping.container.querySelector('video[data-slot="media-stage-loop"]')?.getAttribute("src")).toBe("/media/f1-loop.mp4"));
    expect(root(looping).getAttribute("data-state")).toBe("looping");
    cleanup();
    hub({ stage: [{ ...stage, state: "paused" }] });
    const paused = mount();
    await paused.findByRole("heading", { name: "What should we make today?" });
    expect(root(paused).getAttribute("data-state")).toBe("paused");
    expect(paused.container.querySelector("video")).toBeNull();
  });

  test("a picture or loop from another origin is never loaded, and an unknown state reads as idle", async () => {
    hub({ stage: [{ ...stage, state: "dancing", still: { url: "https://elsewhere.example.com/a.jpg" }, loop: { url: "//elsewhere.example.com/a.mp4" } }] });
    const view = mount();
    await view.findByRole("heading", { name: "What should we make today?" });
    expect(root(view).getAttribute("data-state")).toBe("idle");
    expect([...view.container.querySelectorAll("[src]")].filter((el) => (el.getAttribute("src") ?? "").includes("elsewhere"))).toEqual([]);
  });

  test("progress shows as a strip named after the title, and is not drawn without a number", async () => {
    hub({ stage: [{ ...stage, state: "waiting", progress: 42 }] });
    const view = mount({ size: "stage", children: undefined });
    const bar = await view.findByRole("progressbar", { name: "What should we make today?" });
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
    expect(root(view).getAttribute("data-state")).toBe("waiting");
    cleanup();
    hub({ stage: [stage] });
    const none = mount({ size: "stage", children: undefined });
    await none.findByRole("heading", { name: "What should we make today?" });
    expect(none.queryByRole("progressbar")).toBeNull();
  });

  test("state error: the server's message and the error actions, which call with the row", async () => {
    hub({ stage: [{ ...stage, state: "error", error: "The film could not be made. Try again, or change the words." }] });
    const view = mount();
    expect((await view.findByRole("alert")).textContent).toBe("The film could not be made. Try again, or change the words.");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/videos/retry/f1")).toBe(true));
    fireEvent.click(view.getByRole("button", { name: "Change the words" }));
    await waitFor(() => expect(view.where().path).toBe("/apps/videos/stage"));
  });

  test("compact is passed on, and a failed action says why under the stage", async () => {
    hub({ stage: [stage] });
    const answer = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/duplicate/")
      ? Promise.resolve(new Response(JSON.stringify({ error: "Could not copy this film. Try again." }), { status: 503 }))
      : answer(input, init)) as typeof fetch;
    const view = mount({ compact: true, pills: [{ label: "Duplicate", action: { call: { target: "/api/plugins/videos/duplicate/{id}" } } }] });
    fireEvent.click(await view.findByRole("button", { name: "Duplicate" }));
    expect((await view.findByRole("alert")).textContent).toBe("Could not copy this film. Try again.");
    expect(root(view).hasAttribute("data-compact")).toBe(true);
  });

  test("while the call is loading the stage shows its own loading state, and the composer stays", async () => {
    hub({ stage: "hang" });
    const view = mount();
    await waitFor(() => expect(root(view)).not.toBeNull());
    expect(root(view).getAttribute("data-state")).toBe("loading");
    expect(root(view).getAttribute("aria-busy")).toBe("true");
    expect(view.container.querySelector('[data-slot="media-stage-composer"] textarea')).not.toBeNull();
  });

  test("an answer with no row still draws the stage as idle with its composer (the page stays usable)", async () => {
    hub({ stage: [] });
    const view = mount();
    await waitFor(() => expect(root(view).getAttribute("data-state")).toBe("idle"));
    expect(view.container.querySelector('[data-slot="media-stage-composer"] textarea')).not.toBeNull();
  });

  test("a failed call gives the kit's retry line", async () => {
    hub({ stage: "fail" });
    const view = mount();
    await view.findByText("Something went wrong.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

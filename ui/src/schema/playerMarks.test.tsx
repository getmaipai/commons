// VIDEO-LD-05: the player's saved moments (`marks`) and `{position_s}` in an action's args.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });
beforeEach(() => stubMatchMedia({}));

const parse = (node: unknown) => PageNodeSchema.parse({ type: "page", id: "p", title: "P", body: [node] }).body[0] as UiNode;
const calls: Array<{ url: string; method: string; body: unknown }> = [];
const answer = (item: Record<string, unknown>, boundMarks?: unknown) => {
  calls.length = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method ?? "GET", body });
    if (url.endsWith("/data/item")) return Promise.resolve(new Response(JSON.stringify([item])));
    if (url.endsWith("/data/marks")) return Promise.resolve(new Response(JSON.stringify(boundMarks ?? [])));
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  }) as unknown as typeof fetch;
};
const item = { id: "m1", src: "/api/media/m1/file", title: "Pizza oven", marks: [{ at_s: 74, label: "Firebrick" }, { at_s: 5 }] };
const node = (extra: Record<string, unknown>) => parse({ type: "player", bind: { source: "package", path: "item" }, ...extra });
const save = { label: "Save moment", action: { call: { target: "/api/plugins/videos/mark", args: { media_id: "{id}", at_s: "{position_s}" } } } };
const view = (n: UiNode) => renderWithQueryClient(
  <MemoryRouter><PackageScopeContext.Provider value={{ packageId: "videos" }}><NodeRenderer node={n} state={{}} /></PackageScopeContext.Provider></MemoryRouter>,
);

describe("player.marks", () => {
  test("renders the item's own marks in time order and a tap seeks the player", async () => {
    answer(item);
    const v = view(node({ marks: { heading: "Moments" } }));
    const first = await v.findByRole("button", { name: "0:05" });
    const list = v.container.querySelector('[data-slot="player-marks"]')!;
    expect(list.getAttribute("aria-label")).toBe("Moments");
    expect(list.className).toContain("flex-wrap");
    expect(first.className).toContain("min-h-11");
    const video = v.container.querySelector("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 0 });
    fireEvent.click(v.getByRole("button", { name: "1:14 Firebrick" }));
    expect(video.currentTime).toBe(74);
  });
  test("marks can come from their own bound call", async () => {
    answer({ ...item, marks: undefined }, [{ at_s: 30, label: "Sauce" }]);
    const v = view(node({ marks: { bind: { source: "package", path: "marks" } } }));
    expect(await v.findByRole("button", { name: "0:30 Sauce" })).toBeTruthy();
  });
  test("an empty list draws nothing", async () => {
    answer({ ...item, marks: [] });
    const v = view(node({ marks: { field: "marks" } }));
    await waitFor(() => expect(v.container.querySelector("video")).toBeTruthy());
    expect(v.container.querySelector('[data-slot="player-marks"]')).toBeNull();
  });
  test("without `marks` on the node the item's marks are not drawn", async () => {
    answer(item);
    const v = view(node({}));
    await waitFor(() => expect(v.container.querySelector("video")).toBeTruthy());
    expect(v.container.querySelector('[data-slot="player-marks"]')).toBeNull();
  });
});

describe("{position_s} in action args", () => {
  test("is the player's current time at the click, as a number", async () => {
    answer(item);
    const v = view(node({ actions: [save] }));
    const button = await v.findByRole("button", { name: "Save moment" });
    const video = v.container.querySelector("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 42.26 });
    fireEvent.click(button);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/mark"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/mark"))!.body).toEqual({ media_id: "m1", at_s: 42.3 });
  });
  test("an action without the token keeps its string arguments", async () => {
    answer(item);
    const v = view(node({ actions: [{ label: "Mark", action: { call: { target: "/api/plugins/videos/mark", args: { media_id: "{id}" } } } }] }));
    fireEvent.click(await v.findByRole("button", { name: "Mark" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/mark"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/mark"))!.body).toEqual({ media_id: "m1" });
  });
});

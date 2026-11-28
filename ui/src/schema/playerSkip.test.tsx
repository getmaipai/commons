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
const calls: Array<{ url: string; body: unknown }> = [];
const ranges = [{ id: "ad-a", kind: "ad", start_sec: 90, end_sec: 120 }, { id: "sponsor-a", kind: "sponsor", start_sec: 360, end_sec: 390, status: "confirmed" }, { id: "bumper-a", kind: "bumper", start_sec: 720, end_sec: 735 }, { id: "intro", kind: "intro", start_sec: 0, end_sec: 45 }];
const actions = Object.fromEntries(["range_select", "undo", "skip_button", "hear_anyway", "wrong", "missed"].map((name) => [name, { call: { target: `/api/plugins/podcasts/${name}`, args: { action_id: "{action_id}", id: "{id}" } } }]));
const node = (rangePath = "ranges", barPath = "skip-bar") => parse({ type: "player", kind: "audio", bind: { source: "package", path: "episode" }, skip_ranges: { source: "package", path: rangePath }, skip_bar: { source: "package", path: barPath }, skip_actions: actions });
function answer() {
  calls.length = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined; calls.push({ url, body });
    if (url.endsWith("/data/episode")) return Promise.resolve(new Response(JSON.stringify([{ id: "e1", src: "/episode.mp3", title: "Field Notes", skip_ranges: ranges, skip_bar: { saved_label: "Skipped 2:15", undo_available: true, buttons: [{ id: "skip-all", label: "Skip", kind: "all" }] } }])));
    if (url.endsWith("/data/ranges")) return Promise.resolve(new Response(JSON.stringify(ranges)));
    if (url.endsWith("/data/skip-bar")) return Promise.resolve(new Response(JSON.stringify({ saved_label: "Skipped 2:15", undo_available: true, buttons: [{ id: "skip-all", label: "Skip", kind: "all" }] })));
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  }) as unknown as typeof fetch;
}

describe("player skip plan node", () => {
  test("maps three breaks and an intro, renders bar parts, and dispatches range selection", async () => {
    answer();
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "podcasts" }}><NodeRenderer node={node()} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelectorAll('[data-slot="player-skip-ranges"] button').length).toBe(4));
    expect(view.container.querySelector('[data-slot="player-skip-overlay"]')).toBeTruthy();
    expect(view.getByText("Skipped 2:15")).toBeTruthy();
    fireEvent.click(view.container.querySelector('[data-slot="player-skip-ranges"] button[aria-label^="sponsor"]')!);
    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/range_select"))).toBe(true));
    expect(calls.find((call) => call.url.endsWith("/range_select"))?.body).toEqual({ action_id: "range_select", id: "sponsor-a" });
  });
  test("the skip pill actions dispatch with their ids", async () => {
    answer();
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "podcasts" }}><NodeRenderer node={node()} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    fireEvent.click(await view.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/undo"))).toBe(true));
  });
  test("reads ranges and bar fields from the bound row", async () => {
    answer();
    const rowBound = parse({ type: "player", kind: "audio", bind: { source: "package", path: "episode" }, skip_ranges: { source: "package", path: "episode" }, skip_bar: { source: "package", path: "episode" }, skip_actions: actions });
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "podcasts" }}><NodeRenderer node={rowBound} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelectorAll('[data-slot="player-skip-ranges"] button').length).toBe(4));
    expect(view.getByText("Skipped 2:15")).toBeTruthy();
  });
  test("keeps direct range lists and filters invalid kinds", async () => {
    answer();
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "podcasts" }}><NodeRenderer node={node()} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelectorAll('[data-slot="player-skip-ranges"] button').length).toBe(4));
    expect(view.container.querySelector('[aria-label^="invalid"]')).toBeNull();
  });
  test("skip button, hear anyway, wrong and missed actions dispatch", async () => {
    answer();
    const view = renderWithQueryClient(<MemoryRouter><PackageScopeContext.Provider value={{ packageId: "podcasts" }}><NodeRenderer node={node()} state={{}} /></PackageScopeContext.Provider></MemoryRouter>);
    fireEvent.click(await view.findByRole("button", { name: "Skip" }));
    fireEvent.click(view.getByRole("button", { name: "Hear anyway" }));
    fireEvent.click(view.getByRole("button", { name: "Wrong" }));
    fireEvent.click(view.getByRole("button", { name: "Missed" }));
    await waitFor(() => {
      for (const name of ["skip_button", "hear_anyway", "wrong", "missed"]) expect(calls.some((call) => call.url.endsWith(`/${name}`))).toBe(true);
    });
  });
});

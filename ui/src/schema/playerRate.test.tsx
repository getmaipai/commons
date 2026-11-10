// PODCAST-RATE-01 (spec 0.1.354): player.rate starts at a remembered speed and reports a new one.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";
import { snapRate } from "@/kit/primitives/playerLogic";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });
beforeEach(() => stubMatchMedia({}));

const parse = (node: unknown) => PageNodeSchema.parse({ type: "page", id: "p", title: "P", body: [node] }).body[0] as UiNode;
const calls: Array<{ url: string; method: string; body: unknown }> = [];
const answer = (episode: Record<string, unknown>) => {
  calls.length = 0;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method ?? "GET", body });
    if (url.includes("/api/episode")) return Promise.resolve(new Response(JSON.stringify(episode)));
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  }) as unknown as typeof fetch;
};
const episode = { id: "e1", show_id: "s1", src: "/media/e1.mp3", title: "Episode one", show_rate: 1.3 };
const player = (rate?: unknown) => parse({
  type: "player", kind: "audio", bind: { source: "route", path: "/api/episode", stream: false },
  ...(rate ? { rate } : {}),
});
const change = { call: { target: "/api/shows/{show_id}/rate", method: "PATCH", args: { rate: "{rate}" } } };

describe("snapRate", () => {
  test("snaps to the nearest menu rate and falls back to 1x", () => {
    expect(snapRate(1.3)).toBe(1.25);
    expect(snapRate(3)).toBe(2);
    expect(snapRate(0.1)).toBe(0.5);
    expect(snapRate(undefined)).toBe(1);
    expect(snapRate(-1)).toBe(1);
    expect(snapRate(Number.NaN)).toBe(1);
  });
});

describe("player.rate", () => {
  test("starts at the row field, clamped to a menu option", async () => {
    answer(episode);
    const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={player({ field: "show_rate", value: 1 })} /></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelector("[aria-label='Playback speed: 1.25x']")).toBeTruthy());
  });
  test("falls back to the constant value when the field is missing", async () => {
    answer({ ...episode, show_rate: undefined });
    const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={player({ field: "show_rate", value: 1.5 })} /></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelector("[aria-label='Playback speed: 1.5x']")).toBeTruthy());
  });
  test("picking a speed calls on_change with the numeric rate", async () => {
    answer(episode);
    const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={player({ field: "show_rate", on_change: change })} /></MemoryRouter>);
    const trigger = await waitFor(() => {
      const el = view.container.querySelector("[data-slot='player-rate']");
      if (!el) throw new Error("no rate button");
      return el;
    });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(await view.findByRole("menuitemradio", { name: "2x" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const sent = calls.find((c) => c.method === "PATCH")!;
    expect(sent.url).toContain("/api/shows/s1/rate");
    expect(sent.body).toEqual({ rate: 2 });
  });
  test("without rate the player starts at 1x and reports nothing", async () => {
    answer(episode);
    const view = renderWithQueryClient(<MemoryRouter><NodeRenderer node={player()} /></MemoryRouter>);
    await waitFor(() => expect(view.container.querySelector("[aria-label='Playback speed: 1x']")).toBeTruthy());
    const trigger = view.container.querySelector("[data-slot='player-rate']")!;
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(await view.findByRole("menuitemradio", { name: "2x" }));
    await new Promise((r) => setTimeout(r, 30));
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });
});

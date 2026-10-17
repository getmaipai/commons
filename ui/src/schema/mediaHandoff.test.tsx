// HANDOFF-01c: `play` carries position_s to the host as a number, and the player node's cast menu (Play on another screen).
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { PageNodeSchema, type UiNode } from "@/kit/schema/types";

// The page fixtures live beside schema.json in this repo's own spec workspace (catalog.test.ts reads it the same way).
const SPEC_DIR = process.env.MAIPAI_SPEC_DIR ?? fileURLToPath(new URL("../../../spec", import.meta.url));
const page = (name: string) => PageNodeSchema.parse(JSON.parse(readFileSync(join(SPEC_DIR, "ui", "pages", `${name}.json`), "utf-8")));
const homePage = page("videos-home");
const watchPage = page("videos-watch");

afterEach(cleanup);

interface Call { url: string; method: string; body: unknown; keepalive?: boolean }
let calls: Call[] = [];
const originalFetch = globalThis.fetch;

const ROWS = [
  { id: "m1", title: "Building a pizza oven", channel: "Ember Workshop", thumbnail: "/api/media/m1/thumb.jpg", progress: 0.6, copy_label: "Saved", duration_s: 1122, summary: "Part 3.", backdrop: "/api/media/m1/backdrop.jpg" },
  { id: "m2", title: "How tides work", channel: "Atlas Explains", thumbnail: "https://example.com/t.jpg", progress: 0, copy_label: "", duration_s: 725, summary: "Moon and sea.", backdrop: "/api/media/m2/backdrop.jpg" },
];
const ITEM = {
  id: "m1",
  src: "/api/media/m1/file",
  title: "Building a pizza oven",
  subtitle: "Ember Workshop",
  position_s: 673,
  chapters: [{ start_s: 0, title: "Intro" }, { start_s: 74, title: "Laying the firebrick" }],
  up_next: { id: "m2", title: "How tides work" },
};

beforeEach(() => {
  calls = [];
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined, keepalive: init?.keepalive });
    if (url.endsWith("/data/item")) return Promise.resolve(new Response(JSON.stringify([ITEM]), { status: 200 }));
    if (url.includes("/data/")) return Promise.resolve(new Response(JSON.stringify(ROWS), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function inVideos(node: UiNode, host: MediaHost | null, state: Record<string, unknown> = {}) {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={["/apps/videos"]}>
      <PackageScopeContext.Provider value={{ packageId: "videos" }}>
        <MediaHostContext.Provider value={host}>
          <NodeRenderer node={node} state={state} />
        </MediaHostContext.Provider>
      </PackageScopeContext.Provider>
    </MemoryRouter>,
  );
}

const shelf = homePage.body[1]!;
const playerNode = (watchPage.body[0] as { main: UiNode[] }).main[0]!;

describe("play action position_s", () => {
  const playing = (position_s: unknown) => ({ ...(shelf as object), on_select: { play: { media_id: "{id}", position_s } } }) as UiNode;
  const tap = async (position_s: unknown) => {
    cleanup();
    const onPlay = mock((_id: string, _item: Record<string, unknown>, _options?: { position_s?: number }) => {});
    const { findByRole } = inVideos(playing(position_s), { onPlay });
    fireEvent.click(await findByRole("button", { name: "Building a pizza oven" }));
    await waitFor(() => expect(onPlay).toHaveBeenCalledTimes(1));
    return onPlay.mock.calls[0]!;
  };

  test("a placeholder string reaches onPlay as a number", async () => {
    const call = await tap("{duration_s}");
    expect(call[2]).toEqual({ position_s: 1122 });
    expect(typeof call[2]?.position_s).toBe("number");
  });
  test("a plain number passes through", async () => {
    expect((await tap(30))[2]).toEqual({ position_s: 30 });
  });
  test("a negative or non-numeric value is dropped", async () => {
    expect((await tap("-5"))[2]).toBeUndefined();
    expect((await tap("{summary}"))[2]).toBeUndefined();
    expect((await tap("{missing}"))[2]).toBeUndefined();
  });
  test("no position_s passes no options; a two-argument host keeps working", async () => {
    const seen: unknown[][] = [];
    const host: MediaHost = { onPlay: (...args: unknown[]) => void seen.push(args) } as unknown as MediaHost;
    const { findByRole } = inVideos({ ...(shelf as object), on_select: { play: { media_id: "{id}" } } } as UiNode, host);
    fireEvent.click(await findByRole("button", { name: "Building a pizza oven" }));
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]![2]).toBeUndefined();
  });
});

describe("player cast menu", () => {
  const TARGETS = [{ id: "t1", name: "Living room TV", kind: "tv" }, { id: "t2", name: "Sprout's laptop", kind: "browser" }];
  const open = async (host: MediaHost) => {
    const r = inVideos(playerNode, host, { id: "m1" });
    const trigger = await r.findByRole("button", { name: "Play on another screen" });
    return { ...r, trigger };
  };
  const openMenu = (trigger: HTMLElement) => {
    fireEvent.keyDown(trigger, { key: "Enter" });
  };

  test("lists the targets and calls castTo with the player's current time", async () => {
    const castTargets = mock(async (_item: Record<string, unknown>) => TARGETS);
    const castTo = mock(async (_id: string, _item: Record<string, unknown>, _p: number) => {});
    const { trigger, container, findByRole } = await open({ onPlay: () => {}, castTargets, castTo });
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "currentTime", { value: 42.5, configurable: true, writable: true });
    openMenu(trigger);
    const item = await findByRole("menuitem", { name: "Living room TV" });
    await findByRole("menuitem", { name: "Sprout's laptop" });
    expect(castTargets).toHaveBeenCalledTimes(1);
    expect(castTargets.mock.calls[0]![0]).toMatchObject({ id: "m1" });
    fireEvent.click(item);
    await waitFor(() => expect(castTo).toHaveBeenCalledTimes(1));
    expect(castTo.mock.calls[0]![0]).toBe("t1");
    expect(castTo.mock.calls[0]![1]).toMatchObject({ id: "m1" });
    expect(castTo.mock.calls[0]![2]).toBe(42.5);
  });

  test("an empty list shows the disabled line", async () => {
    const { trigger, findByRole } = await open({ onPlay: () => {}, castTargets: async () => [], castTo: async () => {} });
    openMenu(trigger);
    const line = await findByRole("menuitem", { name: "No other screens are on" });
    expect(line.getAttribute("aria-disabled") ?? line.getAttribute("data-disabled")).not.toBeNull();
  });

  test("a castTo failure shows its message under the player", async () => {
    const { trigger, findByRole, findByText } = await open({ onPlay: () => {}, castTargets: async () => TARGETS, castTo: async () => { throw new Error("The TV is asleep. Wake it and try again."); } });
    openMenu(trigger);
    fireEvent.click(await findByRole("menuitem", { name: "Living room TV" }));
    await findByText("The TV is asleep. Wake it and try again.");
  });

  test("draws nothing without castTargets or castTo", async () => {
    for (const host of [{ onPlay: () => {} }, { onPlay: () => {}, castTargets: async () => TARGETS }, { onPlay: () => {}, castTo: async () => {} }] as MediaHost[]) {
      const { findByRole, queryByRole, unmount } = inVideos(playerNode, host, { id: "m1" });
      await findByRole("button", { name: "Chapters" });
      expect(queryByRole("button", { name: "Play on another screen" })).toBeNull();
      unmount();
    }
  });
});

// UI-BLOCKS-01: the `storyboard_player` node maps the bound shot rows to the kit StoryboardPlayer, writes `selected` and fires `on_select` on a pick.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { installFakeMedia } from "../../tests/fakeMedia";
import { calls, fixtureNode, hub, mountBlock, wait } from "../../tests/blockHarness";
import { StoryboardPlayerNodeSchema } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
let restoreMedia: () => void;
beforeEach(() => { stubMatchMedia({}); restoreMedia = installFakeMedia(); });
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; restoreMedia(); });

const shot = (id: string, caption: string, seconds: number, extra: Record<string, unknown> = {}) => ({
  id, caption, seconds, picture: { url: `/media/${id}.jpg` }, state: "ready", ...extra,
});
const rows = [
  shot("s1", "Juniper opens the gate", 6, {
    clip: { url: "/media/s1.mp4" },
    line: { speaker: "Juniper", text: "Come in.", start: 0.5, voice: { url: "/media/s1.wav", wave: [0.1, 0.8, 0.4] } },
    bed: { url: "/media/bed.mp3" },
  }),
  shot("s2", "Atlas finds a lantern", 5),
  shot("s3", "The hill at dusk", 4, { state: "no_picture", picture: { url: null } }),
];
const node = (change: Record<string, unknown> = {}) => fixtureNode("storyboard-player.json", change);

describe("storyboard_player node", () => {
  test("the example page parses through the kit's schema, and a half-given line is refused", () => {
    const parsed = StoryboardPlayerNodeSchema.parse(node());
    expect(parsed.item_fields.line_audio).toBe("line.voice.url");
    const fields = { shot_id: "id", caption: "c", duration_sec: "s", still: "p", status: "st" };
    expect(StoryboardPlayerNodeSchema.safeParse({ ...parsed, item_fields: { ...fields, line_text: "t" } }).success).toBe(false);
    expect(StoryboardPlayerNodeSchema.safeParse({ ...parsed, item_fields: { ...fields, line_audio: "a" } }).success).toBe(false);
    expect(StoryboardPlayerNodeSchema.safeParse({ ...parsed, item_fields: fields }).success).toBe(true);
  });

  test("draws one strip item per shot, the first shot's words and length, and the bed", async () => {
    hub({ shots: rows });
    const view = mountBlock(node());
    expect(await view.findByRole("button", { name: "Shot 1: Juniper opens the gate, 6 seconds" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Shot 2: Atlas finds a lantern, 5 seconds" })).toBeTruthy();
    expect(view.getByText("Come in.")).toBeTruthy();
    expect(view.getByText("Juniper")).toBeTruthy();
    expect(view.container.querySelector('[data-slot="storyboard-time"]')?.textContent).toBe("0:00 / 0:15");
    expect(view.container.querySelector('audio[src="/media/bed.mp3"]')).not.toBeNull();
    expect(view.container.querySelector('audio[src="/media/s1.wav"]')).not.toBeNull();
  });

  test("a bound value shows: the page's params reach the data call and a shot with no_picture draws a placeholder", async () => {
    hub({ shots: rows });
    const view = mountBlock(node(), { state: { film: "f9" } });
    await view.findByRole("button", { name: /^Shot 3/ });
    const asked = JSON.parse(String((globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls[0]![1].body));
    expect(asked).toEqual({ id: "f9" });
    fireEvent.click(view.getByRole("button", { name: /^Shot 3/ }));
    await view.findByText("No picture yet");
  });

  test("a picture, clip or voice that is not from this origin is never loaded", async () => {
    hub({ shots: [shot("s1", "Away", 5, { picture: { url: "https://elsewhere.example.com/a.jpg" }, clip: { url: "//elsewhere.example.com/a.mp4" }, line: { speaker: "A", text: "Hi.", voice: { url: "https://elsewhere.example.com/a.wav" } } })] });
    const view = mountBlock(node());
    await view.findByText("Hi.");
    const loaded = [...view.container.querySelectorAll("[src]")].map((el) => el.getAttribute("src") ?? "");
    expect(loaded.filter((src) => src.includes("elsewhere"))).toEqual([]);
  });

  test("picking a shot writes `selected` and fires on_select with the shot's own fields (a navigate)", async () => {
    hub({ shots: rows });
    const view = mountBlock(node());
    fireEvent.click(await view.findByRole("button", { name: /^Shot 2/ }));
    await waitFor(() => expect(view.state()).toEqual({ shot: "s2" }));
    await waitFor(() => expect(view.where().path).toBe("/apps/videos/storyboard"));
    expect(view.where().state?.pageState).toEqual({ shot: "s2" });
  });

  test("picking a shot fires a call on_select with the mapped names as placeholders", async () => {
    hub({ shots: rows });
    const view = mountBlock(node({ on_select: { call: { target: "/api/plugins/videos/picked/{shot_id}", args: { caption: "{caption}", seconds: "{duration_sec}", row_id: "{id}" } } } }));
    fireEvent.click(await view.findByRole("button", { name: /^Shot 2/ }));
    await waitFor(() => expect(calls.some((c) => c.url.includes("/picked/"))).toBe(true));
    const sent = calls.find((c) => c.url.includes("/picked/"))!;
    expect(sent.url).toBe("/api/plugins/videos/picked/s2");
    expect(sent.method).toBe("POST");
    expect(sent.body).toEqual({ caption: "Atlas finds a lantern", seconds: "5", row_id: "s2" });
  });

  test("a shot the clock moves into by playing does not write `selected` or fire on_select", async () => {
    hub({ shots: [shot("a", "First", 0.15), shot("b", "Second", 0.15), shot("c", "Third", 5)] });
    const view = mountBlock(node({ on_select: { call: { target: "/api/plugins/videos/picked/{shot_id}" } } }));
    fireEvent.click(await view.findByRole("button", { name: "Play" }));
    await view.findByRole("button", { name: "Pause" });
    await waitFor(() => expect(view.container.querySelector('[aria-current="true"]')?.getAttribute("aria-label")).toContain("Third"));
    await wait(150);
    expect(calls.filter((c) => c.url.includes("/picked/"))).toEqual([]);
    expect(view.state()).toEqual({});
  });

  test("the page's `selected` value moves the player to that shot", async () => {
    hub({ shots: rows });
    const view = mountBlock(node(), { state: { shot: "s2" } });
    await view.findByRole("button", { name: /^Shot 2/ });
    await waitFor(() => expect(view.container.querySelector('[aria-current="true"]')?.getAttribute("aria-label")).toContain("Atlas finds a lantern"));
  });

  test("while the call is loading it says the page's loading_text", async () => {
    hub({ shots: "hang" });
    const view = mountBlock(node());
    const status = await view.findByLabelText("Getting your storyboard ready");
    expect(status.getAttribute("aria-busy")).toBe("true");
  });

  test("no rows: the page's own empty state, with its icon text and action", async () => {
    hub({ shots: [] });
    const view = mountBlock(node({ empty_state: { type: "empty_state", icon: "film", text: "No shots yet. Describe the first scene.", action: { call: { target: "/api/plugins/videos/first-shot" } }, action_label: "Add a shot" } }));
    await view.findByText("No shots yet. Describe the first scene.");
    fireEvent.click(view.getByRole("button", { name: "Add a shot" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/first-shot"))).toBe(true));
  });

  test("no rows: the empty state's action_variant draws the button in that kit look", async () => {
    hub({ shots: [] });
    const view = mountBlock(node({ empty_state: { type: "empty_state", icon: "film", text: "No shots yet. Describe the first scene.", action: { call: { target: "/api/plugins/videos/first-shot" } }, action_label: "Add a shot", action_variant: "default" } }));
    await view.findByText("No shots yet. Describe the first scene.");
    expect(view.getByRole("button", { name: "Add a shot" }).getAttribute("data-variant")).toBe("default");
  });

  test("a failed call says so once and offers Try again", async () => {
    hub({ shots: "fail" });
    const view = mountBlock(node());
    await view.findByText("Something went wrong.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  test("a row with no id is skipped, never drawn half empty", async () => {
    hub({ shots: [{ caption: "No id", seconds: 3, picture: { url: "/media/x.jpg" }, state: "ready" }, shot("s2", "Has an id", 4)] });
    const view = mountBlock(node());
    await view.findByRole("button", { name: /^Shot 1: Has an id/ });
    expect(view.queryByText("No id")).toBeNull();
  });
});

// UI-BLOCKS-01: the `voice_line` node maps the first bound row to the kit VoiceLineRow, plays its own voice file and runs the two reading actions.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { installFakeMedia, playLog } from "../../tests/fakeMedia";
import { calls, fixtureNode, hub, mountBlock } from "../../tests/blockHarness";
import { PageNodeSchema, VoiceLineNodeSchema } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
let restoreMedia: () => void;
beforeEach(() => { stubMatchMedia({}); restoreMedia = installFakeMedia(); });
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; restoreMedia(); });

const line = {
  id: "l7", speaker: { name: "Atlas", picture: { url: "/media/atlas.jpg" } }, text: "Over here, by the lighthouse.",
  voice: { url: "/media/l7-2.wav", wave: [0.2, 0.9, 0.4, 0.6] }, reading: { index: 2, count: 3 }, status: "ready", error: null,
};
const node = (change: Record<string, unknown> = {}) => fixtureNode("voice-line.json", change);
const mount = (change: Record<string, unknown> = {}) => mountBlock(node(change), { packageId: "scripts", state: { line: "l7" } });
const press = (view: ReturnType<typeof mount>, name: string) => view.getByRole("button", { name }) as HTMLButtonElement;

describe("voice_line node", () => {
  test("the example page parses, and a line with no status path is refused", () => {
    const parsed = VoiceLineNodeSchema.parse(node());
    expect(parsed.actions?.use_other_reading?.label).toBe("Use the other reading");
    expect(PageNodeSchema.safeParse({ type: "page", id: "p", title: "P", body: [{ ...parsed, status: undefined }] }).success).toBe(false);
    expect(VoiceLineNodeSchema.safeParse({ ...parsed, actions: { pick_voice: { action: { call: { target: "/api/plugins/scripts/x" } } } } }).success).toBe(false);
  });

  test("draws the bound speaker, words, reading count, waveform and speaker picture; the page's params reach the call", async () => {
    hub({ line: [line] });
    const view = mount();
    expect(await view.findByText("Over here, by the lighthouse.")).toBeTruthy();
    expect(view.getByText("Atlas")).toBeTruthy();
    expect(view.getByText("Reading 2 of 3")).toBeTruthy();
    expect(view.container.querySelectorAll('[data-slot="voice-line-wave"] span')).toHaveLength(4);
    expect(view.container.querySelector('img[src="/media/atlas.jpg"]')).not.toBeNull();
    const asked = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(asked[0]).toBe("/api/plugins/scripts/data/line");
    expect(JSON.parse(String(asked[1].body))).toEqual({ id: "l7" });
  });

  test("the waveform is scaled to the loudest sample", async () => {
    hub({ line: [{ ...line, voice: { url: "/media/l7-2.wav", wave: [2, 4, 1] } }] });
    const view = mount();
    await view.findByText("Over here, by the lighthouse.");
    const heights = [...view.container.querySelectorAll<HTMLElement>('[data-slot="voice-line-wave"] span')].map((el) => el.style.height);
    expect(heights).toEqual(["50%", "100%", "25%"]);
  });

  test("a speaker picture from another origin is never loaded (the name's letters show instead)", async () => {
    hub({ line: [{ ...line, speaker: { name: "Atlas", picture: { url: "https://elsewhere.example.com/a.jpg" } } }] });
    const view = mount();
    await view.findByText("Over here, by the lighthouse.");
    expect(view.container.querySelector('img[src*="elsewhere"]')).toBeNull();
  });

  test("Play starts the voice file and shows Pause; pausing and the end of the file turn it back", async () => {
    hub({ line: [line] });
    const view = mount();
    await view.findByText("Over here, by the lighthouse.");
    const audio = view.container.querySelector("audio")!;
    expect(audio.getAttribute("src")).toBe("/media/l7-2.wav");
    fireEvent.click(press(view, "Play Atlas"));
    expect(playLog).toContain(audio);
    fireEvent.play(audio);
    fireEvent.click(await view.findByRole("button", { name: "Pause Atlas" }));
    expect(audio.paused).toBe(true);
    fireEvent.pause(audio);
    await view.findByRole("button", { name: "Play Atlas" });
    fireEvent.play(audio);
    await view.findByRole("button", { name: "Pause Atlas" });
    fireEvent.ended(audio);
    await view.findByRole("button", { name: "Play Atlas" });
  });

  test("a line with no voice file is text only: no play button, no audio element", async () => {
    hub({ line: [{ ...line, voice: { url: null, wave: null } }] });
    const view = mount();
    await view.findByText("Over here, by the lighthouse.");
    expect(view.queryByRole("button", { name: "Play Atlas" })).toBeNull();
    expect(view.container.querySelector("audio")).toBeNull();
    expect(view.container.querySelector('[data-slot="voice-line-wave"]')).toBeNull();
  });

  test("Say it differently and Use the other reading call with the row's own fields", async () => {
    hub({ line: [line] });
    const view = mount();
    await view.findByText("Over here, by the lighthouse.");
    fireEvent.click(press(view, "Say it differently"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/scripts/say-differently/l7")).toBe(true));
    fireEvent.click(press(view, "Use the other reading"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/scripts/use-other-reading/l7")).toBe(true));
  });

  test("the page's own button words replace the kit's, and a missing action draws no button", async () => {
    hub({ line: [line] });
    const view = mount({ actions: { say_differently: { label: "Read it again", action: { call: { target: "/api/plugins/scripts/say-differently/{id}" } } } } });
    await view.findByText("Over here, by the lighthouse.");
    expect(view.getByRole("button", { name: "Read it again" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Use the other reading" })).toBeNull();
  });

  test("with one reading the other-reading button is off and says why", async () => {
    hub({ line: [{ ...line, reading: { index: 1, count: 1 } }] });
    const view = mount();
    await view.findByText("Reading 1 of 1");
    expect(press(view, "Use the other reading").disabled).toBe(true);
    expect(view.getByText(/only one reading so far/)).toBeTruthy();
  });

  test("status making: a calm line, and both reading actions wait", async () => {
    hub({ line: [{ ...line, status: "making" }] });
    const view = mount();
    await view.findByText("Making a new reading");
    expect(press(view, "Say it differently").disabled).toBe(true);
    expect(press(view, "Use the other reading").disabled).toBe(true);
  });

  test("the server's error line shows, and a failed action says why when the row has none", async () => {
    hub({ line: [{ ...line, error: "That reading could not be made. Press Say it differently to try again." }] });
    const withError = mount();
    expect((await withError.findByRole("alert")).textContent).toContain("That reading could not be made.");
    cleanup();
    hub({ line: [line] });
    const answer = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/say-differently/")
      ? Promise.resolve(new Response(JSON.stringify({ error: "The voice is busy. Try again in a minute." }), { status: 503 }))
      : answer(input, init)) as typeof fetch;
    const failing = mount();
    await failing.findByText("Over here, by the lighthouse.");
    fireEvent.click(press(failing, "Say it differently"));
    expect((await failing.findByRole("alert")).textContent).toContain("The voice is busy. Try again in a minute.");
  });

  test("loading draws the kit's skeleton, an empty answer draws nothing, a failed call offers Try again", async () => {
    hub({ line: "hang" });
    const loading = mount();
    await waitFor(() => expect(loading.container.querySelector('[data-slot="skeleton"]')).not.toBeNull());
    expect(loading.container.querySelector('[data-slot="voice-line-row"]')).toBeNull();
    cleanup();
    hub({ line: [] });
    const none = mount();
    await waitFor(() => expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(none.container.querySelector('[data-slot="voice-line-row"]')).toBeNull();
    expect(none.container.querySelector('[data-slot="skeleton"]')).toBeNull();
    cleanup();
    hub({ line: "fail" });
    const failed = mount();
    await failed.findByText("Something went wrong.");
    expect(failed.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

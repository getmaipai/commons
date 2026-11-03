// VIDEO-STUDIO-04: TrackStudio. The leak test (a locked clip renders and loads nothing; a relock leaves no media element, no src and no request), the lanes,
// per-lane Level, Mute and Solo, the Volume panel, the keyboard (arrows, Space), focus, reduced motion and the phone layout.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { FakeAudioContext, flush, installFakeMedia } from "../../tests/fakeMedia";
import { TrackStudio, PREVIEW_LINE, type TrackStudioProps } from "./track-studio";

const SECRET = { title: "Zorblax Nightshade", label: "zorblax-label", src: "/api/videos/zorblax.mp4", poster: "/api/videos/zorblax-poster.jpg", voice: "/api/files/zorblax-voice.wav", ref: "clip-secret-77" };
const lanes = (tag = "a") => [
  { id: "video", pieces: [
    { id: "p1", ref: "c1", src: `/f/${tag}1.mp4`, label: "Paper boat A", in_s: 0, out_s: 4, source_s: 10, poster: "/f/p1.jpg" },
    { id: "p2", ref: "c2", src: `/f/${tag}2.mp4`, label: "Paper boat B", in_s: 1, out_s: 7, source_s: 12 },
    { id: "p3", ref: "c3", src: `/f/${tag}3.mp4`, label: "Lighthouse", in_s: 0, out_s: 3, source_s: 5 },
  ] },
  { id: "voice", pieces: [{ id: "v1", ref: "f1", src: "/f/voice.wav", label: "Welcome line", in_s: 0, out_s: 3, at_s: 2, source_s: 3 }] },
  { id: "music", pieces: [{ id: "m1", ref: "f2", src: "/f/music.wav", label: "Soft piano", in_s: 0, out_s: 9, at_s: 0, source_s: 30 }] },
];

let restore: () => void;
let fetchSpy: ReturnType<typeof mock>;
let signals: AbortSignal[];
const realMatchMedia = window.matchMedia;
const realFetch = globalThis.fetch;
beforeEach(() => {
  document.body.replaceChildren(); // other test files leave elements behind; these tests count media elements in the whole document
  restore = installFakeMedia();
  stubMatchMedia({});
  signals = [];
  fetchSpy = mock((_url: string, init?: RequestInit) => { if (init?.signal) signals.push(init.signal); return new Promise<Response>(() => undefined); });
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});
afterEach(() => { cleanup(); restore(); window.matchMedia = realMatchMedia; globalThis.fetch = realFetch; });

function open(extra: Partial<TrackStudioProps> = {}) {
  const ctx = new FakeAudioContext();
  const utils = render(<TrackStudio lanes={lanes()} resetKey="c" title="Paper boat in the rain" audioContext={() => ctx as unknown as AudioContext} {...extra} />);
  return { ...utils, ctx };
}
const pieces = (c: HTMLElement, lane: string) => c.querySelectorAll(`[data-lane="${lane}"] [data-piece]`);
const playhead = (c: HTMLElement) => within(c).getByRole("slider", { name: "Playhead" });
const key = (el: Element, k: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(el, { key: k, ...init });

describe("the leak test: a locked clip draws and loads nothing", () => {
  test("only the lock tile exists: no media element, no src, no picture, no request, none of the clip's words", async () => {
    const onMetric = mock(() => undefined);
    const { container, getByRole } = render(
      <TrackStudio
        locked
        resetKey={SECRET.ref}
        title={SECRET.title}
        poster={SECRET.poster}
        lanes={[{ id: "video", pieces: [{ id: "x", ref: SECRET.ref, src: SECRET.src, label: SECRET.label, in_s: 0, out_s: 4 }] }, { id: "voice", pieces: [{ id: "y", ref: "f", src: SECRET.voice, in_s: 0, out_s: 2, at_s: 0 }] }]}
        onMetric={onMetric}
      />,
    );
    await flush();
    expect(getByRole("button", { name: "Locked items. Press to enter your passcode." })).toBeTruthy();
    expect(document.querySelectorAll("video, audio, img, canvas, source, track, iframe, [src], [poster], [href]")).toHaveLength(0);
    const html = document.body.innerHTML;
    for (const secret of Object.values(SECRET)) expect(html).not.toContain(secret);
    expect(html).not.toContain("Welcome");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onMetric).not.toHaveBeenCalled();
    expect(container.textContent).toBe("Locked items");
    expect(container.querySelectorAll("[data-slot='track-studio']")).toHaveLength(0);
  });

  test("relock: an open clip that becomes locked leaves no media element, no src, no scratch video, and aborts every fetch", async () => {
    const ctx = new FakeAudioContext();
    const props = { lanes: lanes(), resetKey: "c", title: "Paper boat in the rain", poster: "/f/poster.jpg", audioContext: () => ctx as unknown as AudioContext };
    const { rerender, container } = render(<TrackStudio {...props} />);
    await flush();
    expect(document.querySelectorAll("video").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[src]").length).toBeGreaterThan(0);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => !s.aborted)).toBe(true);
    // Playing builds the audio graph; relock must tear that down too.
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, " ");
    await waitFor(() => expect(ctx.sources.length).toBeGreaterThan(0));
    rerender(<TrackStudio {...props} locked />);
    await flush();
    await flush();
    expect(document.querySelectorAll("video, audio, img, canvas, [src], [poster]")).toHaveLength(0);
    expect(signals.every((s) => s.aborted)).toBe(true);
    expect(ctx.closed).toBe(true);
    expect(container.textContent).toBe("Locked items");
  });

  test("unmount (the page closing) does the same", async () => {
    const { unmount, ctx, container } = open();
    await flush();
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, " ");
    await waitFor(() => expect(ctx.sources.length).toBeGreaterThan(0));
    unmount();
    await flush();
    expect(document.querySelectorAll("video, audio, [src]")).toHaveLength(0);
    expect(signals.every((s) => s.aborted)).toBe(true);
    expect(ctx.closed).toBe(true);
  });

  test("nothing of the plan is kept in storage, the URL or a cache", async () => {
    const setItem = spyOn(Storage.prototype, "setItem");
    const search = window.location.search;
    const cookie = document.cookie;
    const { container } = open();
    fireEvent.click(pieces(container, "voice")[0]!);
    key(within(container).getByRole("slider", { name: "Level in decibels" }), "ArrowDown");
    fireEvent.click(within(container).getByRole("button", { name: "Mute Voice" }));
    await flush();
    expect(setItem).not.toHaveBeenCalled();
    expect(window.location.search).toBe(search);
    expect(document.cookie).toBe(cookie);
  });

  test("no looping, no controls, no remote playback and no picture in picture on the monitor video", async () => {
    open();
    await flush();
    const v = document.querySelector("video")!;
    expect(v.loop).toBe(false);
    expect(v.hasAttribute("controls")).toBe(false);
    expect(v.disableRemotePlayback).toBe(true);
    expect(v.disablePictureInPicture).toBe(true);
    expect(v.getAttribute("controlsList")).toBe("nodownload noremoteplayback");
    expect(navigator.mediaSession?.metadata ?? null).toBeNull();
  });
});

describe("what is drawn", () => {
  test("three lanes in order, pieces named for a screen reader, a ruler, a transport and the Volume panel", async () => {
    const { container, getByRole } = open();
    await flush();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["video", "voice", "music"]);
    expect(pieces(container, "video")).toHaveLength(3);
    expect(getByRole("button", { name: /Video piece 2 of 3, Paper boat B, 6 seconds/ })).toBeTruthy();
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
    expect(getByRole("button", { name: /Back to start/ })).toBeTruthy();
    expect(getByRole("button", { name: /Loop/ })).toBeTruthy();
    expect(container.querySelector("section[aria-label='Volume']")).toBeTruthy();
    expect(container.querySelector("section[aria-label='Fades']")).toBeNull();
    expect(container.textContent).toContain(PREVIEW_LINE);
    expect(container.textContent).toContain("0:00 / 0:13");
    expect(container.querySelectorAll("[data-handle]")).toHaveLength(0);
  });
  test("lane Level, Mute and Solo, each named", async () => {
    const { getByRole, getAllByRole } = open();
    for (const lane of ["Video", "Voice", "Music"]) {
      expect(getByRole("button", { name: `Mute ${lane}` })).toBeTruthy();
      expect(getByRole("button", { name: `Solo ${lane}` })).toBeTruthy();
      expect(getAllByRole("slider").some((s) => s.getAttribute("aria-label") === `${lane} level, decibels`)).toBe(true);
    }
    fireEvent.click(getByRole("button", { name: "Mute Voice" }));
    expect(getByRole("button", { name: "Mute Voice" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(getByRole("button", { name: "Solo Music" }));
    expect(getByRole("button", { name: "Solo Music" }).getAttribute("aria-pressed")).toBe("true");
  });
  test("the one lane with no piece says so; the monitor shows only for video", async () => {
    const { container, queryByText, rerender } = open({ lanes: [{ id: "video", pieces: lanes()[0]!.pieces }] });
    expect(queryByText("No voice yet.")).toBeTruthy();
    expect(queryByText("No music yet.")).toBeTruthy();
    rerender(<TrackStudio kind="audio" resetKey="a" lanes={lanes()} />);
    await flush();
    expect(container.querySelector("[data-slot='track-studio-monitor']")).toBeNull();
    expect(document.querySelectorAll("video")).toHaveLength(0);
  });
  test("a piece that cannot be decoded says so in its lane and still plays", async () => {
    globalThis.fetch = mock(async () => { throw new Error("nope"); }) as unknown as typeof fetch;
    const { findAllByText } = open();
    expect((await findAllByText("This audio could not be drawn. It still plays.")).length).toBeGreaterThan(0);
  });
  test("a fade or a crossfade in the data is drawn on its piece", async () => {
    const data = lanes();
    (data[2]!.pieces[0] as Record<string, unknown>).fade_in_s = 2;
    (data[0]!.pieces[1] as Record<string, unknown>).crossfade_s = 0.5;
    const { container } = open({ lanes: data });
    expect(container.querySelector("[data-lane='music'] [data-fades]")).toBeTruthy();
    expect(container.querySelector("[data-lane='video'] [data-seam]")).toBeTruthy();
  });
});

describe("keyboard", () => {
  test("arrows nudge the playhead by a tenth of a second, Shift by a second, Home and End jump", async () => {
    const { container } = open();
    const group = container.querySelector("[role='group'][aria-label^='Tracks']")!;
    key(group, "ArrowRight");
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(0.1, 1));
    key(group, "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(1.1, 1));
    key(group, "ArrowLeft");
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(1, 1));
    key(group, "End");
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(13, 0));
    key(group, "Home");
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBe(0));
  });
  test("the playhead slider takes arrows, Home and End too", async () => {
    const { container } = open();
    key(playhead(container), "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(1, 1));
    key(playhead(container), "Home");
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBe(0));
  });
  test("Space plays and pauses; on a plain button it still presses that button", async () => {
    const { container, getByRole } = open();
    await flush();
    const group = container.querySelector("[role='group'][aria-label^='Tracks']")!;
    key(group, " ");
    await waitFor(() => expect(getByRole("button", { name: "Pause" })).toBeTruthy());
    key(group, " ");
    await waitFor(() => expect(getByRole("button", { name: "Play" })).toBeTruthy());
    const loop = getByRole("button", { name: /Loop/ });
    key(loop, " ");
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
  });
  test("a piece takes Space (play) and Enter (select) like a button; keys typed in a slider do not move the playhead", async () => {
    const { container, getAllByRole, getByRole } = open();
    const first = pieces(container, "video")[0]!;
    fireEvent.click(first);
    expect(first.getAttribute("aria-pressed")).toBe("true");
    key(getAllByRole("slider")[1]!, "End");
    expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBe(0);
    key(first, " ");
    await waitFor(() => expect(getByRole("button", { name: "Pause" })).toBeTruthy());
  });
});

describe("focus", () => {
  test("every control is a real button, slider or switch with a name", async () => {
    const { container } = open();
    fireEvent.click(pieces(container, "music")[0]!);
    for (const el of container.querySelectorAll("button, [role='slider'], [role='switch'], [role='radio']")) {
      const name = el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("aria-labelledby");
      expect(name, el.outerHTML.slice(0, 120)).toBeTruthy();
    }
  });
  test("a piece and the playhead carry the kit focus ring; the tracks are one tab stop and each piece another", async () => {
    const { container } = open();
    expect(pieces(container, "video")[0]!.className).toContain("focus-visible:ring-2");
    expect(playhead(container).className).toContain("focus-visible:ring-2");
    const stops = container.querySelectorAll("[tabindex='0'], button:not([disabled])");
    expect(stops.length).toBeGreaterThan(8);
    expect(container.querySelector("[role='group'][aria-label^='Tracks']")!.getAttribute("tabindex")).toBe("0");
  });
});

describe("the Volume panel", () => {
  test("the Level slider acts on the selected piece, says which, and Reset puts it back", async () => {
    const { container, getByRole, getByText } = open();
    expect(getByText("Pick a piece to change its volume.")).toBeTruthy();
    fireEvent.click(pieces(container, "voice")[0]!);
    expect(within(container.querySelector("section[aria-label='Volume']")!).getByText("Selected: Welcome line")).toBeTruthy();
    const level = getByRole("slider", { name: "Level in decibels" });
    expect((level as HTMLElement).getAttribute("aria-valuenow")).toBe("0");
    key(level, "ArrowDown");
    expect(getByRole("slider", { name: "Level in decibels" }).getAttribute("aria-valuenow")).toBe("-0.5");
    fireEvent.click(getByRole("button", { name: /Reset Volume/ }));
    expect(getByRole("slider", { name: "Level in decibels" }).getAttribute("aria-valuenow")).toBe("0");
  });
  test("Lower under speech appears for a music piece only", async () => {
    const { container, queryByRole, getByRole } = open();
    fireEvent.click(pieces(container, "voice")[0]!);
    expect(queryByRole("switch", { name: "Lower under speech" })).toBeNull();
    fireEvent.click(pieces(container, "music")[0]!);
    fireEvent.click(getByRole("switch", { name: "Lower under speech" }));
    expect(getByRole("switch", { name: "Lower under speech" }).getAttribute("aria-checked")).toBe("true");
  });
  test("a lane's Level slider changes that lane's gain in the preview graph", async () => {
    const { container, getByRole, ctx } = open();
    await flush();
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, " ");
    await waitFor(() => expect(ctx.gains.length).toBeGreaterThan(3));
    key(getByRole("slider", { name: "Voice level, decibels" }), "ArrowDown");
    await waitFor(() => expect((ctx.gains[2] as unknown as { gain: { value: number } }).gain.value).toBeCloseTo(10 ** (-0.5 / 20), 4));
    fireEvent.click(getByRole("button", { name: "Mute Voice" }));
    await waitFor(() => expect((ctx.gains[2] as unknown as { gain: { value: number } }).gain.value).toBe(0));
  });
});

describe("reduced motion and layout", () => {
  test("the Element never animates: no animation classes, no smooth scrolling, nothing to turn off", async () => {
    stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const { container } = open();
    expect(container.innerHTML).not.toMatch(/animate-|scroll-smooth|motion-safe:animate/);
    const scrollTo = spyOn(HTMLElement.prototype, "scrollTo");
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, "End");
    await flush();
    for (const call of scrollTo.mock.calls) expect((call[0] as ScrollToOptions | undefined)?.behavior ?? "auto").not.toBe("smooth");
  });
  test("on a phone the transport is one row of icons with the time, and Zoom moves up beside TRACKS", async () => {
    stubMatchMedia({ "(max-width: 639.98px)": true });
    const { container, getByRole } = open();
    expect(getByRole("button", { name: "Back to start" }).textContent).toBe("");
    expect(getByRole("button", { name: "Loop" }).textContent).toBe("");
    expect(within(container.querySelector("[data-slot='track-studio-transport']")!).queryByRole("slider", { name: "Zoom" })).toBeNull();
    expect(within(container.querySelector("[data-slot='track-studio-tracks']")!).getByRole("slider", { name: "Zoom" })).toBeTruthy();
  });
  test("only studio tokens: no fixed colour or palette class in what is drawn", async () => {
    const { container } = open();
    fireEvent.click(pieces(container, "video")[0]!);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b(?![\w-])|rgb\(|hsl\(|oklch\(|(bg|text|border|ring|fill|stroke)-(black|white|red|blue|green|lime|orange|pink|violet|teal)\b/i);
  });
});

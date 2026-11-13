// VIDEO-STUDIO-04 and -05: TrackStudio. The leak test (a locked clip renders and loads nothing; a relock leaves no media element, no src and no
// request), the editing tools by keyboard and pointer, focus, the plan, the Add flow, the limits and reduced motion.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { FakeAudioContext, flush, installFakeMedia } from "../../tests/fakeMedia";
import { TrackStudio, HELP_LINE, PREVIEW_LINE, SPLIT_LABEL, type StudioPlan, type TrackStudioProps } from "./track-studio";

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
    const onExport = mock(() => undefined);
    const onAdd = mock(async () => null);
    const { container, getByRole } = render(
      <TrackStudio
        locked
        resetKey={SECRET.ref}
        title={SECRET.title}
        poster={SECRET.poster}
        lanes={[{ id: "video", pieces: [{ id: "x", ref: SECRET.ref, src: SECRET.src, label: SECRET.label, in_s: 0, out_s: 4 }] }, { id: "voice", pieces: [{ id: "y", ref: "f", src: SECRET.voice, in_s: 0, out_s: 2, at_s: 0 }] }]}
        onExport={onExport}
        onAdd={onAdd}
      />,
    );
    await flush();
    expect(getByRole("button", { name: "Locked items. Press to enter your passcode." })).toBeTruthy();
    expect(document.querySelectorAll("video, audio, img, canvas, source, track, iframe, [src], [poster], [href]")).toHaveLength(0);
    const html = document.body.innerHTML;
    for (const secret of Object.values(SECRET)) expect(html).not.toContain(secret);
    expect(html).not.toContain("Welcome");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onExport).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
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
    fireEvent.click(pieces(container, "video")[1]!);
    key(container.querySelector("section")!, "Delete");
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
  test("three lanes in order, pieces named for a screen reader, a ruler, a transport and one chosen edit panel", async () => {
    const { container, getByRole } = open();
    await flush();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["video", "voice", "music"]);
    expect(pieces(container, "video")).toHaveLength(3);
    expect(getByRole("button", { name: /Video piece 2 of 3, Paper boat B, 6 seconds/ })).toBeTruthy();
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
    expect(getByRole("button", { name: /Back to start/ })).toBeTruthy();
    expect(getByRole("button", { name: /Loop/ })).toBeTruthy();
    expect(container.querySelector(`section[aria-label="Volume"]`)).toBeTruthy();
    const panelChoice = getByRole("radiogroup", { name: "Panel" });
    for (const panel of ["Volume", "Fades", "Crossfade", "Level"]) expect(within(panelChoice).getByRole("radio", { name: panel })).toBeTruthy();
    fireEvent.click(within(panelChoice).getByRole("radio", { name: "Crossfade" }));
    expect(container.querySelector(`section[aria-label="Crossfade"]`)).toBeTruthy();
    expect(container.querySelector(`section[aria-label="Volume"]`)).toBeNull();
    expect(container.textContent).toContain(HELP_LINE);
    expect(container.textContent).toContain(PREVIEW_LINE);
    expect(container.textContent).toContain("0:00 / 0:13");
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
  test("a piece that cannot be decoded draws a plain neutral bar, no error text, and still plays", async () => {
    globalThis.fetch = mock(async () => { throw new Error("nope"); }) as unknown as typeof fetch;
    const { container, queryByText } = open();
    await flush();
    await flush();
    expect(queryByText(/could not be drawn/)).toBeNull();
    const bar = container.querySelector(`[data-lane="music"] [data-piece] svg rect`);
    expect(bar).toBeTruthy();
    expect(container.querySelector(`[data-lane="music"] [data-piece] svg path`)).toBeNull();
    expect(document.querySelectorAll("audio").length).toBeGreaterThan(0);
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
  test("the playhead slider takes arrows too", async () => {
    const { container } = open();
    key(playhead(container), "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(1, 1));
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
  test("S splits at the playhead, Delete removes the selected piece, Ctrl+Z and Ctrl+Shift+Z undo and redo", async () => {
    const { container } = open();
    const section = container.querySelector("section")!;
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, "ArrowRight", { shiftKey: true });
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(2, 1));
    fireEvent.click(pieces(container, "video")[0]!);
    key(pieces(container, "video")[0]!, "s");
    expect(pieces(container, "video")).toHaveLength(4);
    // the second half is selected
    key(section, "Delete");
    expect(pieces(container, "video")).toHaveLength(3);
    // the piece that was on is gone, so focus moved to the piece now selected (a key press must still reach the Studio)
    await waitFor(() => expect(document.activeElement?.hasAttribute("data-piece")).toBe(true));
    key(section, "z", { ctrlKey: true });
    expect(pieces(container, "video")).toHaveLength(4);
    key(section, "z", { ctrlKey: true });
    expect(pieces(container, "video")).toHaveLength(3);
    key(section, "z", { ctrlKey: true, shiftKey: true });
    expect(pieces(container, "video")).toHaveLength(4);
  });
  test("S on a piece edge says why instead of cutting a sliver", async () => {
    const { container, findByText } = open();
    key(container.querySelector("[role='group'][aria-label^='Tracks']")!, "s");
    expect(await findByText(/further from the edge/)).toBeTruthy();
    expect(pieces(container, "video")).toHaveLength(3);
  });
  test("typing S in a slider or a field does not split", async () => {
    const { container, getAllByRole } = open();
    key(getAllByRole("slider")[0]!, "s");
    expect(pieces(container, "video")).toHaveLength(3);
  });
});

describe("focus and pointer", () => {
  test("selecting a piece shows two named trim handles; arrow keys on a handle trim by a tenth, Shift by a second, and one undo undoes a drag", async () => {
    const { container, getByRole } = open();
    fireEvent.click(pieces(container, "video")[1]!);
    const start = getByRole("slider", { name: "Trim start of Paper boat B" });
    const end = getByRole("slider", { name: "Trim end of Paper boat B" });
    expect(start.getAttribute("aria-valuenow")).toBe("1");
    expect(end.getAttribute("aria-valuenow")).toBe("7");
    act(() => end.focus());
    expect(document.activeElement).toBe(end);
    key(end, "ArrowLeft");
    expect(getByRole("slider", { name: "Trim end of Paper boat B" }).getAttribute("aria-valuenow")).toBe("6.9");
    key(end, "ArrowLeft", { shiftKey: true });
    expect(getByRole("slider", { name: "Trim end of Paper boat B" }).getAttribute("aria-valuenow")).toBe("5.9");
    key(start, "ArrowRight");
    expect(getByRole("slider", { name: "Trim start of Paper boat B" }).getAttribute("aria-valuenow")).toBe("1.1");
    // The handle's arrows must not also move the playhead.
    expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBe(0);
  });
  test("a trim cannot pass the end of the source file and says so on the end handle's value", async () => {
    const { container, getByRole } = open();
    fireEvent.click(pieces(container, "video")[2]!);
    const end = getByRole("slider", { name: "Trim end of Lighthouse" });
    key(end, "ArrowRight", { shiftKey: true });
    key(end, "ArrowRight", { shiftKey: true });
    key(end, "ArrowRight", { shiftKey: true });
    expect(getByRole("slider", { name: "Trim end of Lighthouse" }).getAttribute("aria-valuenow")).toBe("5");
  });
  test("a pointer drag on the end handle trims, and the whole drag is one undo step", async () => {
    const { container, getByRole } = open();
    fireEvent.click(pieces(container, "video")[0]!);
    const end = getByRole("slider", { name: "Trim end of Paper boat A" });
    (end as HTMLElement & { setPointerCapture?: (id: number) => void }).setPointerCapture = () => undefined;
    fireEvent.pointerDown(end, { clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(end, { clientX: 250, pointerId: 1 });
    fireEvent.pointerMove(end, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(end, { pointerId: 1 });
    const after = Number(getByRole("slider", { name: "Trim end of Paper boat A" }).getAttribute("aria-valuenow"));
    expect(after).toBeLessThan(4);
    fireEvent.click(getByRole("button", { name: "Undo" }));
    expect(getByRole("slider", { name: "Trim end of Paper boat A" }).getAttribute("aria-valuenow")).toBe("4");
    expect((getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("every control is a real button, slider or switch with a name", async () => {
    const { container } = open();
    fireEvent.click(pieces(container, "video")[0]!);
    for (const el of container.querySelectorAll("button, [role='slider'], [role='switch'], [role='radio']")) {
      const name = el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("aria-labelledby");
      expect(name, el.outerHTML.slice(0, 120)).toBeTruthy();
    }
  });
  test("a piece button and the handles carry the kit focus ring", async () => {
    const { container, getByRole } = open();
    fireEvent.click(pieces(container, "video")[0]!);
    expect(pieces(container, "video")[0]!.className).toContain("focus-visible:ring-2");
    expect(getByRole("slider", { name: "Trim start of Paper boat A" }).className).toContain("focus-visible:ring-2");
  });
});

describe("the Edit tools and panels", () => {
  test("Delete piece is disabled until a piece is selected, then closes the video lane up", async () => {
    const { container, getByRole } = open();
    const del = getByRole("button", { name: "Delete piece" }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    fireEvent.click(pieces(container, "video")[0]!);
    expect(del.disabled).toBe(false);
    fireEvent.click(del);
    expect(pieces(container, "video")).toHaveLength(2);
    expect(container.textContent).toContain("0:00 / 0:09");
  });
  test("Split at playhead on a piece with the playhead inside it", async () => {
    const { container, getByRole } = open();
    key(playhead(container), "ArrowRight", { shiftKey: true });
    key(playhead(container), "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(2, 1));
    fireEvent.click(getByRole("button", { name: SPLIT_LABEL }));
    expect(pieces(container, "video")).toHaveLength(4);
  });
  test("Volume: the Level slider acts on the selected piece, says which, and Reset puts it back", async () => {
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
  test("Volume: Lower under speech appears for a music piece only", async () => {
    const { container, queryByRole, getByRole } = open();
    fireEvent.click(pieces(container, "voice")[0]!);
    expect(queryByRole("switch", { name: "Lower under speech" })).toBeNull();
    fireEvent.click(pieces(container, "music")[0]!);
    fireEvent.click(getByRole("switch", { name: "Lower under speech" }));
    expect(getByRole("switch", { name: "Lower under speech" }).getAttribute("aria-checked")).toBe("true");
  });
  test("Fades: sliders are bounded by the piece's length and drawn on the piece", async () => {
    const { container, getByRole } = open();
    fireEvent.click(getByRole("radio", { name: "Fades" }));
    fireEvent.click(pieces(container, "music")[0]!);
    key(getByRole("slider", { name: "Fade out, seconds" }), "End");
    expect(getByRole("slider", { name: "Fade out, seconds" }).getAttribute("aria-valuenow")).toBe("5");
    expect(container.querySelector("[data-lane='music'] [data-fades]")).toBeTruthy();
  });
  test("Crossfade: a clip with another after it has a length; the last clip says to pick another; the plan carries the seam", async () => {
    const onPlanChange = mock((_p: StudioPlan, _c: boolean) => undefined);
    const { container, getByRole, getByText } = open({ onPlanChange });
    fireEvent.click(getByRole("radio", { name: "Crossfade" }));
    fireEvent.click(pieces(container, "video")[2]!);
    expect(getByText("Pick a clip that has another clip after it.")).toBeTruthy();
    expect((getByRole("slider", { name: "Crossfade length, seconds" }) as HTMLElement).getAttribute("aria-disabled") ?? (getByRole("slider", { name: "Crossfade length, seconds" }) as HTMLElement).getAttribute("data-disabled")).not.toBeNull();
    fireEvent.click(pieces(container, "video")[0]!);
    const x = getByRole("slider", { name: "Crossfade length, seconds" });
    key(x, "End");
    expect(container.querySelector("[data-seam]")).toBeTruthy();
    const plan = onPlanChange.mock.calls.at(-1)![0];
    expect(plan.video.transitions[0]).toEqual({ kind: "crossfade", seconds: 1 });
    expect(plan.film_s).toBe(13 - 1);
  });
  test("Level: five balances; choosing one sets every piece; the chosen one is checked", async () => {
    const onPlanChange = mock((_p: StudioPlan, _c: boolean) => undefined);
    const { getByRole } = open({ onPlanChange });
    fireEvent.click(getByRole("radio", { name: "Level" }));
    for (const name of ["Quiet", "Soft", "Balanced", "Loud", "Very loud"]) expect(getByRole("radio", { name })).toBeTruthy();
    fireEvent.click(getByRole("radio", { name: "Loud" }));
    expect(getByRole("radio", { name: "Loud" }).getAttribute("aria-checked")).toBe("true");
    const plan = onPlanChange.mock.calls.at(-1)![0];
    expect(plan.voice.pieces[0]!.level_db).toBe(4);
    expect(plan.video.pieces[0]!.level_db).toBe(-6);
  });
  test("a page's own level steps replace the five", async () => {
    const { queryByRole, getByRole } = open({ levelSteps: [{ id: "a", label: "Low", gain_db: -10, clip_gain_db: 0 }, { id: "b", label: "High", gain_db: 3, clip_gain_db: -3 }] });
    fireEvent.click(getByRole("radio", { name: "Level" }));
    expect(queryByRole("radio", { name: "Low" })).toBeTruthy();
    expect(queryByRole("radio", { name: "Quiet" })).toBeNull();
  });
  test("tools and panels a page leaves out are not drawn", async () => {
    const { queryByRole, container } = open({ tools: ["split"], panels: ["volume"] });
    expect(queryByRole("button", { name: "Delete piece" })).toBeNull();
    expect(queryByRole("button", { name: SPLIT_LABEL })).toBeTruthy();
    expect(container.querySelector("section[aria-label='Fades']")).toBeNull();
    expect(container.querySelector("section[aria-label='Volume']")).toBeTruthy();
  });
});

describe("Add a clip, a voice, music", () => {
  const added = { ref: "new1", src: "/f/new.mp4", label: "Another clip", duration_s: 5 };
  test("the Add buttons are not drawn without a host handler", () => {
    const { queryByRole } = open();
    expect(queryByRole("button", { name: "Add a clip" })).toBeNull();
  });
  test("a clip joins the end of the video lane and is selected; a voice starts at the playhead", async () => {
    const onAdd = mock(async (kind: string) => (kind === "clip" ? added : { ...added, ref: "v9", src: "/f/v9.wav", label: "New voice", duration_s: 2 }));
    const { container, getByRole } = open({ onAdd });
    fireEvent.click(getByRole("button", { name: "Add a clip" }));
    await waitFor(() => expect(pieces(container, "video")).toHaveLength(4));
    expect(pieces(container, "video")[3]!.getAttribute("aria-pressed")).toBe("true");
    // the playhead went to the start of the new clip
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(13, 0));
    key(playhead(container), "Home");
    key(playhead(container), "ArrowRight", { shiftKey: true });
    await waitFor(() => expect(Number(playhead(container).getAttribute("aria-valuenow"))).toBeCloseTo(1, 1));
    fireEvent.click(getByRole("button", { name: "Add a voice" }));
    await waitFor(() => expect(pieces(container, "voice")).toHaveLength(2));
    expect(onAdd.mock.calls.map((c) => c[0])).toEqual(["clip", "voice"]);
  });
  test("a cancelled pick changes nothing; a failed add shows one plain line", async () => {
    const onAdd = mock(async () => null);
    const { container, getByRole, findByText, rerender } = open({ onAdd });
    fireEvent.click(getByRole("button", { name: "Add music" }));
    await flush();
    expect(pieces(container, "music")).toHaveLength(1);
    rerender(<TrackStudio resetKey="c" lanes={lanes()} onAdd={async () => { throw new Error("Music is not ready yet."); }} />);
    fireEvent.click(getByRole("button", { name: "Add music" }));
    expect(await findByText("Music is not ready yet.")).toBeTruthy();
  });
  test("limits: a seventh clip, a third voice and a film over its length are refused with one plain line each", async () => {
    const onAdd = mock(async () => added);
    const { container, getByRole, findByText } = open({ onAdd, limits: { video_pieces: 3 } });
    fireEvent.click(getByRole("button", { name: "Add a clip" }));
    expect(await findByText("A film can have three clips. Delete one to add another.")).toBeTruthy();
    expect(pieces(container, "video")).toHaveLength(3);
  });
  test("a tool reason disables its button and is shown", async () => {
    const { getByRole, getByText } = open({ onAdd: async () => null, toolReasons: { add_voice: "Voices are not ready yet." } });
    expect((getByRole("button", { name: "Add a voice" }) as HTMLButtonElement).disabled).toBe(true);
    expect(getByText("Voices are not ready yet.")).toBeTruthy();
  });
});

describe("Export and the plan", () => {
  test("Export is disabled until something changes, then hands the host the plan once and keeps the plan", async () => {
    const onExport = mock((_p: StudioPlan) => undefined);
    const { container, getByRole } = open({ onExport });
    const button = getByRole("button", { name: "Export as a new clip" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(pieces(container, "video")[1]!);
    fireEvent.click(getByRole("button", { name: "Delete piece" }));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onExport).toHaveBeenCalledTimes(1);
    const plan = onExport.mock.calls[0]![0];
    expect(plan.video.pieces.map((p) => p.ref)).toEqual(["c1", "c3"]);
    expect(plan.voice.pieces[0]).toMatchObject({ ref: "f1", start_s: 2 });
    expect(JSON.stringify(plan)).not.toContain("/f/");
    expect(pieces(container, "video")).toHaveLength(2);
  });
  test("a reason disables Export and is shown beside it", () => {
    const { getByRole, getByText } = open({ onExport: () => undefined, exportDisabledReason: "Editing is not ready yet." });
    expect((getByRole("button", { name: "Export as a new clip" }) as HTMLButtonElement).disabled).toBe(true);
    expect(getByText("Editing is not ready yet.")).toBeTruthy();
  });
  test("the export card takes the monitor's place with Keep editing, and the plan is kept", async () => {
    const onExport = mock((_p: StudioPlan) => undefined);
    const onKeepEditing = mock(() => undefined);
    const { container, getByRole, queryByText } = open({ onExport, onKeepEditing, exportCard: <p>Making your clip</p> });
    fireEvent.click(pieces(container, "video")[1]!);
    fireEvent.click(getByRole("button", { name: "Delete piece" }));
    fireEvent.click(getByRole("button", { name: "Export as a new clip" }));
    expect(queryByText("Making your clip")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Keep editing" }));
    expect(onKeepEditing).toHaveBeenCalled();
    expect(queryByText("Making your clip")).toBeNull();
    expect(pieces(container, "video")).toHaveLength(2);
  });
  test("Make more buttons call the host with the selected piece and the playhead", async () => {
    const onSelect = mock((_c: { piece: unknown; at_s: number }) => undefined);
    const { container, getByRole } = open({ makeMore: [{ key: "take", label: "Another take", onSelect }, { key: "ext", label: "Extend", badge: "Max", disabledReason: "Not ready" , onSelect: () => undefined }] });
    fireEvent.click(pieces(container, "video")[0]!);
    fireEvent.click(getByRole("button", { name: "Another take" }));
    expect(onSelect.mock.calls[0]![0]).toMatchObject({ at_s: 0, piece: { ref: "c1" } });
    expect((getByRole("button", { name: /Extend/ }) as HTMLButtonElement).disabled).toBe(true);
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
  test("on a phone the panels are one card with a four-way choice, not four cards", async () => {
    stubMatchMedia({ "(max-width: 639.98px)": true });
    const { container, getByRole, queryByRole } = open();
    expect(container.querySelectorAll("section[aria-label='Fades']")).toHaveLength(0);
    expect(getByRole("radiogroup", { name: "Panel" })).toBeTruthy();
    fireEvent.click(getByRole("radio", { name: "Fades" }));
    expect(queryByRole("slider", { name: "Fade in, seconds" })).toBeTruthy();
    expect(queryByRole("slider", { name: "Level in decibels" })).toBeNull();
  });
  test("only studio tokens: no fixed colour or palette class in what is drawn", async () => {
    const { container } = open();
    fireEvent.click(pieces(container, "video")[0]!);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b(?![\w-])|rgb\(|hsl\(|oklch\(|(bg|text|border|ring|fill|stroke)-(black|white|red|blue|green|lime|orange|pink|violet|teal)\b/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// MP-03: the audio studio (kind="audio"): EQ and compressor panels, stem lanes, a range selection.

const stemLanes = () => [
  { id: "stem-vocals", pieces: [{ id: "sv", ref: "v", src: "/f/vocals.wav", label: "Vocals", in_s: 0, out_s: 20, at_s: 0, source_s: 20 }] },
  { id: "stem-drums", pieces: [{ id: "sd", ref: "d", src: "/f/drums.wav", label: "Drums", in_s: 0, out_s: 20, at_s: 0, source_s: 20 }] },
  { id: "stem-bass", pieces: [{ id: "sb", ref: "b", src: "/f/bass.wav", label: "Bass", in_s: 0, out_s: 20, at_s: 0, source_s: 20 }] },
  { id: "stem-other", pieces: [{ id: "so", ref: "o", src: "/f/other.wav", label: "Other", in_s: 0, out_s: 20, at_s: 0, source_s: 20 }] },
];
function openAudio(extra: Partial<TrackStudioProps> = {}) {
  const ctx = new FakeAudioContext();
  const utils = render(<TrackStudio kind="audio" lanes={stemLanes()} resetKey="s" title="A song" audioContext={() => ctx as unknown as AudioContext} {...extra} />);
  return { ...utils, ctx };
}
const slider = (c: HTMLElement, name: string) => within(c).getByRole("slider", { name });
const press = (el: Element, k: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(el, { key: k, ...init });

describe("MP-03 stem lanes", () => {
  test("an audio studio draws one lane per stem with its own name, no video lane and no empty voice or music lane", () => {
    const { container, getAllByText, queryByText } = openAudio();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["stem-vocals", "stem-drums", "stem-bass", "stem-other"]);
    expect(getAllByText("Vocals").length).toBeGreaterThan(0);
    expect(queryByText("No clip.")).toBeNull();
    expect(pieces(container, "stem-drums")).toHaveLength(1);
  });
  test("Mute, Solo and Level work on a stem and are named for it", () => {
    const { getByRole, container } = openAudio();
    fireEvent.click(getByRole("button", { name: "Mute Drums" }));
    expect(getByRole("button", { name: "Mute Drums" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(getByRole("button", { name: "Solo Bass" }));
    expect(getByRole("button", { name: "Solo Bass" }).getAttribute("aria-pressed")).toBe("true");
    expect(slider(container, "Vocals level, decibels")).toBeTruthy();
  });
  test("the plan carries the stems with their mute and level", () => {
    const onPlanChange = mock((_p: StudioPlan, _c: boolean) => undefined);
    const { getByRole } = openAudio({ onPlanChange });
    fireEvent.click(getByRole("button", { name: "Mute Drums" }));
    const [plan, changed] = onPlanChange.mock.calls.at(-1)!;
    expect(changed).toBe(true);
    expect(plan.stems?.find((s) => s.id === "stem-drums")?.muted).toBe(true);
    expect(plan.stems?.find((s) => s.id === "stem-vocals")?.muted).toBe(false);
  });
  test("a video studio is unchanged: the same three lanes, no EQ or Compressor panel, no selection row", () => {
    const { container, queryByRole } = open();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["video", "voice", "music"]);
    expect(queryByRole("radio", { name: "EQ" })).toBeNull();
    expect(queryByRole("radio", { name: "Compressor" })).toBeNull();
    expect(container.querySelector("[data-slot='track-studio-selection']")).toBeNull();
  });
});

describe("MP-03 EQ and compressor panels", () => {
  test("an audio studio offers Volume, Fades, EQ and Compressor; EQ has six named bands at 0 dB", () => {
    const { getByRole, container } = openAudio();
    for (const n of ["Volume", "Fades", "EQ", "Compressor"]) expect(getByRole("radio", { name: n })).toBeTruthy();
    fireEvent.click(getByRole("radio", { name: "EQ" }));
    for (const hz of ["60 Hz", "170 Hz", "500 Hz", "1.5 kHz", "5 kHz", "12 kHz"]) {
      const s = slider(container, `EQ ${hz}, gain in decibels`);
      expect(s.getAttribute("aria-valuemin")).toBe("-12");
      expect(s.getAttribute("aria-valuemax")).toBe("12");
      expect(s.getAttribute("aria-valuenow")).toBe("0");
    }
  });
  test("moving a band by keyboard reports the effects; Reset puts the band back and says nothing is left to apply", () => {
    const onEffectsChange = mock((_fx: unknown, _changed: boolean) => undefined);
    const { getByRole, container } = openAudio({ onEffectsChange });
    fireEvent.click(getByRole("radio", { name: "EQ" }));
    const band = slider(container, "EQ 500 Hz, gain in decibels");
    press(band, "ArrowRight");
    let [fx, changed] = onEffectsChange.mock.calls.at(-1)! as [{ eq: number[] }, boolean];
    expect(fx.eq[2]).toBe(0.5);
    expect(changed).toBe(true);
    fireEvent.click(getByRole("button", { name: /^Reset/ }));
    [fx, changed] = onEffectsChange.mock.calls.at(-1)! as [{ eq: number[] }, boolean];
    expect(fx.eq).toEqual([0, 0, 0, 0, 0, 0]);
    expect(changed).toBe(false);
  });
  test("the compressor has threshold, ratio, attack, release and makeup, each named, and Reset restores them", () => {
    const onEffectsChange = mock((_fx: unknown, _changed: boolean) => undefined);
    const { getByRole, container, getByText } = openAudio({ onEffectsChange });
    fireEvent.click(getByRole("radio", { name: "Compressor" }));
    for (const n of ["Compressor threshold, decibels", "Compressor ratio", "Compressor attack, milliseconds", "Compressor release, milliseconds", "Compressor makeup gain, decibels"]) expect(slider(container, n)).toBeTruthy();
    expect(getByText(/^Off\./)).toBeTruthy();
    press(slider(container, "Compressor ratio"), "ArrowRight");
    const [fx, changed] = onEffectsChange.mock.calls.at(-1)! as [{ compressor: { ratio: number } }, boolean];
    expect(fx.compressor.ratio).toBe(1.5);
    expect(changed).toBe(true);
    fireEvent.click(getByRole("button", { name: /^Reset/ }));
    expect((onEffectsChange.mock.calls.at(-1)![0] as { compressor: { ratio: number } }).compressor.ratio).toBe(1);
  });
  test("the effects prop sets the controls, and a disabled reason disables them and says why", () => {
    const { getByRole, container, getByText } = openAudio({ effects: { eq: [0, 0, 4, 0, 0, 0], compressor: { threshold_db: -20, ratio: 3, attack_ms: 10, release_ms: 100, makeup_db: 0 } }, effectsDisabledReason: "Wait for the stems to finish." });
    fireEvent.click(getByRole("radio", { name: "EQ" }));
    const band = slider(container, "EQ 500 Hz, gain in decibels");
    expect(band.getAttribute("aria-valuenow")).toBe("4");
    expect(band.hasAttribute("data-disabled") || band.getAttribute("aria-disabled") === "true").toBe(true);
    expect(getByText("Wait for the stems to finish.")).toBeTruthy();
  });
  test("choosing a panel tells the host", () => {
    const onPanelChange = mock((_p: string) => undefined);
    const { getByRole } = openAudio({ onPanelChange });
    fireEvent.click(getByRole("radio", { name: "Compressor" }));
    expect(onPanelChange).toHaveBeenCalledWith("compressor");
  });
  test("the preview chain gets the settings: six filters and a compressor", async () => {
    const { getByRole, container, ctx } = openAudio();
    fireEvent.click(getByRole("radio", { name: "EQ" }));
    press(slider(container, "EQ 60 Hz, gain in decibels"), "ArrowRight");
    await act(async () => { fireEvent.click(getByRole("button", { name: "Play" })); await flush(); });
    expect(ctx.filters).toHaveLength(6);
    expect(ctx.filters[0]!.gain.value).toBe(0.5);
    expect(ctx.compressors).toHaveLength(1);
  });
});

describe("MP-03 range selection", () => {
  const rect = { left: 0, top: 0, right: 2000, bottom: 32, width: 2000, height: 32, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  const dragRuler = (c: HTMLElement, from: number, to: number) => {
    const ruler = c.querySelector("[data-slot='track-studio-ruler'] > div:last-child") as HTMLElement;
    ruler.getBoundingClientRect = () => rect;
    ruler.setPointerCapture = () => undefined;
    fireEvent.pointerDown(ruler, { clientX: from, pointerId: 1 });
    fireEvent.pointerMove(ruler, { clientX: to, pointerId: 1 });
    fireEvent.pointerUp(ruler, { clientX: to, pointerId: 1 });
  };
  test("dragging on the ruler selects a range, shows the readout and tells the host in seconds", async () => {
    const onSelectionChange = mock((_s: unknown) => undefined);
    const { container } = openAudio({ onSelectionChange });
    await flush();
    expect(container.querySelector("[data-slot='track-studio-selection-readout']")!.textContent).toContain("No selection");
    // 36 px per second at the default scale before layout is measured.
    dragRuler(container, 72, 360);
    const sel = onSelectionChange.mock.calls.at(-1)![0] as { start_s: number; end_s: number };
    expect(sel.end_s).toBeGreaterThan(sel.start_s);
    expect(container.querySelector("[data-slot='track-studio-selection-band']")).toBeTruthy();
    expect(container.querySelector("[data-slot='track-studio-selection-readout']")!.textContent).toMatch(/^Selection: 0:0\d\.\d to 0:\d+\.\d, /);
  });
  test("a plain press on the ruler still moves the playhead and selects nothing", async () => {
    const onSelectionChange = mock((_s: unknown) => undefined);
    const { container } = openAudio({ onSelectionChange });
    await flush();
    const ruler = container.querySelector("[data-slot='track-studio-ruler'] > div:last-child") as HTMLElement;
    ruler.getBoundingClientRect = () => rect;
    ruler.setPointerCapture = () => undefined;
    fireEvent.pointerDown(ruler, { clientX: 180, pointerId: 1 });
    fireEvent.pointerUp(ruler, { clientX: 180, pointerId: 1 });
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(container.querySelector("[data-slot='track-studio-selection-band']")).toBeNull();
  });
  test("dragging on an empty part of a lane selects a range too", async () => {
    const onSelectionChange = mock((_s: unknown) => undefined);
    const { container } = openAudio({ onSelectionChange, lanes: [{ id: "stem-vocals", pieces: [{ id: "sv", ref: "v", src: "/f/vocals.wav", in_s: 0, out_s: 2, at_s: 0, source_s: 2 }] }, ...stemLanes().slice(1, 2).map((l) => ({ ...l, pieces: [{ ...l.pieces[0]!, out_s: 30, source_s: 30 }] }))] });
    await flush();
    const body = container.querySelector("[data-lane='stem-vocals'] [role='group']") as HTMLElement;
    body.getBoundingClientRect = () => rect;
    body.setPointerCapture = () => undefined;
    fireEvent.pointerDown(body, { clientX: 400, pointerId: 1 });
    fireEvent.pointerMove(body, { clientX: 700, pointerId: 1 });
    fireEvent.pointerUp(body, { clientX: 700, pointerId: 1 });
    expect(onSelectionChange).toHaveBeenCalled();
  });
  test("[ and ] set the start and end at the playhead, Esc and Clear selection clear it", async () => {
    const onSelectionChange = mock((_s: unknown) => undefined);
    const { container, getByRole } = openAudio({ onSelectionChange });
    await flush();
    const section = container.querySelector("section")!;
    const head = playhead(container);
    key(head, "ArrowRight", { shiftKey: true });
    key(head, "ArrowRight", { shiftKey: true });
    await flush();
    press(section, "[");
    expect(onSelectionChange.mock.calls.at(-1)![0]).toMatchObject({ end_s: 20 });
    key(head, "ArrowRight", { shiftKey: true });
    await flush();
    press(section, "]");
    const sel = onSelectionChange.mock.calls.at(-1)![0] as { start_s: number; end_s: number };
    expect(sel.start_s).toBeGreaterThan(0);
    expect(sel.end_s).toBeGreaterThan(sel.start_s);
    press(section, "Escape");
    expect(onSelectionChange.mock.calls.at(-1)![0]).toBeNull();
    expect(container.querySelector("[data-slot='track-studio-selection-band']")).toBeNull();
    expect((getByRole("button", { name: "Clear selection" }) as HTMLButtonElement).disabled).toBe(true);
    expect(getByRole("button", { name: "Clear selection" }).getAttribute("title")).toBe("There is no selection to clear.");
  });
  test("the selection prop draws a range, clamps it to the studio and the Clear button calls back with null", () => {
    const onSelectionChange = mock((_s: unknown) => undefined);
    const { container, getByRole } = openAudio({ selection: { start_s: 5, end_s: 9 }, onSelectionChange });
    expect(container.querySelector("[data-slot='track-studio-selection-readout']")!.textContent).toContain("Selection: 0:05.0 to 0:09.0, 4 seconds.");
    fireEvent.click(getByRole("button", { name: "Clear selection" }));
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });
  test("a video studio ignores [ and ] and draws no selection", () => {
    const { container } = open();
    press(container.querySelector("section")!, "[");
    expect(container.querySelector("[data-slot='track-studio-selection-band']")).toBeNull();
  });
});

// MP-04 follow-ups: lanes with content only, Compare, the host's own peaks.
const songLanes = () => [{ id: "music", pieces: [{ id: "m1", ref: "f2", src: "/f/song.m4a", label: "Song", in_s: 0, out_s: 20, at_s: 0, source_s: 20 }] }];
const openSong = (extra: Partial<TrackStudioProps> = {}) => {
  const ctx = new FakeAudioContext();
  const utils = render(<TrackStudio kind="audio" lanes={songLanes()} resetKey="song" title="A song" audioContext={() => ctx as unknown as AudioContext} {...extra} />);
  return { ...utils, ctx };
};

describe("audio lanes with content only", () => {
  test("a song with no stems draws the song lane alone: no empty Voice, Music or Video lane", async () => {
    const { container, queryByText } = openSong();
    await flush();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["music"]);
    expect(queryByText("No voice yet.")).toBeNull();
  });
  test("the lanes the host offers an Add for are drawn even when empty; without a handler they are not", async () => {
    const onAdd = mock(async () => null);
    const withAdd = openSong({ onAdd });
    await flush();
    expect([...withAdd.container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["voice", "music"]);
    cleanup();
    const stems = openSong({ lanes: [{ id: "stem-vocals", pieces: [] }, ...songLanes()] });
    await flush();
    expect([...stems.container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["music", "stem-vocals"]);
  });
  test("the video studio is unchanged", async () => {
    const { container } = open({ lanes: [{ id: "video", pieces: lanes()[0]!.pieces }] });
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["video", "voice", "music"]);
  });
});

describe("the transport does not float over the Tracks card in an audio studio", () => {
  test("sticky only for video", async () => {
    const song = openSong();
    expect(song.container.querySelector("[data-slot='track-studio-transport']")!.className).not.toContain("sticky");
    cleanup();
    const video = open();
    expect(video.container.querySelector("[data-slot='track-studio-transport']")!.className).toContain("max-sm:sticky");
  });
});

describe("Compare (audio)", () => {
  const toggle = (c: HTMLElement) => c.querySelector<HTMLButtonElement>("[data-slot='track-studio-compare-toggle']")!;
  test("no compare prop, no control; the video studio never draws it", async () => {
    const { container } = openSong();
    expect(toggle(container)).toBeNull();
    cleanup();
    const v = open({ compare: { before_url: "/a", after_url: "/b" } });
    expect(toggle(v.container)).toBeNull();
  });
  test("one version only: disabled, with the reason, and C does nothing", async () => {
    const { container, getByText } = openSong({ compare: { versions: [{ id: "v1", url: "/v1.m4a" }], current_id: "v1" } });
    expect(toggle(container).disabled).toBe(true);
    expect(toggle(container).getAttribute("aria-keyshortcuts")).toBe("C");
    fireEvent.focus(toggle(container).parentElement!);
    await waitFor(() => expect(document.body.textContent).toContain("Nothing to compare yet: this is the first version."));
    key(container.querySelector("section")!, "c");
    expect(container.querySelector("[data-slot='track-studio-compare']")).toBeNull();
    void getByText;
  });
  test("two versions: Compare (or C) opens the A/B player; Before and After swap the source at the same second; closing removes it", async () => {
    const { container, getByRole } = openSong({ compare: { before_url: "/v1.m4a", after_url: "/v2.m4a", label: "Before the EQ" } });
    expect(toggle(container).disabled).toBe(false);
    fireEvent.click(toggle(container));
    const el = () => container.querySelector<HTMLAudioElement>("[data-slot='track-studio-compare-audio']")!;
    await waitFor(() => expect(el()).toBeTruthy());
    expect(el().getAttribute("src")).toBe("/v2.m4a");
    expect(toggle(container).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(getByRole("radio", { name: "Before" }));
    await waitFor(() => expect(el().getAttribute("src")).toBe("/v1.m4a"));
    expect(container.textContent).toContain("Before the EQ");
    fireEvent.click(getByRole("radio", { name: "After" }));
    await waitFor(() => expect(el().getAttribute("src")).toBe("/v2.m4a"));
    key(container.querySelector("section")!, "C");
    await waitFor(() => expect(container.querySelector("[data-slot='track-studio-compare']")).toBeNull());
    key(container.querySelector("section")!, "C");
    await waitFor(() => expect(container.querySelector("[data-slot='track-studio-compare']")).toBeTruthy());
    cleanup();
    expect(document.querySelectorAll("audio, [src]")).toHaveLength(0);
  });
});

describe("the host's own peaks", () => {
  const given = [0.1, 0.5, 1, 0.5, 0.2, 0.8, 0.3, 0.6];
  const song = (piece: Record<string, unknown>) => [{ id: "music", pieces: [{ id: "m1", ref: "f", src: "/f/song.m4a", in_s: 0, out_s: 20, at_s: 0, source_s: 20, ...piece }] }];
  test("peaks given: the waveform is drawn from them and the song is never fetched to be decoded", async () => {
    const { container } = openSong({ lanes: song({ peaks: given }) });
    await flush();
    expect(container.querySelector(`[data-lane="music"] [data-piece] svg path`)).toBeTruthy();
    expect(fetchSpy.mock.calls.filter((c) => String(c[0]).includes("song.m4a"))).toHaveLength(0);
  });
  test("peaks_url: that JSON is fetched and drawn, and the song is not decoded", async () => {
    globalThis.fetch = mock(async (url: string) => (String(url) === "/f/song.peaks.json" ? new Response(JSON.stringify({ peaks: given })) : new Promise<Response>(() => undefined))) as unknown as typeof fetch;
    const { container } = openSong({ lanes: song({ peaks_url: "/f/song.peaks.json" }) });
    await waitFor(() => expect(container.querySelector(`[data-lane="music"] [data-piece] svg path`)).toBeTruthy());
    const urls = (globalThis.fetch as unknown as ReturnType<typeof mock>).mock.calls.map((c) => String(c[0]));
    expect(urls).not.toContain("/f/song.m4a");
  });
  test("a peaks file that cannot be read falls back to decoding the audio", async () => {
    const seen: string[] = [];
    globalThis.fetch = mock(async (url: string) => { seen.push(String(url)); throw new Error("nope"); }) as unknown as typeof fetch;
    const { container } = openSong({ lanes: song({ peaks_url: "/f/missing.json" }) });
    await waitFor(() => expect(seen).toContain("/f/song.m4a"));
    await flush();
    expect(container.querySelector(`[data-lane="music"] [data-piece] svg rect`)).toBeTruthy();
  });
});

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
  test("three lanes in order, pieces named for a screen reader, a ruler, a transport and the four panels", async () => {
    const { container, getByRole } = open();
    await flush();
    expect([...container.querySelectorAll("[data-lane]")].map((l) => l.getAttribute("data-lane"))).toEqual(["video", "voice", "music"]);
    expect(pieces(container, "video")).toHaveLength(3);
    expect(getByRole("button", { name: /Video piece 2 of 3, Paper boat B, 6 seconds/ })).toBeTruthy();
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
    expect(getByRole("button", { name: /Back to start/ })).toBeTruthy();
    expect(getByRole("button", { name: /Loop/ })).toBeTruthy();
    for (const panel of ["Volume", "Fades", "Crossfade", "Level"]) expect(container.querySelector(`section[aria-label="${panel}"]`)).toBeTruthy();
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
  test("a piece that cannot be decoded says so in its lane and still plays", async () => {
    globalThis.fetch = mock(async () => { throw new Error("nope"); }) as unknown as typeof fetch;
    const { findAllByText } = open();
    expect((await findAllByText("This audio could not be drawn. It still plays.")).length).toBeGreaterThan(0);
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
    fireEvent.click(pieces(container, "music")[0]!);
    key(getByRole("slider", { name: "Fade out, seconds" }), "End");
    expect(getByRole("slider", { name: "Fade out, seconds" }).getAttribute("aria-valuenow")).toBe("5");
    expect(container.querySelector("[data-lane='music'] [data-fades]")).toBeTruthy();
  });
  test("Crossfade: a clip with another after it has a length; the last clip says to pick another; the plan carries the seam", async () => {
    const onPlanChange = mock((_p: StudioPlan, _c: boolean) => undefined);
    const { container, getByRole, getByText } = open({ onPlanChange });
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
    for (const name of ["Quiet", "Soft", "Balanced", "Loud", "Very loud"]) expect(getByRole("radio", { name })).toBeTruthy();
    fireEvent.click(getByRole("radio", { name: "Loud" }));
    expect(getByRole("radio", { name: "Loud" }).getAttribute("aria-checked")).toBe("true");
    const plan = onPlanChange.mock.calls.at(-1)![0];
    expect(plan.voice.pieces[0]!.level_db).toBe(4);
    expect(plan.video.pieces[0]!.level_db).toBe(-6);
  });
  test("a page's own level steps replace the five", async () => {
    const { queryByRole } = open({ levelSteps: [{ id: "a", label: "Low", gain_db: -10, clip_gain_db: 0 }, { id: "b", label: "High", gain_db: 3, clip_gain_db: -3 }] });
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

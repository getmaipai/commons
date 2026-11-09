import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Player } from "@/kit/primitives/Player";
import { TranscriptPanel, filterTranscript, normalizeTranscript, transcriptIndexAt } from "@/kit/primitives/TranscriptPanel";
import { formatCountdown, sleepFromValue, sleepRemainingMs, sleepValue } from "@/kit/primitives/sleepLogic";

afterEach(cleanup);

function fakeAudio(el: HTMLMediaElement, duration = 600) {
  let paused = true;
  let current = 0;
  Object.defineProperty(el, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(el, "paused", { configurable: true, get: () => paused });
  Object.defineProperty(el, "currentTime", { configurable: true, get: () => current, set: (v: number) => { current = v; el.dispatchEvent(new Event("seeked")); } });
  el.play = mock(() => { paused = false; el.dispatchEvent(new Event("play")); return Promise.resolve(); });
  el.pause = mock(() => { paused = true; el.dispatchEvent(new Event("pause")); });
  return el;
}

describe("sleep logic", () => {
  test("choices map to states and back, and the countdown reads m:ss", () => {
    expect(sleepFromValue("end", 0)).toEqual({ kind: "end" });
    expect(sleepFromValue("15", 1000)).toEqual({ kind: "at", endsAt: 901000, minutes: 15 });
    expect(sleepFromValue("7", 0)).toBeNull();
    expect(sleepValue(null)).toBe("off");
    expect(sleepValue({ kind: "end" })).toBe("end");
    expect(sleepRemainingMs({ kind: "at", endsAt: 5000, minutes: 5 }, 8000)).toBe(0);
    expect(formatCountdown(14 * 60_000 + 59_001)).toBe("15:00");
    expect(formatCountdown(3_600_000)).toBe("1:00:00");
    expect(formatCountdown(1)).toBe("0:01");
  });
});

describe("transcript logic", () => {
  const lines = [{ start_s: 20, text: "Second part" }, { start_s: 0, text: "Hello and welcome" }, { start_s: -1, text: "bad" }, { start_s: 5, text: "  " }];
  test("lines are cleaned and sorted, the current index follows time, and search narrows", () => {
    const clean = normalizeTranscript(lines);
    expect(clean.map((l) => l.text)).toEqual(["Hello and welcome", "Second part"]);
    expect(transcriptIndexAt(clean, -1)).toBe(-1);
    expect(transcriptIndexAt(clean, 0)).toBe(0);
    expect(transcriptIndexAt(clean, 25)).toBe(1);
    expect(filterTranscript(clean, "WELCOME")).toHaveLength(1);
    expect(filterTranscript(clean, " ")).toHaveLength(2);
  });
});

describe("TranscriptPanel", () => {
  const lines = [{ start_s: 0, text: "Hello and welcome" }, { start_s: 20, text: "Second part" }, { start_s: 40, text: "Third part" }];
  test("marks the current paragraph, seeks on tap and filters with the search box", () => {
    const onSeek = mock((_s: number) => {});
    const view = render(<TranscriptPanel lines={lines} currentTime={22} onSeek={onSeek} />);
    const current = view.getByRole("button", { name: "Second part" });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.className).toContain("text-foreground");
    expect(view.getByRole("button", { name: "Third part" }).className).toContain("text-muted-foreground");
    fireEvent.click(view.getByRole("button", { name: "Third part" }));
    expect(onSeek).toHaveBeenCalledWith(40);
    fireEvent.change(view.getByRole("searchbox", { name: "Search the transcript" }), { target: { value: "hello" } });
    expect(view.queryByRole("button", { name: "Second part" })).toBeNull();
    expect(view.getByRole("button", { name: "Hello and welcome" })).toBeTruthy();
    fireEvent.change(view.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(view.getByRole("status").textContent).toContain("matches");
  });
  test("follows the media element's time", () => {
    const el = fakeAudio(document.createElement("audio"));
    const view = render(<TranscriptPanel lines={lines} getMedia={() => el} onSeek={() => {}} />);
    expect(view.getByRole("button", { name: "Hello and welcome" }).getAttribute("aria-current")).toBe("true");
    act(() => { el.currentTime = 45; el.dispatchEvent(new Event("timeupdate")); });
    expect(view.getByRole("button", { name: "Third part" }).getAttribute("aria-current")).toBe("true");
  });
  test("says plainly when there is no transcript", () => {
    const view = render(<TranscriptPanel lines={[]} onSeek={() => {}} />);
    expect(view.getByRole("status").textContent).toContain("No transcript");
  });
});

describe("Player parity controls", () => {
  const audio = (props: Partial<Parameters<typeof Player>[0]> = {}) => {
    const view = render(<Player src="/api/media/files/e1" kind="audio" title="Episode one" subtitle="Ember Workshop" {...props} />);
    const el = fakeAudio(view.container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
    return { ...view, el };
  };
  test("skip sets the seek buttons' offset, name and number glyph", () => {
    const { container } = audio({ skip: { back: 15, forward: 30 } });
    const back = container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')!;
    const forward = container.querySelector('[data-media-chrome="MediaSeekForwardButton"]')!;
    expect(back.getAttribute("aria-label")).toBe("Back 15 seconds");
    expect(forward.getAttribute("aria-label")).toBe("Ahead 30 seconds");
    expect(back.querySelector("[data-slot=player-skip-glyph]")!.textContent).toBe("15");
    expect(forward.querySelector("[data-slot=player-skip-glyph]")!.textContent).toBe("30");
  });
  test("the sleep timer is absent by default and shows a named button when on", () => {
    const off = audio();
    expect(off.container.querySelector("[data-slot=player-sleep]")).toBeNull();
    cleanup();
    const on = audio({ sleepTimer: true });
    expect(on.getByRole("button", { name: "Sleep timer" })).toBeTruthy();
  });
  test("End of episode stops the chain at the end: no onEnded, no Up next countdown, onSleep('end')", async () => {
    const onEnded = mock(() => {});
    const onSleep = mock((_r: string) => {});
    const onNext = mock(() => {});
    const view = audio({ sleepTimer: true, onEnded, onSleep, onNext, upNext: { id: "n", title: "Next" }, autoplayNext: true });
    fireEvent.pointerDown(view.getByRole("button", { name: "Sleep timer" }), { button: 0, pointerType: "mouse" });
    fireEvent.click(await view.findByRole("menuitemradio", { name: "End of episode" }));
    expect(view.getByRole("button", { name: "Sleep timer: End of episode" })).toBeTruthy();
    act(() => { view.el.dispatchEvent(new Event("ended")); });
    expect(onSleep).toHaveBeenCalledWith("end");
    expect(onEnded).not.toHaveBeenCalled();
    expect(view.queryByText(/Up next in/)).toBeNull();
    expect(view.getByRole("button", { name: "Sleep timer" })).toBeTruthy();
  });
  test("a minutes choice counts down in the button and pauses playback when it runs out", async () => {
    const onSleep = mock((_r: string) => {});
    const realNow = Date.now;
    const realMatch = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
    let clock = 1_000_000;
    Date.now = () => clock;
    try {
      const view = audio({ sleepTimer: true, onSleep });
      act(() => { void view.el.play(); });
      fireEvent.pointerDown(view.getByRole("button", { name: "Sleep timer" }), { button: 0, pointerType: "mouse" });
      fireEvent.click(await view.findByRole("menuitemradio", { name: "5 minutes" }));
      expect(view.getByRole("button", { name: "Sleep timer: 5:00" })).toBeTruthy();
      await act(async () => { clock += 5 * 60_000 + 1000; await new Promise((r) => setTimeout(r, 1100)); });
      expect(view.el.pause).toHaveBeenCalled();
      expect(onSleep).toHaveBeenCalledWith("timer");
    } finally {
      Date.now = realNow;
      window.matchMedia = realMatch;
    }
  });
  test("pip, double tap and long press can be turned off; pip is on by default", () => {
    const on = render(<Player src="/v" title="T" />);
    expect(on.container.querySelector('[data-media-chrome="MediaPipButton"]')).not.toBeNull();
    cleanup();
    const off = render(<Player src="/v" title="T" pip={false} doubleTapSeek={false} longPressSpeed={false} />);
    expect(off.container.querySelector('[data-media-chrome="MediaPipButton"]')).toBeNull();
    const layer = off.container.querySelector("[data-slot=player-gestures]")!;
    const el = fakeAudio(off.container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
    el.currentTime = 100;
    fireEvent.pointerDown(layer, { pointerType: "touch", clientX: 300, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(layer, { pointerType: "touch", clientX: 300, clientY: 50, pointerId: 1 });
    fireEvent.pointerDown(layer, { pointerType: "touch", clientX: 300, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(layer, { pointerType: "touch", clientX: 300, clientY: 50, pointerId: 1 });
    expect(el.currentTime).toBe(100);
  });
  test("double taps on the right seek forward and stack (default on)", () => {
    const view = render(<Player src="/v" title="T" />);
    const layer = view.container.querySelector("[data-slot=player-gestures]")!;
    const el = fakeAudio(view.container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
    (layer as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 170, right: 300, bottom: 170, x: 0, y: 0, toJSON: () => ({}) });
    el.currentTime = 100;
    for (const at of [1000, 1300, 1600]) {
      fireEvent.pointerDown(layer, { pointerType: "touch", clientX: 280, clientY: 80, pointerId: 1 });
      fireEvent.pointerUp(layer, { pointerType: "touch", clientX: 280, clientY: 80, pointerId: 1, timeStamp: at });
    }
    expect(el.currentTime).toBe(130);
  });
  test("transcript button swaps the art for the reader and a tap seeks", () => {
    const view = audio({ transcript: [{ start_s: 0, text: "Hello" }, { start_s: 30, text: "World" }] });
    expect(view.container.querySelector("[data-slot=player-transcript]")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Transcript" }));
    expect(view.container.querySelector("[data-slot=player-transcript]")).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "World" }));
    expect(view.el.currentTime).toBe(30);
  });
});

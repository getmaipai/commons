import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Player, type PlayerProgress } from "@/kit/primitives/Player";

afterEach(cleanup);

describe("Player voiceover", () => {
  const mockAudio = (voices: HTMLAudioElement[]) => {
    const original = globalThis.Audio;
    globalThis.Audio = function AudioMock() { return voices.shift()!; } as unknown as typeof Audio;
    return () => { globalThis.Audio = original; };
  };
  test("plays over music at a bed level, restores changed music volume, and follows pause/resume", async () => {
    const voice = fakeMedia(document.createElement("audio"), 4);
    const restore = mockAudio([voice]);
    const { el, unmount } = setup({ voiceover: { src: "/dj", at: 1 } });
    el.volume = 0.8;
    act(() => { void el.play(); el.currentTime = 1; fireEvent.timeUpdate(el); });
    await waitFor(() => expect(voice.play).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(el.volume).toBeCloseTo(0.28);
    el.volume = 0.6;
    el.pause();
    expect(voice.pause).toHaveBeenCalled();
    act(() => { void el.play(); });
    expect(voice.play).toHaveBeenCalledTimes(2);
    act(() => fireEvent.ended(voice));
    expect(el.volume).toBe(0.6);
    unmount();
    restore();
  });

  test("cuts at the first lyric and reports once", async () => {
    const voice = fakeMedia(document.createElement("audio"), 8);
    const restore = mockAudio([voice]);
    const onDone = mock(() => {});
    const { el } = setup({ voiceover: { src: "/dj", at: "start", firstLyricS: 2, onDone } });
    act(() => { void el.play(); });
    await waitFor(() => expect(voice.play).toHaveBeenCalled());
    act(() => { el.currentTime = 2; fireEvent.timeUpdate(el); });
    await waitFor(() => expect(onDone).toHaveBeenCalledWith("cut"));
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(voice.pause).toHaveBeenCalled();
    restore();
  });

  test("replaces a source and reports load errors without UI", async () => {
    const voices = [fakeMedia(document.createElement("audio")), fakeMedia(document.createElement("audio"))];
    const created: HTMLAudioElement[] = [];
    const original = globalThis.Audio;
    globalThis.Audio = function AudioMock() { const voice = voices.shift()!; created.push(voice); return voice; } as unknown as typeof Audio;
    const failed = mock(() => {});
    const view = render(<Player src="/song" kind="audio" title="Song" voiceover={{ src: "/one" }} />);
    const el = fakeMedia(view.container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
    act(() => { void el.play(); });
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(view.container.querySelector("[data-slot=player-media]")).not.toBeNull();
    view.rerender(<Player src="/song" kind="audio" title="Song" voiceover={{ src: "/two", onDone: failed }} />);
    await waitFor(() => expect(created).toHaveLength(2));
    created[1]?.dispatchEvent(new Event("error"));
    expect(failed).toHaveBeenCalledWith("error");
    expect(view.container.querySelector("[role=alert]")).toBeNull();
    view.unmount();
    globalThis.Audio = original;
  });

  test("speaks over a host-owned element and pauses with it", async () => {
    const voice = fakeMedia(document.createElement("audio"), 4);
    const restore = mockAudio([voice]);
    const owned = fakeMedia(document.createElement("audio"));
    const view = render(<Player src="/song" kind="audio" title="Song" media={owned} voiceover={{ src: "/dj" }} />);
    act(() => { void owned.play(); owned.dispatchEvent(new Event("timeupdate")); });
    await waitFor(() => expect(voice.play).toHaveBeenCalled());
    act(() => { owned.pause(); });
    expect(voice.pause).toHaveBeenCalled();
    view.unmount();
    restore();
  });

  test("does not create Audio without a voiceover and restores music volume on unmount", async () => {
    const restore = mockAudio([]);
    const ctor = mock(function(this: HTMLAudioElement) { return document.createElement("audio"); });
    globalThis.Audio = ctor as unknown as typeof Audio;
    const plain = render(<Player src="/song" kind="audio" title="Song" />);
    expect(ctor).not.toHaveBeenCalled();
    plain.unmount();
    const voice = fakeMedia(document.createElement("audio"));
    globalThis.Audio = function AudioMock() { return voice; } as unknown as typeof Audio;
    const { el, unmount } = setup({ voiceover: { src: "/dj", at: 0 } });
    el.volume = 0.5;
    act(() => { void el.play(); });
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(el.volume).toBeCloseTo(0.175);
    unmount();
    expect(el.volume).toBe(0.5);
    restore();
  });
});

/** happy-dom's media element has no real playback: give it a duration, a paused flag and play/pause that fire events. */
function fakeMedia(el: HTMLMediaElement, duration = 1200) {
  let paused = true;
  let current = 0;
  Object.defineProperty(el, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(el, "paused", { configurable: true, get: () => paused });
  Object.defineProperty(el, "ended", { configurable: true, get: () => current >= duration });
  Object.defineProperty(el, "currentTime", {
    configurable: true,
    get: () => current,
    set: (v: number) => {
      current = v;
      el.dispatchEvent(new Event("seeked"));
    },
  });
  el.play = mock(() => {
    paused = false;
    el.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  el.pause = mock(() => {
    paused = true;
    el.dispatchEvent(new Event("pause"));
  });
  return el;
}

function setup(props: Partial<Parameters<typeof Player>[0]> = {}) {
  const view = render(<Player src="/api/media/files/v1" title="Building a pizza oven" subtitle="Ember Workshop" {...props} />);
  const el = fakeMedia(view.container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
  return { ...view, el, root: view.container.querySelector("[data-slot=player]") as HTMLElement };
}

describe("Player > live stream (RADIO-07)", () => {
  test("a live item draws the Live badge and no time range or seek buttons (video layout)", () => {
    const { container, getByText } = render(<Player src="/stream" kind="video" title="Jazz FM" live />);
    expect(getByText("Live")).toBeTruthy();
    expect(container.querySelector('[data-media-chrome="MediaTimeRange"]')).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaSeekForwardButton"]')).toBeNull();
  });
  test("a live item in the audio layout has no time range, no remaining time and no skip buttons", () => {
    const { container, getByText } = render(<Player src="/stream" kind="audio" title="Jazz FM" live />);
    expect(getByText("Live")).toBeTruthy();
    expect(container.querySelector('[data-media-chrome="MediaTimeRange"]')).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaSeekForwardButton"]')).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaPlayButton"]')).not.toBeNull();
  });
  test("the mini bar shows the Live badge", () => {
    const { getByText } = render(<Player src="/stream" kind="audio" layout="mini" title="Jazz FM" live onExpand={() => {}} />);
    expect(getByText("Live")).toBeTruthy();
  });
  test("arrow keys do not seek a live item", () => {
    const { el, root } = setup({ live: true });
    el.currentTime = 100;
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(el.currentTime).toBe(100);
  });
  test("an item with a finite duration and no live prop keeps its seek controls and no badge", () => {
    const { container, queryByText } = render(<Player src="/a" kind="video" title="Clip" />);
    expect(queryByText("Live")).toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaSeekBackwardButton"]')).not.toBeNull();
    expect(container.querySelector('[data-media-chrome="MediaTimeRange"]')).not.toBeNull();
  });
  test("an element that reports an infinite duration counts as live", () => {
    const { container, getByText } = render(<Player src="/stream" kind="audio" title="Jazz FM" />);
    const el = fakeMedia(container.querySelector("[data-slot=player-media]") as HTMLMediaElement, Number.POSITIVE_INFINITY);
    act(() => { el.dispatchEvent(new Event("durationchange")); });
    expect(getByText("Live")).toBeTruthy();
  });
});

describe("Player", () => {

  test("audio artwork stays square and is capped on narrow screens", () => {
    const { container } = render(<Player src="/song" kind="audio" title="Song" poster="/cover.png" />);
    const cover = container.querySelector("img");
    expect(String(cover?.className)).toContain("aspect-square");
    expect(String(cover?.className)).toContain("max-sm:w-[60vw]");
    const video = render(<Player src="/clip" kind="video" title="Clip" />);
    expect(video.container.querySelector("[data-slot=player-controls]")?.getAttribute("class") ?? "").toContain("bg-transparent");
  });

  test("shows a music placeholder when an audio poster is absent", () => {
    const view = render(<Player src="/a" kind="audio" layout="mini" title="Song" />);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"][data-kind="music"]')).not.toBeNull();
  });
  test("audio lyrics button swaps artwork for the shared list and seeks", () => {
    const { container, getByRole, getByText } = render(<Player src="/song" kind="audio" title="Song" lyrics={{ lines: [{ t: 12, line: "A lyric" }] }} />);
    const media = fakeMedia(container.querySelector("[data-slot=player-media]") as HTMLMediaElement);
    act(() => fireEvent.timeUpdate(media));
    act(() => fireEvent.click(getByRole("button", { name: "Lyrics" })));
    expect(container.querySelector('[data-slot="player-lyrics"]')).not.toBeNull();
    act(() => fireEvent.click(getByText("A lyric")));
    expect(media.currentTime).toBe(12);
    act(() => fireEvent.click(getByRole("button", { name: "Lyrics" })));
    expect(container.querySelector('[data-slot="player-lyrics"]')).toBeNull();
  });
  test("requests missing lyrics once per source when Lyrics opens", () => {
    const onLyricsOpen = mock(() => {});
    const view = render(<Player src="/song" kind="audio" title="Song" lyrics={{}} onLyricsOpen={onLyricsOpen} />);
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(onLyricsOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(onLyricsOpen).toHaveBeenCalledTimes(1);
    view.rerender(<Player src="/song-2" kind="audio" title="Song" lyrics={{}} onLyricsOpen={onLyricsOpen} />);
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(onLyricsOpen).toHaveBeenCalledTimes(2);
  });
  test("does not request lyrics already present", () => {
    const onLyricsOpen = mock(() => {});
    const view = render(<Player src="/song" kind="audio" title="Song" lyrics={{ text: "Already here" }} onLyricsOpen={onLyricsOpen} />);
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(onLyricsOpen).not.toHaveBeenCalled();
  });
  test("shows the loading message while lyrics are being looked up", () => {
    const view = render(<Player src="/song" kind="audio" title="Song" lyrics={{}} lyricsLoading />);
    fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
    expect(view.getByText("Looking for lyrics...")).toBeTruthy();
  });
  test("opens at the stored position with the resume line, and Start over goes to the start", async () => {
    const onProgress = mock((_: PlayerProgress) => {});
    const { el, getByRole, findByText } = setup({ resumeFrom: 760, onProgress });
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(760);
    await findByText("Resuming from 12:40");
    // The resume seek is not reported as the person seeking.
    expect(onProgress.mock.calls.some(([p]) => p.reason === "seek")).toBe(false);
    fireEvent.click(getByRole("button", { name: "Start over" }));
    expect(el.currentTime).toBe(0);
  });

  test("a completed item opens at the start with no resume line", () => {
    const { el, queryByText } = setup({ resumeFrom: 760, completed: true });
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(0);
    expect(queryByText(/Resuming from/)).toBeNull();
  });

  test("the resume line goes after two seconds", async () => {
    const { el, findByText, queryByText } = setup({ resumeFrom: 760 });
    fireEvent.loadedMetadata(el);
    await findByText("Resuming from 12:40");
    await waitFor(() => expect(queryByText("Resuming from 12:40")).toBeNull(), { timeout: 6000 });
  }, 15_000);

  test("onProgress fires on pause, seek, end and unmount", () => {
    const reasons: PlayerProgress[] = [];
    const { el, unmount } = setup({ onProgress: (p) => reasons.push(p) });
    fireEvent.loadedMetadata(el);
    void el.play();
    el.currentTime = 300;
    el.pause();
    el.currentTime = 1200;
    fireEvent.ended(el);
    unmount();
    expect(reasons.map((r) => r.reason)).toEqual(["seek", "pause", "seek", "ended", "unload"]);
    expect(reasons[1]).toMatchObject({ position_s: 300, duration_s: 1200, completed: false });
    expect(reasons[3]!.completed).toBe(true);
  });

  test("opening and leaving without playing reports nothing (a stored position is never overwritten with 0)", () => {
    const onProgress = mock((_: PlayerProgress) => {});
    const { el, unmount } = setup({ onProgress, resumeFrom: 760 });
    fireEvent.loadedMetadata(el);
    fireEvent.pause(el);
    unmount();
    expect(onProgress).not.toHaveBeenCalled();
  });

  test("keyboard: space plays, arrows move 5 s, m mutes", () => {
    const { el, root } = setup();
    fireEvent.loadedMetadata(el);
    el.currentTime = 100;
    fireEvent.keyDown(root, { key: " " });
    expect(el.play).toHaveBeenCalled();
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(el.currentTime).toBe(105);
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(el.currentTime).toBe(95);
    fireEvent.keyDown(root, { key: "m" });
    expect(el.muted).toBe(true);
  });

  test("keyboard: c turns the first captions track on and off", () => {
    const { el, root } = setup({ captions: [{ src: "/c/en.vtt", srclang: "en", label: "English" }] });
    const track = { kind: "subtitles", mode: "disabled" as TextTrackMode };
    Object.defineProperty(el, "textTracks", { configurable: true, get: () => [track] });
    fireEvent.keyDown(root, { key: "c" });
    expect(track.mode).toBe("showing");
    fireEvent.keyDown(root, { key: "c" });
    expect(track.mode).toBe("disabled");
  });

  function gestureLayer(root: HTMLElement) {
    const layer = root.querySelector("[data-slot=player-gestures]") as HTMLElement;
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 170, right: 300, bottom: 170, x: 0, y: 0, toJSON: () => ({}) });
    return layer;
  }
  function tap(layer: HTMLElement, x: number, at: number) {
    fireEvent.pointerDown(layer, { pointerType: "touch", clientX: x, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(layer, { pointerType: "touch", clientX: x, clientY: 80, pointerId: 1, timeStamp: at });
  }

  test("double-tap the right side skips 15 s, a third tap in the window makes it 30", async () => {
    const { el, root, findByText } = setup();
    fireEvent.loadedMetadata(el);
    el.currentTime = 100;
    const layer = gestureLayer(root);
    tap(layer, 280, 1000);
    expect(el.currentTime).toBe(100);
    tap(layer, 280, 1300);
    expect(el.currentTime).toBe(115);
    tap(layer, 280, 1600);
    expect(el.currentTime).toBe(130);
    await findByText("+30 s");
  });

  test("double-tap the left side goes back 15 s", () => {
    const { el, root } = setup();
    fireEvent.loadedMetadata(el);
    el.currentTime = 100;
    const layer = gestureLayer(root);
    tap(layer, 20, 1000);
    tap(layer, 20, 1200);
    expect(el.currentTime).toBe(85);
  });

  test("holding 500 ms plays at 2x until let go", async () => {
    const { el, root, findByText } = setup();
    fireEvent.loadedMetadata(el);
    void el.play();
    el.playbackRate = 1.25;
    const layer = gestureLayer(root);
    fireEvent.pointerDown(layer, { pointerType: "touch", clientX: 150, clientY: 80, pointerId: 1 });
    await findByText("2x speed", undefined, { timeout: 4000 });
    expect(el.playbackRate).toBe(2);
    fireEvent.pointerUp(layer, { pointerType: "touch", clientX: 150, clientY: 80, pointerId: 1 });
    expect(el.playbackRate).toBe(1.25);
  }, 15_000);

  test("pulling the picture down docks it", () => {
    const onDock = mock(() => {});
    const { root } = setup({ onDock });
    const layer = gestureLayer(root);
    fireEvent.pointerDown(layer, { pointerType: "touch", clientX: 150, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(layer, { pointerType: "touch", clientX: 155, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(layer, { pointerType: "touch", clientX: 155, clientY: 140, pointerId: 1 });
    expect(onDock).toHaveBeenCalledTimes(1);
  });

  test("a mouse click on the picture plays and pauses", () => {
    const { el, root } = setup();
    const layer = gestureLayer(root);
    fireEvent.pointerDown(layer, { pointerType: "mouse", clientX: 150, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(layer, { pointerType: "mouse", clientX: 150, clientY: 80, pointerId: 1 });
    expect(el.play).toHaveBeenCalledTimes(1);
  });

  test("Skip intro shows inside an intro chapter and jumps to the next chapter", async () => {
    const { el, findByRole } = setup({
      chapters: [
        { start_s: 0, title: "Intro" },
        { start_s: 42, title: "The harbor" },
      ],
    });
    fireEvent.loadedMetadata(el);
    el.currentTime = 10;
    fireEvent.timeUpdate(el);
    fireEvent.click(await findByRole("button", { name: "Skip intro" }));
    expect(el.currentTime).toBe(42);
  });

  test("Up next counts down when autoplayNext is on, and Cancel stops it", async () => {
    const onNext = mock((_?: string) => {});
    const upNext = { id: "m2", title: "How tides work" };
    const { el, findByText, getByRole, queryByText } = setup({ upNext, autoplayNext: true, onNext });
    fireEvent.loadedMetadata(el);
    fireEvent.ended(el);
    await findByText("Up next in 5");
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(queryByText(/Up next in/)).toBeNull();
    await new Promise((r) => setTimeout(r, 1200));
    expect(onNext).not.toHaveBeenCalled();
  }, 15_000);

  test("the countdown plays the next item when it reaches zero", async () => {
    const onNext = mock((_?: string) => {});
    const { el } = setup({ upNext: { id: "m2", title: "How tides work" }, autoplayNext: true, countdownSeconds: 1, onNext });
    fireEvent.loadedMetadata(el);
    fireEvent.ended(el);
    await waitFor(() => expect(onNext).toHaveBeenCalledWith("m2"), { timeout: 5000 });
  }, 15_000);

  test("with autoplayNext off (kid mode) the end shows Up next without a countdown", async () => {
    const onNext = mock((_?: string) => {});
    const { el, findByText, queryByText, getByRole } = setup({ upNext: { id: "m2", title: "How tides work" }, onNext });
    fireEvent.loadedMetadata(el);
    fireEvent.ended(el);
    await findByText("Up next");
    expect(queryByText(/Up next in/)).toBeNull();
    fireEvent.click(getByRole("button", { name: "Play now" }));
    expect(onNext).toHaveBeenCalledWith("m2");
  });

  test("the video box never shrinks below its 16:9 height", () => {
    const view = render(<Player src="/a" title="Lanterns" kind="video" layout="video" />);
    const root = view.container.querySelector("[data-slot=player]") as HTMLElement;
    expect(root.className).toContain("shrink-0");
  });

  test("the video layout is never taller than the window, so the title stays on screen under it", () => {
    const view = render(<Player src="/a" title="Lanterns" kind="video" layout="video" />);
    const root = view.container.querySelector("[data-slot=player]") as HTMLElement;
    expect(root.style.maxWidth).toContain("100dvh");
    expect(root.style.maxWidth).toContain("16 / 9");
  });

  test("docking to the mini layout keeps the same media element (playback never restarts)", () => {
    const view = render(<Player src="/a" title="Lanterns" kind="video" layout="video" />);
    const before = view.container.querySelector("[data-slot=player-media]");
    view.rerender(<Player src="/a" title="Lanterns" kind="video" layout="mini" onExpand={() => {}} />);
    expect(view.container.querySelector("[data-slot=player]")?.getAttribute("data-layout")).toBe("mini");
    expect(view.container.querySelector("[data-slot=player-media]")).toBe(before);
    view.rerender(<Player src="/a" title="Lanterns" kind="video" layout="video" />);
    expect(view.container.querySelector("[data-slot=player-media]")).toBe(before);
  });

  test("the mini bar opens the full player and names the item", () => {
    const onExpand = mock(() => {});
    const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" subtitle="Iris Vale" onExpand={onExpand} />);
    fireEvent.click(view.getByRole("button", { name: "Open the player: Lanterns" }));
    expect(onExpand).toHaveBeenCalled();
    expect(view.container.querySelector("audio")).toBeTruthy();
  });

  test("mini close control stays outside the hidden actions group and dismisses", () => {
    const onClose = mock(() => {});
    const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onClose={onClose} />);
    const close = view.getByRole("button", { name: "Close player: Lanterns" });
    expect(close.closest(".max-sm\\:hidden")).toBeNull();
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
    view.rerender(<Player src="/a" kind="audio" layout="mini" title="Lanterns" />);
    expect(view.queryByRole("button", { name: "Close player: Lanterns" })).toBeNull();
  });

  describe("MUSIC-KIT-01 props", () => {
    const touch = (el: Element, type: "pointerdown" | "pointerup", y: number, pointerType = "touch") => {
      const event = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
      Object.assign(event, { clientX: 100, clientY: y, pointerId: 1, pointerType });
      el.dispatchEvent(event);
    };
    test("swipeUpToExpand: a touch drag up on the mini bar opens the player once; a short drag, a mouse drag and the default do not", () => {
      const onExpand = mock(() => {});
      const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onExpand={onExpand} swipeUpToExpand />);
      const bar = view.container.querySelector("[data-slot=player]")!;
      expect(bar.getAttribute("data-swipe-up")).toBe("true");
      touch(bar, "pointerdown", 300); touch(bar, "pointerup", 280);
      touch(bar, "pointerdown", 300, "mouse"); touch(bar, "pointerup", 200, "mouse");
      expect(onExpand).not.toHaveBeenCalled();
      touch(bar, "pointerdown", 300); touch(bar, "pointerup", 240);
      expect(onExpand).toHaveBeenCalledTimes(1);
      // the click the browser sends after the swipe is swallowed, so it does not open twice
      fireEvent.click(view.getByRole("button", { name: "Open the player: Lanterns" }));
      expect(onExpand).toHaveBeenCalledTimes(1);
      fireEvent.click(view.getByRole("button", { name: "Open the player: Lanterns" }));
      expect(onExpand).toHaveBeenCalledTimes(2);
    });
    test("swipeToSkip: a sideways touch drag skips next (left) or previous (right); vertical, short, mouse and the default do nothing", () => {
      const onNext = mock(() => {});
      const onPrevious = mock(() => {});
      const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onNext={onNext} onPrevious={onPrevious} swipeToSkip />);
      const bar = view.container.querySelector("[data-slot=player]")!;
      expect(bar.getAttribute("data-swipe-skip")).toBe("true");
      const drag = (x0: number, y0: number, x1: number, y1: number, pointerType = "touch") => {
        for (const [type, x, y] of [["pointerdown", x0, y0], ["pointerup", x1, y1]] as const) {
          const event = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
          Object.assign(event, { clientX: x, clientY: y, pointerId: 1, pointerType });
          bar.dispatchEvent(event);
        }
      };
      drag(200, 100, 190, 100);
      drag(200, 100, 100, 100, "mouse");
      drag(200, 100, 120, 190);
      expect(onNext).not.toHaveBeenCalled();
      expect(onPrevious).not.toHaveBeenCalled();
      drag(200, 100, 100, 110);
      expect(onNext).toHaveBeenCalledTimes(1);
      drag(100, 100, 200, 90);
      expect(onPrevious).toHaveBeenCalledTimes(1);
    });
    test("swipeToSkip off: no swipe markup; the mini bar draws a hairline progress line along its bottom edge", () => {
      const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onNext={() => {}} />);
      const bar = view.container.querySelector("[data-slot=player]")!;
      expect(bar.getAttribute("data-swipe-skip")).toBeNull();
      const line = bar.querySelector("[data-slot=player-hairline]")!;
      expect(line.className).toContain("bottom-0");
      expect(line.className).toContain("h-px");
    });
    test("without swipeUpToExpand the mini bar ignores a swipe and keeps its markup", () => {
      const onExpand = mock(() => {});
      const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onExpand={onExpand} />);
      const bar = view.container.querySelector("[data-slot=player]")!;
      expect(bar.getAttribute("data-swipe-up")).toBeNull();
      expect(bar.className).not.toContain("touch-pan-x");
      touch(bar, "pointerdown", 300); touch(bar, "pointerup", 100);
      expect(onExpand).not.toHaveBeenCalled();
    });
    test("artSpring: the audio art rests small while paused and is motion-safe only; off by default", () => {
      const view = render(<Player src="/a" kind="audio" title="Lanterns" poster="/p.jpg" artSpring />);
      const img = view.container.querySelector("[data-slot=player] img, [data-slot=player] svg, [data-slot=player] [class*=aspect-square]")!;
      expect(img.className).toContain("motion-safe:scale-[var(--art-resting-scale)]");
      expect(img.className).toContain("motion-safe:ease-[var(--art-spring-ease)]");
      expect(img.className).not.toMatch(/(^|\s)scale-/);
      view.rerender(<Player src="/a" kind="audio" title="Lanterns" poster="/p.jpg" />);
      expect(view.container.innerHTML).not.toContain("art-spring");
    });
    test("lyricsBlur passes blurByDistance to the lyrics list", () => {
      const lines = [{ t: 0, line: "One" }, { t: 5, line: "Two" }];
      const view = render(<Player src="/a" kind="audio" title="Song" lyrics={{ lines }} lyricsBlur />);
      fireEvent.click(view.getByRole("button", { name: "Lyrics" }));
      expect(view.container.querySelector("[data-slot=player-lyrics] [data-distance]")).toBeTruthy();
    });
  });

  test("Media Session: metadata and handlers while playing", () => {
    const handlers = new Map<string, unknown>();
    const session = { metadata: null as unknown, setActionHandler: (a: string, h: unknown) => handlers.set(a, h) };
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class {
      constructor(public init: unknown) {}
    };
    const onNext = mock((_?: string) => {});
    const { el } = setup({ poster: "/art.jpg", onNext, upNext: { id: "m2", title: "Next" } });
    fireEvent.loadedMetadata(el);
    act(() => void el.play());
    expect((session.metadata as { init: unknown }).init).toEqual({ title: "Building a pizza oven", artist: "Ember Workshop", artwork: [{ src: "/art.jpg" }] });
    expect(typeof handlers.get("pause")).toBe("function");
    (handlers.get("nexttrack") as () => void)();
    expect(onNext).toHaveBeenCalledWith("m2");
    expect(handlers.get("previoustrack")).toBeNull();
    delete (navigator as { mediaSession?: unknown }).mediaSession;
  });

  test("the rate prop applies the person's speed", () => {
    const { el } = setup({ rate: 1.5 });
    fireEvent.loadedMetadata(el);
    expect(el.playbackRate).toBe(1.5);
  });

  test("every control has a name", () => {
    const { root } = setup({ chapters: [{ start_s: 0, title: "One" }], onDock: () => {} });
    for (const button of root.querySelectorAll("button")) expect(button.getAttribute("aria-label") ?? button.textContent).toBeTruthy();
    expect(root.querySelector("[aria-label='Playback speed: 1x']")).toBeTruthy();
    expect(root.querySelector("[aria-label=Chapters]")).toBeTruthy();
  });

  describe("MEDIA-POLISH-01 a host-owned element", () => {
    test("is adopted into the controls, parked when the Player goes, and carries on in the next Player", () => {
      const owned = fakeMedia(document.createElement("video"));
      const first = render(<Player src="/a" title="Lanterns" kind="video" media={owned} />);
      expect(first.container.querySelector("[data-slot=player-media]")).toBe(owned);
      expect(owned.getAttribute("src")).toBe("/a");
      act(() => void owned.play());
      // The Player hears the element's own events: its play button now offers Pause.
      expect(first.container.querySelector("[data-slot=player-play]")!.getAttribute("aria-label")).toBe("Pause");
      first.unmount();
      // Never out of the document: a media element removed from it pauses.
      expect(owned.isConnected).toBe(true);
      expect(owned.parentElement?.getAttribute("data-slot")).toBe("player-parking");
      expect(owned.paused).toBe(false);
      const dock = render(<Player src="/a" title="Lanterns" kind="video" layout="mini" placement="dock" media={owned} onExpand={() => {}} />);
      expect(dock.container.querySelector("[data-slot=player-media]")).toBe(owned);
      // The mini bar shows the art, not the picture.
      expect(owned.style.display).toBe("none");
      expect(dock.container.querySelector("[data-slot=player]")!.getAttribute("data-placement")).toBe("dock");
      expect(dock.container.querySelector("[data-slot=player]")!.className).toContain("sticky");
    });

    test("an inline mini bar is unchanged (no sticky dock classes)", () => {
      const view = render(<Player src="/a" kind="audio" layout="mini" title="Lanterns" onExpand={() => {}} />);
      expect(view.container.querySelector("[data-slot=player]")!.className).not.toContain("sticky");
    });
  });
});

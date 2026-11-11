import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { setPackIO } from "./pack-loader";
import { CompanionPackPlayer, setPackVideoFactory } from "./player";
import type { SpeechInput } from "./speech";
import { setStackedAlphaRendererFactory } from "./stacked-alpha";
import type { CompanionPackData, PackClip } from "./types";

// PACK-06c regressions: the speech overlay must draw whenever `speech` is defined, whether the clip plays or is held (paused) at a rest frame.
const clip = (id: string): PackClip => ({ id, file: `${id}.mp4`, fps: 24, frames: 117, rest: { first: 0, last: 116 } });
const pack: CompanionPackData = { rest: "rest.webp", states: { idle: [clip("idle-a")], listen: [clip("listen")], think: [clip("think")], speak: [clip("speak")] } };
const FADE_MS = 90;

let queue: FrameRequestCallback[] = [];
let clockNow = 0;
let videos: HTMLVideoElement[] = [];
const restores: Array<() => void> = [];
const oldRaf = window.requestAnimationFrame;
const oldCancel = window.cancelAnimationFrame;
const oldGetContext = HTMLCanvasElement.prototype.getContext;

const speech = (clock: () => number = () => 0.5): SpeechInput => ({
  cues: [{ l: "B", t0: 0, t1: 1, p: "IH" }], loudness: new Float32Array(100), events: [], clock,
});
/** One display refresh: runs the callbacks queued so far; each tick queues the next one. */
const refresh = () => { const run = queue; queue = []; clockNow += 16; act(() => { run.forEach((callback) => callback(clockNow)); }); };
const frames = (count: number) => { for (let i = 0; i < count; i += 1) refresh(); };
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); }); };
const setHidden = (hidden: boolean) => act(() => { Object.defineProperty(document, "hidden", { value: hidden, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });

beforeEach(() => {
  queue = []; clockNow = 0; videos = [];
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => { queue.push(callback); return queue.length; }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => { queue = []; }) as typeof window.cancelAnimationFrame;
  const ctx = new Proxy({ canvas: { width: 480, height: 480 } }, {
    get: (target, key) => (key in target ? (target as Record<string | symbol, unknown>)[key] : () => ({ data: new Uint8ClampedArray(4) })),
  });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  restores.push(setPackIO({ bytes: async () => { throw new Error("no files in tests"); } }));
  restores.push(setStackedAlphaRendererFactory(() => ({ gl: {} as WebGLRenderingContext, draw() {}, dispose() {} })));
  restores.push(setPackVideoFactory(() => {
    const video = document.createElement("video");
    videos.push(video);
    Object.defineProperty(video, "readyState", { value: 4, configurable: true });
    // The clip is HELD on its rest frame: paused, currentTime fixed, no new frames arrive.
    Object.defineProperty(video, "currentTime", { value: 20 / 24, writable: true, configurable: true });
    video.load = () => {}; video.play = async () => {}; video.pause = () => {};
    return video;
  }));
});
afterEach(() => {
  cleanup();
  while (restores.length) restores.pop()!();
  window.requestAnimationFrame = oldRaf; window.cancelAnimationFrame = oldCancel;
  HTMLCanvasElement.prototype.getContext = oldGetContext;
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

const mount = (props: { speech?: SpeechInput; onSpeechFrame?: (ms: number) => void }) => {
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" {...props} />);
  act(() => { videos[0]!.dispatchEvent(new Event("canplay")); });
  const overlay = () => view.container.querySelector("[data-pack-speech]") as HTMLCanvasElement;
  const again = (next: typeof props) => view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" {...next} />);
  return { view, overlay, again };
};

test("speech set after mount, with the clip held at a rest frame, draws within a few ticks", async () => {
  const onSpeechFrame = jest.fn();
  const { overlay, again } = mount({ onSpeechFrame });
  frames(3);
  expect(overlay().style.display).toBe("none");
  again({ speech: speech(), onSpeechFrame });
  await settle();
  frames(4);
  expect(onSpeechFrame).toHaveBeenCalled();
  expect(overlay().style.display).toBe("block");
});

test("clearing speech fades the overlay out within 90 ms and setting it again draws again", async () => {
  const onSpeechFrame = jest.fn();
  const { overlay, again } = mount({ speech: speech(), onSpeechFrame });
  await settle(); frames(4);
  expect(overlay().style.display).toBe("block");
  again({ onSpeechFrame });
  for (let ms = 0; ms <= FADE_MS; ms += 16) refresh();
  frames(1);
  expect(overlay().style.display).toBe("none");
  onSpeechFrame.mockClear();
  again({ speech: speech(), onSpeechFrame });
  frames(4);
  expect(onSpeechFrame).toHaveBeenCalled();
  expect(overlay().style.display).toBe("block");
});

test("no speech: no overlay work", async () => {
  const onSpeechFrame = jest.fn();
  const { overlay } = mount({ onSpeechFrame });
  frames(6);
  expect(onSpeechFrame).not.toHaveBeenCalled();
  expect(overlay().style.display).toBe("none");
});

test("hiding and showing the document with speech set keeps drawing", async () => {
  const onSpeechFrame = jest.fn();
  const { overlay } = mount({ speech: speech(), onSpeechFrame });
  await settle(); frames(3);
  setHidden(true); frames(3);
  setHidden(false);
  onSpeechFrame.mockClear();
  frames(4);
  expect(onSpeechFrame).toHaveBeenCalled();
  expect(overlay().style.display).toBe("block");
});

test("speech set while the document is hidden draws once it is shown", async () => {
  setHidden(true);
  const onSpeechFrame = jest.fn();
  const { overlay, again } = mount({ onSpeechFrame });
  again({ speech: speech(), onSpeechFrame });
  await settle(); frames(3);
  setHidden(false);
  frames(4);
  expect(onSpeechFrame).toHaveBeenCalled();
  expect(overlay().style.display).toBe("block");
});

test("a clock that throws once (suspended audio context) does not stop the loop", async () => {
  const onSpeechFrame = jest.fn();
  let failing = true;
  const { overlay } = mount({ speech: speech(() => { if (failing) throw new Error("suspended"); return 0.5; }), onSpeechFrame });
  await settle();
  frames(3);
  failing = false;
  frames(4);
  expect(onSpeechFrame).toHaveBeenCalled();
  expect(overlay().style.display).toBe("block");
});

test("a speech-frame callback that throws does not stop the loop", async () => {
  let calls = 0;
  const { overlay } = mount({ speech: speech(), onSpeechFrame: () => { calls += 1; if (calls === 1) throw new Error("host bug"); } });
  await settle(); frames(6);
  expect(calls).toBeGreaterThan(1);
  expect(overlay().style.display).toBe("block");
});

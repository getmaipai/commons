import { afterEach, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { CompanionPackPlayer, setPackVideoFactory } from "./player";
import { setStackedAlphaRendererFactory } from "./stacked-alpha";
import type { CompanionPackData } from "./types";
import { setVoiceImageLoader } from "./voice-player";

afterEach(cleanup);
const pack: CompanionPackData = {
  rest: "rest.webp",
  voice: {
    base: "voice/base.webp",
    parts: [{
      id: "heart", file: "voice/heart.webp", box: { x: 200, y: 280, w: 100, h: 90 }, glow: { color: "#ff3b30" },
      effects: [{ channel: "level", smoothing: { attackMs: 0, releaseMs: 0 }, scale: [1, 1.12], glow: [0, 1] }],
    }],
  },
};

/** Installs fakes for rAF, the 2D context and the image loader; returns what was drawn and a way to run frames. */
function rig() {
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const originalGet = HTMLCanvasElement.prototype.getContext;
  let callback: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => { callback = cb; return 1; }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
  const contexts: string[] = [];
  const calls: [string, ...unknown[]][] = [];
  const ctx = new Proxy({}, {
    get: (_t, key: string) => (...args: unknown[]) => { calls.push([key, ...args]); },
    set: () => true,
  });
  HTMLCanvasElement.prototype.getContext = ((kind: string) => { contexts.push(kind); return kind === "2d" ? ctx : null; }) as never;
  const loaded: string[] = [];
  const restoreImages = setVoiceImageLoader(async (url) => { loaded.push(url); return url as never; });
  let now = 0;
  return {
    calls, contexts, loaded,
    async frame(ms = 20) { now += ms; await act(async () => { await Promise.resolve(); callback?.(now); }); },
    restore() {
      window.requestAnimationFrame = originalRaf; window.cancelAnimationFrame = originalCancel;
      HTMLCanvasElement.prototype.getContext = originalGet; restoreImages();
    },
  };
}

test("a still-plus-parts pack creates no video and no GL context", async () => {
  const r = rig();
  let videos = 0; let renderers = 0;
  const restoreVideo = setPackVideoFactory(() => { videos += 1; return document.createElement("video"); });
  const restoreGl = setStackedAlphaRendererFactory(() => { renderers += 1; throw new Error("GL must not be used"); });
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" size={480} tier="desktop" />);
  await r.frame(); await r.frame();
  expect(view.container.querySelector("canvas")).not.toBeNull();
  expect(view.container.querySelector("video")).toBeNull();
  expect(videos).toBe(0);
  expect(renderers).toBe(0);
  expect(r.contexts.every((kind) => kind === "2d")).toBe(true);
  expect(r.loaded).toEqual(["https://example.test/p/voice/base.webp", "https://example.test/p/voice/heart.webp"]);
  view.unmount(); restoreVideo(); restoreGl(); r.restore();
});

test("the heart part scale follows the speech level (envelope 0.5 gives 1.06)", async () => {
  const r = rig();
  const speech = { cues: [], loudness: new Float32Array(0), events: [], envelope: new Float32Array(300).fill(0.5), clock: () => 0.5 };
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="speak" size={480} tier="desktop" speech={speech} />);
  await r.frame(); await r.frame(); await r.frame();
  const scales = r.calls.filter((c) => c[0] === "scale").map((c) => c[1] as number);
  expect(scales.length).toBeGreaterThan(0);
  expect(scales[scales.length - 1]).toBeCloseTo(1.06, 3);
  view.unmount(); r.restore();
});

test("reduced motion, pause and tiny sizes show the plain rest picture with no canvas work", async () => {
  for (const props of [{ reducedMotion: true }, { paused: true }, { size: 36 }]) {
    const r = rig();
    const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="speak" {...props} />);
    await r.frame();
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe("https://example.test/p/rest.webp");
    expect(view.container.querySelector("canvas")).toBeNull();
    expect(r.calls).toHaveLength(0);
    expect(r.loaded).toHaveLength(0);
    view.unmount(); r.restore();
  }
});

test("a pack with states still takes the video path", () => {
  const clip = (id: string) => ({ id, file: `${id}.mp4`, fps: 24, frames: 10, rest: { first: 0, last: 9 } });
  const videoPack: CompanionPackData = { rest: "rest.webp", states: { idle: [clip("a"), clip("b")], listen: [clip("l")], think: [clip("t")], speak: [clip("s")] }, voice: pack.voice };
  const r = rig();
  const view = render(<CompanionPackPlayer pack={videoPack} baseUrl="https://example.test/p/" state="idle" size={480} tier="desktop" />);
  expect(view.container.querySelector("[data-voice-layer]")).toBeNull();
  view.unmount(); r.restore();
});

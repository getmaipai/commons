import { afterEach, expect, jest, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { CompanionPackPlayer, setPackVideoFactory } from "./player";
import { setStackedAlphaRendererFactory, stackedAlphaShaderSources } from "./stacked-alpha";
import type { CompanionPackData, PackClip, PlayerFrame, PlayerLayer } from "./types";

afterEach(cleanup);
const clip = (id: string, phone = `${id}-phone.mp4`): PackClip => ({
  id, file: `${id}.mp4`, phone, fps: 24, frames: 117, rest: { first: 0, last: 116 },
});
const pack: CompanionPackData = {
  rest: "rest.webp",
  states: { idle: [clip("idle-a"), clip("idle-b")], listen: [clip("listen")], think: [clip("think")], speak: [clip("speak")] },
};

test("static modes render the rest image and create no video", () => {
  for (const props of [{ reducedMotion: true }, { paused: true }, { size: 36 }]) {
    let videosCreated = 0;
    const restoreVideoFactory = setPackVideoFactory(() => { videosCreated += 1; return document.createElement("video"); });
    const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" {...props} />);
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe("https://example.test/p/rest.webp");
    expect(view.container.querySelector("video")).toBeNull();
    expect(videosCreated).toBe(0);
    view.unmount();
    restoreVideoFactory();
  }
});

test("phone tier chooses the phone file", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const srcs: string[] = [];
  const originalCreate = document.createElement.bind(document);
  const restoreVideoFactory = setPackVideoFactory(() => {
    const video = originalCreate("video") as HTMLVideoElement;
    Object.defineProperty(video, "src", { set: (value: string) => srcs.push(value), configurable: true });
    Object.defineProperty(video, "dataset", { value: {}, configurable: true });
    return video;
  });
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" tier="phone" />);
  expect(srcs).toHaveLength(0);
  view.unmount();
  restoreVideoFactory();
  window.requestAnimationFrame = oldRaf;
});

test("shader samples colour from the top half and alpha from the bottom half", () => {
  expect(stackedAlphaShaderSources.vertex).toContain(".5-p.y*.5");
  expect(stackedAlphaShaderSources.fragment).toContain("vec2(u.x,u.y*.5)");
  expect(stackedAlphaShaderSources.fragment).toContain("vec2(u.x,.5+u.y*.5)");
  expect(stackedAlphaShaderSources.fragment).toContain("min(c,vec3(a))");
});

test("renderer and videos persist through state changes and re-renders", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const draw = jest.fn();
  const dispose = jest.fn();
  const gl = {} as WebGLRenderingContext;
  const restoreFactory = setStackedAlphaRendererFactory(() => ({ gl, draw, dispose }));
  let videosCreated = 0;
  const restoreVideoFactory = setPackVideoFactory(() => { videosCreated += 1; return document.createElement("video"); });
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" tier="phone" />);
  const initialVideos = videosCreated;
  view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="think" tier="phone" />);
  view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="speak" tier="phone" layers={[]} />);
  expect(videosCreated).toBe(initialVideos);
  expect(dispose).not.toHaveBeenCalled();
  view.unmount();
  expect(dispose).toHaveBeenCalledTimes(1);
  restoreVideoFactory();
  restoreFactory();
  window.requestAnimationFrame = oldRaf;
});

test("only two clips load at once and more states load as earlier clips become ready", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const videos: HTMLVideoElement[] = [];
  const restoreVideoFactory = setPackVideoFactory(() => {
    const video = document.createElement("video");
    videos.push(video);
    video.load = () => {};
    video.play = async () => {};
    video.addEventListener("canplay", () => { Object.defineProperty(video, "readyState", { value: 2, configurable: true }); });
    return video;
  });
  const restoreRendererFactory = setStackedAlphaRendererFactory(() => ({ gl: {} as WebGLRenderingContext, draw: () => {}, dispose: () => {} }));
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" />);
  expect(videos).toHaveLength(2);
  act(() => videos[0]?.dispatchEvent(new Event("canplay")));
  act(() => videos[1]?.dispatchEvent(new Event("canplay")));
  expect(videos.length).toBeLessThanOrEqual(3);
  act(() => videos[1]?.dispatchEvent(new Event("canplay")));
  expect(videos.some((video) => video.dataset.packFile === "listen.mp4")).toBe(true);
  view.unmount();
  restoreVideoFactory();
  restoreRendererFactory();
  window.requestAnimationFrame = oldRaf;
});

test("urgent state change runs on at 8x and switches at the planned rest frame", () => {
  const oldRaf = window.requestAnimationFrame;
  let tick: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => { tick = callback; return 1; }) as typeof window.requestAnimationFrame;
  const videos: HTMLVideoElement[] = [];
  const restoreVideoFactory = setPackVideoFactory(() => {
    const video = document.createElement("video");
    videos.push(video);
    Object.defineProperty(video, "readyState", { value: 2, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 30 / 24, writable: true, configurable: true });
    video.load = () => {};
    video.play = async () => {};
    video.addEventListener("canplay", () => { Object.defineProperty(video, "readyState", { value: 2, configurable: true }); });
    return video;
  });
  const restoreRendererFactory = setStackedAlphaRendererFactory(() => ({ gl: {} as WebGLRenderingContext, draw: () => {}, dispose: () => {} }));
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" />);
  act(() => videos[0]?.dispatchEvent(new Event("canplay")));
  const settled = jest.fn();
  view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="speak" onStateSettled={settled} />);
  expect(videos[0]?.playbackRate).toBe(8);
  const active = videos[0];
  if (active) Object.defineProperty(active, "currentTime", { value: 116 / 24, configurable: true });
  act(() => tick?.(100));
  expect(videos[0]?.playbackRate).toBe(8);
  expect(videos.length).toBeLessThanOrEqual(3);
  view.unmount();
  restoreVideoFactory();
  restoreRendererFactory();
  window.requestAnimationFrame = oldRaf;
});

test("document visibility and paused changes stop and resume the active video", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const videos: HTMLVideoElement[] = [];
  const restoreVideoFactory = setPackVideoFactory(() => {
    const video = document.createElement("video");
    videos.push(video);
    video.load = () => {};
    video.play = async () => {};
    return video;
  });
  const restoreRendererFactory = setStackedAlphaRendererFactory(() => ({ gl: {} as WebGLRenderingContext, draw: () => {}, dispose: () => {} }));
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" />);
  const pause = jest.spyOn(videos[0]!, "pause");
  act(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  expect(pause).toHaveBeenCalled();
  view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" paused />);
  view.rerender(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" paused={false} />);
  view.unmount();
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  restoreVideoFactory();
  restoreRendererFactory();
  window.requestAnimationFrame = oldRaf;
});

test("layers receive frame data in order and are disposed", () => {
  const oldRaf = window.requestAnimationFrame;
  let tick: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => { tick = callback; return 1; }) as typeof window.requestAnimationFrame;
  const draw = jest.fn();
  const dispose = jest.fn();
  const gl = {} as WebGLRenderingContext;
  const restoreRendererFactory = setStackedAlphaRendererFactory(() => ({ gl, draw, dispose }));
  const videos: HTMLVideoElement[] = [];
  const restoreVideoFactory = setPackVideoFactory(() => {
    const video = document.createElement("video");
    videos.push(video);
    Object.defineProperty(video, "readyState", { value: 2, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 0, writable: true, configurable: true });
    video.load = () => {};
    video.play = async () => {};
    return video;
  });
  const calls: number[] = [];
  const layers: PlayerLayer[] = [
    { draw: (frame: PlayerFrame) => { expect(["idle-a", "idle-b"]).toContain(frame.clipId); calls.push(1); }, dispose: () => calls.push(-1) },
    { draw: () => calls.push(2), dispose: () => calls.push(-2) },
  ];
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" layers={layers} />);
  act(() => videos[0]?.dispatchEvent(new Event("canplay")));
  act(() => tick?.(50));
  expect(calls.slice(0, 2)).toEqual([1, 2]);
  view.unmount();
  expect(calls.slice(-2)).toEqual([-1, -2]);
  restoreVideoFactory();
  restoreRendererFactory();
  window.requestAnimationFrame = oldRaf;
});

test("still image is used when WebGL setup fails", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const oldFactory = setStackedAlphaRendererFactory(() => { throw new Error("No WebGL"); });
  const oldGetContext = HTMLCanvasElement.prototype.getContext;
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" />);
  expect(view.container.querySelector("canvas")).not.toBeNull();
  view.unmount();
  HTMLCanvasElement.prototype.getContext = oldGetContext;
  oldFactory();
  window.requestAnimationFrame = oldRaf;
});

// Regressions found by running the real packs in WebKit (2026-11-10): a relative base failed as a URL, and the drawing buffer stayed 300x150.
test("a relative baseUrl resolves against the page", () => {
  const view = render(<CompanionPackPlayer pack={pack} baseUrl="/packs/man/" state="idle" reducedMotion />);
  const origin = /^https?:/.test(window.location.href) ? window.location.href : "http://localhost/";
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(new URL("/packs/man/rest.webp", origin).href);
  view.unmount();
});

test("the drawing buffer matches the tile size of the tier", () => {
  const oldRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 1) as typeof window.requestAnimationFrame;
  const restore = setStackedAlphaRendererFactory(() => ({ draw() {}, dispose() {} }));
  const desktop = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" tier="desktop" />);
  expect(desktop.container.querySelector("canvas")?.width).toBe(480);
  desktop.unmount();
  const phone = render(<CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" tier="phone" />);
  expect(phone.container.querySelector("canvas")?.width).toBe(320);
  phone.unmount();
  restore();
  window.requestAnimationFrame = oldRaf;
});

test("a non-square container keeps the tile aspect and the speech overlay shares the base canvas box", () => {
  const view = render(<div style={{ width: 327, height: 579 }}>
    <CompanionPackPlayer pack={pack} baseUrl="https://example.test/p/" state="idle" size="100%" />
  </div>);
  const canvases = view.container.querySelectorAll("canvas");
  expect(canvases.length).toBe(2);
  const [base, overlay] = Array.from(canvases) as HTMLCanvasElement[];
  for (const canvas of [base!, overlay!]) {
    expect(canvas.style.objectFit).toBe("contain");
    expect(canvas.style.objectPosition).toBe("center");
    expect(canvas.style.width).toBe("100%");
    expect(canvas.style.height).toBe("100%");
  }
  expect(overlay!.style.position).toBe("absolute");
  expect(overlay!.style.inset).toBe("0");
  expect(view.container.querySelector("[data-pack-player]")?.getAttribute("style")).toContain("100%");
});

// VIDEO-UI-14 (item 8): a poster tile that loops a clip, paused off screen and still under reduced motion.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { LoopPoster } from "./LoopPoster";

const realMatchMedia = window.matchMedia;
const RealObserver = globalThis.IntersectionObserver;
let observers: Array<{ cb: IntersectionObserverCallback; el: Element | null }> = [];

function setReduced(reduced: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduced && query.includes("prefers-reduced-motion"), media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  observers = [];
  globalThis.IntersectionObserver = class {
    entry: { cb: IntersectionObserverCallback; el: Element | null };
    constructor(cb: IntersectionObserverCallback) { this.entry = { cb, el: null }; observers.push(this.entry); }
    observe(el: Element) { this.entry.el = el; }
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
  setReduced(false);
});
afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
  globalThis.IntersectionObserver = RealObserver;
});

function show(visible: boolean) {
  act(() => { for (const o of observers) o.cb([{ isIntersecting: visible, target: o.el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
}

describe("LoopPoster", () => {
  test("always draws the poster, and the clip is muted, inline, looped and not fetched until it is on screen", () => {
    const view = render(<LoopPoster poster="/p.jpg" loop="/a.mp4" />);
    expect(view.container.querySelector("img")!.getAttribute("src")).toBe("/p.jpg");
    const video = view.container.querySelector("video") as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute("playsinline")).not.toBeNull();
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.getAttribute("aria-hidden")).toBe("true");
  });

  test("plays while in view and pauses and rewinds off screen", () => {
    const view = render(<LoopPoster poster="/p.jpg" loop="/a.mp4" />);
    const video = view.container.querySelector("video") as HTMLVideoElement;
    const log: string[] = [];
    video.play = (() => { log.push("play"); return Promise.resolve(); }) as typeof video.play;
    video.pause = (() => { log.push("pause"); }) as typeof video.pause;
    show(true);
    expect(log).toContain("play");
    show(false);
    expect(log[log.length - 1]).toBe("pause");
  });

  test("under reduced motion only the poster shows and no clip is drawn or fetched", () => {
    setReduced(true);
    const view = render(<LoopPoster poster="/p.jpg" loop="/a.mp4" />);
    expect(view.container.querySelector("video")).toBeNull();
    expect(view.container.querySelector("img")).toBeTruthy();
  });

  test("a tile with no clip shows its poster alone", () => {
    const view = render(<LoopPoster poster="/p.jpg" loop={null} />);
    expect(view.container.querySelector("video")).toBeNull();
  });
});

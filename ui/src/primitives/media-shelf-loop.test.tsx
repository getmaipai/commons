import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { MediaShelf, TILE_LOOP_DELAY_MS } from "./MediaShelf";
import { MediaTileLoopShowcase } from "./MediaTileLoopShowcase";

interface Clip { id: string; title: string; loop?: string }
const clips: Clip[] = [
  { id: "a", title: "Harbor", loop: "/harbor.mp4" },
  { id: "b", title: "Meadow" },
];

const realMatchMedia = window.matchMedia;
const proto = HTMLMediaElement.prototype as unknown as { play: unknown; pause: unknown };
const realPlay = proto.play;
const realPause = proto.pause;
let plays: HTMLMediaElement[] = [];
let pauses: HTMLMediaElement[] = [];
let refuse = false;

beforeEach(() => {
  jest.useFakeTimers();
  plays = [];
  pauses = [];
  refuse = false;
  proto.play = function play(this: HTMLMediaElement) { plays.push(this); return refuse ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(); };
  proto.pause = function pause(this: HTMLMediaElement) { pauses.push(this); };
  stubMatchMedia({});
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  proto.play = realPlay;
  proto.pause = realPause;
  window.matchMedia = realMatchMedia;
});

const shelf = () => render(
  <MediaShelf items={clips} getKey={(c) => c.id} getLabel={(c) => c.title} getLoop={(c) => c.loop} onSelect={() => {}} renderItem={(c) => <img src={`/${c.id}.jpg`} alt="" />} aspect="wide" />,
);
const tile = (v: ReturnType<typeof shelf>) => v.getByRole("button", { name: "Harbor" });
const video = (v: ReturnType<typeof shelf>) => v.container.querySelector<HTMLVideoElement>('[data-slot="media-tile-loop"]');
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

describe("MediaShelf hover loop", () => {
  test("a tile without a loop has no video, and the still is untouched", () => {
    const v = render(<MediaShelf items={[clips[1]!]} getKey={(c) => c.id} getLabel={(c) => c.title} getLoop={(c) => c.loop} renderItem={(c) => <img src={`/${c.id}.jpg`} alt="" />} />);
    expect(v.container.querySelector("video")).toBeNull();
    expect(v.container.querySelector("img")).toBeTruthy();
  });

  test("the loop is a muted, inline, preload none video that stays hidden until it plays", () => {
    const v = shelf();
    const el = video(v)!;
    expect(v.container.querySelectorAll("video").length).toBe(1);
    expect(el.getAttribute("src")).toBe("/harbor.mp4");
    expect(el.muted).toBe(true);
    expect(el.hasAttribute("playsinline")).toBe(true);
    expect(el.getAttribute("preload")).toBe("none");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.hasAttribute("data-playing")).toBe(false);
    expect(plays.length).toBe(0);
    expect(v.container.querySelector("img")).toBeTruthy();
  });

  test("hover starts the loop after the delay, not before, and leaving rewinds and pauses", () => {
    const v = shelf();
    fireEvent.pointerEnter(tile(v));
    advance(TILE_LOOP_DELAY_MS - 50);
    expect(plays.length).toBe(0);
    advance(60);
    expect(plays).toEqual([video(v)!]);
    fireEvent(video(v)!, new Event("playing"));
    expect(video(v)!.hasAttribute("data-playing")).toBe(true);
    fireEvent.pointerLeave(tile(v));
    expect(pauses).toContain(video(v)!);
    expect(video(v)!.currentTime).toBe(0);
    expect(video(v)!.hasAttribute("data-playing")).toBe(false);
  });

  test("leaving before the delay never plays", () => {
    const v = shelf();
    fireEvent.pointerEnter(tile(v));
    advance(100);
    fireEvent.pointerLeave(tile(v));
    advance(1000);
    expect(plays.length).toBe(0);
  });

  test("keyboard focus starts the loop at once and blur stops it", () => {
    const v = shelf();
    act(() => tile(v).focus());
    expect(plays.length).toBe(1);
    act(() => tile(v).blur());
    expect(pauses.length).toBeGreaterThan(0);
  });

  test("reduced motion and touch screens draw no video and never play", () => {
    for (const query of ["(prefers-reduced-motion: reduce)", "(hover: none)"]) {
      stubMatchMedia({ [query]: true });
      const v = shelf();
      expect(v.container.querySelector("video")).toBeNull();
      fireEvent.pointerEnter(tile(v));
      fireEvent.focusIn(tile(v));
      advance(2000);
      expect(plays.length).toBe(0);
      cleanup();
    }
  });

  test("a refused play leaves the hidden loop over the still, and a failed loop is removed", async () => {
    refuse = true;
    const v = shelf();
    fireEvent.pointerEnter(tile(v));
    advance(TILE_LOOP_DELAY_MS + 10);
    await act(async () => { await Promise.resolve(); });
    expect(plays.length).toBe(1);
    expect(video(v)!.hasAttribute("data-playing")).toBe(false);
    expect(v.container.querySelector("img")).toBeTruthy();
    fireEvent.error(video(v)!);
    expect(video(v)).toBeNull();
    expect(v.container.querySelector("img")).toBeTruthy();
  });

  test("the showcase renders tiles with and without a loop", () => {
    const v = render(<MediaTileLoopShowcase />);
    expect(v.container.querySelectorAll("video").length).toBeGreaterThan(0);
    expect(v.container.querySelectorAll("li").length).toBeGreaterThan(v.container.querySelectorAll("video").length);
  });
});

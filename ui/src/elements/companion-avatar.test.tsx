import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { CompanionAvatar } from "./companion-avatar";
import type { CompanionClips } from "./companion-avatar-machine";

afterEach(cleanup);
const clip = (name: string, loop = true) => ({ h264: `${name}.mp4`, av1: `${name}.av1.mp4`, still: `${name}.png`, loop });
const clips: CompanionClips = { idle: clip("idle"), thinking: clip("thinking"), needs_you: clip("needs"), happy: clip("happy", false), greeting: clip("greeting", false) };
function setup() {
  const oldMatch = window.matchMedia;
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const oldPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = (() => Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
  Object.defineProperty(HTMLMediaElement.prototype, "canPlayType", { configurable: true, value: () => "probably" });
  const oldContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: (_target, key) => key === "getShaderParameter" || key === "getProgramParameter" ? () => true : () => ({}) })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  const oldObserver = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class { constructor(private callback: IntersectionObserverCallback) {} observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } disconnect() {} } as unknown as typeof IntersectionObserver;
  return () => { window.matchMedia = oldMatch; HTMLMediaElement.prototype.play = oldPlay; HTMLCanvasElement.prototype.getContext = oldContext; globalThis.IntersectionObserver = oldObserver; };
}

test("state renders the requested state's clip and accessible wrapper name", async () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="thinking" />);
  expect(view.getByRole("img", { name: "Mimi" })).toBeTruthy();
  await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("thinking.av1.mp4"));
  expect(view.container.querySelector("[aria-live]")).toBeNull();
  restore();
});

test("wanted chooses a state through pickWanted", async () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} wanted={{ thinking: true, needs_you: true }} />);
  fireEvent.ended(view.container.querySelector("video")!);
  await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("needs.av1.mp4"));
  restore();
});

test("once plays a new one shot nonce", async () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} once={{ state: "greeting", nonce: 1 }} />);
  fireEvent.ended(view.container.querySelector("video")!);
  await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("greeting.av1.mp4"));
  restore();
});

test("reduced motion shows the still and does not play video", () => {
  const restore = setup();
  window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="thinking" />);
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe("thinking.png");
  expect(view.container.querySelector("video")).toBeNull();
  restore();
});

test("AV1 is chosen only when the browser reports probably and H.264 follows an error", async () => {
  const restore = setup();
  Object.defineProperty(HTMLMediaElement.prototype, "canPlayType", { configurable: true, value: () => "maybe" });
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="thinking" />);
  await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("thinking.mp4"));
  view.unmount();
  Object.defineProperty(HTMLMediaElement.prototype, "canPlayType", { configurable: true, value: () => "probably" });
  const av1View = render(<CompanionAvatar name="Mimi" clips={clips} state="thinking" />);
  await waitFor(() => expect(av1View.container.querySelector("video")?.getAttribute("src")).toBe("thinking.av1.mp4"));
  fireEvent.error(av1View.container.querySelector("video")!);
  await waitFor(() => expect(av1View.container.querySelector("video")?.getAttribute("src")).toBe("thinking.mp4"));
  restore();
});

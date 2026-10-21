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

test("inline placement remains in flow without absolute positioning", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} />);
  expect(view.getByRole("img", { name: "Mimi" }).className).not.toMatch(/\babsolute\b/);
  restore();
});

test("corner placement positions the Element at the top right", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} placement="corner" />);
  const wrapper = view.container.firstElementChild as HTMLElement;
  expect(wrapper.className).toContain("absolute");
  expect(wrapper.className).toContain("right-3");
  expect(wrapper.className).toContain("top-3");
  expect(wrapper.className).toContain("z-10");
  restore();
});

test("hide button is keyboard focusable, names the action, and reports hidden", () => {
  const restore = setup();
  const calls: boolean[] = [];
  const onHiddenChange = (hidden: boolean) => calls.push(hidden);
  const view = render(<CompanionAvatar name="Mimi" clips={clips} placement="corner" onHiddenChange={onHiddenChange} />);
  const button = view.getByRole("button", { name: "Hide the character" }) as HTMLButtonElement;
  expect(button.tabIndex).toBe(0);
  expect(button.className).toContain("size-12");
  button.focus();
  expect(document.activeElement).toBe(button);
  fireEvent.click(button);
  expect(calls).toEqual([true]);
  restore();
});

test("hidden renders only a show button and does not mount media", () => {
  const restore = setup();
  const calls: boolean[] = [];
  const view = render(<CompanionAvatar name="Mimi" clips={clips} placement="corner" hidden onHiddenChange={(hidden) => calls.push(hidden)} />);
  expect(view.getByRole("button", { name: "Show the character" })).toBeTruthy();
  expect(view.queryByRole("img", { name: "Mimi" })).toBeNull();
  expect(view.container.querySelector("video")).toBeNull();
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(view.container.querySelector("img")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Show the character" }));
  expect(calls).toEqual([false]);
  restore();
});

test("corner placement without a visibility callback has no button", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} placement="corner" />);
  expect(view.queryByRole("button")).toBeNull();
  restore();
});

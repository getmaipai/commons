import { afterEach, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { StackedAlphaVideo, STACKED_ALPHA_FRAGMENT_SHADER, unpremultiply } from "./stacked-alpha-video";

afterEach(cleanup);
function visibleObserver() {
  const previous = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class { constructor(private callback: IntersectionObserverCallback) {} observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } disconnect() {} } as unknown as typeof IntersectionObserver;
  return () => { globalThis.IntersectionObserver = previous; };
}
function fakeGl() {
  return new Proxy({}, { get: (_target, key) => key === "getShaderParameter" || key === "getProgramParameter" ? () => true : () => ({}) });
}

test("unpremultiply restores straight colour and shader samples stacked halves", () => {
  expect(unpremultiply(0.2, 0.1, 0.05, 0.5)).toEqual([0.4, 0.2, 0.1, 0.5]);
  expect(STACKED_ALPHA_FRAGMENT_SHADER).toContain("(1.0 - uv.y) * 0.5");
  expect(STACKED_ALPHA_FRAGMENT_SHADER).toContain("0.5 + (1.0 - uv.y) * 0.5");
  expect(STACKED_ALPHA_FRAGMENT_SHADER).toContain("color.rgb / max(alpha, 0.001)");
});

test("swaps src on the same video and retains the canvas node", async () => {
  const restoreObserver = visibleObserver();
  const oldGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => fakeGl()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  const oldPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = (() => Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
  const view = render(<StackedAlphaVideo src="first.mp4" label="Companion" />);
  const video = view.container.querySelector("video"); const canvas = view.container.querySelector("canvas");
  await waitFor(() => expect(video?.getAttribute("src")).toBe("first.mp4"));
  view.rerender(<StackedAlphaVideo src="second.mp4" label="Companion" />);
  await waitFor(() => expect(video?.getAttribute("src")).toBe("second.mp4"));
  expect(view.container.querySelector("video")).toBe(video); expect(view.container.querySelector("canvas")).toBe(canvas);
  HTMLCanvasElement.prototype.getContext = oldGetContext; HTMLMediaElement.prototype.play = oldPlay; restoreObserver();
});

test("AbortError from play is not treated as a video failure", async () => {
  const restoreObserver = visibleObserver();
  const oldGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => fakeGl()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  const oldPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = (() => Promise.reject(Object.assign(new Error("interrupted"), { name: "AbortError" }))) as typeof HTMLMediaElement.prototype.play;
  const onError = () => { throw new Error("should not fail for AbortError"); };
  render(<StackedAlphaVideo src="first.mp4" label="Companion" onError={onError} />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  HTMLCanvasElement.prototype.getContext = oldGetContext; HTMLMediaElement.prototype.play = oldPlay; restoreObserver();
});

test("failure clears when src changes", async () => {
  const restoreObserver = visibleObserver();
  const oldGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  const onError = () => undefined;
  const view = render(<StackedAlphaVideo src="bad.mp4" label="Companion" onError={onError} />);
  await waitFor(() => expect(view.container.querySelector("canvas")).toBeTruthy());
  view.rerender(<StackedAlphaVideo src="good.mp4" label="Companion" onError={onError} />);
  await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("good.mp4"));
  HTMLCanvasElement.prototype.getContext = oldGetContext; restoreObserver();
});

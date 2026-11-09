import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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

test("xs size uses size-7 while the existing sizes stay the same", () => {
  const restore = setup();
  const xs = render(<CompanionAvatar name="Mimi" clips={clips} size="xs" />);
  expect(xs.getByRole("img", { name: "Mimi" }).className).toContain("size-7");
  xs.unmount();
  const sm = render(<CompanionAvatar name="Mimi" clips={clips} size="sm" />);
  expect(sm.getByRole("img", { name: "Mimi" }).className).toContain("size-16");
  sm.unmount();
  const xl = render(<CompanionAvatar name="Mimi" clips={clips} size="xl" />);
  expect(xl.getByRole("img", { name: "Mimi" }).className).toContain("size-52");
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

test("ring values mark the avatar without changing its clip state", async () => {
  const restore = setup();
  for (const ring of ["idle", "listening", "thinking", "speaking"] as const) {
    const view = render(<CompanionAvatar name="Mimi" clips={clips} state="idle" ring={ring} />);
    const avatar = view.getByRole("img", { name: `Mimi, ${ring}` });
    expect(avatar.getAttribute("data-ring")).toBe(ring);
    await waitFor(() => expect(view.container.querySelector("video")?.getAttribute("src")).toBe("idle.av1.mp4"));
    view.unmount();
  }
  const none = render(<CompanionAvatar name="Mimi" clips={clips} ring={null} />);
  expect(none.container.querySelector("[data-ring]")).toBeNull();
  restore();
});

test("reduced motion ring has no animation class", () => {
  const restore = setup();
  window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} ring="speaking" />);
  const ring = view.container.querySelector("[data-ring] > span")!;
  expect(ring.className).not.toMatch(/animate-/);
  restore();
});

test("animated={false} draws only the still image, with the ring", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} size="xs" ring="speaking" animated={false} />);
  expect(view.container.querySelector("video")).toBeNull();
  expect(view.container.querySelector('[data-ring="speaking"]')).toBeTruthy();
  restore();
});

test("a state with only a still draws that still and no video", () => {
  const restore = setup();
  const stills: CompanionClips = { idle: { still: "idle.png", loop: true }, speaking: { still: "speaking.png", loop: true } } as CompanionClips;
  const view = render(<CompanionAvatar name="Tessa" clips={stills} state="speaking" />);
  expect(view.container.querySelector("video")).toBeNull();
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe("speaking.png");
  restore();
});

test("fill takes the whole space it is given", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} size="fill" animated={false} />);
  expect(view.getByRole("img", { name: "Mimi" }).className).toContain("size-full");
  expect(view.getByRole("img", { name: "Mimi" }).parentElement?.className).toContain("size-full");
  restore();
});

test("the ring is drawn in the primary colour at 4px so it can be seen on any page", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} ring="thinking" />);
  const ring = view.container.querySelector("[data-ring] > span")!;
  expect(ring.className).toContain("border-4");
  expect(ring.className).toContain("border-primary");
  restore();
});

test("each ring differs in shape or motion, not only colour", () => {
  const restore = setup();
  const classes: Record<string, string> = {};
  for (const ring of ["idle", "listening", "thinking", "speaking"] as const) {
    const view = render(<CompanionAvatar name="Mimi" clips={clips} ring={ring} />);
    classes[ring] = view.container.querySelector("[data-ring] > span")!.className;
    if (ring === "listening") expect(view.container.querySelector("[data-ring-ripple]")).not.toBeNull();
    else expect(view.container.querySelector("[data-ring-ripple]")).toBeNull();
    view.unmount();
  }
  expect(classes.idle).toContain("border-dotted");
  expect(classes.listening).toContain("border-solid");
  expect(classes.thinking).toContain("border-dashed");
  expect(classes.thinking).toContain("animate-");
  expect(classes.speaking).toContain("shadow-lg");
  expect(new Set(Object.values(classes)).size).toBe(4);
  restore();
});

test("mouth mode uses idle and mouth stills without a speaking video", () => {
  const restore = setup();
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" wanted={{ speaking: true }} mouth={{ still: "mouth.png", level: () => 0 }} />);
  const wrapper = view.container.querySelector('[data-mouth="active"]')!;
  expect(wrapper).toBeTruthy();
  expect(wrapper.querySelectorAll("img").length).toBe(2);
  expect(Array.from(wrapper.querySelectorAll("img")).map((img) => img.getAttribute("src"))).toEqual(["idle.png", "mouth.png"]);
  expect(view.container.querySelector("video")).toBeNull();
  restore();
});

test("mouth opacity follows level readings on animation frames", () => {
  const restore = setup();
  const oldRaf = window.requestAnimationFrame;
  const oldCancel = window.cancelAnimationFrame;
  let callback: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((next: FrameRequestCallback) => { callback = next; return 1; }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
  let level = 0;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" wanted={{ speaking: true }} mouth={{ still: "mouth.png", level: () => level }} />);
  const layer = view.container.querySelector('[data-mouth="active"] img:last-child') as HTMLImageElement;
  act(() => callback!(0));
  expect(layer.style.opacity).toBe("0");
  level = 0.2; act(() => callback!(16));
  expect(layer.style.opacity).toBe("0.5");
  level = 1; act(() => callback!(32));
  expect(layer.style.opacity).toBe("1");
  view.unmount();
  window.requestAnimationFrame = oldRaf; window.cancelAnimationFrame = oldCancel;
  restore();
});

test("mouth mode is inactive when not speaking or when animation is disabled", () => {
  const restore = setup();
  const mouth = { still: "mouth.png", level: () => 0 };
  const idle = render(<CompanionAvatar name="Mimi" clips={clips} wanted={{ thinking: true }} mouth={mouth} animated={false} />);
  expect(idle.container.querySelector("[data-mouth]")).toBeNull();
  expect(idle.container.querySelector("img")?.getAttribute("src")).toBe("idle.png");
  idle.unmount();
  const speaking = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" wanted={{ speaking: true }} mouth={mouth} animated={false} />);
  expect(speaking.container.querySelector("[data-mouth]")).toBeNull();
  expect(speaking.container.querySelector("img")?.getAttribute("src")).toBe("idle.png");
  restore();
});

test("reduced motion ignores mouth mode and keeps the still", () => {
  const restore = setup();
  window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" wanted={{ speaking: true }} mouth={{ still: "mouth.png", level: () => 0 }} />);
  expect(view.container.querySelector("[data-mouth]")).toBeNull();
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe("idle.png");
  restore();
});

test("a throwing mouth level is treated as zero", () => {
  const restore = setup();
  const oldRaf = window.requestAnimationFrame;
  const oldCancel = window.cancelAnimationFrame;
  let callback: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((next: FrameRequestCallback) => { callback = next; return 1; }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" wanted={{ speaking: true }} mouth={{ still: "mouth.png", level: () => { throw new Error("unavailable"); } }} />);
  const layer = view.container.querySelector('[data-mouth="active"] img:last-child') as HTMLImageElement;
  expect(() => act(() => callback!(0))).not.toThrow();
  expect(layer.style.opacity).toBe("0");
  view.unmount();
  window.requestAnimationFrame = oldRaf; window.cancelAnimationFrame = oldCancel;
  restore();
});

test("mouth shapes follow cue letters and X hides the crop", () => {
  const restore = setup();
  const oldRaf = window.requestAnimationFrame; const oldCancel = window.cancelAnimationFrame;
  let callback: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((next: FrameRequestCallback) => { callback = next; return 1; }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
  let cue: "A" | "B" | "C" | "D" | "E" | "F" | "X" | null = "C";
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={{ still: "legacy.png", level: () => 0, cue: () => cue, anchor: { x: .2, y: .3, w: .4, h: .2 }, shapes: { B: "b.png", C: "c.png" } }} />);
  act(() => callback!(0));
  expect((view.container.querySelector('[data-mouth-shape="C"]') as HTMLImageElement).style.opacity).toBe("1");
  expect((view.container.querySelector('[data-mouth-shape="B"]') as HTMLImageElement).style.opacity).toBe("0");
  expect((view.container.querySelector('[data-mouth-shape="C"]') as HTMLImageElement).style.cssText).toContain("left: 20%");
  cue = "X"; act(() => callback!(16));
  expect(Array.from(view.container.querySelectorAll("[data-mouth-shape]")).every((img) => (img as HTMLElement).style.opacity === "0")).toBe(true);
  view.unmount(); window.requestAnimationFrame = oldRaf; window.cancelAnimationFrame = oldCancel; restore();
});

test("mouth shape levels choose threshold crops", () => {
  const restore = setup(); const oldRaf = window.requestAnimationFrame; const oldCancel = window.cancelAnimationFrame;
  let callback: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((next: FrameRequestCallback) => { callback = next; return 1; }) as typeof window.requestAnimationFrame; window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
  let level = .2;
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={{ still: "legacy.png", level: () => level, anchor: { x: 0, y: 0, w: .5, h: .5 }, shapes: { B: "b.png", C: "c.png", D: "d.png", E: "e.png" } }} />);
  act(() => callback!(0)); expect((view.container.querySelector('[data-mouth-shape="C"]') as HTMLElement).style.opacity).toBe("1");
  level = .04; act(() => callback!(16)); expect(Array.from(view.container.querySelectorAll("[data-mouth-shape]")).every((img) => (img as HTMLElement).style.opacity === "0")).toBe(true);
  level = .7; act(() => callback!(32)); expect((view.container.querySelector('[data-mouth-shape="E"]') as HTMLElement).style.opacity).toBe("1");
  view.unmount(); window.requestAnimationFrame = oldRaf; window.cancelAnimationFrame = oldCancel; restore();
});

test("eye blink follows the delay and is suppressed when motion is unavailable", () => {
  const restore = setup();
  const oldSetTimeout = window.setTimeout; const oldClearTimeout = window.clearTimeout;
  let nextId = 1; const timers = new Map<number, { fn: TimerHandler; delay: number }>();
  window.setTimeout = ((fn: TimerHandler, delay = 0) => { const id = nextId++; timers.set(id, { fn, delay }); return id; }) as typeof window.setTimeout;
  window.clearTimeout = ((id?: number) => { if (id !== undefined) timers.delete(id); }) as typeof window.clearTimeout;
  const runNext = () => { const next = [...timers].sort((a, b) => a[1].delay - b[1].delay)[0]; if (!next) throw new Error("No scheduled timer"); const [id, timer] = next; timers.delete(id); act(() => (timer.fn as () => void)()); };
  const eyes = { closed: "closed.png", half: "half.png", anchor: { x: .1, y: .2, w: .3, h: .2 }, random: () => 0 };
  const view = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={{ still: "mouth.png", level: () => 0 }} eyes={eyes} />);
  expect(timers.size).toBe(1); runNext();
  expect(view.container.querySelector('img[src="half.png"]')).toBeTruthy();
  runNext(); expect(view.container.querySelector('img[src="closed.png"]')).toBeTruthy();
  view.unmount();
  window.setTimeout = oldSetTimeout; window.clearTimeout = oldClearTimeout; restore();
});

test("shape crops and blinks are disabled for reduced motion, hidden docs, static mode, and header", () => {
  const restore = setup();
  const oldVisibility = Object.getOwnPropertyDescriptor(document, "hidden");
  const mouth = { still: "mouth.png", level: () => 1, anchor: { x: 0, y: 0, w: 1, h: 1 }, shapes: { E: "e.png" } };
  const eyes = { closed: "closed.png", anchor: { x: 0, y: 0, w: 1, h: 1 } };
  window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const reduced = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={mouth} eyes={eyes} />);
  expect(reduced.container.querySelector("[data-mouth-shape]")).toBeNull(); reduced.unmount();
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  const hidden = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={mouth} eyes={eyes} />);
  expect(hidden.container.querySelector("[data-mouth-shape]")).toBeNull(); hidden.unmount();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  const staticView = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" mouth={mouth} eyes={eyes} animated={false} />);
  expect(staticView.container.querySelector("[data-mouth-shape]")).toBeNull(); staticView.unmount();
  const header = render(<CompanionAvatar name="Mimi" clips={clips} state="speaking" size="header" mouth={mouth} eyes={eyes} />);
  expect(header.container.querySelector("[data-mouth-shape]")).toBeNull(); expect(header.container.querySelector('img[src="closed.png"]')).toBeNull();
  header.unmount();
  if (oldVisibility) Object.defineProperty(document, "hidden", oldVisibility); else delete (document as { hidden?: boolean }).hidden;
  restore();
});

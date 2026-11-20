import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ClipCompare, type ClipCompareMode, type ClipCompareSide } from "./clip-compare";
import { clockOf, flush, installFakeMedia, playLog, setClock } from "../../tests/fakeMedia";

let restore: () => void;
beforeEach(() => { restore = installFakeMedia(); });
afterEach(() => { cleanup(); restore(); });

const before: ClipCompareSide = { src: "/before.mp4", kind: "video", label: "Before", poster: "/before.png" };
const after: ClipCompareSide = { src: "/after.mp4", kind: "video", label: "After", poster: "/after.png" };
const stillBefore: ClipCompareSide = { src: "/before.png", kind: "image", label: "Before" };
const stillAfter: ClipCompareSide = { src: "/after.png", kind: "image", label: "After" };

const videos = (root: HTMLElement) => [...root.querySelectorAll("video")] as HTMLVideoElement[];

describe("ClipCompare", () => {
  test("starts side by side with a before pane above an after pane, a labelled two-option toggle and calm label pills", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} />);
    const root = container.querySelector('[data-slot="clip-compare"]')!;
    expect(root.getAttribute("data-mode")).toBe("side_by_side");
    expect(getByRole("radiogroup", { name: "Compare view" })).toBeTruthy();
    expect(getByRole("radio", { name: "Side by side" }).getAttribute("aria-checked")).toBe("true");
    expect(getByRole("radio", { name: "Wipe" }).getAttribute("aria-checked")).toBe("false");
    const panes = [...container.querySelectorAll('[data-slot="clip-compare-pane"]')];
    expect(panes.map((p) => p.getAttribute("data-side"))).toEqual(["before", "after"]);
    expect(panes[0]!.querySelector('[data-slot="clip-compare-label"]')!.textContent).toBe("Before");
    expect(panes[1]!.querySelector('[data-slot="clip-compare-label"]')!.textContent).toBe("After");
    expect(panes[0]!.querySelector('[data-slot="clip-compare-label"]')!.className).toContain("bottom-2");
    expect(container.querySelector('[data-slot="clip-compare-frame"]')!.className).toContain("grid-cols-1");
    expect(container.querySelector('[data-slot="clip-compare-handle"]')).toBeNull();
    expect(videos(container).map((v) => v.getAttribute("poster"))).toEqual(["/before.png", "/after.png"]);
  });

  test("labels default to Before and After and can be replaced", () => {
    const plain = render(<ClipCompare before={{ src: "/a.mp4", kind: "video" }} after={{ src: "/b.mp4", kind: "video" }} />);
    expect([...plain.container.querySelectorAll('[data-slot="clip-compare-label"]')].map((l) => l.textContent)).toEqual(["Before", "After"]);
    cleanup();
    const named = render(<ClipCompare before={{ ...before, label: "Original" }} after={{ ...after, label: "Swapped" }} />);
    expect([...named.container.querySelectorAll('[data-slot="clip-compare-label"]')].map((l) => l.textContent)).toEqual(["Original", "Swapped"]);
  });

  test("the toggle reports the new mode, switches the view and keeps the same video elements and position", async () => {
    const modes: ClipCompareMode[] = [];
    const { getByRole, getByLabelText, container } = render(<ClipCompare before={before} after={after} onModeChange={(m) => modes.push(m)} />);
    const [b, a] = videos(container);
    fireEvent.keyDown(getByRole("slider", { name: "Clip position" }), { key: "ArrowRight" });
    await flush();
    fireEvent.click(getByRole("radio", { name: "Wipe" }));
    expect(modes).toEqual(["wipe"]);
    expect(container.querySelector('[data-slot="clip-compare"]')!.getAttribute("data-mode")).toBe("wipe");
    expect(getByRole("slider", { name: "Before and after divider" })).toBeTruthy();
    expect(videos(container)[0]).toBe(b!);
    expect(videos(container)[1]).toBe(a!);
    expect(clockOf(b!)).toBe(1);
    fireEvent.click(getByRole("radio", { name: "Side by side" }));
    expect(modes).toEqual(["wipe", "side_by_side"]);
    expect(getByLabelText("Before")).toBe(b!);
  });

  test("a controlled mode only changes when the host passes it back", () => {
    const modes: ClipCompareMode[] = [];
    const { getByRole, container, rerender } = render(<ClipCompare before={before} after={after} mode="side_by_side" onModeChange={(m) => modes.push(m)} />);
    fireEvent.click(getByRole("radio", { name: "Wipe" }));
    expect(modes).toEqual(["wipe"]);
    expect(container.querySelector('[data-slot="clip-compare"]')!.getAttribute("data-mode")).toBe("side_by_side");
    rerender(<ClipCompare before={before} after={after} mode="wipe" onModeChange={(m) => modes.push(m)} />);
    expect(container.querySelector('[data-slot="clip-compare"]')!.getAttribute("data-mode")).toBe("wipe");
  });

  test("the wipe handle is a slider moved by the arrow keys, with a spoken value", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} mode="wipe" />);
    const handle = getByRole("slider", { name: "Before and after divider" });
    expect(handle.getAttribute("aria-valuetext")).toBe("Showing 50% of the before");
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    expect(handle.getAttribute("aria-valuetext")).toBe("Showing 40% of the before");
    expect(handle.getAttribute("aria-valuenow")).toBe("40");
    const afterPane = container.querySelector('[data-side="after"]') as HTMLElement;
    expect(afterPane.style.clipPath).toBe("inset(0 0 0 40%)");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuetext")).toBe("Showing 42% of the before");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle.getAttribute("aria-valuetext")).toBe("Showing 0% of the before");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle.getAttribute("aria-valuenow")).toBe("0");
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuenow")).toBe("100");
    expect(container.querySelectorAll("video").length).toBe(2);
  });

  test("the handle is at least 48px wide and the transport targets are 48px", () => {
    const { getByRole } = render(<ClipCompare before={before} after={after} mode="wipe" />);
    expect(getByRole("slider", { name: "Before and after divider" }).className).toContain("w-12");
    expect(getByRole("button", { name: "Play" }).className).toContain("size-12");
    expect(getByRole("button", { name: "Unmute" }).className).toContain("size-12");
    expect(getByRole("slider", { name: "Clip position" }).className).toContain("h-12");
  });

  test("one play starts both videos and one pause stops both", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} />);
    const [b, a] = videos(container);
    fireEvent.click(getByRole("button", { name: "Play" }));
    expect(playLog).toContain(b!);
    expect(playLog).toContain(a!);
    expect(b!.paused).toBe(false);
    expect(a!.paused).toBe(false);
    fireEvent.click(getByRole("button", { name: "Pause" }));
    expect(b!.paused).toBe(true);
    expect(a!.paused).toBe(true);
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
  });

  test("the scrub bar shows the length and seeks both videos", async () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} />);
    const [b, a] = videos(container);
    const slider = getByRole("slider", { name: "Clip position" });
    expect(slider.getAttribute("aria-valuemax")).toBe("10");
    expect(slider.getAttribute("aria-valuetext")).toBe("0:00 of 0:10");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    await flush();
    expect(clockOf(b!)).toBe(2);
    expect(clockOf(a!)).toBe(2);
    expect(slider.getAttribute("aria-valuenow")).toBe("2");
    expect(container.querySelector('[data-slot="clip-compare-time"]')!.textContent).toBe("0:02 / 0:10");
    fireEvent.keyDown(slider, { key: "End" });
    expect(clockOf(a!)).toBe(10);
    fireEvent.keyDown(slider, { key: "Home" });
    expect(clockOf(b!)).toBe(0);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(clockOf(b!)).toBe(0);
  });

  test("on timeupdate the follower is pulled back only when it drifts more than 0.25 s", () => {
    const { container } = render(<ClipCompare before={before} after={after} />);
    const [b, a] = videos(container);
    setClock(b!, 3);
    setClock(a!, 3.2);
    fireEvent.timeUpdate(b!);
    expect(clockOf(a!)).toBe(3.2);
    setClock(a!, 3.6);
    fireEvent.timeUpdate(b!);
    expect(clockOf(a!)).toBe(3);
    setClock(a!, 4);
    fireEvent.timeUpdate(a!);
    expect(clockOf(a!)).toBe(3);
    expect(container.querySelector('[data-slot="clip-compare-time"]')!.textContent).toBe("0:03 / 0:10");
  });

  test("when either video ends both pause, and Play starts again from the start", async () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} />);
    const [b, a] = videos(container);
    fireEvent.click(getByRole("button", { name: "Play" }));
    fireEvent.ended(a!);
    expect(b!.paused).toBe(true);
    expect(a!.paused).toBe(true);
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
    setClock(b!, 10);
    setClock(a!, 10);
    fireEvent.click(getByRole("button", { name: "Play" }));
    await flush();
    expect(clockOf(b!)).toBe(0);
    expect(clockOf(a!)).toBe(0);
    expect(b!.paused).toBe(false);
  });

  test("starts muted with one unmute button, and only one side's sound plays", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} />);
    const [b, a] = videos(container);
    expect(b!.muted).toBe(true);
    expect(a!.muted).toBe(true);
    expect(getByRole("button", { name: "Unmute" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Unmute" }));
    expect(b!.muted).toBe(true);
    expect(a!.muted).toBe(false);
    expect(getByRole("button", { name: "Mute" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Mute" }));
    expect(a!.muted).toBe(true);
  });

  test("in a wipe the sound follows the side the handle shows more of", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} mode="wipe" />);
    const [b, a] = videos(container);
    fireEvent.click(getByRole("button", { name: "Unmute" }));
    expect([b!.muted, a!.muted]).toEqual([true, false]);
    fireEvent.keyDown(getByRole("slider", { name: "Before and after divider" }), { key: "End" });
    expect([b!.muted, a!.muted]).toEqual([false, true]);
  });

  test("a video that fails shows one plain line with what to do, and no transport", () => {
    const { container, getByRole, queryByRole } = render(<ClipCompare before={before} after={after} />);
    fireEvent.error(videos(container)[1]!);
    const alert = getByRole("alert");
    expect(alert.textContent).toBe("One of the two clips did not load. Reload this page or open the clip from the Library.");
    expect(queryByRole("button", { name: "Play" })).toBeNull();
    expect(container.querySelectorAll("video").length).toBe(0);
  });

  test("a picture that fails shows the same line", () => {
    const { container, getByRole } = render(<ClipCompare before={stillBefore} after={stillAfter} />);
    fireEvent.error(container.querySelectorAll("img")[0]!);
    expect(getByRole("alert").textContent).toContain("did not load");
  });

  test("stills show both pictures, the labels and the mode toggle, with no transport", () => {
    const { container, queryByRole, getByRole } = render(<ClipCompare before={stillBefore} after={stillAfter} />);
    expect([...container.querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual(["Before", "After"]);
    expect(container.querySelectorAll("video").length).toBe(0);
    expect(queryByRole("button", { name: "Play" })).toBeNull();
    expect(queryByRole("button", { name: "Unmute" })).toBeNull();
    expect(queryByRole("slider", { name: "Clip position" })).toBeNull();
    expect(container.querySelector('[data-slot="clip-compare-transport"]')).toBeNull();
    fireEvent.click(getByRole("radio", { name: "Wipe" }));
    expect(getByRole("slider", { name: "Before and after divider" })).toBeTruthy();
    expect(container.querySelectorAll("img").length).toBe(2);
  });

  test("a clip beside a still keeps the transport for the clip", () => {
    const { container, getByRole } = render(<ClipCompare before={stillBefore} after={after} />);
    fireEvent.click(getByRole("button", { name: "Play" }));
    expect(videos(container).length).toBe(1);
    expect(videos(container)[0]!.paused).toBe(false);
  });

  test("loading shows a labelled placeholder instead of the compare", () => {
    const { getByRole, container } = render(<ClipCompare before={before} after={after} loading />);
    const status = getByRole("status", { name: "Loading the clips" });
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll("video").length).toBe(0);
    expect(status.innerHTML).toContain("motion-reduce:animate-none");
  });

  test("copy replaces the words", () => {
    const { getByRole } = render(<ClipCompare before={before} after={after} mode="wipe" copy={{ play: "Start", wipeValue: (p) => `${p} percent original` }} />);
    expect(getByRole("button", { name: "Start" })).toBeTruthy();
    expect(getByRole("slider", { name: "Before and after divider" }).getAttribute("aria-valuetext")).toBe("50 percent original");
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

afterEach(cleanup);

const noop = () => {};

/** happy-dom has no media timeline, so the test gives the clip one it can move. */
function clock(view: ReturnType<typeof render>, at: number, length = 12) {
  const video = view.container.querySelector("video")!;
  let time = at;
  Object.defineProperty(video, "currentTime", { configurable: true, get: () => time, set: (v: number) => { time = v; } });
  Object.defineProperty(video, "duration", { configurable: true, get: () => length });
  fireEvent(video, new Event("loadedmetadata"));
  fireEvent(video, new Event("timeupdate"));
  return { video, set: (v: number) => { time = v; fireEvent(video, new Event("timeupdate")); } };
}

describe("VideoPlayer retake from a time", () => {
  test("shows the current time in the action's text and calls onRetakeFrom with it", () => {
    const seen: number[] = [];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={t => seen.push(t)} />);
    const media = clock(view, 7.4);
    const button = view.getByRole("button", { name: "Retake from 0:07" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    media.set(9.6);
    expect(view.getByRole("button", { name: "Retake from 0:09" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Retake from 0:09" }));
    expect(seen).toEqual([9.6]);
  });

  test("choosing arms a marker on the scrub bar at that time, and Clear takes it away", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={noop} />);
    const media = clock(view, 3);
    expect(view.container.querySelector("[data-slot=video-player-retake-marker]")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Retake from 0:03" }));
    const marker = view.container.querySelector("[data-slot=video-player-retake-marker]") as HTMLElement;
    expect(marker.style.insetInlineStart).toContain("25%");
    expect(view.getByText("Retake point 0:03")).toBeTruthy();
    expect(view.getByRole("button", { name: "Retake from 0:03" }).getAttribute("aria-pressed")).toBe("true");
    media.set(6);
    expect(view.getByRole("button", { name: "Retake from 0:03" })).toBeTruthy();
    expect((view.container.querySelector("[data-slot=video-player-retake-marker]") as HTMLElement).style.insetInlineStart).toContain("25%");
    fireEvent.click(view.getByRole("button", { name: "Clear retake point" }));
    expect(view.container.querySelector("[data-slot=video-player-retake-marker]")).toBeNull();
    expect(view.queryByText(/Retake point/)).toBeNull();
  });

  test("retakeArmedAt controls the marker", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={noop} durationSec={10} retakeArmedAt={5} />);
    expect((view.container.querySelector("[data-slot=video-player-retake-marker]") as HTMLElement).style.insetInlineStart).toContain("50%");
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={noop} durationSec={10} retakeArmedAt={null} />);
    expect(view.container.querySelector("[data-slot=video-player-retake-marker]")).toBeNull();
  });

  test("the scrub bar is a labelled slider that seeks the clip by keyboard and pointer", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={noop} />);
    const media = clock(view, 2);
    const slider = view.getByRole("slider", { name: "Seek" });
    expect(slider.getAttribute("aria-valuetext")).toBe("0:02 of 0:12");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(media.video.currentTime).toBe(3);
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(media.video.currentTime).toBe(12);
    fireEvent.keyDown(slider, { key: "Home" });
    expect(media.video.currentTime).toBe(0);
    slider.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 48, right: 200, bottom: 48, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1 });
    expect(media.video.currentTime).toBe(6);
  });

  test("a disabledReason is visible text, the action is disabled and nothing is called", () => {
    let called = 0;
    const view = render(
      <VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={() => { called += 1; }} controls={{ retake: { disabledReason: "Retake needs Final HD. This clip is a Quick draft." } }} />,
    );
    const button = view.getByRole("button", { name: /Retake from/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const line = view.container.querySelector("[data-slot=video-player-action-note]")!;
    expect(line.textContent).toBe("Retake needs Final HD. This clip is a Quick draft.");
    expect(button.getAttribute("aria-describedby")).toBe(line.id);
    fireEvent.click(button);
    expect(called).toBe(0);
  });

  test("an actionItems entry of kind retake_from replaces the built-in and takes its own label, note and busy", () => {
    const seen: number[] = [];
    const items: VideoPlayerAction[] = [{ kind: "retake_from", label: "Redo from {time}", note: "Keeps the opening. About 8 minutes." }];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={t => seen.push(t)} actionItems={items} />);
    clock(view, 4);
    expect(view.getAllByRole("button", { name: /Redo from|Retake from/ })).toHaveLength(1);
    fireEvent.click(view.getByRole("button", { name: "Redo from 0:04" }));
    expect(seen).toEqual([4]);
    expect(view.getByText("Keeps the opening. About 8 minutes.")).toBeTruthy();
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onRetakeFrom={noop} actionItems={[{ ...items[0]!, busy: true }]} />);
    const busy = view.getByRole("button", { name: /Redo from/ }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
  });

  test("no onRetakeFrom and no retake item: no action, no scrub bar, and the video is untouched", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onShare={noop} />);
    expect(view.queryByRole("button", { name: /Retake/ })).toBeNull();
    expect(view.queryByRole("slider")).toBeNull();
    expect(view.container.querySelector("[data-slot=video-player-retake]")).toBeNull();
  });

  test("not drawn while the clip is not ready", () => {
    const view = render(<VideoPlayer status="generating" prompt="x" onRetakeFrom={noop} />);
    expect(view.queryByRole("button", { name: /Retake/ })).toBeNull();
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" bare onRetakeFrom={noop} />);
    expect(view.queryByRole("slider")).toBeNull();
  });
});

describe("VideoPlayer per-clip actions with notes and busy", () => {
  const items: VideoPlayerAction[] = [
    { label: "Another take", icon: "sparkles", note: "Starts over with the same words. About 5 minutes.", onSelect: noop },
    { label: "Extend", icon: "plus", note: "Keeps the whole clip. About 8 minutes.", busy: true, onSelect: noop },
    { label: "Enhance", icon: "sparkles", note: "Keeps the story.", disabledReason: "Enhance needs Final HD. This clip is a Quick draft.", onSelect: noop },
  ];

  test("each note is visible beside its action, and a disabledReason takes the note's place", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={items} />);
    const notes = Array.from(view.container.querySelectorAll("[data-slot=video-player-action-note]")).map(n => n.textContent);
    expect(notes).toEqual(["Starts over with the same words. About 5 minutes.", "Keeps the whole clip. About 8 minutes.", "Enhance needs Final HD. This clip is a Quick draft."]);
    expect(view.container.querySelectorAll("[data-slot=video-player-action-note][data-reason]")).toHaveLength(1);
  });

  test("busy disables the action and marks it, the others still run", () => {
    let taken = 0;
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[{ ...items[0]!, onSelect: () => { taken += 1; } }, items[1]!, items[2]!]} />);
    const extend = view.getByRole("button", { name: "Extend" }) as HTMLButtonElement;
    expect(extend.disabled).toBe(true);
    expect(extend.getAttribute("aria-busy")).toBe("true");
    expect(extend.querySelector("svg")!.getAttribute("class")).toContain("motion-safe:animate-spin");
    expect((view.getByRole("button", { name: "Enhance" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(view.getByRole("button", { name: "Another take" }));
    expect(taken).toBe(1);
  });

  test("actions without a note draw exactly as before", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[{ label: "Go", onSelect: noop }]} />);
    expect(view.container.querySelector("[data-slot=video-player-action-item]")).toBeNull();
    expect(view.getByRole("button", { name: "Go" }).hasAttribute("aria-busy")).toBe(false);
  });

  test("in the icons variant the note still shows and the label names the button", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionsVariant="icons" actionItems={[items[0]!]} />);
    expect(view.getByRole("button", { name: "Another take" }).textContent).toBe("");
    expect(view.getByText("Starts over with the same words. About 5 minutes.")).toBeTruthy();
  });
});

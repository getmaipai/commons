import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { StoryboardPlayer, formatStoryboardTime, type StoryboardShot } from "./storyboard-player";
import { installFakeMedia, playLog } from "../../tests/fakeMedia";

let restore: () => void;
beforeEach(() => { restore = installFakeMedia(); });
afterEach(() => { cleanup(); restore(); });

const shots: StoryboardShot[] = [
  { id: "a", caption: "Juniper at the window", durationSec: 6, still: "/a.png", line: { speaker: "Juniper", text: "Morning, Atlas.", audioSrc: "/a.mp3", wave: [0.2, 0.9, 0.5] } },
  { id: "b", caption: "Atlas at the shed", durationSec: 5, still: "/b.png", line: { speaker: "Atlas", text: "I found the lantern." } },
  { id: "c", caption: "The hill", durationSec: 7, still: "/c.png" },
];
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("StoryboardPlayer", () => {
  test("renders the stage, caption, time, scrub bar and one strip item per shot", () => {
    const { getByRole, getAllByRole, getByText, container } = render(<StoryboardPlayer shots={shots} />);
    expect(getByRole("button", { name: "Play" })).toBeTruthy();
    expect(getByText("Juniper")).toBeTruthy();
    expect(getByText("Morning, Atlas.")).toBeTruthy();
    expect(container.querySelector('[data-slot="storyboard-time"]')?.textContent).toBe("0:00 / 0:18");
    const slider = getByRole("slider", { name: "Storyboard position" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 1 of 3, 0:00");
    expect(container.querySelectorAll('[data-slot="storyboard-tick"]').length).toBe(2);
    const items = getAllByRole("button", { name: /^Shot \d/ });
    expect(items.length).toBe(3);
    expect(items[0]!.className).toContain("min-h-[48px]");
    expect(items[0]!.getAttribute("aria-current")).toBe("true");
    expect(container.querySelectorAll('[data-slot="storyboard-wave"]').length).toBe(1);
    expect(container.querySelectorAll('[data-slot="storyboard-line-marker"]').length).toBe(1);
  });

  test("selecting a shot seeks to its start, updates the caption and reports the id", () => {
    const ids: string[] = [];
    const times: number[] = [];
    const { getByRole, getByText, container } = render(<StoryboardPlayer shots={shots} onValueChange={(id) => ids.push(id)} onTimeChange={(s) => times.push(s)} />);
    fireEvent.click(getByRole("button", { name: "Shot 3: The hill, 7 seconds" }));
    expect(ids).toEqual(["c"]);
    expect(times).toEqual([11]);
    expect(getByText("The hill")).toBeTruthy();
    expect(getByRole("slider").getAttribute("aria-valuetext")).toBe("Shot 3 of 3, 0:11");
    expect(container.querySelector('[data-slot="storyboard-time"]')?.textContent).toBe("0:11 / 0:18");
  });

  test("a controlled value moves the player and is not echoed back", () => {
    const ids: string[] = [];
    const { getByRole, rerender } = render(<StoryboardPlayer shots={shots} value="a" onValueChange={(id) => ids.push(id)} />);
    rerender(<StoryboardPlayer shots={shots} value="b" onValueChange={(id) => ids.push(id)} />);
    expect(getByRole("slider").getAttribute("aria-valuetext")).toBe("Shot 2 of 3, 0:06");
    expect(ids).toEqual([]);
  });

  test("keyboard on the scrub bar steps a second, jumps shots and goes to the ends", () => {
    const { getByRole } = render(<StoryboardPlayer shots={shots} />);
    const slider = getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 1 of 3, 0:01");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 2 of 3, 0:06");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 3 of 3, 0:18");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 1 of 3, 0:00");
  });

  test("clicking the scrub bar seeks and selects the shot under the pointer", () => {
    const { getByRole } = render(<StoryboardPlayer shots={shots} />);
    const slider = getByRole("slider");
    slider.getBoundingClientRect = () => ({ left: 0, right: 180, width: 180, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1 });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 2 of 3, 0:10");
    fireEvent.pointerMove(slider, { clientX: 20, pointerId: 1 });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 1 of 3, 0:02");
    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 170, pointerId: 1 });
    expect(slider.getAttribute("aria-valuetext")).toBe("Shot 1 of 3, 0:02");
  });

  test("play runs the clock, fires onTimeChange and starts the line audio and the bed; pause stops them", async () => {
    const times: number[] = [];
    const { getByRole, container } = render(<StoryboardPlayer shots={shots} bedSrc="/bed.mp3" onTimeChange={(s) => times.push(s)} />);
    fireEvent.click(getByRole("button", { name: "Play" }));
    await waitFor(() => expect(times.length).toBeGreaterThan(2));
    expect(getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(times.at(-1)!).toBeGreaterThan(0.1);
    expect(container.querySelector('[data-slot="storyboard-player"]')?.getAttribute("data-state")).toBe("playing");
    expect(playLog.some((el) => el.getAttribute("src") === "/bed.mp3")).toBe(true);
    fireEvent.click(getByRole("button", { name: "Pause" }));
    const seen = times.length;
    await wait(150);
    expect(times.length).toBe(seen);
    expect(container.querySelector('[data-slot="storyboard-player"]')?.getAttribute("data-state")).toBe("paused");
  });

  test("a shot with no picture shows a calm placeholder", () => {
    const { getByText, queryByRole } = render(<StoryboardPlayer shots={[{ id: "x", caption: "Willow arrives", durationSec: 4, status: "no_picture" }]} />);
    expect(getByText("No picture yet")).toBeTruthy();
    expect(queryByRole("img")).toBeNull();
  });

  test("a shot being changed says so", () => {
    const { getByText, getByRole } = render(<StoryboardPlayer shots={[{ id: "x", caption: "Sage lights the lantern", durationSec: 4, still: "/x.png", status: "changing" }]} />);
    expect(getByText("Changing this shot")).toBeTruthy();
    expect(getByRole("status").textContent).toBe("Changing this shot");
  });

  test("optional shot context truncates into a calm strip line; affected ids use the changing look and note sits under the caption", () => {
    const extended = [
      { id: "a", caption: "A caption", durationSec: 3, framing: "Wide", place: "Kitchen" },
      { id: "b", caption: "Another", durationSec: 3 },
    ];
    const { container, getByText } = render(<StoryboardPlayer shots={extended} affectedShotIds={["b"]} note="One sentence after the edit." />);
    expect(getByText("Wide · Kitchen")).toBeTruthy();
    expect(container.querySelector('[data-slot="storyboard-shot-context"]')?.className).toContain("truncate");
    expect(getByText("One sentence after the edit.")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="storyboard-strip"] img').length).toBe(0);
    expect(container.querySelectorAll('[data-slot="storyboard-strip"] [data-slot="storyboard-no-picture"]').length).toBe(0);
    expect(container.querySelectorAll('[data-slot="storyboard-strip"] li')[1]?.querySelector("button")?.textContent).toContain("2");
  });

  test("loading draws a skeleton and no controls", () => {
    const { getByRole, queryByRole } = render(<StoryboardPlayer shots={shots} loading />);
    expect(getByRole("status", { name: "Loading the storyboard" }).getAttribute("aria-busy")).toBe("true");
    expect(queryByRole("slider")).toBeNull();
    expect(queryByRole("button")).toBeNull();
  });

  test("an empty list says what to do", () => {
    const { getByText, queryByRole } = render(<StoryboardPlayer shots={[]} />);
    expect(getByText("No shots yet. Add a shot to start your storyboard.")).toBeTruthy();
    expect(queryByRole("slider")).toBeNull();
    expect(document.querySelector("[data-slot=storyboard-player][data-state=empty]")!.className).toContain("aspect-video");
  });

  test("labels can be overridden", () => {
    const { getByRole } = render(<StoryboardPlayer shots={shots} labels={{ play: "Lanzar", scrub: "Posicion" }} />);
    expect(getByRole("button", { name: "Lanzar" })).toBeTruthy();
    expect(getByRole("slider", { name: "Posicion" })).toBeTruthy();
  });

  test("the clock stops at the end and the button returns to Play", async () => {
    const { getByRole } = render(<StoryboardPlayer shots={[{ id: "x", caption: "Short", durationSec: 0.1, still: "/x.png" }]} />);
    fireEvent.click(getByRole("button", { name: "Play" }));
    await waitFor(() => expect(getByRole("button", { name: "Play" })).toBeTruthy());
    expect(getByRole("slider").getAttribute("aria-valuenow")).toBe("0");
    expect(getByRole("slider").getAttribute("aria-valuemax")).toBe("0");
  });

  test("formats times as m:ss", () => {
    expect(formatStoryboardTime(74.9)).toBe("1:14");
    expect(formatStoryboardTime(-3)).toBe("0:00");
  });
});

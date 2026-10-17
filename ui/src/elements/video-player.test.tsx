import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { VideoPlayer, barValue, formatClock } from "./video-player";

afterEach(cleanup);

describe("VideoPlayer helpers", () => {
  test("formatClock reads m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75_400)).toBe("1:15");
  });
  test("barValue uses the reported progress, else a slow estimate capped at 90", () => {
    expect(barValue(42.4, 0, 120_000)).toBe(42);
    expect(barValue(null, 60_000, 120_000)).toBe(45);
    expect(barValue(undefined, 900_000, 120_000)).toBe(90);
    expect(barValue(150, 0, 120_000)).toBe(100);
  });
});

describe("VideoPlayer", () => {
  test("generating shows status, a bar, the clock and Stop", () => {
    let stopped = 0;
    const view = render(<VideoPlayer status="generating" prompt="a paper boat" progress={40} startedAt={Date.now() - 65_000} phaseLabel="Drawing the frames" hint="About 2 minutes" onStop={() => { stopped += 1; }} />);
    expect(view.getByRole("status").textContent).toContain("Making your video");
    expect(view.getByRole("status").textContent).toContain("Drawing the frames");
    expect(view.getByRole("progressbar").getAttribute("aria-valuetext")).toContain("40 percent");
    expect(view.container.querySelector("[data-slot=progress-indicator]")!.getAttribute("style")).toContain("-60%");
    expect(view.container.textContent).toContain("1:05");
    expect(view.container.textContent).toContain("About 2 minutes");
    fireEvent.click(view.getByRole("button", { name: "Stop" }));
    expect(stopped).toBe(1);
  });
  test("the clock ticks", async () => {
    const view = render(<VideoPlayer status="generating" prompt="x" startedAt={Date.now()} />);
    expect(view.container.textContent).toContain("0:00");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1200)); });
    expect(view.container.textContent).toContain("0:01");
  });
  test("queued names the place in line", () => {
    const view = render(<VideoPlayer status="queued" prompt="x" queuePosition={2} />);
    expect(view.getByRole("status").textContent).toContain("Place in line: 2");
  });
  test("ready is a looping player with controls, poster, a caption and the actions", () => {
    let again = 0;
    const view = render(<VideoPlayer status="ready" prompt="a paper boat in the rain" src="/v.mp4" poster="/p.jpg" onMakeAnother={() => { again += 1; }} onShare={() => {}} actions={<button type="button">Animate</button>} />);
    const video = view.container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("/v.mp4");
    expect(video.getAttribute("poster")).toBe("/p.jpg");
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute("aria-label")).toBe("a paper boat in the rain");
    expect(view.getByRole("button", { name: "Download" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Share" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Animate" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Make another" }));
    expect(again).toBe(1);
    expect(view.container.textContent).toContain("a paper boat in the rain");
  });
  test("failed shows the reason and Try again, never a player", () => {
    let retried = 0;
    const view = render(<VideoPlayer status="failed" prompt="x" error="I couldn't make that video. Try again." onRetry={() => { retried += 1; }} />);
    expect(view.container.querySelector("video")).toBeNull();
    expect(view.getByRole("alert").textContent).toContain("I couldn't make that video.");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(retried).toBe(1);
  });
  test("cancelled keeps nothing and offers Make another", () => {
    const view = render(<VideoPlayer status="cancelled" prompt="x" onMakeAnother={() => {}} />);
    expect(view.container.textContent).toContain("Stopped.");
    expect(view.getByRole("button", { name: "Make another" })).toBeTruthy();
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LyricsList, lyricDistance } from "./lyrics-list";

afterEach(cleanup);

describe("LyricsList", () => {
  test("seeks timed lines and marks the line at current time", () => {
    const onSeek: number[] = [];
    const view = render(<LyricsList lines={[{ t: 0, line: "First", section: "Verse" }, { t: 5, line: "Second" }]} currentTime={6} onSeek={t => onSeek.push(t)} labels={{ label: "Lyrics" }} />);
    expect(view.getByRole("button", { name: "Second" }).getAttribute("aria-current")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "First" }));
    expect(onSeek).toEqual([0]);
  });
  test("renders plain text and an empty label", () => {
    const view = render(<LyricsList text={"A line\nAnother line"} labels={{ label: "Lyrics" }} />);
    expect(view.container.querySelector("pre")?.textContent).toBe("A line\nAnother line");
    view.rerender(<LyricsList labels={{ label: "Song lyrics" }} />);
    expect(view.getByText("Song lyrics")).toBeTruthy();
  });
  test("blurByDistance sets the distance from the active line and is off by default", () => {
    const lines = [{ t: 0, line: "A" }, { t: 5, line: "B" }, { t: 10, line: "C" }, { t: 15, line: "D" }];
    const view = render(<LyricsList lines={lines} currentTime={6} largeCurrent />);
    expect(view.container.querySelector("[data-distance]")).toBeNull();
    expect(view.container.innerHTML).not.toContain("lyric-distance");
    view.rerender(<LyricsList lines={lines} currentTime={6} largeCurrent blurByDistance />);
    expect([...view.container.querySelectorAll("button")].map((b) => b.getAttribute("data-distance"))).toEqual(["1", "0", "1", "2"]);
    const dim = view.getByRole("button", { name: "D" });
    expect(dim.className).toContain("--lyrics-blur-step");
    expect(dim.className).toContain("hover:[filter:none]");
    expect(dim.className).toContain("motion-safe:transition");
    expect(view.getByRole("button", { name: "B" }).getAttribute("aria-current")).toBe("true");
  });
  test("before the first line there is no active line, so nothing blurs", () => {
    const view = render(<LyricsList lines={[{ t: 5, line: "A" }, { t: 9, line: "B" }]} currentTime={1} blurByDistance />);
    expect(view.getByRole("button", { name: "B" }).className).not.toContain("--lyrics-blur-step");
    expect(lyricDistance(3, -1)).toBe(0);
    expect(lyricDistance(1, 4)).toBe(3);
  });
});

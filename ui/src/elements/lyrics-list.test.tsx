import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LyricsList, lyricDistance, nextActiveIndex, LYRIC_LEAD_S } from "./lyrics-list";

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

  test("nextActiveIndex accepts forward moves, refuses small backward steps, accepts a seek", () => {
    expect(nextActiveIndex(2, 10, 3, 10.1)).toBe(3);
    expect(nextActiveIndex(2, 10, 2, 10.1)).toBe(2);
    expect(nextActiveIndex(3, 10, 2, 9.5)).toBe(3);
    expect(nextActiveIndex(3, 10, 2, 9.2)).toBe(2);
    expect(nextActiveIndex(3, 10, 0, 2)).toBe(0);
  });
  const worded = [{ t: 0, line: "Hello big world", words: [{ t: 0, end: 1, text: "Hello" }, { t: 1, end: 2, text: "big" }, { t: 2, end: 3, text: "world" }] }, { t: 10, line: "Next" }];
  test("word wipe sets --word-fill per word and keeps the plain accessible name", () => {
    const view = render(<LyricsList lines={worded} currentTime={1.5} />);
    const spans = [...view.container.querySelectorAll("[data-word]")] as HTMLElement[];
    expect(spans.map(s => s.style.getPropertyValue("--word-fill"))).toEqual(["1", "0.5", "0"]);
    expect(view.getByRole("button", { name: "Hello big world" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Next" }).querySelector("[data-word]")).toBeNull();
  });
  test("a line without words has no word spans", () => {
    const view = render(<LyricsList lines={[{ t: 0, line: "Plain" }]} currentTime={0.5} />);
    expect(view.container.querySelector("[data-word]")).toBeNull();
    expect(view.getByRole("button", { name: "Plain" }).textContent).toBe("Plain");
  });
  test("word wipe uses only theme tokens", () => {
    const view = render(<LyricsList lines={worded} currentTime={1.5} />);
    const html = view.getByRole("button", { name: "Hello big world" }).outerHTML;
    expect(html).toContain("var(--foreground)");
    expect(html).toContain("var(--muted-foreground)");
    expect(html.replace(/whitespace-/g, "")).not.toMatch(/rgb|#[0-9a-fA-F]{3}|white/);
  });
  test("a line lights early by the lead", () => {
    expect(LYRIC_LEAD_S).toBe(0.55);
    const view = render(<LyricsList lines={[{ t: 0, line: "A" }, { t: 5, line: "B" }]} currentTime={4.7} />);
    expect(view.getByRole("button", { name: "B" }).getAttribute("aria-current")).toBe("true");
  });
  test("count-in shows in the last 3 s of a gap of 2 s or more only", () => {
    const long = [{ t: 0, line: "A" }, { t: 7, line: "B" }];
    expect(render(<LyricsList lines={long} currentTime={5} />).container.querySelector("[data-slot=progress]")).not.toBeNull();
    cleanup();
    expect(render(<LyricsList lines={long} currentTime={3} />).container.querySelector("[data-slot=progress]")).toBeNull();
    cleanup();
    const short = [{ t: 0, line: "A" }, { t: 3, line: "B" }];
    expect(render(<LyricsList lines={short} currentTime={2.5} />).container.querySelector("[data-slot=progress]")).toBeNull();
    cleanup();
    const bar = render(<LyricsList lines={long} currentTime={5} />).container.querySelector("[data-slot=progress]")!;
    expect(bar.closest("[aria-hidden=true]") ?? bar.getAttribute("aria-hidden") === "true" ? true : false).toBe(true);
  });
  test("secondary line renders inside the button and seeks", () => {
    const onSeek: number[] = [];
    const view = render(<LyricsList lines={[{ t: 4, line: "Hola", secondary: "Hello" }]} onSeek={t => onSeek.push(t)} />);
    const sec = view.getByText("Hello");
    expect(sec.className).toContain("text-muted-foreground");
    expect(sec.closest("button")).toBeTruthy();
    fireEvent.click(sec);
    expect(onSeek).toEqual([4]);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LyricsList } from "./lyrics-list";

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
});

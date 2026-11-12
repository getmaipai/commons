import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { GeneratedCover, coverTitleSize } from "./GeneratedCover";

const NAMES = ["Night Bus", "Static Bloom", "Golden Hour", "Paper Planes", "Slow Mornings", "Neon Rain", "Fireflies", "Sunday Drive", "Back Porch Blues", "Night Shift", "Focus", "Chill"];
const titleOf = (c: HTMLElement) => c.querySelector('[data-slot="generated-cover-title"]')!.getAttribute("data-title");

describe("GeneratedCover", () => {
  test("carries the name for any style and the same name always draws the same style", () => {
    for (const n of NAMES) {
      const a = render(<GeneratedCover title={n} />);
      const b = render(<GeneratedCover title={n} />);
      expect(titleOf(a.container)).toBe(n);
      expect(a.container.firstElementChild!.getAttribute("data-style")).toBe(b.container.firstElementChild!.getAttribute("data-style"));
    }
  });
  test("names reach both the moving mesh and the glyph tile", () => {
    const seen = new Set(NAMES.map((n) => render(<GeneratedCover title={n} />).container.firstElementChild!.getAttribute("data-style")));
    expect(seen.has("mesh")).toBe(true);
    expect(seen.has("glyph")).toBe(true);
  });
  test("a mesh cover has drifting blobs and a glyph cover has a line drawing", () => {
    const covers = NAMES.map((n) => render(<GeneratedCover title={n} />).container);
    expect(covers.find((c) => c.querySelector('[data-style="mesh"]'))!.querySelectorAll('[data-slot="generated-cover-blob"]').length).toBe(4);
    expect(covers.find((c) => c.querySelector('[data-style="glyph"]'))!.querySelector("svg path, svg circle, svg ellipse")).not.toBeNull();
  });
  test("long names get a smaller title so they fit", () => {
    expect(coverTitleSize(5)).toBeGreaterThan(coverTitleSize(20));
    expect(coverTitleSize(20)).toBeGreaterThan(coverTitleSize(60));
  });
});

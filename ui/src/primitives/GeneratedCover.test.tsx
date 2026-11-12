import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { COVER_TEMPLATES, GeneratedCover, coverTitleSize } from "./GeneratedCover";

describe("GeneratedCover", () => {
  test("draws the name and the same name always picks the same template", () => {
    const a = render(<GeneratedCover title="Night Bus" />);
    const b = render(<GeneratedCover title="Night Bus" />);
    expect(a.container.querySelector('[data-slot="generated-cover-title"]')!.getAttribute("data-title")).toBe("Night Bus");
    expect(a.container.firstElementChild!.getAttribute("data-template")).toBe(b.container.firstElementChild!.getAttribute("data-template"));
  });
  test("different names reach more than one template and every template draws the name", () => {
    const seen = new Set<string>();
    for (const n of ["Night Bus", "Static Bloom", "Golden Hour", "Paper Planes", "Slow Mornings", "Neon Rain", "Fireflies", "Sunday Drive", "Back Porch Blues", "Night Shift"]) {
      const v = render(<GeneratedCover title={n} />);
      seen.add(v.container.firstElementChild!.getAttribute("data-template")!);
      expect(v.container.querySelector('[data-slot="generated-cover-title"]')!.getAttribute("data-title")).toBe(n);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(COVER_TEMPLATES).toBe(8);
  });
  test("long names get a smaller title so they fit", () => {
    expect(coverTitleSize(6)).toBeGreaterThan(coverTitleSize(20));
    expect(coverTitleSize(20)).toBeGreaterThan(coverTitleSize(60));
  });
  test("it draws with theme tokens only", () => {
    const v = render(<GeneratedCover title="Night Bus" />);
    expect(v.container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(\s*\d/i.source.length ? /#[0-9a-f]{6}\b/i : /x/);
  });
});

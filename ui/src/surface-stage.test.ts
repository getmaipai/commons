// VIDEO-UI-13: the recessed stage token. Darker than the page in both themes, never the raised pane, the same value in every dark block.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8");
const hexes = (name: string) => [...css.matchAll(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`, "g"))].map((m) => m[1]!);

function lum(hex: string): number {
  const c = [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };

// Order in tokens.css: the light root first, then the two dark blocks (.dark and the system-dark root).
const stage = hexes("--surface-stage");
const page = hexes("--surface-page");
const pane = hexes("--surface-pane");
const fg = hexes("--foreground");
const muted = hexes("--muted-foreground");

describe("--surface-stage", () => {
  test("is defined beside --surface-page in the light root and both dark blocks", () => {
    expect(stage.length).toBe(3);
    expect(page.length).toBe(3);
    expect(stage[1]).toBe(stage[2]);
  });
  test("is darker than the page in light and in dark, and is not the raised pane", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(lum(stage[i]!)).toBeLessThan(lum(page[i]!));
      expect(stage[i]).not.toBe(pane[i]);
    }
  });
  test("dark stage is darker than the dark page by a visible step, light stage is a soft step only", () => {
    expect(ratio(stage[1]!, page[1]!)).toBeGreaterThanOrEqual(1.05);
    expect(ratio(stage[0]!, page[0]!)).toBeGreaterThanOrEqual(1.05);
    expect(ratio(stage[0]!, page[0]!)).toBeLessThan(1.2);
  });
  test("foreground and muted text clear 4.5 on the stage in both themes", () => {
    expect(ratio(fg[0]!, stage[0]!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(muted[0]!, stage[0]!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(fg[1]!, stage[1]!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(muted[1]!, stage[1]!)).toBeGreaterThanOrEqual(4.5);
  });
  test("is not a page tone", () => {
    expect(css).not.toContain("data-page-tone");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// A11Y-DEBT-01 regression (ui 0.5.702): the touch-floor rules were plain CSS, and an unlayered rule beats every layered Tailwind utility, so
// `.absolute` handles became `position: relative` (the Studio's trim handles, the playhead, the clip Play button). They live in `@layer base`.
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const start = css.indexOf("A11Y-DEBT-01: the 48 px touch floor");

describe("the touch-floor rules sit under Tailwind's utilities", () => {
  test("the position and pseudo-element and text-field rules are inside one @layer base block", () => {
    expect(start).toBeGreaterThan(0);
    const open = css.indexOf("@layer base {", start);
    expect(open).toBeGreaterThan(start);
    const close = css.indexOf("\n}\n", open);
    const block = css.slice(open, close);
    expect(block).toContain("{ position: relative; }");
    expect(block).toContain("::after {");
    expect(block).toContain("inset: min(0px, calc((100% - 49px) / 2));");
    expect(block).toContain("min-height: 48px");
  });
  test("no unlayered rule forces position on a focusable element", () => {
    const lines = css.split("\n");
    const bad = lines.filter((l) => /^:where\((button|a\[href\])/.test(l) && /position: relative/.test(l));
    expect(bad).toEqual([]);
  });
});

// 2026-11-21: Radix tab panels carry tabindex=0, so the touch floor gave each panel a full-size ::after that painted above its own buttons and
// the Add voice dialog (and every tabbed page) ignored clicks. Focusable containers are not controls.
describe("the touch floor leaves focusable containers alone", () => {
  test("the tabindex clause excludes tab panels, dialogs and regions on both rules", () => {
    const hits = css.split("\n").filter((l) => l.includes('[tabindex]:not([tabindex="-1"])'));
    expect(hits.length).toBeGreaterThanOrEqual(2);
    for (const l of hits) {
      expect(l).toContain('[role="tabpanel"]');
      expect(l).toContain('[role="dialog"]');
      expect(l).toContain('[role="region"]');
    }
  });
});

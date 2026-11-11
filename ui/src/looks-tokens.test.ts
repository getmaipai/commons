import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { LOOKS_PATH, TOKENS_PATH, generateFrom as generateLooks, render } from "../scripts/gen-looks";
import { PRESETS_PATH, generateFrom as generateEase } from "../scripts/gen-ease-tokens";

const css = readFileSync(TOKENS_PATH, "utf8");
const spec = JSON.parse(readFileSync(LOOKS_PATH, "utf8")) as { bundles: Record<string, Record<string, unknown>>; looks: Record<string, string> };
const block = css.slice(css.indexOf("LOOKS-GENERATED:BEGIN"), css.indexOf("LOOKS-GENERATED:END"));
const rule = (look: string) => new RegExp(`body\\.style-${look} \\{([^}]*)\\}`).exec(block)?.[1] ?? "";

describe("Look bundles", () => {
  test("generated block matches its source", () => expect(css).toBe(render()));
  test("each Look maps to a declared bundle", () => {
    expect(Object.keys(spec.looks).sort()).toEqual(["mauve", "mist", "navy", "neutral", "olive", "stone", "taupe", "zinc"]);
    for (const bundle of Object.values(spec.looks)) expect(spec.bundles[bundle]).toBeDefined();
  });
  test("generated block contains no color literals", () => {
    expect(block).not.toMatch(/#|\brgb\s*\(|\bhsl\s*\(|\boklch\s*\(/i);
  });
  test("standard pins the replaced values", () => {
    expect(spec.bundles.standard).toMatchObject({ font_weight_title: 600, font_weight_body: 500, radius_card: 16, radius_thumb: 10, radius_pill: 999, glass_blur: 24, motion_pill_ms: 200, density_scale: 1, type_scale: 1 });
    expect(rule("stone")).toContain("--radius-card: 16px");
    expect(rule("stone")).toContain("--radius-thumb: 10px");
    expect(rule("stone")).toContain("--glass-blur: 24px");
    expect(rule("stone")).toContain("--motion-pill: 200ms");
    expect(rule("stone")).toContain("--radius: var(--radius-card)");
    expect(rule("stone")).toContain("--text-title--font-weight: var(--font-weight-title)");
    expect(css).toContain("--spacing: calc(0.25rem * var(--density-scale, 1) * var(--ease-spacing-scale, 1))");
    const easeBlock = css.slice(css.indexOf("EASE-GENERATED:BEGIN"), css.indexOf("EASE-GENERATED:END"));
    expect(easeBlock.match(/--sidebar-row-height:/g)).toHaveLength(1);
    expect(easeBlock.match(/--aui-thread-list-item-min-height:/g)).toHaveLength(1);
  });
  test("studio bundle matches the approved values", () => {
    expect(spec.bundles.studio).toMatchObject({ font_sans: "Inter, ui-sans-serif, system-ui, sans-serif", font_display: "Fraunces, ui-serif, Georgia, serif", font_weight_title: 400, font_weight_body: 400, letter_spacing_title: "-0.03em", type_scale: 1, density_scale: 0.9, radius_card: 12, radius_thumb: 8, radius_pill: 999, tile_aspect: "auto", surface_step: { light: 3, dark: 5 }, hairline_alpha: 8, card_edge: "none", glass_blur: 14, nav_active: "edge", motion_pill_ms: 150, hover_lift: 0 });
    expect(rule("neutral")).toContain("--radius-card: 12px");
    expect(rule("neutral")).toContain("--density-scale: 0.9");
    expect(rule("neutral")).toContain("--radius-pill: 999px");
    expect(rule("neutral")).toContain("--density-scale: 0.9");
  });
  test("all looks retain type and touch target floors at standard and large ease settings", () => {
    for (const look of Object.keys(spec.looks)) {
      const vars = rule(look);
      expect(Number(/--type-scale: ([\d.]+)/.exec(vars)?.[1])).toBeGreaterThanOrEqual(1);
      const density = Number(/--density-scale: ([\d.]+)/.exec(vars)?.[1]);
      expect(48 * density).toBeGreaterThanOrEqual(43.2);
      expect(Math.max(48, 64) * density).toBeGreaterThanOrEqual(48);
    }
    expect(css).toContain('html[data-ease-targets="large"] [data-slot="button"]');
  });
  test("each generator is idempotent on the committed text", () => {
    const presets = JSON.parse(readFileSync(PRESETS_PATH, "utf8"));
    const easeOnce = generateEase(css, presets);
    const easeTwice = generateEase(easeOnce, presets);
    expect(easeTwice).toBe(easeOnce);
    const looksOnce = generateLooks(css, spec as never);
    const looksTwice = generateLooks(looksOnce, spec as never);
    expect(looksTwice).toBe(looksOnce);
    expect(render()).toBe(css);
  });
});

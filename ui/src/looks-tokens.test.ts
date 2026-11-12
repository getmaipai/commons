import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { LOOKS_PATH, TOKENS_PATH, generateFrom as generateLooks, render } from "../scripts/gen-looks";
import { PRESETS_PATH, generateFrom as generateEase } from "../scripts/gen-ease-tokens";

const css = readFileSync(TOKENS_PATH, "utf8");
const spec = JSON.parse(readFileSync(LOOKS_PATH, "utf8")) as { bundles: Record<string, Record<string, unknown>>; looks: Record<string, string> };
const block = css.slice(css.indexOf("LOOKS-GENERATED:BEGIN"), css.indexOf("LOOKS-GENERATED:END"));
const rule = (look: string) => new RegExp(`:root body\\.style-${look} \\{([^}]*)\\}`).exec(block)?.[1] ?? "";

describe("Look bundles", () => {
  test("generated block matches its source", () => expect(css).toBe(render()));
  test("each Look maps to a declared bundle", () => {
    expect(Object.keys(spec.looks).sort()).toEqual(["mauve", "mist", "navy", "neutral", "olive", "stone", "taupe", "zinc"]);
    for (const bundle of Object.values(spec.looks)) expect(spec.bundles[bundle]).toBeDefined();
  });
  test("generated block contains no color literals", () => {
    expect(block).not.toMatch(/#|\brgb\s*\(|\bhsl\s*\(|\boklch\s*\(/i);
  });
  test("standard emits only density and type scale, with all new typography keys deferred", () => {
    expect(Object.entries(spec.bundles.standard ?? {}).filter(([, value]) => value !== null)).toEqual([["type_scale", 1], ["density_scale", 1]]);
    expect(rule("stone").trim().split("\n").map((line) => line.trim().split(":")[0])).toEqual(["--type-scale", "--density-scale"]);
    expect(css).toContain("--spacing: calc(0.25rem * var(--density-scale, 1) * var(--ease-spacing-scale, 1))");
    const easeBlock = css.slice(css.indexOf("EASE-GENERATED:BEGIN"), css.indexOf("EASE-GENERATED:END"));
    expect(easeBlock.match(/--sidebar-row-height:/g)).toHaveLength(1);
    expect(easeBlock.match(/--aui-thread-list-item-min-height:/g)).toHaveLength(1);
  });
  test("card edge variables emit only for explicit bundle modes", () => {
    expect(rule("neutral")).toContain("--card-edge-border: transparent");
    expect(rule("neutral")).toContain("--card-edge-shadow: none");
    for (const look of ["stone", "zinc", "mauve", "olive", "mist", "taupe", "navy"]) {
      expect(rule(look)).not.toContain("--card-edge-");
    }
    const generated = generateLooks(css, { ...spec, bundles: { ...spec.bundles,
      hairline: { ...spec.bundles.studio, card_edge: "hairline" },
      shadow: { ...spec.bundles.studio, card_edge: "shadow" },
    }, looks: { hairline: "hairline", shadow: "shadow" } } as never);
    expect(generated).toContain("--card-edge-border: var(--hairline)");
    expect(generated).toContain("--card-edge-shadow: var(--elevation-2)");
  });
  test("header edge and rail sizing emit only for studio", () => {
    expect(rule("neutral")).toContain("--header-edge: none");
    expect(rule("neutral")).toContain("--header-edge-color: transparent");
    expect(rule("neutral")).toContain("--rail-width: 48px");
    expect(rule("neutral")).toContain("--rail-icon-size: 18px");
    for (const look of ["stone", "zinc", "mauve", "olive", "mist", "taupe", "navy"]) {
      expect(rule(look)).not.toMatch(/--header-edge|--rail-width|--rail-icon-size/);
    }
    expect(css).toContain('[data-slot="rail-page-header"]');
    expect(css).toContain("border-bottom-color: var(--header-edge-color, var(--border))");
  });
  test("studio bundle matches the approved values", () => {
    expect(spec.bundles.studio).toMatchObject({ font_sans: "Inter, ui-sans-serif, system-ui, sans-serif", font_display: "Fraunces, ui-serif, Georgia, serif", font_weight_title: 400, font_weight_body: 400, letter_spacing_title: "-0.03em", title_weight: 400, title_tracking: "-0.03em", hero_weight: 400, hero_tracking: "-0.035em", section_weight: 500, section_tracking: "-0.01em", type_scale: 1, density_scale: 0.9, radius_card: 12, radius_thumb: 8, radius_pill: 999, tile_aspect: "auto", surface_step: { light: 3, dark: 5 }, hairline_alpha: 8, card_edge: "none", glass_blur: 14, nav_active: "edge", motion_pill_ms: 150, hover_lift: 0 });
    expect(rule("neutral")).toContain("--radius-card: 12px");
    expect(rule("neutral")).toContain("--density-scale: 0.9");
    expect(rule("neutral")).toContain("--radius-pill: 999px");
    for (const declaration of ["--look-weight-title: 400", "--look-tracking-title: -0.03em", "--look-weight-hero: 400", "--look-tracking-hero: -0.035em", "--look-weight-section: 500", "--look-tracking-section: -0.01em"]) expect(rule("neutral")).toContain(declaration);
    for (const variable of ["--look-weight-title", "--look-tracking-title", "--look-weight-hero", "--look-tracking-hero", "--look-weight-section", "--look-tracking-section"]) expect(rule("stone")).not.toContain(variable);
    expect(rule("neutral")).toContain("--density-scale: 0.9");
  });
  test("semantic text utilities defer weight and tracking to Look tokens", () => {
    for (const declaration of [
      "--text-title--font-weight: var(--look-weight-title, var(--font-weight-title))", "--text-title--letter-spacing: var(--look-tracking-title, inherit)",
      "--text-hero--font-weight: var(--look-weight-hero, var(--font-weight-title))", "--text-hero--letter-spacing: var(--look-tracking-hero, inherit)",
      "--text-section--font-weight: var(--look-weight-section, var(--font-weight-section))", "--text-section--letter-spacing: var(--look-tracking-section, inherit)",
    ]) expect(css).toContain(declaration);
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
  test("Look selector specificity beats both pro-look body rules", () => {
    const specificity = (selector: string) => {
      const ids = (selector.match(/#[\w-]+/g) ?? []).length;
      const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) ?? []).length;
      const elements = (selector.match(/(^|\s|>)([a-z][\w-]*)/gi) ?? []).length;
      return [ids, classes, elements];
    };
    const greater = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i]! > b[i]!; } return false; };
    const look = specificity(":root body.style-neutral");
    expect(greater(look, specificity("html[data-pro-look] body"))).toBe(true);
    expect(greater(look, specificity("html[data-pro-look] body"))).toBe(true); // same selector in the 720px media rule
  });
});

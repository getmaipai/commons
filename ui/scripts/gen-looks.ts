// Generates the non-color Look bundles from spec/ui/looks.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BEGIN = "/* LOOKS-GENERATED:BEGIN (ui/scripts/gen-looks.ts, from spec/ui/looks.json; do not edit) */";
export const END = "/* LOOKS-GENERATED:END */";
const UI = join(import.meta.dir, "..");
export const LOOKS_PATH = join(UI, "..", "spec", "ui", "looks.json");
export const TOKENS_PATH = join(UI, "src", "tokens.css");
const vars = [["--font-sans", "font_sans"], ["--font-display", "font_display"], ["--font-weight-title", "font_weight_title"], ["--font-weight-body", "font_weight_body"], ["--letter-spacing-title", "letter_spacing_title"], ["--type-scale", "type_scale"], ["--density-scale", "density_scale"], ["--radius-card", "radius_card"], ["--radius-thumb", "radius_thumb"], ["--radius-pill", "radius_pill"], ["--tile-aspect", "tile_aspect"], ["--surface-step", "surface_step"], ["--hairline-alpha", "hairline_alpha"], ["--card-edge", "card_edge"], ["--header-edge", "header_edge"], ["--rail-width", "rail_width"], ["--rail-icon-size", "rail_icon"], ["--glass-blur", "glass_blur"], ["--nav-active", "nav_active"], ["--motion-pill", "motion_pill_ms"], ["--hover-lift", "hover_lift"]] as const;
const typeVars = [["--look-weight-title", "title_weight"], ["--look-tracking-title", "title_tracking"], ["--look-weight-hero", "hero_weight"], ["--look-tracking-hero", "hero_tracking"], ["--look-weight-section", "section_weight"], ["--look-tracking-section", "section_tracking"]] as const;
type Bundle = Record<string, string | number | { light: number; dark: number } | null>;
type Looks = { bundles: Record<string, Bundle>; looks: Record<string, string> };

export function stripBlock(css: string): string {
  let base = css;
  while (base.includes(BEGIN)) {
    const a = base.indexOf(BEGIN);
    const b = base.indexOf(END, a);
    if (b < 0) throw new Error("LOOKS-GENERATED block has no END marker");
    base = base.slice(0, a) + base.slice(b + END.length);
  }
  // Remove legacy compose blocks left by earlier generator versions.
  const compose = /\/\* LOOKS-SPACING-COMPOSE:BEGIN \*\/[\s\S]*?\/\* LOOKS-SPACING-COMPOSE:END \*\//g;
  return base.replace(compose, "").replace(/\n+$/, "\n");
}

export function renderLookBlock(data: Looks): string {
  const lines = [BEGIN];
  for (const [look, bundleName] of Object.entries(data.looks)) {
    const b = data.bundles[bundleName];
    if (!b) throw new Error(`Look ${look} maps to missing bundle ${bundleName}`);
    const linesOut = vars.map(([variable, key]) => {
      const value = b[key];
      if (value === undefined) throw new Error(`Bundle ${bundleName} is missing ${key}`);
      if (value === null) return null;
      if (key === "surface_step") return `  ${variable}: light-dark(${(value as {light:number}).light}%, ${(value as {dark:number}).dark}%);`;
      if (["radius_card", "radius_thumb", "radius_pill"].includes(key)) return `  ${variable}: ${value}px;`;
      if (["rail_width", "rail_icon"].includes(key)) return `  ${variable}: ${value}px;`;
      if (key === "glass_blur") return `  ${variable}: ${value}px;`;
      if (key === "motion_pill_ms") return `  ${variable}: ${value}ms;`;
      if (key === "hairline_alpha") return `  ${variable}: ${value}%;`;
      if (key === "hover_lift") return `  ${variable}: ${value}px;`;
      return `  ${variable}: ${value};`;
    });
    const emitted = linesOut.filter((line): line is string => line !== null);
    for (const [variable, key] of typeVars) {
      const value = b[key];
      if (value === undefined) throw new Error(`Bundle ${bundleName} is missing ${key}`);
      if (value !== null) emitted.push(`  ${variable}: ${value};`);
    }
    if (b.card_edge === "none") emitted.push("  --card-edge-border: transparent;", "  --card-edge-shadow: none;");
    if (b.card_edge === "hairline") emitted.push("  --card-edge-border: var(--hairline);", "  --card-edge-shadow: none;");
    if (b.card_edge === "shadow") emitted.push("  --card-edge-border: transparent;", "  --card-edge-shadow: var(--elevation-2);");
    if (b.header_edge === "none") emitted.push("  --header-edge-color: transparent;");
    if (b.header_edge === "hairline") emitted.push("  --header-edge-color: var(--hairline);");
    if (bundleName !== "standard") {
      emitted.push("  --radius: var(--radius-card);", "  --radius-sm: calc(var(--radius-card) - 4px);", "  --radius-md: calc(var(--radius-card) - 2px);", "  --radius-lg: var(--radius-card);", "  --radius-xl: calc(var(--radius-card) + 4px);", "  --radius-2xl: calc(var(--radius-card) + 8px);", "  --radius-3xl: calc(var(--radius-card) + 12px);", "  --radius-4xl: calc(var(--radius-card) + 16px);");
    }
    lines.push(`:root body.style-${look} {\n${emitted.join("\n")}\n}`);
    if (b.card_edge !== null) {
      lines.push(`:root body.style-${look} [data-slot="kit-card"],\n:root body.style-${look} [data-slot="card"] {\n  border-color: var(--card-edge-border);\n  box-shadow: var(--card-edge-shadow);\n}`);
    }
  }
  lines.push(END);
  return lines.join("\n");
}

export function render(): string {
  const data = JSON.parse(readFileSync(LOOKS_PATH, "utf8")) as Looks;
  const css = readFileSync(TOKENS_PATH, "utf8");
  return generateFrom(css, data);
}

export function generateFrom(css: string, data: Looks): string {
  const base = stripBlock(css);
  const easeStart = base.indexOf("/* EASE-GENERATED:BEGIN");
  if (easeStart < 0) return base.replace(/\n*$/, "\n\n") + renderLookBlock(data) + "\n";
  return base.slice(0, easeStart).replace(/\n*$/, "\n\n") + renderLookBlock(data) + "\n\n" + base.slice(easeStart).replace(/^\n+/, "");
}

if (import.meta.main) writeFileSync(TOKENS_PATH, render());

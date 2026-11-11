// Generates the non-color Look bundles from spec/ui/looks.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BEGIN = "/* LOOKS-GENERATED:BEGIN (ui/scripts/gen-looks.ts, from spec/ui/looks.json; do not edit) */";
export const END = "/* LOOKS-GENERATED:END */";
const UI = join(import.meta.dir, "..");
export const LOOKS_PATH = join(UI, "..", "spec", "ui", "looks.json");
export const TOKENS_PATH = join(UI, "src", "tokens.css");
const vars = [["--font-sans", "font_sans"], ["--font-display", "font_display"], ["--font-weight-title", "font_weight_title"], ["--font-weight-body", "font_weight_body"], ["--letter-spacing-title", "letter_spacing_title"], ["--type-scale", "type_scale"], ["--density-scale", "density_scale"], ["--radius-card", "radius_card"], ["--radius-thumb", "radius_thumb"], ["--radius-pill", "radius_pill"], ["--tile-aspect", "tile_aspect"], ["--surface-step", "surface_step"], ["--hairline-alpha", "hairline_alpha"], ["--card-edge", "card_edge"], ["--glass-blur", "glass_blur"], ["--nav-active", "nav_active"], ["--motion-pill", "motion_pill_ms"], ["--hover-lift", "hover_lift"]] as const;
type Bundle = Record<string, string | number | { light: number; dark: number }>;
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
      if (key === "surface_step") return `  ${variable}: light-dark(${(value as {light:number}).light}%, ${(value as {dark:number}).dark}%);`;
      if (["radius_card", "radius_thumb", "radius_pill"].includes(key)) return `  ${variable}: ${value}px;`;
      if (key === "glass_blur") return `  ${variable}: ${value}px;`;
      if (key === "motion_pill_ms") return `  ${variable}: ${value}ms;`;
      if (key === "hairline_alpha") return `  ${variable}: ${value}%;`;
      if (key === "hover_lift") return `  ${variable}: ${value}px;`;
      return `  ${variable}: ${value};`;
    });
    linesOut.push("  --radius: var(--radius-card);");
    linesOut.push("  --radius-sm: calc(var(--radius-card) - 4px);");
    linesOut.push("  --radius-md: calc(var(--radius-card) - 2px);");
    linesOut.push("  --radius-lg: var(--radius-card);");
    linesOut.push("  --radius-xl: calc(var(--radius-card) + 4px);");
    linesOut.push("  --radius-2xl: calc(var(--radius-card) + 8px);");
    linesOut.push("  --radius-3xl: calc(var(--radius-card) + 12px);");
    linesOut.push("  --radius-4xl: calc(var(--radius-card) + 16px);");
    linesOut.push("  --text-title--font-weight: var(--font-weight-title);");
    linesOut.push("  --text-title--letter-spacing: var(--letter-spacing-title);");
    linesOut.push("  --text-section--font-weight: var(--font-weight-title);");
    linesOut.push("  --text-section--letter-spacing: var(--letter-spacing-title);");
    linesOut.push("  --text-hero--font-weight: var(--font-weight-title);");
    linesOut.push("  --text-hero--letter-spacing: var(--letter-spacing-title);");
    lines.push(`body.style-${look} {\n${linesOut.join("\n")}\n}`);
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

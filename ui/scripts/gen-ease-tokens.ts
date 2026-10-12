// EASE-OF-USE-01b. Generates the ease token block at the end of src/tokens.css
// from spec/ease/presets.json, the one record of what each ease preset sets.
// A preset changes only tokens: the shell sets data-ease-* attributes on <html>
// (text, spacing, targets, contrast, motion) and the blocks below answer them.
// Run: bun run gen:ease (from ui/). A parity test fails if the committed block
// and this output differ.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BEGIN = "/* EASE-GENERATED:BEGIN (ui/scripts/gen-ease-tokens.ts, from spec/ease/presets.json; do not edit) */";
export const END = "/* EASE-GENERATED:END */";

const FIXED_HUES = ["violet", "violet-deep", "teal", "orange", "pink", "red"];
/** Share of the muted text mix at `more` contrast; tokens.test proves it clears the ratio. */
export const MORE_CONTRAST_MIX = 80;
/** Visible rail icon box at standard targets; the 48 px floor comes from its hit area. */
const RAIL_BUTTON_STANDARD = 40;
const RAIL_PADDING = 16;

const UI = join(import.meta.dir, "..");
export const PRESETS_PATH = join(UI, "..", "spec", "ease", "presets.json");
export const TOKENS_PATH = join(UI, "src", "tokens.css");

type Presets = { values: {
  text_size: Record<string, { scale: number }>;
  spacing: Record<string, { scale: number }>;
  targets: Record<string, { min_px: number }>;
  contrast: Record<string, { ratio: number }>;
  motion: Record<string, { reduce_motion: boolean; muted_colors: boolean }>;
} };

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

export function stripBlock(css: string): string {
  const a = css.indexOf(BEGIN);
  if (a < 0) return css;
  const b = css.indexOf(END, a);
  return (css.slice(0, a) + css.slice(b + END.length)).replace(/\n+$/, "\n");
}

export function renderEaseBlock(presets: Presets, css: string): string {
  const base = stripBlock(css);
  const fonts = [...base.matchAll(/--font-size-(title|section|metric|body|supporting):\s*([\d.]+)px;/g)].map((m) => [m[1]!, Number(m[2])] as const);
  const hues = FIXED_HUES.map((h) => {
    const m = new RegExp(`--hue-${h}:\\s*(#[0-9a-fA-F]{6});`).exec(base);
    if (!m) throw new Error(`--hue-${h} not found in tokens.css`);
    return [h, m[1]!] as const;
  });
  const out: string[] = [BEGIN];
  const v = presets.values;

  out.push("/* Targets: --target-min is the smallest control size; the rail reads --rail-button and --rail-width. */");
  const standardMin = v.targets.standard!.min_px;
  out.push(`:root {\n  --target-min: ${px(standardMin)};\n  --rail-button: ${px(RAIL_BUTTON_STANDARD)};\n  --rail-width: ${px(RAIL_BUTTON_STANDARD + RAIL_PADDING)};\n}`);
  for (const [name, { min_px }] of Object.entries(v.targets)) {
    if (min_px <= standardMin) continue;
    out.push(`html[data-ease-targets="${name}"] {\n  --target-min: ${px(min_px)};\n  --rail-button: ${px(min_px)};\n  --rail-width: ${px(min_px + RAIL_PADDING)};\n}`);
    out.push(`html[data-ease-targets="${name}"] [data-slot="button"],\nhtml[data-ease-targets="${name}"] [data-slot="input"],\nhtml[data-ease-targets="${name}"] [data-slot="select-trigger"],\nhtml[data-ease-targets="${name}"] [data-slot="toggle"] {\n  min-height: var(--target-min);\n}`);
  }

  out.push("/* Text size: the root font size scales every rem utility; the px type tokens scale with it. */");
  for (const [name, { scale }] of Object.entries(v.text_size)) {
    const lines = [`  font-size: ${px(16 * scale)};`, ...fonts.map(([n, size]) => `  --font-size-${n}: ${px(size * scale)};`)];
    out.push(`html[data-ease-text="${name}"] {\n${lines.join("\n")}\n}`);
  }

  out.push("/* Spacing: Tailwind's spacing unit (0.25rem). */");
  for (const [name, { scale }] of Object.entries(v.spacing)) {
    if (scale === 1) continue;
    out.push(`html[data-ease-spacing="${name}"] {\n  --spacing: ${Math.round(0.25 * scale * 10000) / 10000}rem;\n}`);
  }

  out.push("/* Contrast: secondary text moves toward the page's strongest text color. */");
  for (const [name, { ratio }] of Object.entries(v.contrast)) {
    if (ratio <= 4.5) continue;
    out.push(`html[data-ease-contrast="${name}"] {\n  --muted-foreground: color-mix(in srgb, var(--background), var(--foreground) ${MORE_CONTRAST_MIX}%);\n}`);
  }

  out.push("/* Motion: calm mutes the accent hues and stops animation; the OS reduced-motion setting stops it too. */");
  const stop = (sel: string, i = "") => `${i}${sel} *,\n${i}${sel} *::before,\n${i}${sel} *::after {\n${i}  animation-duration: 0.001ms !important;\n${i}  animation-iteration-count: 1 !important;\n${i}  transition-duration: 0.001ms !important;\n${i}  scroll-behavior: auto !important;\n${i}}`;
  for (const [name, m] of Object.entries(v.motion)) {
    if (m.muted_colors) out.push(`html[data-ease-motion="${name}"] {\n${hues.map(([h, hex]) => `  --hue-${h}: color-mix(in srgb, ${hex} 65%, gray);`).join("\n")}\n}`);
    if (m.reduce_motion) out.push(stop(`html[data-ease-motion="${name}"]`));
  }
  out.push(`@media (prefers-reduced-motion: reduce) {\n${stop("html", "  ")}\n}`);
  out.push(END);
  return out.join("\n");
}

export function render(): string {
  const presets = JSON.parse(readFileSync(PRESETS_PATH, "utf8")) as Presets;
  const css = readFileSync(TOKENS_PATH, "utf8");
  return stripBlock(css).replace(/\n*$/, "\n\n") + renderEaseBlock(presets, css) + "\n";
}

if (import.meta.main) writeFileSync(TOKENS_PATH, render());

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// K06 (contrast sweep). Home runs an axe color-contrast gate at WCAG AA
// (4.5:1) and may not override kit parts, so any kit text drawn as
// `text-foreground/<n>` with a low `n` blocks every Home screen that
// renders it (number-ticker label at /35, timeline timestamps at /40 and
// /45). This lint reads the real surface and text tokens from tokens.css
// for both themes and fails any text opacity utility that does not clear
// 4.5:1 on every surface the kit paints. It is a regression guard in the
// same spirit as contrast.test.ts: the blend is a linear-RGB estimate,
// so a passing value carries a margin, and a new opacity still needs the
// real a11y matrix in Home.

const srcDir = resolve(import.meta.dir);
const css = readFileSync(join(srcDir, "tokens.css"), "utf8");
const MIN_RATIO = 4.5;
// Margin for the gap between this blend and the browser's oklab mix.
const MARGIN = 0.15;

function block(source: string, from: string, to?: string): string {
  const start = source.indexOf(from);
  const end = to ? source.indexOf(to, start) : source.length;
  return source.slice(start, end === -1 ? undefined : end);
}
const lightRoot = block(css, ":root {", "@media (max-width: 639px)");
const darkRoot = block(css, ".dark {");

function readVar(source: string, name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(source);
  if (!match) throw new Error(`${name} not found`);
  return match[1]!;
}
function luminance(hex: string): number {
  const ch = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
function blend(fg: string, bg: string, alpha: number): string {
  const c = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(c(fg, i) * alpha + c(bg, i) * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

type Family = "foreground" | "muted-foreground" | "sidebar-foreground" | "background";
const PAGE_SURFACES = ["--surface-page", "--surface-card", "--surface-pane", "--surface-sidebar"];

/** Every (text, surface) pair the family is drawn on, per theme. */
function pairs(family: Family): { theme: string; text: string; surface: string }[] {
  const out: { theme: string; text: string; surface: string }[] = [];
  for (const [theme, root] of [["light", lightRoot], ["dark", darkRoot]] as const) {
    if (family === "background") {
      // Inverted ink surfaces (TerminalBlock `ink`): light theme text-background on bg-foreground.
      // The dark theme paints those with explicit `dark:` overrides on real tokens.
      if (theme === "light") out.push({ theme, text: readVar(root, "--background"), surface: readVar(root, "--foreground") });
      continue;
    }
    if (family === "sidebar-foreground") {
      out.push({ theme, text: readVar(root, "--sidebar-foreground"), surface: readVar(root, "--sidebar") });
      continue;
    }
    const text = readVar(root, family === "foreground" ? "--foreground" : "--muted-foreground");
    for (const s of PAGE_SURFACES) out.push({ theme, text, surface: readVar(root, s) });
  }
  return out;
}

function worstRatio(family: Family, alpha: number): number {
  return Math.min(...pairs(family).map((p) => ratio(blend(p.text, p.surface, alpha), p.surface)));
}
function passes(family: Family, percent: number): boolean {
  return percent >= 100 || worstRatio(family, percent / 100) >= MIN_RATIO + MARGIN;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

// Exempt by shape: the utility sits on an icon element (an icon is never the
// only carrier of information in these parts: the label or aria-label beside
// it carries the meaning, and non-text contrast is judged separately).
const ICON_ELEMENT = /<(?:[A-Za-z0-9]*Icon|Icon|FileText)\b/;

// Exempt by reason, matched on file plus a distinctive substring of the line.
const ALLOWLIST: { file: string; snippet: string; reason: string }[] = [
  { file: "elements/tool-group.tsx", snippet: `"text-foreground/25 size-3 shrink-0 transition-transform`, reason: "expand chevron icon; the row label carries the meaning" },
  { file: "elements/mcp-server-panel.tsx", snippet: `"text-foreground/25 size-3 shrink-0 transition-transform`, reason: "expand chevron icon; the row label carries the meaning" },
  { file: "elements/task-card.tsx", snippet: `"text-foreground/25 size-3 shrink-0 transition-transform`, reason: "expand chevron icon; the row label carries the meaning" },
  { file: "elements/agent-handoff.tsx", snippet: `settled ? "text-foreground/25"`, reason: "arrow icon of a settled handoff; the carried-over label beside it is real text" },
  { file: "elements/option-list.tsx", snippet: `className="text-foreground/45 size-3.5"`, reason: "check icon beside a sr-only selected label" },
  { file: "elements/option-list.tsx", snippet: `option.disabled && "text-foreground/35"`, reason: "disabled option row (WCAG exempts inactive controls)" },
  { file: "elements/quote.aui.tsx", snippet: `"text-muted-foreground/60 mt-0.5 size-3 shrink-0"`, reason: "decorative quote glyph icon" },
  { file: "elements/terminal-block.tsx", snippet: `"text-background/35 dark:text-muted-foreground"`, reason: "running spinner icon on the ink surface; the command text beside it carries the state" },
  { file: "elements/composer.tsx", snippet: `text-foreground/30 dark:bg-foreground/[0.09]`, reason: "send button while the composer is idle and empty (disabled state)" },
];

type Hit = { file: string; line: number; text: string; family: Family; percent: number };

function collect(): Hit[] {
  const hits: Hit[] = [];
  const roots = ["elements", "ui", "assistant-ui", "dashboard"].map((d) => join(srcDir, d));
  for (const root of roots) {
    for (const file of sourceFiles(root)) {
      const rel = relative(srcDir, file);
      readFileSync(file, "utf8").split("\n").forEach((text, i) => {
        const trimmed = text.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        for (const m of text.matchAll(/(?<![\w-])text-(foreground|muted-foreground|sidebar-foreground|background)\/(\d+)(?![\d[])/g)) {
          hits.push({ file: rel, line: i + 1, text, family: m[1] as Family, percent: Number(m[2]) });
        }
      });
    }
  }
  return hits;
}

describe("text opacity utilities clear WCAG AA on the kit's surfaces (both themes)", () => {
  test("the check itself separates the known failing and passing values", () => {
    expect(passes("foreground", 35)).toBe(false);
    expect(passes("foreground", 45)).toBe(false);
    expect(passes("foreground", 60)).toBe(false);
    expect(passes("foreground", 65)).toBe(true);
    expect(passes("foreground", 70)).toBe(true);
    expect(passes("muted-foreground", 60)).toBe(false);
    expect(passes("muted-foreground", 100)).toBe(true);
  });

  test("no kit text uses a foreground opacity that fails 4.5:1, outside the reasoned allowlist", () => {
    const failures: string[] = [];
    for (const hit of collect()) {
      if (hit.percent === 0) continue; // fully transparent until hover (DaySeparator timestamp), not shown text
      if (ICON_ELEMENT.test(hit.text)) continue;
      if (ALLOWLIST.some((a) => a.file === hit.file && hit.text.includes(a.snippet))) continue;
      if (passes(hit.family, hit.percent)) continue;
      failures.push(`${hit.file}:${hit.line} text-${hit.family}/${hit.percent} is ${worstRatio(hit.family, hit.percent / 100).toFixed(2)}:1 at worst; use text-muted-foreground`);
    }
    expect(failures).toEqual([]);
  });

  test("every allowlist entry still matches a real line (no stale exemptions)", () => {
    const hits = collect();
    for (const entry of ALLOWLIST) {
      expect(hits.some((h) => h.file === entry.file && h.text.includes(entry.snippet))).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });
});

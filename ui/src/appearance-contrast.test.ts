import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const globals = readFileSync(new URL("./dashboard/css/globals.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const LOOKS = ["neutral", "stone", "zinc", "mauve", "olive", "mist", "taupe", "navy"] as const;
const ACCENTS = ["blue", "violet", "teal", "orange", "pink", "red"] as const;

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

function declarations(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "m"))?.[1];
  if (!body) throw new Error(`Missing selector ${selector}`);
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]));
}

describe("appearance token contrast", () => {
  test.each([...ACCENTS])("%s profile accent clears 4.5:1 against light and dark cards", (accent) => {
    const colors = [...tokens.matchAll(new RegExp(`--profile-accent-${accent}:\\s*(#[0-9a-fA-F]{6});`, "g"))].map((match) => match[1]!);
    expect(colors).toHaveLength(3);
    expect(contrast(colors[0]!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    for (const darkColor of colors.slice(1)) expect(contrast(darkColor, "#102238")).toBeGreaterThanOrEqual(4.5);
  });

  test("each look changes the primary token and keeps its foreground readable", () => {
    const light = LOOKS.map((look) => declarations(globals, `.style-${look}`));
    const dark = LOOKS.map((look) => declarations(globals, `.dark .style-${look}`));
    expect(new Set(light.map((theme) => theme["primary"])).size).toBe(LOOKS.length);
    expect(new Set(dark.map((theme) => theme["primary"])).size).toBe(LOOKS.length);
    for (const theme of light) expect(contrast(theme["primary"]!, theme["primary-foreground"]!)).toBeGreaterThanOrEqual(4.5);
    for (const theme of dark) expect(contrast(theme["primary"]!, theme["primary-foreground"]!)).toBeGreaterThanOrEqual(4.5);
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// WEATHER-CARD-01: the weather card's hero text is white (--weather-ink) over a gradient, a scrim and the
// sky effects. Worst case for the text: the lightest effect (a cloud or the sun glow at 22% white) over the
// gradient stop, then the scrim over both. Every stop, in the light root and both dark blocks, must keep
// 4.5:1 for the ink against that.
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const KINDS = ["clear", "partly-cloudy", "overcast", "fog", "drizzle", "rain", "snow", "thunderstorm"];
const TIMES = ["day", "night"];
const EFFECT_WHITE = 0.22;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb;
function luminance([r, g, b]: Rgb) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
}
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => v * (1 - t) + b[i]! * t) as Rgb;

const scrim = /--weather-scrim:\s*rgb\(0 0 0 \/ ([0-9.]+)\)/.exec(tokens);
const ink = /--weather-ink:\s*(#[0-9a-fA-F]{6})/.exec(tokens);

describe("weather card contrast", () => {
  test("the ink and scrim tokens exist", () => {
    expect(ink).not.toBeNull();
    expect(scrim).not.toBeNull();
  });

  for (const kind of KINDS) {
    for (const time of TIMES) {
      for (const edge of ["from", "to"]) {
        test(`${kind}-${time}-${edge}: defined for light, system dark and .dark, and keeps 4.5:1`, () => {
          const values = [...tokens.matchAll(new RegExp(`--weather-${kind}-${time}-${edge}:\\s*(#[0-9a-fA-F]{6});`, "g"))].map((m) => m[1]!);
          expect(values).toHaveLength(3);
          for (const value of values) {
            const lit = mix(rgb(value), [255, 255, 255], EFFECT_WHITE);
            const shaded = mix(lit, [0, 0, 0], Number(scrim![1]));
            expect(contrast(rgb(ink![1]!), shaded), `${value}`).toBeGreaterThanOrEqual(4.5);
            // Halfway down the gradient is never lighter than its lighter end, so the stops cover the span.
          }
        });
      }
    }
  }

  test("every dark stop is no lighter than its light stop", () => {
    for (const kind of KINDS)
      for (const time of TIMES)
        for (const edge of ["from", "to"]) {
          const [light, ...dark] = [...tokens.matchAll(new RegExp(`--weather-${kind}-${time}-${edge}:\\s*(#[0-9a-fA-F]{6});`, "g"))].map((m) => luminance(rgb(m[1]!)));
          for (const d of dark) expect(d!).toBeLessThanOrEqual(light!);
        }
  });
});

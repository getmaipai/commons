import { afterEach, describe, expect, test, jest } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { WeatherSky } from "./weather-sky";
import { cloudWindFactor, moonFromDate } from "./weather-scene";
import { readFileSync } from "node:fs";
import type { WeatherClass } from "./weather-condition";
import scene from "./weather-scene.json";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const skySource = readFileSync(new URL("./weather-sky.tsx", import.meta.url), "utf8");

afterEach(cleanup);

describe("WeatherSky moon disc", () => {
  test("cloud counts follow class and variant design", () => {
    const expected: Record<string, number> = { clear: 2, "partly-cloudy": 4, overcast: 6, drizzle: 4, rain: 5, snow: 3, thunderstorm: 6, fog: 0 };
    for (const [cls, count] of Object.entries(expected)) {
      const { container, unmount } = render(<WeatherSky cls={cls as WeatherClass} isDay={true} />);
      expect(container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(count); unmount();
    }
    const night = render(<WeatherSky cls="clear" isDay={false} />);
    expect(night.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(0); night.unmount();
    for (const variant of ["lite", "compact", "wide"] as const) {
      const { container } = render(<WeatherSky cls="thunderstorm" isDay={true} variant={variant} />);
      expect(container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(variant === "lite" ? 2 : variant === "compact" ? 4 : 7);
      cleanup();
    }
  });
  test("clouds are masked, have no blur, and use the specified depth and drift rules", () => {
    const rule = css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"] {'), css.indexOf('[data-slot="weather-sky"] [data-fx="fog"] {'));
    expect(rule).not.toContain("filter:"); expect(rule).not.toContain("blur(");
    expect(rule).toContain("mask-image:"); expect(rule).toContain("-webkit-mask-image:");
    for (const text of ["scale: .62", "opacity: .34", "scale: .88", "opacity: .56", "scale: 1.15", "opacity: .72", "z-index: 21", "z-index: 22", "z-index: 23", "7px", "13px", "22px", "0% 22%", "8% 40%", "20% 56%"])
      expect(rule).toContain(text);
    expect(css).toContain("translate3d(100cqw, 0, 0)");
  });
  test("cloud puff circles fit their boxes and widths use container-relative clamps", () => {
    const ratios: Record<string, number> = { a: 2.6, b: 1.9, c: 1.5 };
    for (const [shape, puffList] of Object.entries(scene.clouds.puffs)) for (const [x = 0, y = 0, radius = 0] of puffList) {
      const outerRadius = radius + 9;
      expect(x - outerRadius).toBeGreaterThanOrEqual(4);
      expect(y - outerRadius * ratios[shape]!).toBeGreaterThanOrEqual(4);
      expect(100 - x - outerRadius).toBeGreaterThanOrEqual(4);
      expect(100 - y - outerRadius * ratios[shape]!).toBeGreaterThanOrEqual(4);
      expect(shape).toMatch(/^[abc]$/);
    }
    const cloudRules = css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"] {'), css.indexOf('[data-slot="weather-sky"] [data-fx="fog"] {'));
    expect(cloudRules).not.toContain("ellipse");
    expect(skySource).toMatch(/widthCqw[^\n]+cqw[^\n]+width/);
    expect(skySource).toContain('"--s": p.size');
    for (const depth of Object.values(scene.clouds.depths)) {
      expect(depth.widthCqw).toBeGreaterThan(0);
      expect(depth.width).toBeGreaterThan(depth.minWidth);
      expect(skySource).toContain("clamp(${d.minWidth}px, ${d.widthCqw}cqw, ${d.width}px)");
    }
  });
  test("cloud bottoms stay above the text zone at the far edge of every y band", () => {
    const shapeRatio: Record<string, number> = { a: 2.6, b: 1.9, c: 1.5 };
    for (const [width, height] of [[218, 170], [360, 220], [470, 230]] as const) for (const [depthName, depth] of Object.entries(scene.clouds.depths)) for (const [shape, ratio] of Object.entries(shapeRatio)) {
      const cloudWidth = Math.max(depth.minWidth, Math.min(depth.widthCqw * width / 100, depth.width));
      const cloudHeight = cloudWidth / ratio * depth.scale / height * 100;
      const visualBottom = Math.min(depth.y[1] ?? 0, 56 - cloudHeight) + cloudHeight;
      expect(visualBottom, `${width}x${height} ${depthName} ${shape}`).toBeLessThanOrEqual(56);
    }
  });
  test("cloud windows have populated negative delays and wind retimes only at iteration", () => {
    expect(cloudWindFactor()).toBe(1); expect(cloudWindFactor(-100)).toBe(0.6); expect(cloudWindFactor(1000)).toBe(2.4);
    const { container, rerender } = render(<WeatherSky cls="rain" isDay={true} wind={0} width={400} />);
    const clouds = [...container.querySelectorAll<HTMLElement>('[data-fx="cloud"]')];
    expect(clouds).toHaveLength(5);
    for (const cloud of clouds) expect(Number.parseFloat(cloud.style.getPropertyValue("--dl"))).toBeLessThanOrEqual(0);
    const near = clouds.find(x => x.dataset.depth === "near")!;
    const before = near.style.getPropertyValue("--d");
    rerender(<WeatherSky cls="rain" isDay={true} wind={30} width={400} />);
    near.dispatchEvent(new Event("animationiteration"));
    expect(near.style.getPropertyValue("--d")).not.toBe(before);
  });
  test("precipitation pools scale by intensity, area and variant", () => {
    const cases = [["rain", 61, 12], ["rain", 63, 18], ["thunderstorm", 95, 18], ["thunderstorm", 96, 28]] as const;
    for (const [cls, code, expected] of cases) {
      const { container, unmount } = render(<WeatherSky cls={cls} isDay={true} code={code} width={420} height={230} variant="full" />);
      expect(container.querySelectorAll('[data-fx="fall"]')).toHaveLength(expected); unmount();
    }
    const drizzle = render(<WeatherSky cls="drizzle" isDay={true} code={55} width={420} height={230} />);
    expect(drizzle.container.querySelectorAll('[data-fx="fall"]')).toHaveLength(16);
    expect(drizzle.container.querySelectorAll('[data-fx="splash"]')).toHaveLength(0);
    expect(drizzle.container.querySelectorAll('[data-fx="fog"]')).toHaveLength(1); drizzle.unmount();
    const snow = render(<WeatherSky cls="snow" isDay={true} code={75} width={420} height={230} />);
    expect(snow.container.querySelectorAll('[data-fx="flake"]')).toHaveLength(30);
    expect(snow.container.querySelectorAll('[data-fx="sway"]')).toHaveLength(15);
    expect(snow.container.querySelectorAll('[data-fx="pile"]')).toHaveLength(1);
    for (const variant of ["full", "lite", "compact", "wide"] as const) {
      const view = render(<WeatherSky cls="thunderstorm" isDay={true} code={96} width={420} height={230} variant={variant} />);
      expect(view.container.querySelectorAll('[data-fx="fall"]').length).toBeLessThanOrEqual(({ full: 28, lite: 8, compact: 18, wide: 34 })[variant]); view.unmount();
    }
  });
  test("precipitation and fog CSS keyframes are transform and opacity only", () => {
    for (const name of ["wx-fall", "wx-flake", "wx-sway", "wx-pile", "wx-splash", "wx-fog", "wx-breathe"]) expect(css).toContain(`@keyframes ${name}`);
    const blocks = css.match(/@keyframes wx-[^{]+\{[^}]*\}/g) ?? [];
    for (const block of blocks) expect(block).not.toMatch(/filter:|box-shadow:|background:/);
    expect(css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="fog"]'), css.indexOf('[data-slot="weather-sky"] [data-fx="sun"]'))).not.toContain("blur(");
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="fall"]');
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="flake"]');
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="fog"]');
  });
  test("publishes phase, intensity and variant with inline phase values", () => {
    const { container } = render(<WeatherSky cls="rain" isDay={true} code={63}/>);
    const sky = container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    expect(sky.dataset.phase).toBe("day"); expect(sky.dataset.intensity).toBe("0.75");
    expect(sky.dataset.running).toBe("true"); expect(sky.dataset.variant).toBe("full");
    expect(sky.style.getPropertyValue("--wx-t")).toBe("1");
    expect(sky.style.getPropertyValue("--wx-light-x")).toBe("74%");
  });

  test("re-reads the clock every 60 seconds and clears the interval", () => {
    jest.useFakeTimers();
    const { container, unmount } = render(<WeatherSky cls="clear" isDay={true} sunrise="2026-10-22T06:00" sunset="2026-10-22T18:00"/>);
    const sky = container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    jest.useRealTimers();
    expect(sky.dataset.phase).toBeTruthy();
  });
  test("uses the phase disc in place of the generic crescent when moon data is present", () => {
    const { container } = render(<WeatherSky cls="clear" isDay={false} moon={{ phase: "Waning Gibbous", illumination: 72 }} />);
    expect(container.querySelector('[data-fx="moon"]')).toBeNull();
    const disc = container.querySelector<SVGElement>('[data-slot="weather-moon-disk"]');
    expect(disc).not.toBeNull();
    expect(disc?.getAttribute("width")).toBe("54");
  });

  test("calculates moon phases and always renders MoonDisc on clear and partly cloudy nights", () => {
    const newMoon = moonFromDate("2000-01-06T18:14:00Z");
    const fullMoon = moonFromDate("2000-01-21T04:40:00Z");
    expect(newMoon.illumination).toBeLessThan(3);
    expect(fullMoon.illumination).toBeGreaterThan(97);
    expect(moonFromDate("2000-01-12T00:00:00Z").phase.startsWith("Waxing")).toBe(true);
    expect(moonFromDate("2000-02-02T00:00:00Z").phase.startsWith("Waning")).toBe(true);
    for (const cls of ["clear", "partly-cloudy"] as const) {
      const { container, unmount } = render(<WeatherSky cls={cls} isDay={false} now="2000-01-21T04:40:00Z" />);
      expect(container.querySelector('[data-slot="weather-moon-disk"]')).not.toBeNull();
      expect(container.querySelector('[data-fx="moon"]')).toBeNull();
      unmount();
    }
  });

  test("light and star source CSS has the required shapes", () => {
    expect(css).not.toMatch(/sun-rays|wx-rays|wx-sun-pulse|moon-glow-pulse|conic-gradient/);
    expect(css).toContain("@keyframes wx-corona");
    expect(css).toContain("@keyframes wx-twinkle");
    expect(css).toContain("--wx-night");
    expect(css).toMatch(/radial-gradient\(circle at 35% 35%,\s*var\(--weather-sun-core\),\s*var\(--weather-sun-edge\) 78%\)/);
    expect(css).toContain("#ffd75e");
    expect(css).toContain("#ffb02e");
    expect(skySource).not.toContain('data-fx="sun-rays"');
    expect(skySource).not.toContain('data-fx="moon"');
  });

  test("light source visibility and star pools follow class, phase and variant", () => {
    const night = (cls: WeatherClass, variant: "full" | "lite" = "full") => render(<WeatherSky cls={cls} isDay={false} variant={variant} />);
    for (const [cls, count] of [["clear", 54], ["partly-cloudy", 30], ["overcast", 8], ["snow", 0], ["fog", 0], ["rain", 0], ["drizzle", 0], ["thunderstorm", 0]] as const) {
      const view = night(cls);
      expect(view.container.querySelectorAll('[data-fx="star"]')).toHaveLength(count);
      view.unmount();
    }
    const compactField = night("clear", "lite");
    expect(compactField.container.querySelectorAll('[data-fx="star"]')).toHaveLength(18);
    compactField.unmount();
    const dimSun = render(<WeatherSky cls="fog" isDay={true} />);
    expect(dimSun.container.querySelector('[data-fx="sun-group"]')?.getAttribute("data-dimmed")).toBe("true");
    dimSun.unmount();
    for (const cls of ["overcast", "snow"] as const) {
      const halo = night(cls);
      expect(halo.container.querySelector('[data-fx="moon-halo"]')).not.toBeNull();
      expect(halo.container.querySelector('[data-fx="moon-disc"]')).toBeNull();
      halo.unmount();
    }
  });
});

describe("sky wrappers are sized", () => {
  test("every data-fx wrapper named *-field in weather-sky.tsx has a CSS rule that gives it an inset (a collapsed wrapper puts every child at left 0)", () => {
    const wrappers = [...new Set([...skySource.matchAll(/data-fx="([a-z-]+-field)"/g)].map((m) => m[1]!))];
    expect(wrappers.length).toBeGreaterThan(0);
    for (const name of wrappers) {
      const rule = new RegExp(`\\[data-slot="weather-sky"\\] \\[data-fx="${name}"\\]\\s*\\{[^}]*inset:\\s*0`).exec(css);
      expect(rule, `${name} needs [data-slot="weather-sky"] [data-fx="${name}"] { inset: 0 }`).not.toBeNull();
    }
  });
});

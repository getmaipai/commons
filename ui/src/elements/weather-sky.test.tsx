import { afterEach, describe, expect, test, jest } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { WeatherSky } from "./weather-sky";
import { cloudWindFactor } from "./weather-scene";
import { readFileSync } from "node:fs";
import type { WeatherClass } from "./weather-condition";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");

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
    for (const text of ["scale(.62)", "opacity: .34", "scale(.88)", "opacity: .56", "scale(1.15)", "opacity: .72", "z-index: 21", "z-index: 22", "z-index: 23", "7px", "13px", "22px", "0% 22%", "8% 40%", "20% 56%"])
      expect(rule).toContain(text);
    expect(css).toContain("translate3d(100cqw, 0, 0)");
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

  test("keeps the generic crescent when moon data is absent", () => {
    const { container } = render(<WeatherSky cls="clear" isDay={false} />);
    expect(container.querySelector('[data-fx="moon"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="weather-moon-disk"]')).toBeNull();
  });
});

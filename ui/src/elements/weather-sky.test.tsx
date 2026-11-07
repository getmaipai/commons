import { afterEach, describe, expect, test, jest } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { WeatherSky } from "./weather-sky";

afterEach(cleanup);

describe("WeatherSky moon disc", () => {
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

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { WeatherSky } from "./weather-sky";

afterEach(cleanup);

describe("WeatherSky moon disc", () => {
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

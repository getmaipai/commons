// WEATHER-SKY-01: on a wide screen the detail sky (clouds, sun, stars) covers one screen at the top of the page, not the whole scrolling page,
// so the clouds and the sun sit behind the hero instead of hundreds of pixels down behind the tiles.
import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { WeatherForecastPage } from "./weather-forecast-page";

afterEach(cleanup);

const locations = [{
  id: "home", city: "Springfield", isMyLocation: true, localTime: "9:41 AM",
  detail: { temp: 68, condition: "Partly cloudy", code: 2, isDay: true, high: 72, low: 54,
    hourly: [{ time: "2026-10-22T10:00", temp: 69, pop: 25, windSpeed: 8 }],
    daily: [{ date: "2026-10-22", high: 72, low: 54, code: 2 }], wind: { speed: 8, direction: 180 } },
}];

test("the detail sky layer is one screen tall at the top on wide screens, and still fixed on phones", () => {
  const { container } = render(<WeatherForecastPage locations={locations} selectedId="home" />);
  const layer = container.querySelector<HTMLElement>('[data-weather-layer="detail-sky"]')!;
  expect(layer.className).toContain("fixed");
  expect(layer.className).toContain("lg:absolute");
  expect(layer.className).toContain("lg:h-[100svh]");
  expect(layer.className).toContain("lg:bottom-auto");
});

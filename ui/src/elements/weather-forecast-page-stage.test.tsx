// WEATHER-PANE-01: the detail sky of the Weather page places its sun, moon and clouds in the top stage.
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

test("the detail sky uses the top stage and the location cards do not", () => {
  const { container } = render(<WeatherForecastPage locations={locations} selectedId="home" />);
  const detail = container.querySelector('[data-weather-layer="detail-sky"] [data-slot="weather-sky"]')!;
  expect(detail.getAttribute("data-stage")).toBe("top");
  const card = container.querySelector('[data-slot="weather-location"] [data-slot="weather-sky"]')!;
  expect(card.hasAttribute("data-stage")).toBe(false);
});

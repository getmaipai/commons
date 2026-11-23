import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { WeatherForecastPage } from "./weather-forecast-page";

afterEach(cleanup);

const hourly = [
  { time: "2026-10-22T10:00", temp: 69, pop: 25, windSpeed: 8 },
  { time: "2026-10-22T11:00", temp: 71, pop: 40, windSpeed: 11 },
  { time: "2026-10-22T12:00", temp: 74, pop: 0, windSpeed: 5 },
  { time: "2026-10-22T13:00", temp: 70, pop: 60, windSpeed: 14 },
];
const locations = [{
  id: "home", city: "Springfield", isMyLocation: true, localTime: "9:41 AM",
  detail: { temp: 68, condition: "Partly cloudy", code: 2, isDay: true, high: 72, low: 54, hourly,
    daily: [{ date: "2026-10-22", high: 72, low: 54, code: 2 }], wind: { speed: 8, direction: 180 } },
}];

function values(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-slot="weather-chart-value"]')).map((node) => node.textContent);
}

describe("hourly chart value labels", () => {
  test("every temperature bar shows its value", () => {
    const { container } = render(<WeatherForecastPage locations={locations} selectedId="home" />);
    expect(container.querySelectorAll('[data-slot="weather-chart-bar"]')).toHaveLength(4);
    expect(values(container)).toEqual(["69°", "71°", "74°", "70°"]);
  });

  test("the precipitation and wind metrics label their bars too", () => {
    const { container } = render(<WeatherForecastPage locations={locations} selectedId="home" />);
    const switcher = container.querySelector<HTMLElement>('[data-slot="weather-condition-switcher"]')!;
    fireEvent.click(within(switcher).getByRole("button", { name: "Precipitation" }));
    expect(values(container)).toEqual(["25%", "40%", "0%", "60%"]);
    fireEvent.click(within(switcher).getByRole("button", { name: "Wind" }));
    expect(values(container)).toEqual(["8", "11", "5", "14"]);
  });

  test("the value labels are hidden from the accessibility tree (the bar already has the value in its label)", () => {
    const { container } = render(<WeatherForecastPage locations={locations} selectedId="home" />);
    for (const node of Array.from(container.querySelectorAll('[data-slot="weather-chart-value"]'))) expect(node.getAttribute("aria-hidden")).toBe("true");
  });
});

import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { WeatherForecastPage, dedupeLocations, formatLocalTime, rangeBarMetrics } from "./weather-forecast-page";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const tokens = readFileSync(resolve(import.meta.dir, "../tokens.css"), "utf8");

afterEach(cleanup);

const locations = [{
  id: "home", city: "Springfield", isMyLocation: true, localTime: "9:41 AM",
  detail: { temp: 68, condition: "Partly cloudy", code: 2, isDay: true, high: 72, low: 54,
    hourly: [{ time: "2026-10-22T10:00", temp: 69 }],
    daily: [{ date: "2026-10-22", high: 72, low: 54, code: 2 }],
    wind: { speed: 8, direction: 180 }, humidity: 52, sunrise: "6:42 AM", sunset: "6:11 PM" },
}];

describe("WeatherForecastPage", () => {
  test("renders sorted location cards, sky hero and only supplied tiles", () => {
    const { container, getByText } = render(<WeatherForecastPage locations={locations} selectedId="home"/>);
    expect(container.querySelector('[data-slot="weather-location"]')?.textContent).toContain("My Location");
    expect(container.querySelector('[data-slot="weather-forecast-hero"]')?.textContent).toContain("Springfield");
    expect(getByText("Wind", { selector: "span" })).toBeTruthy();
    expect(getByText("Humidity")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="weather-tile"]')).toHaveLength(6);
    expect(container.querySelector('[data-slot="weather-forecast-hero"]')?.getAttribute("style")).toContain("--weather-partly-cloudy-day-from");
  });

  test("deduplicates by id and rounded coordinates while keeping My Location first", () => {
    const items = [
      { id: "city", city: "A", latitude: 40.71281, longitude: -74.00591 },
      { id: "duplicate-id", city: "B", latitude: 41, longitude: -73 },
      { id: "duplicate-coord", city: "C", latitude: 40.72, longitude: -74.02, isMyLocation: true },
    ];
    expect(dedupeLocations(items).map((x) => x.id)).toEqual(["duplicate-coord", "city", "duplicate-id"]);
  });

  test("range bars map lows, highs, and the current dot to the shared scale", () => {
    expect(rangeBarMetrics(20, 40, 10, 50, 30)).toEqual({ left: 25, width: 50, dot: 50 });
  });

  test("formats local time without exposing an ISO timestamp", () => {
    expect(formatLocalTime("2026-10-22T13:05:00Z", "America/New_York", "en-US")).toBe("9:05 AM");
    expect(formatLocalTime("2026-10-22T06:42", undefined, "en-US")).toBe("6:42 AM");
  });

  test("location cards share a fixed height, omit absent tiles, and use shared sky scene", () => {
    const small = [{ id: "one", city: "One", detail: { temp: 40, condition: "Rain", code: 61, isDay: false } }];
    const { container } = render(<WeatherForecastPage locations={[...small, { id: "two", city: "Two" }]} selectedId="one"/>);
    const cards = container.querySelectorAll<HTMLElement>("[data-slot=weather-location-sky]");
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(card.className).toContain("h-40");
    expect(container.querySelectorAll("[data-slot=weather-tile]")).toHaveLength(0);
    expect(container.querySelector("[data-slot=weather-sky]")).not.toBeNull();
  });

  test("location header structurally separates a shrinkable long city from fixed time and remove target", () => {
    const long = { id: "long", city: "San Bernardino Valley, California", localTime: "2:19 PM", detail: { temp: 80, condition: "Clear", code: 0, isDay: true } };
    const { container } = render(<WeatherForecastPage locations={[long]} onRemoveLocation={() => {}} />);
    const name = container.querySelector("[data-slot=weather-location-name]")!;
    const actions = container.querySelector("[data-slot=weather-location-actions]")!;
    expect(name.className).toContain("min-w-0");
    expect(actions.className).toContain("shrink-0");
    expect(actions.querySelector("[data-slot=weather-location-time]")?.className).toContain("shrink");
    expect(container.querySelector("[aria-label^=\"Remove location\"]")?.className).toContain("size-11");
    expect(name.parentElement).not.toBe(actions);
  });

  test("data-backed tiles appear only with fields and the Conditions switcher changes chart data", () => {
    const detail = { ...locations[0]!.detail!, airQuality: { aqi: 22, category: "Good" }, uvIndex: 3, feelsLike: 70, dewPoint: 50,
      precipitationNext24h: 0.2, visibility: 9, visibilityDescription: "Clear", pressure: 1012, pressureTrend: "falling" as const,
      moon: { phase: "First Quarter", illumination: 50 }, hourly: [{ time: "2026-10-22T10:00", temp: 69, pop: 25, windSpeed: 8 }] };
    const { container, getByRole, getByText } = render(<WeatherForecastPage locations={[{ ...locations[0]!, detail }]} selectedId="home" />);
    for (const title of ["Air Quality", "UV Index", "Sunrise & Sunset", "Feels Like", "Humidity", "Visibility", "Pressure", "Moon Phase", "Conditions"]) expect(getByText(title)).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=weather-tile] span")).not.toHaveLength(0);
    expect(getByText("Wind", { selector: "span" })).toBeTruthy();
    expect(container.querySelector("[data-slot=weather-aqi-bar]")).not.toBeNull();
    expect(container.querySelector("[data-slot=weather-wind-dial]")).not.toBeNull();
    expect(container.querySelector("[data-slot=weather-moon-disk]")?.textContent).toBe("");
    const precipitationButton = getByRole("button", { name: "Precipitation" });
    fireEvent.click(precipitationButton);
    expect(container.querySelector("[data-slot=weather-hourly-chart]")?.getAttribute("data-metric")).toBe("precipitation");
    cleanup();
    const empty = render(<WeatherForecastPage locations={[{ id: "bare", city: "Bare", detail: { temp: 60, condition: "Clear", code: 0, isDay: true } }]} />);
    for (const title of ["Air Quality", "UV Index", "Sunrise & Sunset", "Feels Like", "Humidity", "Visibility", "Pressure", "Moon Phase", "Conditions"]) expect(empty.queryByText(title)).toBeNull();
    expect(empty.container.querySelector("[data-slot=weather-tile]")).toBeNull();
  });

  test("the sky CSS defines visible scene keyframes and freezes them for reduced motion", () => {
    expect(tokens).toContain("@keyframes wx-sun-pulse");
    expect(tokens).toContain("animation-duration: 4s");
    expect(tokens).toContain("@keyframes wx-twinkle");
    expect(tokens).toContain("@keyframes wx-rain");
    expect(tokens).toContain("@keyframes wx-snow");
    expect(tokens).toContain("@keyframes wx-flash");
    expect(tokens).toContain("@keyframes wx-fog");
    expect(tokens).toContain("@media (prefers-reduced-motion: reduce)");
    expect(tokens).toContain("animation: none !important");
  });

  test("searches and opens then closes the mobile detail", () => {
    const onSearch = mock(() => {}); const onSelect = mock(() => {});
    const { container, getByLabelText, getByRole } = render(<WeatherForecastPage locations={locations} selectedId="home" onSearch={onSearch} onSelect={onSelect}/>);
    fireEvent.change(getByLabelText("Search locations"), { target: { value: "Spring" } });
    expect(onSearch).toHaveBeenCalledWith("Spring");
    fireEvent.click(container.querySelector('[data-slot="weather-location"]')!);
    expect(onSelect).toHaveBeenCalledWith("home");
    expect(container.querySelector('[data-slot="weather-location-detail"]')?.className).not.toContain("hidden");
    fireEvent.click(getByRole("button", { name: /Locations/ }));
    expect(onSelect).toHaveBeenLastCalledWith("");
  });
});

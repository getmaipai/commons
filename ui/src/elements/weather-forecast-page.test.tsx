import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { WeatherForecastPage, dedupeLocations, formatLocalTime, rangeBarMetrics } from "./weather-forecast-page";

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
    expect(getByText("Wind")).toBeTruthy();
    expect(getByText("Humidity")).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="weather-tile"]')).toHaveLength(5);
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

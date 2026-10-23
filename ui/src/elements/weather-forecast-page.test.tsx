import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { WeatherForecastPage } from "./weather-forecast-page";

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

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

  test("location header structurally separates a truncated name, fixed time and always-visible remove target", () => {
    const long = { id: "long", city: "San Bernardino Valley, California", localTime: "2:19 PM", detail: { temp: 80, condition: "Clear", code: 0, isDay: true } };
    const { container } = render(<WeatherForecastPage locations={[long]} onRemoveLocation={() => {}} />);
    const name = container.querySelector("[data-slot=weather-location-name]")!;
    const actions = container.querySelector("[data-slot=weather-location-actions]")!;
    expect(name.className).toContain("min-w-0");
    expect(name.className).toContain("truncate");
    expect(actions.className).toContain("shrink-0");
    expect(actions.querySelector("[data-slot=weather-location-time]")?.className).toContain("shrink-0");
    const remove = container.querySelector<HTMLElement>("[aria-label^=\"Remove location\"]");
    expect(remove?.className).toContain("weather-remove-hit");
    expect(remove?.querySelector(".weather-remove-chip")).not.toBeNull();
    expect(name.parentElement).not.toBe(actions);
  });

  test("detail grid uses content-sized rows and hourly card is not stretched", () => {
    const { container } = render(<WeatherForecastPage locations={locations} selectedId="home"/>);
    const grid = container.querySelector<HTMLElement>("[data-slot=weather-detail-grid]")!;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]");
    expect(grid.className).toContain("min-w-0");
    expect(grid.className).toContain("w-full");
    expect(grid.className).toContain("repeat(auto-fill,minmax(220px,1fr))");
    expect(grid.className).toContain("minmax(160px,auto)");
    expect(grid.className).not.toContain("auto-rows-fr");
    const hourly = container.querySelector<HTMLElement>("[data-slot=weather-hourly-strip]")?.closest("[data-slot=weather-tile]");
    expect(hourly?.className).toContain("h-auto");
    expect(hourly?.className).toContain("min-h-0");
    expect(hourly?.className).toContain("min-w-0");
    expect(hourly?.className).toContain("w-full");
    expect(container.querySelector<HTMLElement>("[data-slot=weather-hourly-strip]")?.className).toContain("overflow-x-auto");
    expect(container.querySelector<HTMLElement>("[data-slot=weather-daily-list] li")?.className).toContain("grid-cols-[3rem_2rem_2.4rem_minmax(0,1fr)_2.4rem]");
    expect([...container.querySelectorAll<HTMLElement>("[data-slot=weather-tile]")].every(tile => tile.className.includes("min-w-0") && tile.className.includes("w-full"))).toBe(true);
    expect(hourly?.className).not.toMatch(/(?:^|\s)h-(?:[0-9]|full)(?:\s|$)|aspect-/);
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
    expect(tokens).toContain("@keyframes wx-rays");
    expect(tokens).toContain("animation: wx-rays 60s linear infinite");
    expect(tokens).toContain("#ffd75e, #ffb02e");
    expect(tokens).toContain("animation-duration: 4s");
    expect(tokens).toContain("animation-duration: 4s");
    expect(tokens).toContain("@keyframes wx-twinkle");
    expect(tokens).toContain("@keyframes wx-rain");
    expect(tokens).toContain("@keyframes wx-snow");
    expect(tokens).toContain("@keyframes wx-flash");
    expect(tokens).toContain("@keyframes wx-fog");
    expect(tokens).toContain("@media (prefers-reduced-motion: reduce)");
    expect(tokens).toContain("animation: none !important");
    expect(tokens).toContain(".weather-remove-chip");
  });

  test("clear day has drifting clouds and rotating rays, with motion disabled for reduced motion", () => {
    const clear = [{ id: "sun", city: "Sun", detail: { temp: 82, condition: "Clear", code: 0, isDay: true } }];
    const { container } = render(<WeatherForecastPage locations={clear} selectedId="sun"/>);
    const sky = container.querySelector('[data-slot="weather-forecast-hero"] [data-slot="weather-sky"]')!;
    expect(sky.querySelectorAll('[data-fx="cloud"]')).toHaveLength(3);
    expect(sky.querySelector('[data-fx="sun-rays"]')).not.toBeNull();
    expect(tokens).toContain("@keyframes wx-drift");
    expect(tokens).toContain("animation: wx-rays 60s linear infinite");
    expect(tokens).toContain("@media (prefers-reduced-motion: reduce)");
    expect(tokens).toContain("animation: none !important");
  });

  test("clear hero scenes contain sun and night stars", () => {
    const day = render(<WeatherForecastPage locations={[{ id: "day", city: "Day", detail: { temp: 80, condition: "Clear", code: 0, isDay: true } }]} selectedId="day"/>);
    const daySky = day.container.querySelector('[data-slot="weather-forecast-hero"] [data-slot="weather-sky"]')!;
    expect(daySky.querySelector('[data-fx="sun"]')).not.toBeNull();
    expect(daySky.querySelector('[data-fx="sun-rays"]')).not.toBeNull();
    cleanup();
    const night = render(<WeatherForecastPage locations={[{ id: "night", city: "Night", detail: { temp: 50, condition: "Clear", code: 0, isDay: false } }]} selectedId="night"/>);
    const nightSky = night.container.querySelector('[data-slot="weather-forecast-hero"] [data-slot="weather-sky"]')!;
    expect(nightSky.querySelectorAll('[data-fx="star"]').length).toBeGreaterThanOrEqual(72);
    expect(nightSky.querySelector('[data-fx="moon"]')).not.toBeNull();
  });

  test("weather tiles draw compass, pressure arc, sunrise path, and chart gridlines without duplicate times", () => {
    const detail = { ...locations[0]!.detail!, wind: { speed: 8, direction: 225, gust: 13 }, pressure: 1016, pressureTrend: "rising" as const,
      sunrise: "2026-10-22T07:13:00", sunset: "2026-10-22T17:59:00", hourly: Array.from({length:6},(_,i)=>({time:`2026-10-22T${String(9+i*3).padStart(2,"0")}:00`,temp:60+i})) };
    const { container } = render(<WeatherForecastPage locations={[{ ...locations[0]!, detail }]} selectedId="home"/>);
    expect(container.querySelector('[data-slot="weather-wind-needle"]')?.getAttribute("style")).toContain("rotate(225deg)");
    expect(container.querySelector('[data-slot="weather-pressure-gauge"] path:nth-child(2)')).not.toBeNull();
    expect(container.querySelector('[data-slot="weather-sun-arc"]')).not.toBeNull();
    const sunTile = [...container.querySelectorAll('[data-slot="weather-tile"]')].find(x=>x.textContent?.includes("Sunrise & Sunset"))!;
    expect(sunTile.textContent?.match(/7:13 AM/g)?.length).toBe(1);
    expect(container.querySelectorAll('[data-slot="weather-chart-gridline"]')).toHaveLength(4);
  });

  test("forecast hourly strip uses fixed width cells and short non-wrapping labels", () => {
    const hours = Array.from({ length: 3 }, (_, i) => ({ time: `2026-10-22T${String(12 + i * 3).padStart(2, "0")}:00`, temp: 60 + i }));
    const { container } = render(<WeatherForecastPage locations={[{ ...locations[0]!, detail: { ...locations[0]!.detail!, hourly: hours } }]} selectedId="home" />);
    const cells = container.querySelectorAll<HTMLElement>("[data-slot=weather-forecast-hour]");
    expect(cells).toHaveLength(3);
    for (const cell of cells) { expect(cell.className).toContain("w-16"); expect(cell.querySelector("span")?.className).toContain("whitespace-nowrap"); }
    expect(cells[0]?.textContent).toContain("Now");
    expect(cells[1]?.textContent).toContain("3 PM");
  });

  test("hourly icons switch between night moon and daytime sun", () => {
    const detail = { ...locations[0]!.detail!, code: 0, sunrise: "2026-10-22T07:00:00", sunset: "2026-10-22T18:00:00",
      hourly: [{ time: "2026-10-22T20:00:00", temp: 55 }, { time: "2026-10-23T12:00:00", temp: 70 }] };
    const { container } = render(<WeatherForecastPage locations={[{ ...locations[0]!, detail }]} selectedId="home"/>);
    const cells = container.querySelectorAll("[data-slot=weather-forecast-hour]");
    expect(cells[0]?.querySelector("svg")?.getAttribute("class")).toContain("lucide-moon");
    expect(cells[1]?.querySelector("svg")?.getAttribute("class")).toContain("lucide-sun");
  });

  test("provided hourly isDay overrides sunrise and sunset fallback", () => {
    const detail = { ...locations[0]!.detail!, code: 0, sunrise: "2026-10-22T07:00:00", sunset: "2026-10-22T18:00:00",
      hourly: [{ time: "2026-10-22T20:00:00", temp: 55, isDay: true }] };
    const { container } = render(<WeatherForecastPage locations={[{ ...locations[0]!, detail }]} selectedId="home"/>);
    expect(container.querySelector("[data-slot=weather-forecast-hour] svg")?.getAttribute("class")).toContain("lucide-sun");
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

describe("hero sky layer layout (regression: the text-lift rule must not turn the sky wrapper into a zero-height box)", () => {
  test("the hero's text-lift rule skips the sky and scrim layers", () => {
    expect(tokens).toContain('[data-slot="weather-forecast-hero"] > :not([data-weather-layer]) { position: relative; z-index: 2; }');
  });
  test("the sky wrapper and the scrim are marked as layers and stay absolutely positioned over the hero", () => {
    const { container } = render(<WeatherForecastPage locations={locations} selectedId="home"/>);
    const layers = container.querySelectorAll('[data-slot="weather-forecast-hero"] > [data-weather-layer]');
    expect(layers.length).toBe(2);
    for (const layer of Array.from(layers)) expect(layer.className).toContain("absolute inset-0");
  });
});

describe("detail grid at phone width (regression: a col-span-2 tile created a second implicit column)", () => {
  test("no tile spans two columns below the sm breakpoint", () => {
    const source = readFileSync(resolve(import.meta.dir, "./weather-forecast-page.tsx"), "utf8");
    const bare = source.match(/(^|[\s"'`])col-span-2\b/gm) ?? [];
    expect(bare).toEqual([]);
  });
  test("renders advice chips under the hero, with tone and icon", () => {
    const advice = [{ id: "jacket", label: "Bring a jacket", icon: "cloud-sun" }, { id: "uv", label: "Sunscreen", tone: "warn" as const }, { id: "odd", label: "Hat", icon: "no-such-icon" }];
    const { container, getByText } = render(<WeatherForecastPage locations={locations} selectedId="home" advice={advice}/>);
    const row = container.querySelector('[data-slot="weather-advice"]')!;
    expect(row.querySelectorAll('[data-slot="badge"]')).toHaveLength(3);
    expect(getByText("Bring a jacket")).toBeTruthy();
    expect(row.querySelector('[data-tone="warn"]')?.textContent).toBe("Sunscreen");
    expect(row.querySelectorAll("svg")).toHaveLength(1);
    const hero = container.querySelector('[data-slot="weather-forecast-hero"]')!;
    expect(hero.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("renders the alert banner above the forecast, by severity", () => {
    const { container, getByText, rerender } = render(<WeatherForecastPage locations={locations} selectedId="home" alert={{ title: "Wind advisory", text: "Gusts to 50 mph.", severity: "warn" }}/>);
    const banner = container.querySelector('[data-slot="weather-alert"]')!;
    expect(banner.getAttribute("data-severity")).toBe("warn");
    expect(getByText("Wind advisory")).toBeTruthy();
    expect(getByText("Gusts to 50 mph.")).toBeTruthy();
    const hero = container.querySelector('[data-slot="weather-forecast-hero"]')!;
    expect(banner.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    rerender(<WeatherForecastPage locations={locations} selectedId="home" alert={{ title: "Tornado warning" }}/>);
    expect(container.querySelector('[data-slot="weather-alert"]')?.getAttribute("data-severity")).toBe("info");
    expect(container.querySelector('[data-slot="alert-description"]')).toBeNull();
  });

  test("renders nothing extra without advice or an alert, or with an empty advice list", () => {
    const plain = render(<WeatherForecastPage locations={locations} selectedId="home"/>);
    const html = plain.container.innerHTML;
    expect(plain.container.querySelector('[data-slot="weather-advice"]')).toBeNull();
    expect(plain.container.querySelector('[data-slot="weather-alert"]')).toBeNull();
    plain.rerender(<WeatherForecastPage locations={locations} selectedId="home" advice={[]}/>);
    expect(plain.container.innerHTML).toBe(html);
  });
});

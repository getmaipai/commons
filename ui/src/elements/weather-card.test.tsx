import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import fixture from "@maipai/spec/fixtures/answer-block/valid-weather_card.json";
import { WeatherCard, weekdayOf } from "./weather-card";
import { WEATHER_CLASSES } from "./weather-condition";

afterEach(cleanup);

const props = fixture.props as Parameters<typeof WeatherCard>[0];
const days = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(12 + i).padStart(2, "0")}`, high: 60 + i, low: 50, code: 0 }));

describe("WeatherCard", () => {
  test("hero shows place, rounded temperature, unit, condition and attribution", () => {
    const { container, getByText } = render(<WeatherCard {...props} current={{ ...props.current, temp: 71.6 }} />);
    expect(getByText("Springfield")).toBeTruthy();
    expect(getByText("Partly cloudy")).toBeTruthy();
    expect(getByText("Open-Meteo")).toBeTruthy();
    expect(container.querySelector('[data-slot="weather-hero"]')?.textContent).toContain("72°F");
  });

  test("the hero gradient comes from the class and time of day tokens", () => {
    const day = render(<WeatherCard {...props} current={{ ...props.current, code: 61, is_day: true }} />);
    expect(day.container.querySelector<HTMLElement>('[data-slot="weather-hero"]')!.style.backgroundImage).toContain(
      "var(--weather-rain-day-from)",
    );
    cleanup();
    const night = render(<WeatherCard {...props} current={{ ...props.current, code: 61, is_day: false }} />);
    const root = night.container.querySelector('[data-slot="weather-card"]')!;
    expect(root.getAttribute("data-day")).toBe("false");
    expect(night.container.querySelector<HTMLElement>('[data-slot="weather-hero"]')!.style.backgroundImage).toContain(
      "var(--weather-rain-night-to)",
    );
  });

  test("shows one column per day, at most 8, in order", () => {
    const { container } = render(<WeatherCard {...props} daily={days(8)} />);
    expect(container.querySelectorAll('[data-slot="weather-day"]')).toHaveLength(8);
    cleanup();
    const nine = render(<WeatherCard {...props} daily={days(9)} />);
    expect(nine.container.querySelectorAll('[data-slot="weather-day"]')).toHaveLength(8);
  });

  test("a day shows its rain percent from 20 up, otherwise its sky icon", () => {
    const { container } = render(
      <WeatherCard
        {...props}
        daily={[
          { date: "2026-10-16", high: 70, low: 50, code: 61, pop: 70 },
          { date: "2026-10-17", high: 70, low: 50, code: 0, pop: 19 },
          { date: "2026-10-18", high: 70, low: 50, code: 0 },
        ]}
      />,
    );
    const cols = container.querySelectorAll('[data-slot="weather-day"]');
    expect(cols[0]!.textContent).toContain("70%");
    expect(cols[1]!.textContent).not.toContain("%");
    expect(cols[1]!.querySelector("svg")).not.toBeNull();
    expect(cols[2]!.textContent).not.toContain("%");
    expect(cols[0]!.getAttribute("aria-label")).toContain("70 percent chance of rain");
  });

  test("weekday is the calendar day of the date, not shifted by the reader's zone", () => {
    expect(weekdayOf("2026-10-16")).toBe("Fri");
    expect(weekdayOf("2026-10-18")).toBe("Sun");
    expect(weekdayOf("not-a-date")).toBe("not-a-date");
  });

  test("every class draws a sky, and the effect layers are hidden from assistive tech with at most 32 parts", () => {
    const codeFor = { clear: 0, "partly-cloudy": 2, overcast: 3, fog: 45, drizzle: 51, rain: 61, snow: 71, thunderstorm: 95 } as const;
    for (const cls of WEATHER_CLASSES) {
      for (const is_day of [true, false]) {
        const { container } = render(<WeatherCard {...props} current={{ ...props.current, code: codeFor[cls], is_day }} />);
        const root = container.querySelector('[data-slot="weather-card"]')!;
        expect(root.getAttribute("data-class")).toBe(cls);
        const layers = [...container.querySelectorAll("[data-fx]")];
        expect(layers.length, `${cls} ${is_day}`).toBeGreaterThan(0);
        expect(layers.length).toBeLessThanOrEqual(32);
        for (const layer of layers) expect(layer.getAttribute("aria-hidden")).toBe("true");
        cleanup();
      }
    }
  });

  test("the same props draw the same markup", () => {
    const a = render(<WeatherCard {...props} />).container.innerHTML;
    cleanup();
    expect(render(<WeatherCard {...props} />).container.innerHTML).toBe(a);
  });
});

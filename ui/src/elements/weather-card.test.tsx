import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import fixture from "@maipai/spec/fixtures/answer-block/valid-weather_card.json";
import { WeatherCard, hourLabelOf, weekdayOf } from "./weather-card";
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

  test("every class draws a sky, and effects are hidden from assistive tech", () => {
    const codeFor = { clear: 0, "partly-cloudy": 2, overcast: 3, fog: 45, drizzle: 51, rain: 61, snow: 71, thunderstorm: 95 } as const;
    for (const cls of WEATHER_CLASSES) {
      for (const is_day of [true, false]) {
        const { container } = render(<WeatherCard {...props} current={{ ...props.current, code: codeFor[cls], is_day }} />);
        const root = container.querySelector('[data-slot="weather-card"]')!;
        expect(root.getAttribute("data-class")).toBe(cls);
        const layers = [...container.querySelectorAll("[data-fx]")];
        expect(layers.length, `${cls} ${is_day}`).toBeGreaterThan(0);
        expect(layers.length).toBeLessThanOrEqual(100);
        for (const layer of layers) expect(layer.getAttribute("aria-hidden") ?? layer.closest("[aria-hidden=true]")?.getAttribute("aria-hidden")).toBe("true");
        cleanup();
      }
    }
  });

  test("the shared sky module provides reduced-motion-safe scene hooks", () => {
    const { container } = render(<WeatherCard {...props} current={{ ...props.current, code: 61 }} />);
    expect(container.querySelector("[data-slot=weather-sky] [data-fx=fall]")).not.toBeNull();
    expect(container.querySelector("[data-slot=weather-sky]")?.getAttribute("data-class")).toBe("rain");
  });

  test("night, rain and snow scenes contain enough particles for visible motion", () => {
    const night = render(<WeatherCard {...props} current={{ ...props.current, code: 0, is_day: false }} />);
    expect(night.container.querySelectorAll('[data-fx="star"]')).toHaveLength(72);
    expect(night.container.querySelector('[data-fx="moon"]')).not.toBeNull();
    cleanup();
    const rainy = render(<WeatherCard {...props} current={{ ...props.current, code: 61 }} />);
    expect(rainy.container.querySelectorAll('[data-fx="fall"]')).toHaveLength(76);
    expect(rainy.container.querySelector('[data-fx="splash"]')).not.toBeNull();
    cleanup();
    const snowy = render(<WeatherCard {...props} current={{ ...props.current, code: 71 }} />);
    expect(snowy.container.querySelectorAll('[data-fx="flake"]')).toHaveLength(60);
    expect(snowy.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(0);
  });

  test("sun, shaped clouds and storm bolt render for their weather classes", () => {
    const clear = render(<WeatherCard {...props} current={{ ...props.current, code: 0, is_day: true }} />);
    expect(clear.container.querySelector('[data-fx="sun"]')).not.toBeNull();
    expect(clear.container.querySelector('[data-fx="sun-rays"]')).not.toBeNull();
    cleanup();
    const partly = render(<WeatherCard {...props} current={{ ...props.current, code: 2, is_day: true }} />);
    expect(partly.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(2);
    expect(partly.container.querySelector('[data-fx="cloud"] i')).not.toBeNull();
    cleanup();
    const storm = render(<WeatherCard {...props} current={{ ...props.current, code: 95 }} />);
    expect(storm.container.querySelector('[data-fx="bolt"]')).not.toBeNull();
    expect(storm.container.querySelectorAll('[data-fx="fall"]')).toHaveLength(76);
  });

  test("the same props draw the same markup", () => {
    const a = render(<WeatherCard {...props} />).container.innerHTML;
    cleanup();
    expect(render(<WeatherCard {...props} />).container.innerHTML).toBe(a);
  });
});

describe("WeatherCard accessibility and variants", () => {
  test("a visually hidden sentence gives the conditions, the high and the low; the visible hero is hidden from assistive tech", () => {
    const { container } = render(<WeatherCard {...props} />);
    const summary = container.querySelector('[data-slot="weather-summary"]')!;
    expect(summary.className).toContain("sr-only");
    expect(summary.textContent).toContain(`Weather in ${props.place}`);
    expect(summary.textContent).toMatch(/High \d+, low \d+\./);
    expect(container.querySelector('[data-slot="weather-hero"] [aria-hidden="true"] [data-slot="weather-range"]')).not.toBeNull();
  });

  test("compact draws the hero alone and keeps the sentence", () => {
    const { container } = render(<WeatherCard {...props} variant="compact" />);
    expect(container.querySelector('[data-slot="weather-card"]')!.getAttribute("data-variant")).toBe("compact");
    expect(container.querySelectorAll('[data-slot="weather-day"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="weather-summary"]')).not.toBeNull();
  });

  test("full is the default", () => {
    const { container } = render(<WeatherCard {...props} />);
    expect(container.querySelector('[data-slot="weather-card"]')!.getAttribute("data-variant")).toBe("full");
  });

  const hours = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      time: `2026-10-17T${String((20 + i) % 24).padStart(2, "0")}:00`,
      temp: 41 + i,
      ...(i === 1 ? { pop: 60 } : i === 2 ? { pop: 19 } : {}),
    }));

  test("wide draws the next 24 hours as a labelled list above the days", () => {
    const { container } = render(<WeatherCard {...props} variant="wide" hourly={hours(30)} />);
    const root = container.querySelector('[data-slot="weather-card"]')!;
    expect(root.getAttribute("data-variant")).toBe("wide");
    expect(root.className).toContain("max-w-3xl");
    expect(root.className).not.toContain("max-w-md");
    const strip = container.querySelector('[data-slot="weather-hourly"]')!;
    expect(strip.tagName).toBe("UL");
    const items = strip.querySelectorAll('[data-slot="weather-hour"]');
    expect(items).toHaveLength(24);
    expect(items[0]!.getAttribute("aria-label")).toBe("8 PM: 41 degrees Fahrenheit");
    expect(items[1]!.getAttribute("aria-label")).toBe("9 PM: 42 degrees Fahrenheit, 60 percent chance of rain");
    expect(items[1]!.textContent).toContain("60%");
    expect(items[1]!.querySelector("svg")).not.toBeNull();
    expect(items[2]!.textContent).not.toContain("%");
    expect(items[2]!.getAttribute("aria-label")).not.toContain("rain");
    expect(items[4]!.getAttribute("aria-label")).toStartWith("12 AM");
    expect(container.querySelectorAll('[data-slot="weather-day"]').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-slot="weather-summary"]')).not.toBeNull();
  });

  test("wide omits the hourly strip when hourly is absent or empty", () => {
    expect(render(<WeatherCard {...props} variant="wide" hourly={undefined} />).container.querySelector('[data-slot="weather-hourly"]')).toBeNull();
    cleanup();
    expect(render(<WeatherCard {...props} variant="wide" hourly={[]} />).container.querySelector('[data-slot="weather-hourly"]')).toBeNull();
  });

  test("full and compact ignore hourly: output is the same with or without it", () => {
    for (const variant of ["full", "compact"] as const) {
      const without = render(<WeatherCard {...props} variant={variant} hourly={undefined} />).container.innerHTML;
      cleanup();
      const withHours = render(<WeatherCard {...props} variant={variant} hourly={hours(24)} />).container.innerHTML;
      cleanup();
      expect(withHours).toBe(without);
      expect(withHours).toContain("max-w-md");
    }
  });

  test("hour labels are read from the ISO string with no zone conversion", () => {
    expect(hourLabelOf("2026-10-17T00:00")).toBe("12 AM");
    expect(hourLabelOf("2026-10-17T12:00")).toBe("12 PM");
    expect(hourLabelOf("2026-10-17T21:00+05:00")).toBe("9 PM");
    expect(hourLabelOf("junk")).toBe("junk");
  });
});

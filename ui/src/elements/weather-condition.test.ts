import { describe, expect, test } from "bun:test";
import {
  WEATHER_CLASSES,
  WMO_CLASS,
  particles,
  seeded,
  weatherClassOf,
} from "./weather-condition";

// Every weather_code Open-Meteo can emit (https://open-meteo.com/en/docs, "WMO Weather interpretation codes").
const OPEN_METEO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
];

describe("WMO code to sky class", () => {
  test("every code Open-Meteo emits maps to a known class", () => {
    for (const code of OPEN_METEO_CODES) {
      expect(WMO_CLASS[code], `code ${code}`).toBeDefined();
      expect(WEATHER_CLASSES).toContain(weatherClassOf(code));
    }
  });

  test("the table holds exactly those codes, so a new row is a deliberate edit", () => {
    expect(Object.keys(WMO_CLASS).map(Number).sort((a, b) => a - b)).toEqual(OPEN_METEO_CODES);
  });

  test("every class is reachable", () => {
    expect(new Set(Object.values(WMO_CLASS))).toEqual(new Set(WEATHER_CLASSES));
  });

  test("spot checks", () => {
    expect(weatherClassOf(0)).toBe("clear");
    expect(weatherClassOf(2)).toBe("partly-cloudy");
    expect(weatherClassOf(3)).toBe("overcast");
    expect(weatherClassOf(48)).toBe("fog");
    expect(weatherClassOf(57)).toBe("drizzle");
    expect(weatherClassOf(82)).toBe("rain");
    expect(weatherClassOf(86)).toBe("snow");
    expect(weatherClassOf(96)).toBe("thunderstorm");
  });

  test("a code outside the table reads as overcast", () => {
    for (const code of [4, 10, 60, 100, -1, 2.5, Number.NaN]) expect(weatherClassOf(code)).toBe("overcast");
  });
});

describe("particles", () => {
  const range = { size: [2, 4] as [number, number], dur: [1, 2] as [number, number], opacity: [0.2, 0.8] as [number, number] };

  test("the same seed gives the same sky", () => {
    expect(particles(7, 10, range)).toEqual(particles(7, 10, range));
    expect(particles(7, 10, range)).not.toEqual(particles(8, 10, range));
    expect(seeded(1)()).toBe(seeded(1)());
  });

  test("values stay inside their ranges and every delay starts mid-cycle", () => {
    for (const p of particles(3, 50, range)) {
      expect(p.size).toBeGreaterThanOrEqual(2);
      expect(p.size).toBeLessThanOrEqual(4);
      expect(p.opacity).toBeGreaterThanOrEqual(0.2);
      expect(p.opacity).toBeLessThanOrEqual(0.8);
      expect(p.delay).toBeLessThanOrEqual(0);
      expect(p.delay).toBeGreaterThan(-p.dur - 1e-9);
    }
  });
});

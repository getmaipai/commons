/** The sky classes the weather card draws. */
export const WEATHER_CLASSES = [
  "clear",
  "partly-cloudy",
  "overcast",
  "fog",
  "drizzle",
  "rain",
  "snow",
  "thunderstorm",
] as const;

export type WeatherClass = (typeof WEATHER_CLASSES)[number];

/**
 * The one table from a WMO weather code to a sky class. These are the 28
 * codes Open-Meteo emits; weather-condition.test.ts holds that each one maps.
 * Freezing drizzle and freezing rain stay drizzle and rain, and the rain
 * showers (80 to 82) are rain, because the card draws sky, not temperature.
 */
export const WMO_CLASS: Readonly<Record<number, WeatherClass>> = {
  0: "clear",
  1: "clear",
  2: "partly-cloudy",
  3: "overcast",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  56: "drizzle",
  57: "drizzle",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "rain",
  67: "rain",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain",
  81: "rain",
  82: "rain",
  85: "snow",
  86: "snow",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};

/** The sky class for `code`. A code outside the table reads as overcast, the one sky that claims nothing. */
export function weatherClassOf(code: number): WeatherClass {
  return WMO_CLASS[code] ?? "overcast";
}

/** A seeded generator (mulberry32), so a card draws the same particles on every render. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Particle {
  /** Horizontal position, percent of the hero width. */
  x: number;
  /** Vertical position, percent of the hero height (still layers only). */
  y: number;
  /** Size in px: streak length, flake or star diameter, cloud width. */
  size: number;
  /** Animation length in seconds. */
  dur: number;
  /** Animation delay in seconds, negative so every particle starts mid-cycle. */
  delay: number;
  /** Peak opacity. */
  opacity: number;
}

/** `count` particles from `seed`; the ranges are [min, max] pairs. */
export function particles(
  seed: number,
  count: number,
  r: {
    y?: [number, number];
    size: [number, number];
    dur: [number, number];
    opacity: [number, number];
  },
): Particle[] {
  const rnd = seeded(seed);
  const between = ([lo, hi]: [number, number]) => lo + rnd() * (hi - lo);
  return Array.from({ length: count }, () => {
    const dur = between(r.dur);
    return {
      x: between([0, 100]),
      y: between(r.y ?? [0, 100]),
      size: between(r.size),
      dur,
      delay: -rnd() * dur,
      opacity: between(r.opacity),
    };
  });
}

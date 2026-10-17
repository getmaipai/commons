"use client";

import type { ComponentProps, CSSProperties } from "react";
import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  DropletIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { cn } from "cn";
import { paper } from "./surfaces";
import {
  particles,
  weatherClassOf,
  type Particle,
  type WeatherClass,
} from "./weather-condition";

export interface WeatherCurrent {
  temp: number;
  condition: string;
  /** WMO weather code (the Open-Meteo `weather_code`). */
  code: number;
  is_day: boolean;
}

export interface WeatherHour {
  time: string;
  temp: number;
  pop?: number;
}

export interface WeatherDay {
  /** YYYY-MM-DD. */
  date: string;
  high: number;
  low: number;
  code: number;
  pop?: number;
}

/** A day shows its rain percent from this chance up; below it the day shows its sky icon. */
export const POP_SHOWN_FROM = 20;

const ICONS = {
  clear: SunIcon,
  "partly-cloudy": CloudSunIcon,
  overcast: CloudIcon,
  fog: CloudFogIcon,
  drizzle: CloudDrizzleIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  thunderstorm: CloudLightningIcon,
} as const;

type Style = CSSProperties & Record<`--${string}`, string | number>;

/** One effect element's inline custom properties (see tokens.css, WEATHER-CARD-01). */
function fx(p: Partial<Particle>): Style {
  const style: Style = {};
  if (p.x !== undefined) style["--x"] = p.x.toFixed(1);
  if (p.y !== undefined) style["--y"] = p.y.toFixed(1);
  if (p.size !== undefined) style["--s"] = p.size.toFixed(1);
  if (p.dur !== undefined) style["--d"] = `${p.dur.toFixed(2)}s`;
  if (p.delay !== undefined) style["--dl"] = `${p.delay.toFixed(2)}s`;
  if (p.opacity !== undefined) style["--o"] = p.opacity.toFixed(2);
  return style;
}

// Particle sets are built once. Seeded, so a card draws the same sky on every render. Counts stay small:
// at most 32 effect elements in any one sky.
const RAIN = [
  particles(11, 8, { size: [10, 14], dur: [0.9, 1.2], opacity: [0.18, 0.3] }),
  particles(12, 10, { size: [14, 20], dur: [0.65, 0.85], opacity: [0.3, 0.45] }),
  particles(13, 8, { size: [20, 28], dur: [0.45, 0.6], opacity: [0.45, 0.6] }),
];
const DRIZZLE = [
  particles(21, 6, { size: [8, 12], dur: [1.2, 1.6], opacity: [0.2, 0.32] }),
  particles(22, 8, { size: [12, 16], dur: [0.9, 1.2], opacity: [0.3, 0.45] }),
];
const STORM = [
  particles(31, 8, { size: [14, 20], dur: [0.6, 0.8], opacity: [0.25, 0.4] }),
  particles(32, 12, { size: [20, 28], dur: [0.4, 0.55], opacity: [0.4, 0.6] }),
  particles(33, 8, { size: [24, 32], dur: [0.35, 0.5], opacity: [0.5, 0.65] }),
];
const SNOW = [
  particles(41, 8, { size: [1.5, 3], dur: [7, 10], opacity: [0.35, 0.55] }),
  particles(42, 8, { size: [3, 5], dur: [5, 7.5], opacity: [0.6, 0.8] }),
  particles(43, 6, { size: [5, 7], dur: [3.5, 5.5], opacity: [0.85, 1] }),
];
const STARS = particles(51, 24, { y: [0, 85], size: [1, 2.6], dur: [1.5, 4], opacity: [0.6, 1] });
const CLOUDS_PARTLY = particles(61, 3, { y: [4, 56], size: [150, 220], dur: [18, 30], opacity: [0.16, 0.22] });
const CLOUDS_OVERCAST = particles(62, 4, { y: [0, 60], size: [190, 280], dur: [20, 34], opacity: [0.14, 0.22] });
const FOG = [
  { y: 16, size: 30, dur: 9, delay: -2, opacity: 0.18 },
  { y: 46, size: 26, dur: 13, delay: -6, opacity: 0.16 },
  { y: 70, size: 20, dur: 17, delay: -9, opacity: 0.14 },
];

function Layer({ items, kind }: { items: readonly Particle[]; kind: string }) {
  return items.map((p, i) => <span key={i} data-fx={kind} aria-hidden style={fx(p)} />);
}

/** The sky behind the hero text: only decoration, chosen by class and time of day. */
function Sky({ cls, isDay }: { cls: WeatherClass; isDay: boolean }) {
  const lamp = isDay ? (
    <span data-fx="sun" aria-hidden />
  ) : (
    <span data-fx="moon" aria-hidden />
  );
  // Night clouds are dimmer so they stay a shade above the gradient.
  const clouds = (set: readonly Particle[]) =>
    set.map((p, i) => (
      <span
        key={i}
        data-fx="cloud"
        aria-hidden
        style={fx({ ...p, opacity: isDay ? p.opacity : p.opacity * 0.55 })}
      />
    ));
  const stars = (n: number) => <Layer items={STARS.slice(0, n)} kind="star" />;
  switch (cls) {
    case "clear":
      return isDay ? lamp : <>{lamp}{stars(24)}</>;
    case "partly-cloudy":
      return <>{lamp}{!isDay && stars(10)}{clouds(CLOUDS_PARTLY)}</>;
    case "overcast":
      return <>{!isDay && lamp}{clouds(CLOUDS_OVERCAST)}</>;
    case "fog":
      return (
        <>
          {!isDay && lamp}
          {FOG.map((f, i) => (
            <span key={i} data-fx="fog" aria-hidden style={fx(f)} />
          ))}
        </>
      );
    case "drizzle":
      return <>{DRIZZLE.map((set, i) => <Layer key={i} items={set} kind="fall" />)}</>;
    case "rain":
      return <>{RAIN.map((set, i) => <Layer key={i} items={set} kind="fall" />)}</>;
    case "thunderstorm":
      return (
        <>
          {clouds(CLOUDS_OVERCAST.slice(0, 2))}
          {STORM.map((set, i) => <Layer key={i} items={set} kind="fall" />)}
          <span data-fx="flash" aria-hidden />
        </>
      );
    case "snow":
      return (
        <>
          {!isDay && stars(8)}
          {SNOW.map((set, i) => <Layer key={i} items={set} kind="flake" />)}
        </>
      );
  }
}

const WEEKDAYS = new Map<string, Intl.DateTimeFormat>();

/** The short weekday for a YYYY-MM-DD date, read as that calendar day wherever the reader is. */
export function weekdayOf(date: string, locale = "en-US"): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  let fmt = WEEKDAYS.get(locale);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    } catch {
      fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
    }
    WEEKDAYS.set(locale, fmt);
  }
  return fmt.format(new Date(Date.UTC(y, m - 1, d)));
}

const degrees = (n: number) => `${Math.round(n)}°`;

function DayColumn({
  day,
  unit,
  locale,
}: {
  day: WeatherDay;
  unit: string;
  locale: string;
}) {
  const cls = weatherClassOf(day.code);
  const Icon = ICONS[cls];
  const rain = day.pop !== undefined && day.pop >= POP_SHOWN_FROM;
  const weekday = weekdayOf(day.date, locale);
  return (
    <li
      data-slot="weather-day"
      data-class={cls}
      aria-label={`${weekday}: high ${Math.round(day.high)}, low ${Math.round(day.low)} ${unit === "C" ? "degrees Celsius" : "degrees Fahrenheit"}${rain ? `, ${day.pop} percent chance of rain` : ""}`}
      className="flex min-w-10 flex-1 flex-col items-center gap-1.5"
    >
      <span className="text-muted-foreground text-xs">{weekday}</span>
      <span className="text-[13px] font-medium tabular-nums">{degrees(day.high)}</span>
      {rain ? (
        <span className="text-primary flex items-center text-[11px] tabular-nums">
          <DropletIcon className="size-3" aria-hidden />
          {day.pop}%
        </span>
      ) : (
        <Icon className="text-muted-foreground size-4" aria-hidden />
      )}
    </li>
  );
}

/** The hour on a clock for an ISO local time ("2026-10-17T21:00"), read as written: no zone conversion. */
export function hourLabelOf(time: string): string {
  const m = /T(\d{2})/.exec(time);
  if (!m) return time;
  const h = Number(m[1]) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

function HourColumn({ hour, unit }: { hour: WeatherHour; unit: string }) {
  const rain = hour.pop !== undefined && hour.pop >= POP_SHOWN_FROM;
  const label = hourLabelOf(hour.time);
  return (
    <li
      data-slot="weather-hour"
      aria-label={`${label}: ${Math.round(hour.temp)} ${unit === "C" ? "degrees Celsius" : "degrees Fahrenheit"}${rain ? `, ${hour.pop} percent chance of rain` : ""}`}
      className="flex min-w-12 flex-1 flex-col items-center gap-1.5"
    >
      <span aria-hidden className="text-muted-foreground text-xs whitespace-nowrap">{label}</span>
      <span aria-hidden className="text-[13px] font-medium tabular-nums">{degrees(hour.temp)}</span>
      <span aria-hidden className="text-primary flex h-4 items-center text-[11px] tabular-nums">
        {rain ? (
          <>
            <DropletIcon className="size-3" aria-hidden />
            {hour.pop}%
          </>
        ) : null}
      </span>
    </li>
  );
}

/**
 * The weather card: a hero whose gradient and motion follow the sky (a WMO code
 * and day or night), and a strip of up to 8 daily columns beneath it. The `wide`
 * variant (package pages) is full width up to max-w-3xl, has a taller hero and draws
 * the next 24 `hourly` entries above the daily strip; `full` and `compact` ignore `hourly`.
 */
export function WeatherCard({
  place,
  unit,
  current,
  hourly,
  daily,
  attribution,
  locale = "en-US",
  variant = "full",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "place" | "unit" | "current" | "hourly" | "daily" | "attribution"
> & {
  place: string;
  unit: "F" | "C";
  current: WeatherCurrent;
  hourly?: readonly WeatherHour[];
  daily: readonly WeatherDay[];
  attribution: string;
  /** Locale for the weekday names. Render-only; not part of the spec block. */
  locale?: string;
  /** `compact` draws the hero alone, shorter, for a dashboard card. Render-only; not part of the spec block. */
  variant?: "full" | "compact" | "wide";
}) {
  const compact = variant === "compact";
  const wide = variant === "wide";
  const hours = wide ? (hourly ?? []).slice(0, 24) : [];
  const today = daily[0];
  const unitWord = unit === "C" ? "degrees Celsius" : "degrees Fahrenheit";
  const summary =
    `Weather in ${place}: ${Math.round(current.temp)} ${unitWord} and ${current.condition.toLowerCase()}` +
    (today ? `. High ${Math.round(today.high)}, low ${Math.round(today.low)}.` : ".");
  const cls = weatherClassOf(current.code);
  const tod = current.is_day ? "day" : "night";
  const ConditionIcon = current.is_day ? ICONS[cls] : cls === "clear" ? MoonIcon : ICONS[cls];
  const heroStyle: CSSProperties = {
    backgroundImage: `linear-gradient(to bottom, var(--weather-${cls}-${tod}-from), var(--weather-${cls}-${tod}-to))`,
    color: "var(--weather-ink)",
  };
  return (
    <div
      data-slot="weather-card"
      data-class={cls}
      data-day={current.is_day ? "true" : "false"}
      data-variant={variant}
      className={cn(paper, "w-full overflow-hidden rounded-2xl", wide ? "max-w-3xl" : "max-w-md", className)}
      {...props}
    >
      <div
        data-slot="weather-hero"
        style={heroStyle}
        className={cn(
          "relative isolate flex flex-col justify-between overflow-hidden",
          compact ? "min-h-36 gap-3 p-4" : wide ? "min-h-72 p-6" : "min-h-52 p-5",
        )}
      >
        <p className="sr-only" data-slot="weather-summary">{summary}</p>
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <Sky cls={cls} isDay={current.is_day} />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: "var(--weather-scrim)" }} />
        <div aria-hidden className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-medium tracking-[0.14em] uppercase">{place}</span>
          <span className="text-end text-[11px]">{attribution}</span>
        </div>
        <div aria-hidden className="flex items-end justify-between gap-3">
          <span className={cn("leading-none font-light tabular-nums", compact ? "text-5xl" : "text-[64px]")}>
            {degrees(current.temp)}
            <span className="text-2xl">{unit}</span>
          </span>
          <span className="flex flex-col items-end gap-1 pb-1.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <ConditionIcon className="size-4" aria-hidden />
              {current.condition}
            </span>
            {today ? (
              <span data-slot="weather-range" className="text-xs tabular-nums">
                H {degrees(today.high)} L {degrees(today.low)}
              </span>
            ) : null}
          </span>
        </div>
      </div>
      {hours.length > 0 ? (
        <ul data-slot="weather-hourly" aria-label="Next 24 hours" className="border-border flex overflow-x-auto border-b px-1.5 py-3">
          {hours.map((hour) => (
            <HourColumn key={hour.time} hour={hour} unit={unit} />
          ))}
        </ul>
      ) : null}
      {compact ? null : (
      <ul className="flex overflow-x-auto px-1.5 py-3">
        {daily.slice(0, 8).map((day) => (
          <DayColumn key={day.date} day={day} unit={unit} locale={locale} />
        ))}
      </ul>
      )}
    </div>
  );
}

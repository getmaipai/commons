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
  weatherClassOf,
} from "./weather-condition";
import { WeatherSky } from "./weather-sky";
import { WeatherAdviceChips, WeatherAlertBanner, type WeatherAdvice, type WeatherAlert } from "./weather-advice";
export { WeatherSky } from "./weather-sky";

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
    className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-1.5"
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
  advice,
  alert,
  locale = "en-US",
  variant = "full",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "place" | "unit" | "current" | "hourly" | "daily" | "attribution" | "alert"
> & {
  place: string;
  unit: "F" | "C";
  current: WeatherCurrent;
  hourly?: readonly WeatherHour[];
  daily: readonly WeatherDay[];
  attribution: string;
  /** Advice chips drawn under the hero. Absent or empty: nothing extra. */
  advice?: readonly WeatherAdvice[];
  /** An alert banner drawn above the hero. Absent: nothing extra. */
  alert?: WeatherAlert;
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
      {alert ? <div className="p-3"><WeatherAlertBanner alert={alert} /></div> : null}
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
          <WeatherSky cls={cls} isDay={current.is_day} intensity={1} />
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
      {advice?.length ? (
        <div className="border-border border-b px-4 py-3">
          <WeatherAdviceChips advice={advice} />
        </div>
      ) : null}
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

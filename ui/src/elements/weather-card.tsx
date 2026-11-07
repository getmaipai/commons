"use client";

import type { ComponentProps } from "react";
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
import { i18n, kitLocaleTag } from "@/kit/i18n";
import {
  weatherClassOf,
} from "./weather-condition";
import { WeatherSky, type WeatherMoon } from "./weather-sky";
import { MoonDisc } from "./moon-disc";
import { WeatherAdviceChips, WeatherAlertBanner, type WeatherAdvice, type WeatherAlert } from "./weather-advice";
export { WeatherSky } from "./weather-sky";
export type { WeatherMoon } from "./weather-sky";

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
export function weekdayOf(date: string, locale = kitLocaleTag()): string {
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

const unitWordOf = (unit: string) => unit === "C" ? i18n._({ id: "ui.degrees Celsius", message: "degrees Celsius" }) : i18n._({ id: "ui.degrees Fahrenheit", message: "degrees Fahrenheit" });

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
      aria-label={rain ? i18n._({ id: "ui.{weekday}: high {high}, low {low} {unit}, {pop} percent chance of rain", message: "{weekday}: high {high}, low {low} {unit}, {pop} percent chance of rain", values: { weekday, high: Math.round(day.high), low: Math.round(day.low), unit: unitWordOf(unit), pop: day.pop } }) : i18n._({ id: "ui.{weekday}: high {high}, low {low} {unit}", message: "{weekday}: high {high}, low {low} {unit}", values: { weekday, high: Math.round(day.high), low: Math.round(day.low), unit: unitWordOf(unit) } })}
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
  const tag = kitLocaleTag();
  if (!tag.startsWith("en")) {
    try { return new Intl.DateTimeFormat(tag, { hour: "numeric", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, h)); } catch { /* English below */ }
  }
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

function HourColumn({ hour, unit }: { hour: WeatherHour; unit: string }) {
  const rain = hour.pop !== undefined && hour.pop >= POP_SHOWN_FROM;
  const label = hourLabelOf(hour.time);
  return (
    <li
      data-slot="weather-hour"
      aria-label={rain ? i18n._({ id: "ui.{label}: {temp} {unit}, {pop} percent chance of rain", message: "{label}: {temp} {unit}, {pop} percent chance of rain", values: { label, temp: Math.round(hour.temp), unit: unitWordOf(unit), pop: hour.pop } }) : i18n._({ id: "ui.{label}: {temp} {unit}", message: "{label}: {temp} {unit}", values: { label, temp: Math.round(hour.temp), unit: unitWordOf(unit) } })}
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
 *
 * Props: `place`, `unit`, `current`, `daily`, `attribution` (required); `hourly`, `advice`, `alert`, `moon`;
 * `sunrise` and `sunset` (ISO local strings) with `now` make the sky follow the real sun (else `current.is_day`);
 * `wind` (km/h) speeds clouds, snow and fog; `thunderJolt` shakes the hero on a strike; `locale`; `variant`.
 * Variants and the running-animation budgets of the sky behind them: `full` 90, `wide` 110, `compact` 50. The
 * location cards of the forecast page use `WeatherSky variant="lite"` (24). The sky pauses off screen and in a
 * hidden tab, cross-fades when the condition changes, and freezes mid-cycle under reduced motion.
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
  moon,
  sunrise,
  sunset,
  wind,
  now,
  thunderJolt,
  locale = kitLocaleTag(),
  variant = "full",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "place" | "unit" | "current" | "hourly" | "daily" | "attribution" | "alert" | "moon"
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
  /** Moon phase shown on a clear night. */
  moon?: WeatherMoon;
  sunrise?: string;
  sunset?: string;
  wind?: number;
  now?: Date | string | number;
  thunderJolt?: boolean;
  /** Locale for the weekday names. Render-only; not part of the spec block. */
  locale?: string;
  /** `compact` draws the hero alone, shorter, for a dashboard card. Render-only; not part of the spec block. */
  variant?: "full" | "compact" | "wide";
}) {
  const compact = variant === "compact";
  const wide = variant === "wide";
  const hours = wide ? (hourly ?? []).slice(0, 24) : [];
  const today = daily[0];
  const unitWord = unitWordOf(unit);
  const summary = today
    ? i18n._({ id: "ui.Weather in {place}: {temp} {unitWord} and {condition}. High {high}, low {low}.", message: "Weather in {place}: {temp} {unitWord} and {condition}. High {high}, low {low}.", values: { place, temp: Math.round(current.temp), unitWord, condition: current.condition.toLowerCase(), high: Math.round(today.high), low: Math.round(today.low) } })
    : i18n._({ id: "ui.Weather in {place}: {temp} {unitWord} and {condition}.", message: "Weather in {place}: {temp} {unitWord} and {condition}.", values: { place, temp: Math.round(current.temp), unitWord, condition: current.condition.toLowerCase() } });
  const cls = weatherClassOf(current.code);
  const ConditionIcon = current.is_day ? ICONS[cls] : cls === "clear" ? MoonIcon : ICONS[cls];
  const heroStyle = { color: "var(--weather-ink)" };
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
          <WeatherSky cls={cls} isDay={current.is_day} code={current.code} moon={moon} variant={variant} sunrise={sunrise} sunset={sunset} wind={wind} now={now} thunderJolt={thunderJolt} />
        </div>
        <div aria-hidden className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-medium tracking-[0.14em] uppercase">{place}</span>
          {attribution ? <span className="text-end text-[11px]">{attribution}</span> : null}
        </div>
        <div aria-hidden className="flex items-end justify-between gap-3">
          <span className={cn("leading-none font-light tabular-nums", compact ? "text-5xl" : "text-[64px]")}>
            {degrees(current.temp)}
            <span className="text-2xl">{unit}</span>
          </span>
          <span className="flex flex-col items-end gap-1 pb-1.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              {!current.is_day && cls === "clear" && moon ? <MoonDisc phase={moon.phase} illumination={moon.illumination} size={16}/> : <ConditionIcon className="size-4" aria-hidden />}
              {current.condition}
            </span>
            {today ? (
              <span data-slot="weather-range" className="text-xs tabular-nums">
                {i18n._({ id: "ui.H {high} L {low}", message: "H {high} L {low}", values: { high: degrees(today.high), low: degrees(today.low) } })}
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
        <ul data-slot="weather-hourly" aria-label={i18n._({ id: "ui.Next 24 hours", message: "Next 24 hours" })} className="border-border flex overflow-x-auto border-b px-1.5 py-3">
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

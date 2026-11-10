"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CloudDrizzleIcon, CloudFogIcon, CloudIcon, CloudLightningIcon, CloudMoonIcon, CloudRainIcon, CloudSnowIcon, CloudSunIcon, DropletIcon, MapPin, MoonIcon, Search, SunIcon, Wind, Gauge, Thermometer, Sunrise, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { WeatherSky } from "./weather-sky";
import { MoonDisc } from "./moon-disc";
export { MoonDisc } from "./moon-disc";
import { WeatherAdviceChips, WeatherAlertBanner, type WeatherAdvice, type WeatherAlert } from "./weather-advice";
export type { WeatherAdvice, WeatherAlert } from "./weather-advice";
import { weatherClassOf, type WeatherClass } from "./weather-condition";
import { phaseOf } from "./weather-scene";
import { i18n, kitLocaleTag } from "@/kit/i18n";

export interface ForecastHour { time: string; temp: number; condition?: string; code?: number; pop?: number; amount?: number; windSpeed?: number; isDay?: boolean }
export interface ForecastDay { date: string; high: number; low: number; code: number; pop?: number; amount?: number }
export interface ForecastMinutely { time: string; amount: number }
/** Additive, optional data for detail tiles. Missing fields omit their tile or sentence. */
export interface WeatherLocationDetail {
  temp: number; condition: string; code: number; isDay: boolean; high?: number; low?: number;
  hourly?: readonly ForecastHour[]; daily?: readonly ForecastDay[]; minutely?: readonly ForecastMinutely[]; precipUnit?: "mm" | "in";
  airQuality?: { aqi: number; category: string };
  wind?: { speed: number; direction: number; gust?: number; label?: string };
  sunrise?: string; sunset?: string; uvIndex?: number; feelsLike?: number; humidity?: number; dewPoint?: number;
  precipitation?: number; precipitationAmount?: number; precipitationLast24h?: number; precipitationNext24h?: number;
  visibility?: number; visibilityDescription?: string; pressure?: number; pressureTrend?: "rising" | "falling" | "steady";
  moon?: { phase: string; illumination: number; nextFull?: string; nextNew?: string };
}
export interface WeatherLocation { id: string; city: string; state?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; localTime?: string; isMyLocation?: boolean; detail?: WeatherLocationDetail }
export interface WeatherForecastPageLabels {
  searchLocations: string; myLocation: string; weatherUnavailable: string; backToLocations: string; hourlyForecast: string; tenDayForecast: string;
  airQuality: string; wind: string; conditions: string; temperature: string; precipitationMetric: string; windMetric: string; sunriseAndSunset: string; uvIndex: string; feelsLike: string; humidity: string; precipitation: string;
  visibility: string; pressure: string; moonPhase: string; nextFullMoon: string; nextNewMoon: string; currentTemperature: string; detailsUnavailable: string; addLocation: string; removeLocation: string; precipitationIntensity: string;
}
export const weatherForecastPageDefaultLabels: WeatherForecastPageLabels = {
  get searchLocations() { return i18n._({ id: "ui.Search locations", message: "Search locations" }); },
  get myLocation() { return i18n._({ id: "ui.My Location", message: "My Location" }); },
  get weatherUnavailable() { return i18n._({ id: "ui.Weather unavailable", message: "Weather unavailable" }); },
  get backToLocations() { return i18n._({ id: "ui.Locations", message: "Locations" }); },
  get hourlyForecast() { return i18n._({ id: "ui.Hourly Forecast", message: "Hourly Forecast" }); },
  get tenDayForecast() { return i18n._({ id: "ui.10-Day Forecast", message: "10-Day Forecast" }); },
  get airQuality() { return i18n._({ id: "ui.Air Quality", message: "Air Quality" }); },
  get wind() { return i18n._({ id: "ui.Wind", message: "Wind" }); },
  get conditions() { return i18n._({ id: "ui.Conditions", message: "Conditions" }); },
  get temperature() { return i18n._({ id: "ui.Temperature", message: "Temperature" }); },
  get precipitationMetric() { return i18n._({ id: "ui.Precipitation", message: "Precipitation" }); },
  get windMetric() { return i18n._({ id: "ui.Wind", message: "Wind" }); },
  get sunriseAndSunset() { return i18n._({ id: "ui.Sunrise & Sunset", message: "Sunrise & Sunset" }); },
  get uvIndex() { return i18n._({ id: "ui.UV Index", message: "UV Index" }); },
  get feelsLike() { return i18n._({ id: "ui.Feels Like", message: "Feels Like" }); },
  get humidity() { return i18n._({ id: "ui.Humidity", message: "Humidity" }); },
  get precipitation() { return i18n._({ id: "ui.Precipitation", message: "Precipitation" }); },
  get precipitationIntensity() { return i18n._({ id: "ui.Intensity - Chance of rain", message: "Intensity - Chance of rain" }); },
  get visibility() { return i18n._({ id: "ui.Visibility", message: "Visibility" }); },
  get pressure() { return i18n._({ id: "ui.Pressure", message: "Pressure" }); },
  get moonPhase() { return i18n._({ id: "ui.Moon Phase", message: "Moon Phase" }); },
  get nextFullMoon() { return i18n._({ id: "ui.Next full moon", message: "Next full moon" }); },
  get nextNewMoon() { return i18n._({ id: "ui.Next new moon", message: "Next new moon" }); },
  get currentTemperature() { return i18n._({ id: "ui.Current temperature", message: "Current temperature" }); },
  get detailsUnavailable() { return i18n._({ id: "ui.Weather details unavailable.", message: "Weather details unavailable." }); },
  get addLocation() { return i18n._({ id: "ui.Add location", message: "Add location" }); },
  get removeLocation() { return i18n._({ id: "ui.Remove location", message: "Remove location" }); },
};
export interface WeatherForecastPageProps {
  locations: readonly WeatherLocation[]; selectedId?: string; onSelect?: (id: string) => void; onSearch?: (query: string) => void;
  onAddLocation?: () => void; onRemoveLocation?: (id: string) => void; onSelectResult?: (result: WeatherLocation) => void;
  searchResults?: readonly WeatherLocation[]; unit?: "F" | "C"; locale?: string; className?: string; labels?: Partial<WeatherForecastPageLabels>;
  /** Advice chips for the selected place, drawn under the current conditions. Absent or empty: nothing extra. */
  advice?: readonly WeatherAdvice[];
  /** One or two written sentences about the day, drawn under the hero. */
  summary?: string;
  /** An alert banner for the selected place, drawn above the forecast. Absent: nothing extra. */
  alert?: WeatherAlert;
}

export function dedupeLocations(locations: readonly WeatherLocation[]): WeatherLocation[] {
  const ids = new Set<string>(); const coords = new Set<string>(); const result: WeatherLocation[] = [];
  for (const location of locations) {
    const coord = location.latitude !== undefined && location.longitude !== undefined ? `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}` : undefined;
    if (ids.has(location.id) || (coord && coords.has(coord))) continue;
    ids.add(location.id); if (coord) coords.add(coord); result.push(location);
  }
  return result.sort((a, b) => Number(Boolean(b.isMyLocation)) - Number(Boolean(a.isMyLocation)));
}
export function rangeBarMetrics(low: number, high: number, globalMin: number, globalMax: number, current?: number) {
  const span = Math.max(1, globalMax - globalMin);
  return { left: Math.max(0, Math.min(100, (low - globalMin) / span * 100)), width: Math.max(0, Math.min(100, (high - low) / span * 100)), dot: current === undefined ? undefined : Math.max(0, Math.min(100, (current - globalMin) / span * 100)) };
}
function PressureGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, (value - 980) / 70));
  const angle = Math.PI * (1 - pct);
  const x = 100 + 82 * Math.cos(angle); const y = 92 - 82 * Math.sin(angle);
  return <svg data-slot="weather-pressure-gauge" viewBox="0 0 200 106" className="mt-2 h-14 w-full" role="img" aria-label={i18n._({ id: "ui.Pressure {value} hPa", message: "Pressure {value} hPa", values: { value } })}><path d="M18 92 A82 82 0 0 1 182 92" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round"/><path d={`M18 92 A82 82 0 0 1 ${x} ${y}`} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"/><circle cx={x} cy={y} r="6" fill="var(--primary)" stroke="var(--card)" strokeWidth="3"/><text x="12" y="105" fontSize="9" fill="currentColor">980</text><text x="188" y="105" textAnchor="end" fontSize="9" fill="currentColor">1050 hPa</text></svg>;
}
export function formatLocalTime(value: string, timeZone?: string, locale = kitLocaleTag()): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    try { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(date); } catch { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date); }
  }
  const match = /T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const dateForClock = new Date(Date.UTC(2020, 0, 1, Number(match[1]), Number(match[2])));
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(dateForClock);
}
const pressureTrendLabel = (trend: "rising" | "falling" | "steady"): string => trend === "rising" ? i18n._({ id: "ui.rising", message: "rising" }) : trend === "falling" ? i18n._({ id: "ui.falling", message: "falling" }) : i18n._({ id: "ui.steady", message: "steady" });
const metricWord = (metric: "temperature" | "precipitation" | "wind"): string => metric === "temperature" ? i18n._({ id: "ui.temperature", message: "temperature" }) : metric === "precipitation" ? i18n._({ id: "ui.precipitation", message: "precipitation" }) : i18n._({ id: "ui.wind", message: "wind" });
const deg = (n: number) => `${Math.round(n)}°`;
const ICONS: Record<WeatherClass, typeof SunIcon> = { clear: SunIcon, "partly-cloudy": CloudSunIcon, overcast: CloudIcon, fog: CloudFogIcon, drizzle: CloudDrizzleIcon, rain: CloudRainIcon, snow: CloudSnowIcon, thunderstorm: CloudLightningIcon };
function localDateKey(value: string, timeZone?: string): string | undefined {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = /^(\d{4}-\d{2}-\d{2})T/.exec(value);
    return match?.[1];
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(x => x.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
function clockMinutes(value: string, dateKey: string, timeZone?: string): number | undefined {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
      return Number(parts.find(x => x.type === "hour")?.value) * 60 + Number(parts.find(x => x.type === "minute")?.value);
    } catch { /* Use the source timestamp's clock below. */ }
  }
  const match = new RegExp(`^${dateKey}T(\\d{2}):(\\d{2})`).exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}
function timeValueForDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(value);
  if (iso) return Number(iso[1]) * 60 + Number(iso[2]);
  const clock = /(?:T)?(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(value);
  if (!clock) return undefined;
  let hour = Number(clock[1]) % 12;
  if (clock[3]?.toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(clock[2]);
}
function hourIsDay(hour: ForecastHour, detail: WeatherLocationDetail, timeZone?: string): boolean {
  if (hour.isDay !== undefined) return hour.isDay;
  const dateKey = localDateKey(hour.time, timeZone);
  const minutes = dateKey ? clockMinutes(hour.time, dateKey, timeZone) : undefined;
  if (dateKey && minutes !== undefined) {
    const sunrise = timeValueForDate(detail.sunrise);
    const sunset = timeValueForDate(detail.sunset);
    if (sunrise !== undefined && sunset !== undefined) {
      const at = new Date(`${dateKey}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`);
      return phaseOf({ sunrise: `${dateKey}T${String(Math.floor(sunrise / 60)).padStart(2, "0")}:${String(sunrise % 60).padStart(2, "0")}`, sunset: `${dateKey}T${String(Math.floor(sunset / 60)).padStart(2, "0")}:${String(sunset % 60).padStart(2, "0")}`, now: at, isDay: detail.isDay }).phase === "day";
    }
  }
  return detail.isDay;
}
function hourlyIcon(cls: WeatherClass, isDay: boolean) {
  if (isDay) return ICONS[cls];
  if (cls === "clear") return MoonIcon;
  if (cls === "partly-cloudy") return CloudMoonIcon;
  return ICONS[cls];
}
const dayName = (date: string, locale: string) => { const parts = date.split("-").map(Number); const y = parts[0] ?? 2000; const m = parts[1] ?? 1; const d = parts[2] ?? 1; return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d))); };
function moonDate(value: string | undefined, locale: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return undefined;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}
function Tile({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <section data-slot="weather-tile" style={{ color: "var(--weather-ink)" }} className={cn("border-border flex w-full min-w-0 min-h-40 flex-col rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur-xl", className)}><h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase opacity-80">{icon}<span>{title}</span></h3>{children}</section>;
}
function PlaceLine({ location, labels }: { location: WeatherLocation; labels: WeatherForecastPageLabels }) {
  const line = [location.state, location.country].filter(Boolean).join(", ");
  return <span className="flex flex-col text-left"><span className="flex items-center gap-1.5 text-sm font-semibold">{location.isMyLocation && <MapPin className="size-3.5" aria-hidden/>}{location.isMyLocation ? `${labels.myLocation} · ` : ""}{location.city}</span>{line && <span className="text-xs opacity-75">{line}</span>}</span>;
}
function LocationSky({ location, labels }: { location: WeatherLocation; labels: WeatherForecastPageLabels }) {
  const detail = location.detail ?? { temp: 0, condition: labels.weatherUnavailable, code: 3, isDay: true };
  const cls = weatherClassOf(detail.code);
  return <div data-slot="weather-location-sky" data-class={cls} style={{ color: "var(--weather-ink)" }} className="relative isolate flex h-40 w-full flex-col justify-between overflow-hidden rounded-2xl bg-card p-4 text-left">
    <div className="absolute inset-0 -z-10 overflow-hidden"><WeatherSky cls={cls} isDay={detail.isDay} code={detail.code} variant="lite" sunrise={detail.sunrise?.includes("T") ? detail.sunrise : undefined} sunset={detail.sunset?.includes("T") ? detail.sunset : undefined} wind={detail.wind?.speed}/></div>
    <div data-slot="weather-location-header" className="flex min-w-0 items-start gap-2"><div data-slot="weather-location-name" className="min-w-0 flex-1 truncate"><PlaceLine location={location} labels={labels}/></div><div data-slot="weather-location-actions" className="ml-auto flex shrink-0 items-center gap-2"><span data-slot="weather-location-time" className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums">{location.localTime ?? ""}</span>{!location.isMyLocation && <span data-slot="weather-location-remove-space" className="size-7 shrink-0" aria-hidden="true" />}</div></div>
    <div><span className="block text-4xl font-light tabular-nums">{deg(detail.temp)}</span><span className="text-xs">{detail.condition}{detail.high !== undefined && detail.low !== undefined ? ` · ${i18n._({ id: "ui.H {high} L {low}", message: "H {high} L {low}", values: { high: deg(detail.high), low: deg(detail.low) } })}` : ""}</span></div>
  </div>;
}
export function WeatherForecastPage({ locations, selectedId, onSelect, onSearch, onAddLocation, onRemoveLocation, onSelectResult, searchResults = [], unit = "F", locale = kitLocaleTag(), className, labels: labelsProp, advice, summary, alert }: WeatherForecastPageProps) {
  const labels = { ...weatherForecastPageDefaultLabels, ...labelsProp }; const [mobileListOpen, setMobileListOpen] = useState(false); const [metric, setMetric] = useState<"temperature" | "precipitation" | "wind">("temperature");
  const uniqueLocations = useMemo(() => dedupeLocations(locations), [locations]);
  const selected = uniqueLocations.find((l) => l.id === selectedId) ?? uniqueLocations.find((l) => l.isMyLocation) ?? uniqueLocations[0]; const d = selected?.detail;
  const cls = d ? weatherClassOf(d.code) : "overcast";
  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; event.preventDefault(); const next = uniqueLocations[(index + (event.key === "ArrowDown" ? 1 : -1) + uniqueLocations.length) % uniqueLocations.length]; if (next) { onSelect?.(next.id); document.querySelector<HTMLElement>(`[data-location-id="${CSS.escape(next.id)}"]`)?.focus(); } };
  const daily = d?.daily?.slice(0, 10) ?? []; const globalMin = daily.length ? Math.min(...daily.map(x => x.low)) : 0; const globalMax = daily.length ? Math.max(...daily.map(x => x.high)) : 1;
  const fmt = (v: number, suffix = "") => `${Math.round(v)}${suffix}`;
  const tile = (title: string, value: ReactNode, description: string, visual?: ReactNode, className?: string) => <Tile key={title} title={title} icon={title === labels.airQuality ? <Wind className="size-4" aria-hidden/> : title === labels.wind ? <Wind className="size-4" aria-hidden/> : title === labels.uvIndex ? <SunIcon className="size-4" aria-hidden/> : title === labels.humidity ? <DropletIcon className="size-4" aria-hidden/> : title === labels.feelsLike ? <Thermometer className="size-4" aria-hidden/> : title === labels.precipitation ? <DropletIcon className="size-4" aria-hidden/> : title === labels.visibility ? <CloudIcon className="size-4" aria-hidden/> : title === labels.pressure ? <Gauge className="size-4" aria-hidden/> : undefined} className={className}><div className="text-3xl font-light tabular-nums">{value}</div><p className="mt-1 line-clamp-1 text-xs opacity-80">{description}</p>{visual && <div className="pt-2">{visual}</div>}</Tile>;
  const tileVisual = (title: string, icon: ReactNode, children: ReactNode, className?: string) => <Tile key={title} title={title} icon={icon} className={className}>{children}</Tile>;
  return <div data-slot="weather-forecast-page" className={cn("relative min-h-[680px] lg:grid lg:gap-5 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]", className)}>
    <aside data-slot="weather-location-list" className={cn("min-w-0 space-y-3", mobileListOpen ? "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-border bg-background p-4 shadow-xl" : "hidden", "lg:static lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none")}>
      {mobileListOpen && <Button type="button" variant="ghost" size="sm" onClick={() => setMobileListOpen(false)} className="mb-2 lg:hidden">{labels.backToLocations}</Button>}
      <div className="flex gap-2"><label className="border-border bg-card flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3"><Search className="text-muted-foreground size-4" aria-hidden/><Input aria-label={labels.searchLocations} className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" placeholder={labels.searchLocations} onChange={(e) => onSearch?.(e.currentTarget.value)}/></label><Button type="button" variant="outline" size="icon" aria-label={labels.addLocation} onClick={onAddLocation}><span aria-hidden>+</span></Button></div>
      {searchResults.length > 0 && <ul className="bg-card border-border rounded-xl border p-1">{searchResults.map(result => <li key={result.id}><Button type="button" variant="ghost" width="full" align="start" onClick={() => { onSelectResult?.(result); }}>{result.city}{result.state ? `, ${result.state}` : ""}</Button></li>)}</ul>}
      <div role="listbox" aria-label={i18n._({ id: "ui.Locations", message: "Locations" })} className="space-y-3">{uniqueLocations.map((location, index) => <div role="option" aria-selected={selected?.id === location.id} key={location.id} data-location-id={location.id} tabIndex={0} onKeyDown={(e) => keyDown(e, index)} className="relative rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
        <Button type="button" variant="ghost" size="default" align="start" height="auto" width="full" data-slot="weather-location" aria-pressed={selected?.id === location.id} aria-label={`${location.city}${location.isMyLocation ? `, ${labels.myLocation}` : ""}`} onClick={() => { onSelect?.(location.id); setMobileListOpen(false); }} className={cn("h-40 p-0 hover:bg-transparent", selected?.id === location.id && "rounded-2xl ring-2 ring-ring")}><LocationSky location={location} labels={labels}/></Button>
        {!location.isMyLocation && onRemoveLocation && <Button type="button" variant="ghost" size="icon" aria-label={i18n._({ id: "ui.{label}: {city}", message: "{label}: {city}", values: { label: labels.removeLocation, city: location.city } })} onClick={() => onRemoveLocation(location.id)} className="weather-remove-hit absolute right-1 top-1 z-10 size-11 min-h-11 rounded-full p-0 text-[var(--weather-ink)]"><span className="weather-remove-chip"><X className="size-4" aria-hidden/></span></Button>}
      </div>)}</div>
    </aside>
    {selected && <main data-slot="weather-location-detail" className="relative isolate min-w-0 overflow-hidden pb-[calc(49px+env(safe-area-inset-bottom)+1.5rem)] lg:pb-8">
      {d && <div data-weather-layer="detail-sky" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden lg:absolute"><WeatherSky cls={cls} isDay={d.isDay} code={d.code} sunrise={d.sunrise?.includes("T") ? d.sunrise : undefined} sunset={d.sunset?.includes("T") ? d.sunset : undefined} wind={d.wind?.speed}/></div>}
      {d ? <>
        {alert ? <div className="mb-4"><WeatherAlertBanner alert={alert}/></div> : null}
        <section data-slot="weather-forecast-hero" data-class={cls} style={{ color: "var(--weather-ink)" }} className="relative -mx-4 mb-4 flex min-h-[42svh] flex-col items-center justify-center overflow-hidden bg-transparent p-6 text-center sm:mx-0 sm:min-h-72 sm:items-start sm:justify-end sm:rounded-3xl sm:p-7">
          <div className="mb-5"><p className="text-xs font-semibold tracking-[.18em] uppercase">{selected.isMyLocation ? labels.myLocation : selected.city}</p><p className="mt-1 text-2xl font-medium sm:text-xl">{selected.isMyLocation ? `${selected.city}${selected.state ? `, ${selected.state}` : ""}` : selected.state ? `${selected.city}, ${selected.state}` : selected.country ? `${selected.city}, ${selected.country}` : selected.city}</p></div>
          <p className="text-[5.5rem] leading-none font-extralight tabular-nums sm:text-7xl">{deg(d.temp)}<span className="text-3xl">{unit}</span></p><p className="mt-2 text-lg">{d.condition}</p><p className="mt-1 text-sm">{d.feelsLike !== undefined ? i18n._({ id: "ui.Feels Like: {temp}", message: "Feels Like: {temp}", values: { temp: `${deg(d.feelsLike)}${unit}` } }) : ""}</p><p className="mt-1 text-sm">{d.high !== undefined && d.low !== undefined ? i18n._({ id: "ui.H:{high} L:{low}", message: "H:{high} L:{low}", values: { high: deg(d.high), low: deg(d.low) } }) : ""}</p>
        </section>
        {(summary || advice?.length) ? <div style={{ color: "var(--weather-ink)" }}>
          {summary ? <p data-slot="weather-forecast-summary" className="mb-4 text-base leading-relaxed">{summary}</p> : null}
          {advice?.length ? <div className="mb-4"><WeatherAdviceChips advice={advice}/></div> : null}
        </div> : null}
        <div data-slot="weather-detail-grid" className="grid min-w-0 w-full grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] auto-rows-[minmax(160px,auto)] items-start gap-3">
          {d.hourly?.length ? <Tile title={labels.hourlyForecast} icon={<Thermometer className="size-4" aria-hidden/>} className="col-span-full order-0 h-auto min-h-0 sm:order-none"><ol data-slot="weather-hourly-strip" className="flex min-w-0 gap-2 overflow-x-auto pb-2">{d.hourly.slice(0,24).map((hour,i) => { const Icon = hourlyIcon(weatherClassOf(hour.code ?? d.code), hourIsDay(hour, d, selected.timezone)); return <li key={hour.time} data-slot="weather-forecast-hour" className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-2 text-sm"><span className="whitespace-nowrap opacity-80">{i === 0 ? i18n._({ id: "ui.Now", message: "Now" }) : formatLocalTime(hour.time, selected.timezone, locale).replace(/:\d{2}(?=\s|$)/, "")}</span><Icon className="size-5" aria-hidden/><b className="tabular-nums">{deg(hour.temp)}{unit}</b><span className="text-primary h-4 text-xs">{hour.pop !== undefined && hour.pop >= 10 ? `${hour.pop}%` : " "}</span></li>; })}</ol></Tile> : null}

          {d.hourly?.length ? <Tile title={labels.conditions} icon={<Thermometer className="size-4" aria-hidden/>} className="col-span-full order-1 sm:order-none">
            <div role="group" aria-label={labels.conditions} data-slot="weather-condition-switcher" className="mb-3 flex rounded-lg bg-muted p-1">{([["temperature",labels.temperature],["precipitationMetric",labels.precipitation],["windMetric",labels.wind]] as const).map(([key,label]) => { const active = metric === ({temperature:"temperature",precipitationMetric:"precipitation",windMetric:"wind"}[key]); return <button key={key} type="button" aria-pressed={active} onClick={() => setMetric((({temperature:"temperature",precipitationMetric:"precipitation",windMetric:"wind"}[key]) as "temperature" | "precipitation" | "wind"))} className={cn("min-h-9 flex-1 rounded-md px-2 text-xs text-[var(--card-foreground)]", active && "bg-primary text-[var(--primary-foreground)]")}>{label}</button>; })}</div>
            <p data-slot="weather-selected-metric" className="text-sm font-medium">{metric === "temperature" ? labels.temperature : metric === "precipitation" ? labels.precipitation : labels.wind}</p>
            <div data-slot="weather-hourly-chart" data-metric={metric} className="relative mt-2 h-28" role="group" aria-label={i18n._({ id: "ui.{label}: {metric}", message: "{label}: {metric}", values: { label: labels.hourlyForecast, metric: metricWord(metric) } })}>
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">{[100,66,33,0].map((level,i)=><div key={level} data-slot="weather-chart-gridline" className="flex items-center gap-2"><span className="w-7 text-right text-[9px] opacity-80">{i === 0 ? i18n._({ id: "ui.max", message: "max" }) : i === 3 ? "0" : ""}</span><i className="flex-1 border-t border-border/70"/></div>)}</div>
              <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-1">{d.hourly.slice(0, 12).map((hour,index) => { const val = metric === "temperature" ? hour.temp : metric === "precipitation" ? (hour.pop ?? 0) : (hour.windSpeed ?? 0); const values = d.hourly!.slice(0,12).map(h => metric === "temperature" ? h.temp : metric === "precipitation" ? (h.pop ?? 0) : (h.windSpeed ?? 0)); const min = Math.min(...values); const max = Math.max(min + 1, ...values); const pct = (val-min)/(max-min)*74+8; return <div key={hour.time} className="relative flex h-full min-w-2 flex-1 flex-col justify-end"><button type="button" data-slot="weather-chart-bar" aria-label={`${formatLocalTime(hour.time, selected.timezone, locale)}: ${val}`} title={`${val}`} className={cn("w-full rounded-t bg-primary/75 transition-colors hover:bg-primary focus-visible:bg-primary focus-visible:outline-2 focus-visible:outline-ring", index === 0 && "bg-primary ring-2 ring-primary/50")} style={{height:`${pct}%`}}/><span className="text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px]">{index % 3 === 0 ? formatLocalTime(hour.time, selected.timezone, locale).replace(/:\d{2}(?=\s|$)/, "") : ""}</span></div>; })}</div>
            </div>
          </Tile> : null}

          {(d.minutely?.length || d.hourly?.some(h => h.amount !== undefined || h.pop !== undefined) || d.daily?.some(x => x.amount !== undefined || x.pop !== undefined)) ? <Tile title={labels.precipitation} icon={<DropletIcon className="size-4" aria-hidden/>} className="col-span-full order-2 sm:order-none">
            <p className="mb-3 text-xs opacity-80">{labels.precipitationIntensity}</p>
            {(() => { const slots = d.minutely?.length ? d.minutely.slice(0,12).map((x,i) => ({...x, pop: undefined, label: i === 0 ? i18n._({ id: "ui.Now", message: "Now" }) : formatLocalTime(x.time, selected.timezone, locale), minute: true})) : (d.hourly ?? []).slice(0,12).map((x,i) => ({...x, label: i === 0 ? i18n._({ id: "ui.Now", message: "Now" }) : formatLocalTime(x.time, selected.timezone, locale), minute: false})); return <ol data-slot="weather-precipitation-hours" className="flex min-w-0 gap-3 overflow-x-auto pb-3">{slots.map(x => { const pct = Math.max(x.amount === undefined ? 8 : 0, Math.min(100, (x.amount ?? 0) / (d.precipUnit === "in" ? 0.1 : 2.5) * 100)); return <li key={x.time} className="flex w-12 shrink-0 flex-col items-center gap-1 text-xs"><span className="whitespace-nowrap opacity-80">{x.label}</span><span className="bg-muted flex h-20 w-3 items-end overflow-hidden rounded-full"><i data-slot="weather-precipitation-bar" className="block w-full rounded-full bg-primary" style={{height:`${pct}%`}}/></span><span className="text-primary tabular-nums">{x.minute ? ((x.amount ?? 0) > 0 ? `${x.amount} ${d.precipUnit ?? (unit === "F" ? "in" : "mm")}` : " ") : x.pop !== undefined ? `${x.pop}%` : " "}</span></li>; })}</ol>; })()}
            {daily.some(x => x.amount !== undefined || x.pop !== undefined) && <ol data-slot="weather-precipitation-daily" className="divide-border divide-y">{daily.map((day,i) => <li key={day.date} className="grid min-h-9 grid-cols-[4rem_minmax(2rem,1fr)_auto_auto] items-center gap-3 text-xs tabular-nums"><span>{i === 0 ? i18n._({ id: "ui.Today", message: "Today" }) : dayName(day.date,locale)}</span><span className="bg-muted h-1.5 overflow-hidden rounded-full"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,(day.amount ?? 0)/(d.precipUnit === "in" ? 0.5 : 12.5)*100))}%`}}/></span><span>{day.amount === undefined ? "" : day.amount === 0 ? `0 ${d.precipUnit ?? (unit === "F" ? "in" : "mm")}` : `${d.precipUnit === "in" ? day.amount.toFixed(2).replace(/^0/, "") : day.amount} ${d.precipUnit ?? (unit === "F" ? "in" : "mm")}`}</span><span className="text-primary">{day.pop === undefined ? "" : `${day.pop}%`}</span></li>)}</ol>}
          </Tile> : null}
          {daily.length ? <Tile title={labels.tenDayForecast} icon={<SunIcon className="size-4" aria-hidden/>} className="col-span-full order-3 sm:order-none"><ol data-slot="weather-daily-list" className="min-w-0 divide-border divide-y">{daily.map((day,i) => { const Icon = ICONS[weatherClassOf(day.code)]; const m = rangeBarMetrics(day.low, day.high, globalMin, globalMax, i === 0 ? d.temp : undefined); return <li key={day.date} className="grid min-h-11 min-w-0 grid-cols-[3rem_2rem_2.4rem_minmax(0,1fr)_2.4rem] items-center gap-1 sm:gap-2 text-sm tabular-nums"><span>{i === 0 ? i18n._({ id: "ui.Today", message: "Today" }) : dayName(day.date,locale)}</span><span className="flex flex-col items-center"><Icon className="size-4" aria-hidden/>{day.pop !== undefined && day.pop >= 20 && <small className="text-primary text-[10px]">{day.pop}%</small>}</span><span className="text-right opacity-80">{deg(day.low)}</span><span className="bg-muted relative h-1.5 min-w-0 rounded-full"><span className="from-[var(--weather-range-cool)] via-[var(--weather-range-mid)] to-[var(--weather-range-warm)] absolute h-full rounded-full bg-gradient-to-r" style={{left:`${m.left}%`,width:`${m.width}%`}}/>{m.dot !== undefined && <i aria-label={labels.currentTemperature} className="bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{left:`${m.dot}%`}}/>}</span><span className="text-right">{deg(day.high)}</span></li>; })}</ol></Tile> : null}

          {d.uvIndex !== undefined && tile(labels.uvIndex, d.uvIndex, d.uvIndex < 3 ? i18n._({ id: "ui.Low", message: "Low" }) : d.uvIndex < 6 ? i18n._({ id: "ui.Moderate", message: "Moderate" }) : d.uvIndex < 8 ? i18n._({ id: "ui.High", message: "High" }) : i18n._({ id: "ui.Very high", message: "Very high" }), <div data-slot="weather-uv-bar" className="relative h-2 rounded-full bg-gradient-to-r from-[var(--weather-uv-low)] via-[var(--weather-uv-mid)] to-[var(--weather-uv-high)]"><i className="absolute -top-1 size-4 rounded-full border-2 border-background bg-foreground" style={{left:`${Math.min(100,d.uvIndex/11*100)}%`}}/></div>, "order-3 sm:order-none")}
          {(d.sunrise || d.sunset) && tileVisual(labels.sunriseAndSunset, <Sunrise className="size-4" aria-hidden/>, <><div className="flex justify-between text-2xl font-light tabular-nums"><span>{d.sunrise ? formatLocalTime(d.sunrise, selected.timezone, locale) : ""}</span><span>{d.sunset ? formatLocalTime(d.sunset, selected.timezone, locale) : ""}</span></div><div data-slot="weather-sun-arc" className="mt-2"><svg viewBox="0 0 200 76" className="h-16 w-full" aria-hidden="true"><path d="M8 58 Q100 -28 192 58" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="2"/><path d="M8 58 H192" fill="none" stroke="currentColor" strokeOpacity=".35"/><circle cx="100" cy="15" r="6" fill="var(--primary)"/><text x="8" y="73" fontSize="9" fill="currentColor">{i18n._({ id: "ui.Sunrise", message: "Sunrise" })}</text><text x="192" y="73" textAnchor="end" fontSize="9" fill="currentColor">{i18n._({ id: "ui.Sunset", message: "Sunset" })}</text></svg></div></>, "order-4 sm:order-none")}
          {!(d.minutely?.length || d.hourly?.some(h => h.amount !== undefined || h.pop !== undefined) || d.daily?.some(x => x.amount !== undefined || x.pop !== undefined)) && (d.precipitation !== undefined || d.precipitationAmount !== undefined || d.precipitationLast24h !== undefined || d.precipitationNext24h !== undefined) && tileVisual(labels.precipitation, <DropletIcon className="size-4" aria-hidden/>, <><div className="text-3xl font-light tabular-nums">{d.precipitationAmount !== undefined ? `${d.precipitationAmount} ${unit === "F" ? "in" : "mm"}` : d.precipitation !== undefined ? `${d.precipitationNext24h ?? d.precipitationLast24h ?? 0} ${unit === "F" ? "in" : "mm"}` : `${d.precipitationNext24h ?? d.precipitationLast24h} ${unit === "F" ? "in" : "mm"}`}</div>{d.precipitation !== undefined && <><p className="mt-1 text-xs opacity-80">{i18n._({ id: "ui.{percent}% chance", message: "{percent}% chance", values: { percent: d.precipitation } })}</p><div data-slot="weather-precipitation-bar" className="mt-3 h-2 rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.precipitation))}%`}}/></div></>}</> , "order-5 sm:order-none")}
          {d.visibility !== undefined && tile(labels.visibility, `${fmt(d.visibility)} ${unit === "F" ? "mi" : "km"}`, d.visibility >= 10 ? i18n._({ id: "ui.Clear view", message: "Clear view" }) : d.visibility >= 4 ? i18n._({ id: "ui.Hazy", message: "Hazy" }) : i18n._({ id: "ui.Poor", message: "Poor" }), <div data-slot="weather-visibility-bar" className="h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.visibility/(unit === "F" ? 10 : 16)*100))}%`}}/></div>, "order-8 sm:order-none")}
          {d.humidity !== undefined && tile(labels.humidity, `${d.humidity}%`, d.humidity >= 60 ? i18n._({ id: "ui.The air feels humid", message: "The air feels humid" }) : d.humidity <= 30 ? i18n._({ id: "ui.Dry air", message: "Dry air" }) : i18n._({ id: "ui.Comfortable humidity", message: "Comfortable humidity" }), <div data-slot="weather-humidity-bar" className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.humidity))}%`}}/></div>, "order-7 sm:order-none")}
          {d.pressure !== undefined && tileVisual(labels.pressure, <Gauge className="size-4" aria-hidden/>, <><div className="text-3xl font-light tabular-nums">{fmt(d.pressure)} hPa</div><p className="mt-1 text-xs opacity-80">{d.pressureTrend ? pressureTrendLabel(d.pressureTrend) : i18n._({ id: "ui.Atmospheric pressure", message: "Atmospheric pressure" })}</p><PressureGauge value={d.pressure}/></>, "order-8 sm:order-none")}
          {d.airQuality && tile(labels.airQuality, <>{d.airQuality.aqi} <span className="text-base">{d.airQuality.category}</span></>, i18n._({ id: "ui.AQI {aqi}: {category}", message: "AQI {aqi}: {category}", values: { aqi: d.airQuality.aqi, category: d.airQuality.category } }), <div data-slot="weather-aqi-bar" className="relative h-2 rounded-full bg-gradient-to-r from-[var(--weather-aqi-good)] via-[var(--weather-aqi-moderate)] to-[var(--weather-aqi-poor)]"><i className="absolute -top-1 size-4 rounded-full border-2 border-background bg-foreground" style={{left:`${Math.min(100,d.airQuality.aqi/300*100)}%`}}/></div>, "order-9 sm:order-none")}

          {d.feelsLike !== undefined && tile(labels.feelsLike, `${deg(d.feelsLike)}${unit}`, d.feelsLike > d.temp ? i18n._({ id: "ui.Feels warmer than {temp}{unit}", message: "Feels warmer than {temp}{unit}", values: { temp: deg(d.temp), unit } }) : d.feelsLike < d.temp ? i18n._({ id: "ui.Feels cooler than {temp}{unit}", message: "Feels cooler than {temp}{unit}", values: { temp: deg(d.temp), unit } }) : i18n._({ id: "ui.Feels like the air temperature", message: "Feels like the air temperature" }), undefined, "order-11 sm:order-none")}

          {d.wind && tileVisual(labels.wind, <Wind className="size-4" aria-hidden/>, <div className="flex flex-row items-center gap-4 max-sm:gap-2"><div data-slot="weather-wind-dial" className="relative size-24 shrink-0 rounded-full border border-border max-sm:size-20"><span className="absolute inset-x-0 top-1 text-center text-[9px] font-semibold">{i18n._({ id: "ui.N (compass north)", message: "N" })}</span><span className="absolute inset-y-0 right-1 flex items-center text-[9px]">{i18n._({ id: "ui.E (compass east)", message: "E" })}</span><span className="absolute inset-x-0 bottom-1 text-center text-[9px]">{i18n._({ id: "ui.S (compass south)", message: "S" })}</span><span className="absolute inset-y-0 left-1 flex items-center text-[9px]">{i18n._({ id: "ui.W (compass west)", message: "W" })}</span>{[0,45,90,135].map(a=><i key={a} className="absolute left-1/2 top-1/2 h-2 -translate-x-1/2 -translate-y-1/2 border-l border-border" style={{transform:`translate(-50%,-50%) rotate(${a}deg) translateY(-43px)`}}/>)}<span data-slot="weather-wind-needle" className="absolute left-1/2 top-1/2 block h-12 w-0.5 origin-bottom bg-primary" style={{transform:`translate(-50%,-100%) rotate(${d.wind.direction}deg)`}}/><span className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold tabular-nums">{fmt(d.wind.speed)}<small className="text-[9px] font-normal">{d.wind.label ?? (unit === "F" ? "mph" : "km/h")}</small></span></div><div className="min-w-0 text-sm whitespace-nowrap">{d.wind.gust !== undefined ? i18n._({ id: "ui.Gust {speed} {unit}", message: "Gust {speed} {unit}", values: { speed: fmt(d.wind.gust), unit: d.wind.label ?? (unit === "F" ? "mph" : "km/h") } }) : i18n._({ id: "ui.Wind direction", message: "Wind direction" })}</div></div>, "col-span-full order-12 sm:order-none")}
          {d.moon && <Tile title={labels.moonPhase} icon={<MoonIcon className="size-4" aria-hidden/>} className="col-span-full order-12 sm:order-none"><div className="flex items-center gap-3"><MoonDisc phase={d.moon.phase} illumination={d.moon.illumination} size={64}/><div><div className="text-xl font-light">{d.moon.phase}</div><p className="text-xs opacity-80">{i18n._({ id: "ui.{percent}% illuminated", message: "{percent}% illuminated", values: { percent: Math.max(0, Math.min(100, d.moon.illumination)) } })}</p></div></div>{moonDate(d.moon.nextFull, locale) && <p className="mt-2 text-xs opacity-80">{labels.nextFullMoon}: {moonDate(d.moon.nextFull, locale)}</p>}{moonDate(d.moon.nextNew, locale) && <p className="text-xs opacity-80">{labels.nextNewMoon}: {moonDate(d.moon.nextNew, locale)}</p>}</Tile>}
        </div>
      </> : <div data-slot="weather-empty-detail" className="text-muted-foreground rounded-2xl border p-8">{labels.detailsUnavailable}</div>}
    </main>}
    <div data-slot="weather-mobile-controls" className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(49px+env(safe-area-inset-bottom))] items-center gap-1 border-t border-border bg-card/50 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"><Button type="button" variant="ghost" size="icon-sm" data-slot="weather-mobile-locations" aria-label={labels.backToLocations} title={labels.backToLocations} onClick={() => setMobileListOpen(true)}><MapPin className="size-4" aria-hidden/></Button><label data-slot="weather-mobile-search" className="flex min-w-0 flex-1 basis-0 items-center gap-2 px-2"><Search className="text-muted-foreground size-4 shrink-0" aria-hidden/><Input aria-label={labels.searchLocations} className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none" placeholder={i18n._({ id: "ui.Search", message: "Search" })} onChange={e => onSearch?.(e.currentTarget.value)}/></label><Button type="button" variant="outline" size="icon-sm" aria-label={labels.addLocation} onClick={onAddLocation}><span aria-hidden>+</span></Button></div>
  </div>;
}

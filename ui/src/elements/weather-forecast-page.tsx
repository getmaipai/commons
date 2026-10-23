"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, CloudDrizzleIcon, CloudFogIcon, CloudIcon, CloudLightningIcon, CloudRainIcon, CloudSnowIcon, CloudSunIcon, DropletIcon, MapPin, MoonIcon, Search, SunIcon, Wind, Gauge, Thermometer, Sunrise, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { WeatherSky } from "./weather-sky";
import { weatherClassOf, type WeatherClass } from "./weather-condition";

export interface ForecastHour { time: string; temp: number; condition?: string; code?: number; pop?: number; windSpeed?: number }
export interface ForecastDay { date: string; high: number; low: number; code: number; pop?: number }
/** Additive, optional data for detail tiles. Missing fields omit their tile or sentence. */
export interface WeatherLocationDetail {
  temp: number; condition: string; code: number; isDay: boolean; high?: number; low?: number;
  hourly?: readonly ForecastHour[]; daily?: readonly ForecastDay[];
  airQuality?: { aqi: number; category: string };
  wind?: { speed: number; direction: number; gust?: number; label?: string };
  sunrise?: string; sunset?: string; uvIndex?: number; feelsLike?: number; humidity?: number; dewPoint?: number;
  precipitation?: number; precipitationAmount?: number; precipitationLast24h?: number; precipitationNext24h?: number;
  visibility?: number; visibilityDescription?: string; pressure?: number; pressureTrend?: "rising" | "falling" | "steady";
  moon?: { phase: string; illumination: number };
}
export interface WeatherLocation { id: string; city: string; state?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; localTime?: string; isMyLocation?: boolean; detail?: WeatherLocationDetail }
export interface WeatherForecastPageLabels {
  searchLocations: string; myLocation: string; weatherUnavailable: string; backToLocations: string; hourlyForecast: string; tenDayForecast: string;
  airQuality: string; wind: string; conditions: string; temperature: string; precipitationMetric: string; windMetric: string; sunriseAndSunset: string; uvIndex: string; feelsLike: string; humidity: string; precipitation: string;
  visibility: string; pressure: string; moonPhase: string; currentTemperature: string; detailsUnavailable: string; addLocation: string; removeLocation: string;
}
export const weatherForecastPageDefaultLabels: WeatherForecastPageLabels = {
  searchLocations: "Search locations", myLocation: "My Location", weatherUnavailable: "Weather unavailable", backToLocations: "Locations",
  hourlyForecast: "Hourly Forecast", tenDayForecast: "10-Day Forecast", airQuality: "Air Quality", wind: "Wind", conditions: "Conditions", temperature: "Temperature", precipitationMetric: "Precipitation", windMetric: "Wind", sunriseAndSunset: "Sunrise & Sunset",
  uvIndex: "UV Index", feelsLike: "Feels Like", humidity: "Humidity", precipitation: "Precipitation", visibility: "Visibility", pressure: "Pressure",
  moonPhase: "Moon Phase", currentTemperature: "Current temperature", detailsUnavailable: "Weather details unavailable.", addLocation: "Add location", removeLocation: "Remove location",
};
export interface WeatherForecastPageProps {
  locations: readonly WeatherLocation[]; selectedId?: string; onSelect?: (id: string) => void; onSearch?: (query: string) => void;
  onAddLocation?: () => void; onRemoveLocation?: (id: string) => void; onSelectResult?: (result: WeatherLocation) => void;
  searchResults?: readonly WeatherLocation[]; unit?: "F" | "C"; locale?: string; className?: string; labels?: Partial<WeatherForecastPageLabels>;
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
  const largeArc = pct > 0.5 ? 1 : 0;
  return <svg data-slot="weather-pressure-gauge" viewBox="0 0 200 106" className="mt-2 h-14 w-full" role="img" aria-label={`Pressure ${value} hPa`}><path d="M18 92 A82 82 0 0 1 182 92" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round"/><path d={`M18 92 A82 82 0 ${largeArc} 1 ${x} ${y}`} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"/><circle cx={x} cy={y} r="6" fill="var(--primary)" stroke="var(--card)" strokeWidth="3"/><text x="12" y="105" fontSize="9" fill="currentColor">980</text><text x="188" y="105" textAnchor="end" fontSize="9" fill="currentColor">1050 hPa</text></svg>;
}
export function formatLocalTime(value: string, timeZone?: string, locale = "en-US"): string {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    try { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(date); } catch { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date); }
  }
  const match = /T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const dateForClock = new Date(Date.UTC(2020, 0, 1, Number(match[1]), Number(match[2])));
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(dateForClock);
}
const deg = (n: number) => `${Math.round(n)}°`;
const ICONS: Record<WeatherClass, typeof SunIcon> = { clear: SunIcon, "partly-cloudy": CloudSunIcon, overcast: CloudIcon, fog: CloudFogIcon, drizzle: CloudDrizzleIcon, rain: CloudRainIcon, snow: CloudSnowIcon, thunderstorm: CloudLightningIcon };
const dayName = (date: string, locale: string) => { const parts = date.split("-").map(Number); const y = parts[0] ?? 2000; const m = parts[1] ?? 1; const d = parts[2] ?? 1; return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d))); };
function Tile({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <section data-slot="weather-tile" className={cn("bg-card/65 border-border flex min-h-40 flex-col rounded-2xl border p-4 shadow-sm backdrop-blur-xl", className)}><h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">{icon}<span>{title}</span></h3>{children}</section>;
}
function PlaceLine({ location, labels }: { location: WeatherLocation; labels: WeatherForecastPageLabels }) {
  const line = [location.state, location.country].filter(Boolean).join(", ");
  return <span className="flex flex-col text-left"><span className="flex items-center gap-1.5 text-sm font-semibold">{location.isMyLocation && <MapPin className="size-3.5" aria-hidden/>}{location.isMyLocation ? `${labels.myLocation} · ` : ""}{location.city}</span>{line && <span className="text-xs opacity-75">{line}</span>}</span>;
}
function LocationSky({ location, labels }: { location: WeatherLocation; labels: WeatherForecastPageLabels }) {
  const detail = location.detail ?? { temp: 0, condition: labels.weatherUnavailable, code: 3, isDay: true };
  const cls = weatherClassOf(detail.code); const tod = detail.isDay ? "day" : "night";
  return <div data-slot="weather-location-sky" data-class={cls} style={{ backgroundImage: `linear-gradient(150deg,var(--weather-${cls}-${tod}-from),var(--weather-${cls}-${tod}-to))`, color: "var(--weather-ink)" }} className="relative isolate flex h-40 w-full flex-col justify-between overflow-hidden rounded-2xl p-4 text-left">
    <div className="absolute inset-0 -z-10 overflow-hidden"><WeatherSky cls={cls} isDay={detail.isDay} paused intensity={0.55}/></div><div className="absolute inset-0 -z-10 bg-[var(--weather-scrim-soft)]"/>
    <div data-slot="weather-location-header" className="flex min-w-0 items-start gap-2"><div data-slot="weather-location-name" className="min-w-0 flex-1 truncate"><PlaceLine location={location} labels={labels}/></div><div data-slot="weather-location-actions" className="ml-auto flex shrink-0 items-center gap-2"><span data-slot="weather-location-time" className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums">{location.localTime ?? ""}</span>{!location.isMyLocation && <span data-slot="weather-location-remove-space" className="size-7 shrink-0" aria-hidden="true" />}</div></div>
    <div><span className="block text-4xl font-light tabular-nums">{deg(detail.temp)}</span><span className="text-xs">{detail.condition}{detail.high !== undefined && detail.low !== undefined ? ` · H ${deg(detail.high)} L ${deg(detail.low)}` : ""}</span></div>
  </div>;
}
export function WeatherForecastPage({ locations, selectedId, onSelect, onSearch, onAddLocation, onRemoveLocation, onSelectResult, searchResults = [], unit = "F", locale = "en-US", className, labels: labelsProp }: WeatherForecastPageProps) {
  const labels = { ...weatherForecastPageDefaultLabels, ...labelsProp }; const [mobileDetail, setMobileDetail] = useState(false); const [metric, setMetric] = useState<"temperature" | "precipitation" | "wind">("temperature");
  const uniqueLocations = useMemo(() => dedupeLocations(locations), [locations]);
  const selected = uniqueLocations.find((l) => l.id === selectedId) ?? uniqueLocations.find((l) => l.isMyLocation) ?? uniqueLocations[0]; const d = selected?.detail;
  const cls = d ? weatherClassOf(d.code) : "overcast"; const tod = d?.isDay ? "day" : "night";
  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; event.preventDefault(); const next = uniqueLocations[(index + (event.key === "ArrowDown" ? 1 : -1) + uniqueLocations.length) % uniqueLocations.length]; if (next) { onSelect?.(next.id); document.querySelector<HTMLElement>(`[data-location-id="${CSS.escape(next.id)}"]`)?.focus(); } };
  const daily = d?.daily?.slice(0, 10) ?? []; const globalMin = daily.length ? Math.min(...daily.map(x => x.low)) : 0; const globalMax = daily.length ? Math.max(...daily.map(x => x.high)) : 1;
  const fmt = (v: number, suffix = "") => `${Math.round(v)}${suffix}`;
  const tile = (title: string, value: ReactNode, description: string, visual?: ReactNode, className?: string) => <Tile key={title} title={title} icon={title === labels.airQuality ? <Wind className="size-4" aria-hidden/> : title === labels.wind ? <Wind className="size-4" aria-hidden/> : title === labels.uvIndex ? <SunIcon className="size-4" aria-hidden/> : title === labels.humidity ? <DropletIcon className="size-4" aria-hidden/> : title === labels.feelsLike ? <Thermometer className="size-4" aria-hidden/> : title === labels.precipitation ? <DropletIcon className="size-4" aria-hidden/> : title === labels.visibility ? <CloudIcon className="size-4" aria-hidden/> : title === labels.pressure ? <Gauge className="size-4" aria-hidden/> : undefined} className={className}><div className="text-3xl font-light tabular-nums">{value}</div><p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{description}</p>{visual && <div className="pt-2">{visual}</div>}</Tile>;
  const tileVisual = (title: string, icon: ReactNode, children: ReactNode, className?: string) => <Tile key={title} title={title} icon={icon} className={className}>{children}</Tile>;
  return <div data-slot="weather-forecast-page" className={cn("grid min-h-[680px] gap-5 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]", className)}>
    <aside data-slot="weather-location-list" className={cn("min-w-0 space-y-3", mobileDetail && "hidden lg:block")}>
      <div className="flex gap-2"><label className="border-border bg-card flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3"><Search className="text-muted-foreground size-4" aria-hidden/><Input aria-label={labels.searchLocations} className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" placeholder={labels.searchLocations} onChange={(e) => onSearch?.(e.currentTarget.value)}/></label><Button type="button" variant="outline" size="icon" aria-label={labels.addLocation} onClick={onAddLocation}><span aria-hidden>+</span></Button></div>
      {searchResults.length > 0 && <ul className="bg-card border-border rounded-xl border p-1">{searchResults.map(result => <li key={result.id}><Button type="button" variant="ghost" width="full" align="start" onClick={() => { onSelectResult?.(result); }}>{result.city}{result.state ? `, ${result.state}` : ""}</Button></li>)}</ul>}
      <div role="listbox" aria-label="Locations" className="space-y-3">{uniqueLocations.map((location, index) => <div role="option" aria-selected={selected?.id === location.id} key={location.id} data-location-id={location.id} tabIndex={0} onKeyDown={(e) => keyDown(e, index)} className="relative rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
        <Button type="button" variant="ghost" size="default" align="start" height="auto" width="full" data-slot="weather-location" aria-pressed={selected?.id === location.id} aria-label={`${location.city}${location.isMyLocation ? `, ${labels.myLocation}` : ""}`} onClick={() => { onSelect?.(location.id); setMobileDetail(true); }} className={cn("h-40 p-0 hover:bg-transparent", selected?.id === location.id && "rounded-2xl ring-2 ring-ring")}><LocationSky location={location} labels={labels}/></Button>
        {!location.isMyLocation && onRemoveLocation && <Button type="button" variant="ghost" size="icon" aria-label={`${labels.removeLocation}: ${location.city}`} onClick={() => onRemoveLocation(location.id)} className="weather-remove-hit absolute right-1 top-1 z-10 size-11 min-h-11 rounded-full p-0 text-white"><span className="weather-remove-chip"><X className="size-4" aria-hidden/></span></Button>}
      </div>)}</div>
    </aside>
    {selected && <main data-slot="weather-location-detail" className={cn("min-w-0", !mobileDetail && "hidden lg:block")}>
      <Button type="button" variant="ghost" size="sm" data-slot="weather-back" aria-label={labels.backToLocations} onClick={() => { setMobileDetail(false); onSelect?.(""); }} className="mb-3 flex items-center gap-2 text-sm lg:hidden"><ArrowLeft className="size-4"/>{labels.backToLocations}</Button>
      {d ? <>
        <section data-slot="weather-forecast-hero" data-class={cls} style={{ backgroundImage: `linear-gradient(150deg,var(--weather-${cls}-${tod}-from),var(--weather-${cls}-${tod}-to))`, color: "var(--weather-ink)" }} className="relative isolate mb-4 flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl p-7">
          <div data-weather-layer="sky" className="absolute inset-0 z-0 overflow-hidden"><WeatherSky cls={cls} isDay={d.isDay} intensity={1}/></div><div data-weather-layer="scrim" className="absolute inset-0 z-[1] bg-gradient-to-t from-[var(--weather-text-scrim)] via-transparent to-transparent"/>
          <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-xl font-medium">{selected.city}{selected.state ? `, ${selected.state}` : ""}</p><p className="text-sm opacity-80">{selected.localTime ?? ""}{selected.timezone ? ` · ${selected.timezone}` : ""}</p></div><p className="text-xs opacity-80">Updated {d.hourly?.[0]?.time ? formatLocalTime(d.hourly[0].time, selected.timezone, locale) : "recently"}</p></div>
          <p className="text-7xl leading-none font-light tabular-nums">{deg(d.temp)}<span className="text-3xl">{unit}</span></p><p className="mt-3 text-lg">{d.condition}</p><p className="mt-1 text-sm">{d.high !== undefined && d.low !== undefined ? `H ${deg(d.high)} · L ${deg(d.low)}` : ""}</p>
        </section>
        <div data-slot="weather-detail-grid" className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] auto-rows-[minmax(160px,auto)] items-start gap-3">
          {d.hourly?.length ? <Tile title={labels.hourlyForecast} icon={<Thermometer className="size-4" aria-hidden/>} className="col-span-full h-auto min-h-0"><ol data-slot="weather-hourly-strip" className="flex gap-2 overflow-x-auto pb-2">{d.hourly.slice(0,24).map((hour,i) => { const Icon = ICONS[weatherClassOf(hour.code ?? d.code)]; return <li key={hour.time} data-slot="weather-forecast-hour" className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-2 text-sm"><span className="text-muted-foreground whitespace-nowrap">{i === 0 ? "Now" : formatLocalTime(hour.time, selected.timezone, locale).replace(/:\d{2}(?=\s|$)/, "")}</span><Icon className="size-5" aria-hidden/><b className="tabular-nums">{deg(hour.temp)}{unit}</b><span className="text-primary h-4 text-xs">{hour.pop !== undefined && hour.pop >= 10 ? `${hour.pop}%` : " "}</span></li>; })}</ol></Tile> : null}
          {daily.length ? <Tile title={labels.tenDayForecast} icon={<SunIcon className="size-4" aria-hidden/>} className="col-span-full"><ol data-slot="weather-daily-list" className="divide-border divide-y">{daily.map((day,i) => { const Icon = ICONS[weatherClassOf(day.code)]; const m = rangeBarMetrics(day.low, day.high, globalMin, globalMax, i === 0 ? d.temp : undefined); return <li key={day.date} className="grid min-h-11 grid-cols-[3.2rem_2.5rem_2.6rem_minmax(2rem,1fr)_2.6rem] items-center gap-2 text-sm tabular-nums"><span>{i === 0 ? "Today" : dayName(day.date,locale)}</span><span className="flex flex-col items-center"><Icon className="size-4" aria-hidden/>{day.pop !== undefined && day.pop >= 20 && <small className="text-primary text-[10px]">{day.pop}%</small>}</span><span className="text-muted-foreground text-right">{deg(day.low)}</span><span className="bg-muted relative h-1.5 rounded-full"><span className="from-[var(--weather-range-cool)] via-[var(--weather-range-mid)] to-[var(--weather-range-warm)] absolute h-full rounded-full bg-gradient-to-r" style={{left:`${m.left}%`,width:`${m.width}%`}}/>{m.dot !== undefined && <i aria-label={labels.currentTemperature} className="bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{left:`${m.dot}%`}}/>}</span><span className="text-right">{deg(day.high)}</span></li>; })}</ol></Tile> : null}

          {d.uvIndex !== undefined && tile(labels.uvIndex, d.uvIndex, d.uvIndex < 3 ? "Low" : d.uvIndex < 6 ? "Moderate" : d.uvIndex < 8 ? "High" : "Very high", <div data-slot="weather-uv-bar" className="relative h-2 rounded-full bg-gradient-to-r from-[var(--weather-uv-low)] via-[var(--weather-uv-mid)] to-[var(--weather-uv-high)]"><i className="absolute -top-1 size-4 rounded-full border-2 border-background bg-foreground" style={{left:`${Math.min(100,d.uvIndex/11*100)}%`}}/></div>)}
          {(d.sunrise || d.sunset) && tileVisual(labels.sunriseAndSunset, <Sunrise className="size-4" aria-hidden/>, <><div className="flex justify-between text-2xl font-light tabular-nums"><span>{d.sunrise ? formatLocalTime(d.sunrise, selected.timezone, locale) : ""}</span><span>{d.sunset ? formatLocalTime(d.sunset, selected.timezone, locale) : ""}</span></div><div data-slot="weather-sun-arc" className="mt-2"><svg viewBox="0 0 200 76" className="h-16 w-full" aria-hidden="true"><path d="M8 58 Q100 -28 192 58" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="2"/><path d="M8 58 H192" fill="none" stroke="currentColor" strokeOpacity=".35"/><circle cx="100" cy="15" r="6" fill="var(--primary)"/><text x="8" y="73" fontSize="9" fill="currentColor">Sunrise</text><text x="192" y="73" textAnchor="end" fontSize="9" fill="currentColor">Sunset</text></svg></div></>, "col-span-2")}
          {d.feelsLike !== undefined && tile(labels.feelsLike, `${deg(d.feelsLike)}${unit}`, d.feelsLike > d.temp ? `Feels warmer than ${deg(d.temp)}${unit}` : d.feelsLike < d.temp ? `Feels cooler than ${deg(d.temp)}${unit}` : "Feels like the air temperature")}
          {d.humidity !== undefined && tile(labels.humidity, `${d.humidity}%`, d.humidity >= 60 ? "The air feels humid" : d.humidity <= 30 ? "Dry air" : "Comfortable humidity", <div data-slot="weather-humidity-bar" className="h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.humidity))}%`}}/></div>)}
          {(d.precipitation !== undefined || d.precipitationAmount !== undefined || d.precipitationLast24h !== undefined || d.precipitationNext24h !== undefined) && tileVisual(labels.precipitation, <DropletIcon className="size-4" aria-hidden/>, <><div className="text-3xl font-light tabular-nums">{d.precipitationAmount !== undefined ? `${d.precipitationAmount} ${unit === "F" ? "in" : "mm"}` : d.precipitation !== undefined ? `${d.precipitationNext24h ?? d.precipitationLast24h ?? 0} ${unit === "F" ? "in" : "mm"}` : `${d.precipitationNext24h ?? d.precipitationLast24h} ${unit === "F" ? "in" : "mm"}`}</div>{d.precipitation !== undefined && <><p className="text-muted-foreground mt-1 text-xs">{d.precipitation}% chance</p><div data-slot="weather-precipitation-bar" className="mt-3 h-2 rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.precipitation))}%`}}/></div></>}</>)}
          {d.visibility !== undefined && tile(labels.visibility, `${fmt(d.visibility)} ${unit === "F" ? "mi" : "km"}`, d.visibility >= 10 ? "Clear view" : d.visibility >= 4 ? "Hazy" : "Poor", <div data-slot="weather-visibility-bar" className="h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{width:`${Math.max(0,Math.min(100,d.visibility/(unit === "F" ? 10 : 16)*100))}%`}}/></div>)}
          {d.pressure !== undefined && tileVisual(labels.pressure, <Gauge className="size-4" aria-hidden/>, <><div className="text-3xl font-light tabular-nums">{fmt(d.pressure)} hPa</div><p className="text-muted-foreground mt-1 text-xs">{d.pressureTrend ?? "Atmospheric pressure"}</p><PressureGauge value={d.pressure}/></>)}
          {d.airQuality && tile(labels.airQuality, <>{d.airQuality.aqi} <span className="text-base">{d.airQuality.category}</span></>, `AQI ${d.airQuality.aqi}: ${d.airQuality.category}`, <div data-slot="weather-aqi-bar" className="relative h-2 rounded-full bg-gradient-to-r from-[var(--weather-aqi-good)] via-[var(--weather-aqi-moderate)] to-[var(--weather-aqi-poor)]"><i className="absolute -top-1 size-4 rounded-full border-2 border-background bg-foreground" style={{left:`${Math.min(100,d.airQuality.aqi/300*100)}%`}}/></div>)}
          {d.hourly?.length ? <Tile title={labels.conditions} icon={<Thermometer className="size-4" aria-hidden/>} className="col-span-2">
            <div role="group" aria-label={labels.conditions} data-slot="weather-condition-switcher" className="mb-3 flex rounded-lg bg-muted p-1">{([["temperature",labels.temperature],["precipitationMetric",labels.precipitation],["windMetric",labels.wind]] as const).map(([key,label]) => <button key={key} type="button" aria-pressed={metric === ({temperature:"temperature",precipitationMetric:"precipitation",windMetric:"wind"}[key])} onClick={() => setMetric((({temperature:"temperature",precipitationMetric:"precipitation",windMetric:"wind"}[key]) as "temperature" | "precipitation" | "wind"))} className="min-h-9 flex-1 rounded-md px-2 text-xs">{label}</button>)}</div>
            <p data-slot="weather-selected-metric" className="text-sm font-medium">{metric === "temperature" ? labels.temperature : metric === "precipitation" ? labels.precipitation : labels.wind}</p>
            <div data-slot="weather-hourly-chart" data-metric={metric} className="relative mt-2 h-28" role="group" aria-label={`${labels.hourlyForecast}: ${metric}`}>
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">{[100,66,33,0].map((level,i)=><div key={level} data-slot="weather-chart-gridline" className="flex items-center gap-2"><span className="text-muted-foreground w-7 text-right text-[9px]">{i === 0 ? "max" : i === 3 ? "0" : ""}</span><i className="flex-1 border-t border-border/70"/></div>)}</div>
              <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-1">{d.hourly.slice(0, 12).map((hour,index) => { const val = metric === "temperature" ? hour.temp : metric === "precipitation" ? (hour.pop ?? 0) : (hour.windSpeed ?? 0); const values = d.hourly!.slice(0,12).map(h => metric === "temperature" ? h.temp : metric === "precipitation" ? (h.pop ?? 0) : (h.windSpeed ?? 0)); const min = Math.min(...values); const max = Math.max(min + 1, ...values); const pct = (val-min)/(max-min)*74+8; return <div key={hour.time} className="relative flex h-full min-w-2 flex-1 flex-col justify-end"><button type="button" data-slot="weather-chart-bar" aria-label={`${formatLocalTime(hour.time, selected.timezone, locale)}: ${val}`} title={`${val}`} className={cn("w-full rounded-t bg-primary/75 transition-colors hover:bg-primary focus-visible:bg-primary focus-visible:outline-2 focus-visible:outline-ring", index === 0 && "bg-primary ring-2 ring-primary/50")} style={{height:`${pct}%`}}/><span className="text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px]">{index % 3 === 0 ? formatLocalTime(hour.time, selected.timezone, locale).replace(/:\d{2}(?=\s|$)/, "") : ""}</span></div>; })}</div>
            </div>
          </Tile> : null}

          {d.wind && tileVisual(labels.wind, <Wind className="size-4" aria-hidden/>, <div className="flex items-center gap-4"><div data-slot="weather-wind-dial" className="relative size-24 shrink-0 rounded-full border border-border"><span className="absolute inset-x-0 top-1 text-center text-[9px] font-semibold">N</span><span className="absolute inset-y-0 right-1 flex items-center text-[9px]">E</span><span className="absolute inset-x-0 bottom-1 text-center text-[9px]">S</span><span className="absolute inset-y-0 left-1 flex items-center text-[9px]">W</span>{[0,45,90,135].map(a=><i key={a} className="absolute left-1/2 top-1/2 h-2 -translate-x-1/2 -translate-y-1/2 border-l border-border" style={{transform:`translate(-50%,-50%) rotate(${a}deg) translateY(-43px)`}}/>)}<span data-slot="weather-wind-needle" className="absolute left-1/2 top-1/2 block h-12 w-0.5 origin-bottom bg-primary" style={{transform:`translate(-50%,-100%) rotate(${d.wind.direction}deg)`}}/><span className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold tabular-nums">{fmt(d.wind.speed)}<small className="text-[9px] font-normal">{d.wind.label ?? (unit === "F" ? "mph" : "km/h")}</small></span></div><div className="text-sm">{d.wind.gust !== undefined ? `Gust ${fmt(d.wind.gust)} ${d.wind.label ?? (unit === "F" ? "mph" : "km/h")}` : "Wind direction"}</div></div>)}
          {d.moon && <Tile title={labels.moonPhase} icon={<MoonIcon className="size-4" aria-hidden/>}><div className="flex items-center gap-3"><span data-slot="weather-moon-disk" style={{background:`linear-gradient(90deg,var(--weather-moon-lit) ${d.moon.illumination}%,var(--weather-moon-dark) ${d.moon.illumination}%)`}} className="size-10 rounded-full shadow-inner"/><div><div className="text-xl font-light">{d.moon.phase}</div><p className="text-muted-foreground text-xs">{d.moon.illumination}% illuminated</p></div></div></Tile>}
        </div>
      </> : <div data-slot="weather-empty-detail" className="text-muted-foreground rounded-2xl border p-8">{labels.detailsUnavailable}</div>}
    </main>}
  </div>;
}

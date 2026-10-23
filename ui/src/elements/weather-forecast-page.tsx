"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, CloudDrizzleIcon, CloudFogIcon, CloudIcon, CloudLightningIcon, CloudRainIcon, CloudSnowIcon, CloudSunIcon, DropletIcon, MoonIcon, Search, SunIcon, Wind } from "lucide-react";
import { cn } from "cn";
import { WeatherSky } from "./weather-card";
import { weatherClassOf } from "./weather-condition";

export interface ForecastHour { time: string; temp: number; condition?: string; code?: number; pop?: number }
export interface ForecastDay { date: string; high: number; low: number; code: number; pop?: number }
export interface WeatherLocationDetail {
  temp: number; condition: string; code: number; isDay: boolean; high?: number; low?: number;
  hourly?: readonly ForecastHour[]; daily?: readonly ForecastDay[];
  airQuality?: string | number; wind?: { speed: number; direction: number; label?: string };
  sunrise?: string; sunset?: string; uvIndex?: number; feelsLike?: number; humidity?: number;
  precipitation?: number; visibility?: number; pressure?: number; moonPhase?: string;
}
export interface WeatherLocation { id: string; city: string; localTime?: string; isMyLocation?: boolean; detail?: WeatherLocationDetail }
export interface WeatherForecastPageProps {
  locations: readonly WeatherLocation[]; selectedId?: string; onSelect?: (id: string) => void;
  onSearch?: (query: string) => void; unit?: "F" | "C"; className?: string;
}

const ICONS = [SunIcon, CloudSunIcon, CloudIcon, CloudFogIcon, CloudDrizzleIcon, CloudRainIcon, CloudSnowIcon, CloudLightningIcon];
const CLASS_ORDER = ["clear", "partly-cloudy", "overcast", "fog", "drizzle", "rain", "snow", "thunderstorm"] as const;
const deg = (n: number) => `${Math.round(n)}°`;
const dayName = (date: string) => new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const hourName = (time: string) => { const h = Number(/T(\d{2})/.exec(time)?.[1] ?? 0); return `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`; };
function Tile({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <section data-slot="weather-tile" className={cn("bg-card/75 border-border min-h-32 rounded-2xl border p-4 shadow-sm backdrop-blur", className)}><h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">{title}</h3>{children}</section>;
}
function CardSky({ detail, city, localTime, isMyLocation }: { detail: WeatherLocationDetail; city: string; localTime?: string; isMyLocation?: boolean }) {
  const cls = weatherClassOf(detail.code); const tod = detail.isDay ? "day" : "night";
  const style: CSSProperties = { backgroundImage: `linear-gradient(145deg,var(--weather-${cls}-${tod}-from),var(--weather-${cls}-${tod}-to))`, color: "var(--weather-ink)" };
  return <div data-slot="weather-location-sky" data-class={cls} data-day={detail.isDay ? "true" : "false"} style={style} className="relative isolate flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl p-4">
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden"><WeatherSky cls={cls} isDay={detail.isDay}/></div><div aria-hidden className="absolute inset-0 -z-10" style={{backgroundColor:"var(--weather-scrim)"}} />
    <div><span className="block text-sm font-semibold">{isMyLocation ? "My Location · " : ""}{city}</span><span className="text-xs opacity-80">{localTime ?? ""}</span></div><span className="text-4xl leading-none font-light">{deg(detail.temp)}</span><span className="text-sm">{detail.condition} {detail.high !== undefined && detail.low !== undefined ? `· H ${deg(detail.high)} L ${deg(detail.low)}` : ""}</span>
  </div>;
}

export function WeatherForecastPage({ locations, selectedId, onSelect, onSearch, unit = "F", className }: WeatherForecastPageProps) {
  const [mobileDetail, setMobileDetail] = useState(false);
  const selected = locations.find((l) => l.id === selectedId) ?? locations.find((l) => l.isMyLocation) ?? locations[0];
  const d = selected?.detail;
  const cls = d ? weatherClassOf(d.code) : "overcast"; const tod = d?.isDay ? "day" : "night";
  return <div data-slot="weather-forecast-page" className={cn("grid min-h-[680px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]", className)}>
    <aside data-slot="weather-location-list" className={cn("space-y-3", mobileDetail && "hidden lg:block")}>
      <label className="border-border bg-card flex items-center gap-2 rounded-xl border px-3"><Search className="text-muted-foreground size-4" aria-hidden/><input aria-label="Search locations" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search locations" onChange={(e) => onSearch?.(e.currentTarget.value)}/></label>
      {[...locations].sort((a,b)=>Number(Boolean(b.isMyLocation))-Number(Boolean(a.isMyLocation))).map((location) => <button key={location.id} type="button" data-slot="weather-location" aria-pressed={selected?.id === location.id} onClick={() => { onSelect?.(location.id); setMobileDetail(true); }} className={cn("w-full text-left transition-transform hover:-translate-y-0.5", selected?.id === location.id && "ring-ring rounded-2xl ring-2")}>
        <CardSky detail={location.detail ?? {temp:0,condition:"Weather unavailable",code:3,isDay:true}} city={location.city} localTime={location.localTime} isMyLocation={location.isMyLocation}/>
      </button>)}
    </aside>
    {selected && <main data-slot="weather-location-detail" className={cn("min-w-0", !mobileDetail && "hidden lg:block")}>
      <button type="button" data-slot="weather-back" onClick={() => { setMobileDetail(false); onSelect?.(""); }} className="mb-3 flex items-center gap-2 text-sm lg:hidden"><ArrowLeft className="size-4"/>Locations</button>
      {d ? <>
        <section data-slot="weather-forecast-hero" style={{backgroundImage:`linear-gradient(150deg,var(--weather-${cls}-${tod}-from),var(--weather-${cls}-${tod}-to))`,color:"var(--weather-ink)"}} className="relative isolate mb-4 flex min-h-64 flex-col justify-end overflow-hidden rounded-3xl p-7">
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden"><WeatherSky cls={cls} isDay={d.isDay}/></div><div aria-hidden className="absolute inset-0 -z-10" style={{backgroundColor:"var(--weather-scrim)"}}/>
          <p className="text-lg">{selected.city}</p><p className="text-7xl leading-none font-light tabular-nums">{deg(d.temp)}<span className="text-3xl">{unit}</span></p><p className="mt-3">{d.condition}{d.high !== undefined && d.low !== undefined ? ` · H ${deg(d.high)} L ${deg(d.low)}` : ""}</p>
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {d.hourly?.length ? <Tile title="Hourly Forecast" className="sm:col-span-2 xl:col-span-3"><ol className="flex gap-5 overflow-x-auto pb-1">{d.hourly.map(h=>{const HourIcon=h.code !== undefined ? ICONS[Math.max(0,CLASS_ORDER.indexOf(weatherClassOf(h.code)))] ?? CloudIcon : SunIcon;return <li key={h.time} className="flex min-w-12 flex-col items-center gap-2 text-sm"><span className="text-muted-foreground">{hourName(h.time)}</span><span><HourIcon className="size-5"/></span><b>{deg(h.temp)}</b>{h.pop !== undefined && <span className="text-primary text-xs">{h.pop}%</span>}</li>})}</ol></Tile> : null}
          {d.daily?.length ? <Tile title="10-Day Forecast" className="sm:col-span-2 xl:col-span-3"><ol className="space-y-2">{d.daily.slice(0,10).map(day=>{const DayIcon=ICONS[Math.max(0,CLASS_ORDER.indexOf(weatherClassOf(day.code)))] ?? CloudIcon;const min=Math.min(...d.daily!.map(x=>x.low));const max=Math.max(...d.daily!.map(x=>x.high));const left=((day.low-min)/(max-min||1))*100;const width=((day.high-day.low)/(max-min||1))*100;return <li key={day.date} className="grid grid-cols-[3.5rem_1.5rem_2.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span>{dayName(day.date)}</span><DayIcon className="size-4"/><span className="text-muted-foreground text-right">{deg(day.low)}</span><span className="bg-muted relative h-1.5 rounded-full"><span className="from-primary to-orange-400 absolute h-full rounded-full bg-gradient-to-r" style={{left:`${left}%`,width:`${width}%`}}/>{d.temp>=day.low&&d.temp<=day.high&&<i aria-label="Current temperature" className="bg-foreground absolute -top-0.5 size-2.5 rounded-full" style={{left:`${((d.temp-day.low)/(day.high-day.low||1))*100}%`}}/>}</span><span className="text-right">{deg(day.high)}</span></li>})}</ol></Tile> : null}
          {d.airQuality !== undefined && <Tile title="Air Quality"><strong className="text-2xl">{d.airQuality}</strong></Tile>}
          {d.wind && <Tile title="Wind"><div className="flex items-center gap-4"><span className="border-border flex size-14 items-center justify-center rounded-full border" style={{transform:`rotate(${d.wind.direction}deg)`}}><Wind className="size-6"/></span><div className="text-2xl">{d.wind.speed}<small className="text-muted-foreground ml-1 text-xs">{d.wind.label ?? "km/h"}</small></div></div></Tile>}
          {(d.sunrise || d.sunset) && <Tile title="Sunrise & Sunset"><p className="text-lg"><SunIcon className="mr-2 inline size-5"/>{d.sunrise ?? "—"}</p><p className="text-muted-foreground mt-2"><MoonIcon className="mr-2 inline size-4"/>{d.sunset ?? "—"}</p></Tile>}
          {d.uvIndex !== undefined && <Tile title="UV Index"><strong className="text-3xl">{d.uvIndex}</strong></Tile>}
          {d.feelsLike !== undefined && <Tile title="Feels Like"><strong className="text-3xl">{deg(d.feelsLike)}{unit}</strong></Tile>}
          {d.humidity !== undefined && <Tile title="Humidity"><strong className="text-3xl">{d.humidity}%</strong></Tile>}
          {d.precipitation !== undefined && <Tile title="Precipitation"><strong className="text-3xl"><DropletIcon className="mr-1 inline size-6"/>{d.precipitation}%</strong></Tile>}
          {d.visibility !== undefined && <Tile title="Visibility"><strong className="text-3xl">{d.visibility}<small className="text-muted-foreground ml-1 text-xs">km</small></strong></Tile>}
          {d.pressure !== undefined && <Tile title="Pressure"><strong className="text-3xl">{d.pressure}<small className="text-muted-foreground ml-1 text-xs">hPa</small></strong></Tile>}
          {d.moonPhase !== undefined && <Tile title="Moon Phase"><strong className="text-xl"><MoonIcon className="mr-2 inline size-5"/>{d.moonPhase}</strong></Tile>}
        </div>
      </> : <div data-slot="weather-empty-detail" className="text-muted-foreground rounded-2xl border p-8">Weather details unavailable.</div>}
    </main>}
  </div>;
}

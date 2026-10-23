import type { CSSProperties } from "react";
import { particles, type Particle, type WeatherClass } from "./weather-condition";

const rain = particles(11, 24, { size: [10, 24], dur: [0.45, 1.1], opacity: [0.28, 0.7] });
const drizzle = particles(21, 14, { size: [8, 16], dur: [0.9, 1.6], opacity: [0.2, 0.48] });
const snow = particles(41, 20, { size: [2, 6], dur: [4, 9], opacity: [0.45, 0.95] });
const stars = particles(51, 24, { y: [0, 80], size: [1, 3], dur: [1.5, 4], opacity: [0.6, 1] });
const clouds = particles(61, 6, { y: [3, 66], size: [100, 260], dur: [16, 34], opacity: [0.13, 0.32] });
const fog = [16, 46, 72].map((y, i) => ({ x: 0, y, size: 24 + i * 3, dur: 9 + i * 4, delay: -2 * i, opacity: 0.18 - i * 0.02 }));
type Style = CSSProperties & Record<`--${string}`, string | number>;
function style(p: Partial<Particle>): Style {
  return { "--x": p.x ?? 0, "--y": p.y ?? 0, "--s": p.size ?? 0, "--d": `${p.dur ?? 1}s`, "--dl": `${p.delay ?? 0}s`, "--o": p.opacity ?? 0.2 };
}
function Layer({ list, kind, count }: { list: readonly Particle[]; kind: string; count?: number }) {
  return <>{list.slice(0, count).map((p, i) => <span key={i} data-fx={kind} aria-hidden="true" style={style(p)} />)}</>;
}

/** Shared animated weather scene for chat cards, list thumbnails, and forecast heroes. */
export function WeatherSky({ cls, isDay, intensity = 1, paused = false }: { cls: WeatherClass; isDay: boolean; intensity?: number; paused?: boolean }) {
  return <div data-slot="weather-sky" data-class={cls} data-paused={paused ? "true" : "false"} style={{ "--weather-intensity": intensity } as CSSProperties} aria-hidden="true">
    {isDay ? <span data-fx="sun" /> : <><span data-fx="moon"/><Layer list={stars} kind="star" count={paused ? 6 : 8}/></>}
    {(cls === "partly-cloudy" || cls === "overcast" || cls === "thunderstorm" || cls === "fog") && <><Layer list={clouds} kind="cloud" count={paused ? 2 : cls === "partly-cloudy" ? 3 : 6}/><Layer list={clouds.slice(2)} kind="cloud-slow" count={paused ? 1 : 4}/></>}
    {cls === "fog" && fog.map((p, i) => <span key={i} data-fx="fog" aria-hidden="true" style={style(p)}/>)}
    {(cls === "rain" || cls === "drizzle" || cls === "thunderstorm") && <Layer list={cls === "drizzle" ? drizzle : rain} kind="fall" count={paused ? 4 : 6}/ >}
    {cls === "snow" && <Layer list={snow} kind="flake" count={paused ? 8 : 16}/>}
    {cls === "thunderstorm" && <span data-fx="flash"/>}
  </div>;
}

import type { CSSProperties } from "react";
import { particles, type Particle, type WeatherClass } from "./weather-condition";
import { MoonDisc } from "./moon-disc";

export interface WeatherMoon {
  phase: string;
  illumination: number;
}

const rain = particles(11, 76, { size: [14, 22], dur: [0.55, 0.9], opacity: [0.55, 0.9] });
const snow = particles(41, 60, { y: [-10, 0], size: [2, 5], dur: [7, 11], opacity: [0.55, 1] });
const stars = particles(51, 72, { y: [0, 90], size: [1.5, 3.5], dur: [2, 5], opacity: [0.65, 1] });
const cloudPositions = [
  { x: 4, y: 10, size: 126, dur: 62, delay: -18, opacity: 0.35 },
  { x: 49, y: 1, size: 158, dur: 58, delay: -31, opacity: 0.38 },
  { x: 72, y: 38, size: 184, dur: 48, delay: -12, opacity: 0.54 },
  { x: 12, y: 45, size: 208, dur: 52, delay: -39, opacity: 0.64 },
  { x: 42, y: 61, size: 242, dur: 44, delay: -22, opacity: 0.70 },
];
const fog = [18, 48, 72].map((y, i) => ({ x: 0, y, size: 17 + i * 4, dur: 38 + i * 9, delay: -11 * i, opacity: 0.22 - i * 0.025 }));
type Style = CSSProperties & Record<`--${string}`, string | number>;
function style(p: Partial<Particle>): Style {
  return { "--x": p.x ?? 0, "--y": p.y ?? 0, "--s": p.size ?? 0, "--d": `${p.dur ?? 1}s`, "--dl": `${p.delay ?? 0}s`, "--o": p.opacity ?? 0.2 };
}
function Layer({ list, kind, count }: { list: readonly Particle[]; kind: string; count: number }) {
  return <>{list.slice(0, count).map((p, i) => <span key={`${kind}-${i}`} data-fx={kind} aria-hidden="true" style={style(p)} />)}</>;
}
function Clouds({ count }: { count: number }) {
  return <>{cloudPositions.slice(0, count).map((p, i) => <span key={i} data-fx="cloud" data-depth={i < 2 ? "far" : i < 4 ? "mid" : "near"} aria-hidden="true" style={style(p)}><i/><i/><i/><i/><i/><i/></span>)}</>;
}

/** Shared decorative scene. Paused previews keep the same still composition. */
export function WeatherSky({ cls, isDay, intensity = 1, paused = false, moon }: { cls: WeatherClass; isDay: boolean; intensity?: number; paused?: boolean; moon?: WeatherMoon }) {
  const count = paused ? 12 : 76;
  const hasSun = isDay && (cls === "clear" || cls === "partly-cloudy");
  return <div data-slot="weather-sky" data-class={cls} data-paused={paused ? "true" : "false"} style={{ "--weather-intensity": intensity } as CSSProperties} aria-hidden="true">
    {hasSun && <><span data-fx="sun"/><span data-fx="sun-rays"/></>}
    {!isDay && cls === "clear" && <>{moon ? <span data-fx="moon-glow" aria-hidden="true"><span data-fx="moon-disc"><MoonDisc phase={moon.phase} illumination={moon.illumination} size={54}/></span></span> : <span data-fx="moon"/>}<Layer list={stars} kind="star" count={paused ? 12 : 72}/></>}
    {(cls === "clear" && isDay) && <Clouds count={3}/>}
    {cls === "partly-cloudy" && <Clouds count={2}/>}
    {(cls === "overcast" || cls === "thunderstorm") && <Clouds count={5}/>}
    {cls === "fog" && fog.map((p, i) => <span key={i} data-fx="fog" aria-hidden="true" style={style(p)}/>)}
    {(cls === "rain" || cls === "drizzle" || cls === "thunderstorm") && <><Layer list={rain} kind="fall" count={paused ? 12 : count}/><span data-fx="splash"/></>}
    {cls === "snow" && <Layer list={snow} kind="flake" count={paused ? 12 : 60}/>}
    {cls === "thunderstorm" && <><span data-fx="flash"/><svg data-fx="bolt" viewBox="0 0 80 130" aria-hidden="true"><path d="M47 0 12 70h25l-8 60 39-80H43z"/></svg></>}
  </div>;
}

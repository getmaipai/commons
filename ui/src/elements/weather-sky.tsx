import type { CSSProperties } from "react";
import { particles, type Particle, type WeatherClass } from "./weather-condition";

const rain = particles(11, 72, { size: [14, 30], dur: [0.5, 0.9], opacity: [0.45, 0.9] });
const snow = particles(41, 56, { size: [2, 7], dur: [6, 10], opacity: [0.55, 1] });
const stars = particles(51, 72, { y: [0, 84], size: [1.5, 3.5], dur: [2, 5], opacity: [0.65, 1] });
const clouds = particles(61, 8, { y: [4, 74], size: [130, 290], dur: [25, 65], opacity: [0.26, 0.52] });
const fog = [18, 48, 72].map((y, i) => ({ x: 0, y, size: 17 + i * 4, dur: 38 + i * 9, delay: -11 * i, opacity: 0.22 - i * 0.025 }));
type Style = CSSProperties & Record<`--${string}`, string | number>;
function style(p: Partial<Particle>): Style {
  return { "--x": p.x ?? 0, "--y": p.y ?? 0, "--s": p.size ?? 0, "--d": `${p.dur ?? 1}s`, "--dl": `${p.delay ?? 0}s`, "--o": p.opacity ?? 0.2 };
}
function Layer({ list, kind, count }: { list: readonly Particle[]; kind: string; count: number }) {
  return <>{list.slice(0, count).map((p, i) => <span key={`${kind}-${i}`} data-fx={kind} aria-hidden="true" style={style(p)} />)}</>;
}

/** Shared decorative scene. Paused thumbnails retain a small static composition. */
export function WeatherSky({ cls, isDay, intensity = 1, paused = false }: { cls: WeatherClass; isDay: boolean; intensity?: number; paused?: boolean }) {
  const particlesCount = paused ? 12 : 64;
  return <div data-slot="weather-sky" data-class={cls} data-paused={paused ? "true" : "false"} style={{ "--weather-intensity": intensity } as CSSProperties} aria-hidden="true">
    {cls === "clear" && isDay ? <span data-fx="sun" /> : null}
    {!isDay && cls === "clear" ? <><span data-fx="moon"/><Layer list={stars} kind="star" count={paused ? 8 : 72}/></> : null}
    {(cls === "clear" && isDay || cls === "partly-cloudy") && <Layer list={clouds} kind="cloud" count={paused ? 2 : 4}/ >}
    {(cls === "overcast" || cls === "thunderstorm") && <Layer list={clouds} kind="cloud" count={paused ? 2 : 6}/ >}
    {cls === "fog" && <><Layer list={clouds} kind="cloud" count={paused ? 1 : 5}/>{fog.map((p, i) => <span key={i} data-fx="fog" aria-hidden="true" style={style(p)}/>)}</>}
    {(cls === "rain" || cls === "drizzle" || cls === "thunderstorm") && <><Layer list={rain} kind="fall" count={paused ? 8 : cls === "drizzle" ? 40 : particlesCount}/><span data-fx="splash"/></>}
    {cls === "snow" && <Layer list={snow} kind="flake" count={paused ? 10 : 56}/>}
    {cls === "thunderstorm" && <span data-fx="flash"/>}
  </div>;
}

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { particles, type Particle, type WeatherClass, weatherIntensityOf } from "./weather-condition";
import { MoonDisc } from "./moon-disc";
import scene from "./weather-scene.json";
import { cloudDuration, cloudWindFactor, lightPosition, phaseOf, type WeatherVariant } from "./weather-scene";

export interface WeatherMoon {
  phase: string;
  illumination: number;
}

const rain = particles(11, 76, { size: [14, 22], dur: [0.55, 0.9], opacity: [0.55, 0.9] });
const snow = particles(41, 60, { y: [-10, 0], size: [2, 5], dur: [7, 11], opacity: [0.55, 1] });
const stars = particles(51, 72, { y: [0, 90], size: [1.5, 3.5], dur: [2, 5], opacity: [0.65, 1] });
const cloudDepths = ["far", "mid", "near"] as const;
const classShapes: Record<WeatherClass, readonly ("a" | "b" | "c")[]> = { clear: ["a", "c"], "partly-cloudy": ["a", "b", "c", "b"], overcast: ["a", "b", "c", "a", "b", "c"], fog: [], drizzle: ["a", "b", "c", "a"], rain: ["a", "b", "c", "a", "b"], snow: ["a", "b", "c"], thunderstorm: ["a", "b", "c", "a", "b", "c"] };
const fog = [18, 48, 72].map((y, i) => ({ x: 0, y, size: 17 + i * 4, dur: 38 + i * 9, delay: -11 * i, opacity: 0.22 - i * 0.025 }));
type Style = CSSProperties & Record<`--${string}`, string | number>;
function style(p: Partial<Particle>): Style {
  return { "--x": p.x ?? 0, "--y": p.y ?? 0, "--s": p.size ?? 0, "--d": `${p.dur ?? 1}s`, "--dl": `${p.delay ?? 0}s`, "--o": p.opacity ?? 0.2 };
}
function Layer({ list, kind, count }: { list: readonly Particle[]; kind: string; count: number }) {
  return <>{list.slice(0, count).map((p, i) => <span key={`${kind}-${i}`} data-fx={kind} aria-hidden="true" style={style(p)} />)}</>;
}
function Clouds({ cls, variant, wind, width }: { cls: WeatherClass; variant: WeatherVariant; wind?: number; width: number }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const pendingWind = useRef(wind);
  const factor = cloudWindFactor(wind);
  const baseCount = cls === "clear" ? 2 : scene.clouds.counts[cls];
  const count = variant === "lite" ? Math.min(2, baseCount) : variant === "compact" ? Math.min(4, baseCount) : baseCount + (variant === "wide" && baseCount > 0 ? 1 : 0);
  const data = Array.from({ length: count }, (_, i) => {
    const depth = cloudDepths[i % 3]!; const d = scene.clouds.depths[depth];
    const shapes = classShapes[cls]; const shape = shapes[i % Math.max(1, shapes.length)] ?? "a";
    const size = `clamp(${d.minWidth}px, ${d.widthCqw}cqw, ${d.width}px)`; const duration = cloudDuration(width, d.width * d.scale, d.speed, factor);
    const yMin = d.y[0] ?? 0; const yMax = d.y[1] ?? yMin;
    const y = yMin + ((i * 7 + 4) % (yMax - yMin + 1));
    return { depth, shape, size, duration, delay: -(i / count) * duration, y, mask: cloudMask(shape) };
  });
  useEffect(() => { pendingWind.current = wind; }, [wind]);
  const retime = (el: HTMLSpanElement, i: number) => {
    const p = data[i]; if (!p) return;
    const nextFactor = cloudWindFactor(pendingWind.current);
    const depth = scene.clouds.depths[p.depth];
    el.style.setProperty("--d", `${cloudDuration(width, depth.width * depth.scale, depth.speed, nextFactor)}s`);
  };
  return <>{data.map((p, i) => <span ref={el => { refs.current[i] = el; }} key={i} data-fx="cloud" data-shape={p.shape} data-depth={p.depth} aria-hidden="true" onAnimationIteration={e => retime(e.currentTarget, i)} style={{ "--y": p.y, "--s": p.size, "--d": `${p.duration}s`, "--dl": `${p.delay}s`, "--o": scene.clouds.depths[p.depth].opacity, "--z": scene.clouds.depths[p.depth].z, "--cloud-mask": p.mask } as Style}/>)}</>;
}
function cloudMask(shape: "a" | "b" | "c") {
  const puffs = scene.clouds.puffs[shape] as number[][];
  return puffs.map(puff => { const [x = 0, y = 0, r = 0] = puff; return `radial-gradient(circle calc(var(--s) * ${(r + 9) / 100}) at ${x}% ${y}%, var(--weather-ink) 40%, transparent 100%)`; }).join(", ");
}

/** Shared decorative scene. Paused previews keep the same still composition. */
export function WeatherSky({ cls, isDay, code = 0, intensity, elevation, sunrise, sunset, now, wind, width, paused = false, variant: variantProp, thunderJolt: _thunderJolt, seed: _seed, running = true, moon }: { cls: WeatherClass; isDay: boolean; code?: number; intensity?: number; elevation?: number; sunrise?: string; sunset?: string; now?: Date | string | number; wind?: number; width?: number; paused?: boolean; variant?: WeatherVariant; thunderJolt?: boolean; seed?: number; running?: boolean; moon?: WeatherMoon }) {
  const variant = paused ? "lite" : (variantProp ?? "full");
  const skyRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(width ?? scene.clouds.defaultWidth);
  useEffect(() => {
    if (width !== undefined) { setMeasuredWidth(width); return; }
    const el = skyRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => { const w = entries[0]?.contentRect.width; if (w) setMeasuredWidth(w); });
    observer.observe(el); return () => observer.disconnect();
  }, [width]);
  const actualIntensity = intensity ?? weatherIntensityOf(code);
  const [clock, setClock] = useState(now ?? new Date());
  useEffect(() => { if (now !== undefined) setClock(now); }, [now]);
  useEffect(() => {
    if (!sunrise || !sunset || now !== undefined || !running) return;
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [sunrise, sunset, now, running]);
  const timing = phaseOf({ elevation, sunrise, sunset, now: clock, isDay });
  const position = lightPosition(variant, timing.dayFraction);
  const count = paused || variant === "lite" ? 12 : 76;
  const side = timing.phase === "dawn" || (timing.phase === "night" && timing.elevation < 0 && timing.dayFraction < 0.5) ? "dawn" : "dusk";
  const twilight = timing.phase === "dawn" || timing.phase === "dusk" ? timing.phase : side;
  const skyStyle = { "--wx-t": timing.t, "--wx-night-top": `var(--weather-${cls}-night-top)`, "--wx-night-mid": `var(--weather-${cls}-night-mid)`, "--wx-night-bottom": `var(--weather-${cls}-night-bottom)`, "--wx-twilight-top": `var(--weather-${cls}-${twilight}-top)`, "--wx-twilight-mid": `var(--weather-${cls}-${twilight}-mid)`, "--wx-twilight-bottom": `var(--weather-${cls}-${twilight}-bottom)`, "--wx-day-top": `var(--weather-${cls}-day-top)`, "--wx-day-mid": `var(--weather-${cls}-day-mid)`, "--wx-day-bottom": `var(--weather-${cls}-day-bottom)`, "--wx-glow": `var(--weather-${cls}-${timing.phase}-glow)`, "--wx-scrim": `var(--weather-${cls}-${timing.phase}-scrim)`, "--wx-light-x": `${position.x}%`, "--wx-light-y": `${Math.max(40,position.y)}%`, "--weather-intensity": actualIntensity } as CSSProperties;
  Object.assign(skyStyle, { "--wx-cloud-day-lit": `var(--weather-${cls}-cloud-lit)`, "--wx-cloud-day-shade": `var(--weather-${cls}-cloud-shade)`, "--wx-cloud-night-lit": `var(--weather-${cls}-cloud-night-lit)`, "--wx-cloud-night-shade": `var(--weather-${cls}-cloud-night-shade)`, "--wx-cloud-twilight-lit": `var(--weather-${cls}-cloud-twilight-lit)`, "--wx-cloud-twilight-shade": `var(--weather-${cls}-cloud-twilight-shade)` });
  const hasSun = isDay && (cls === "clear" || cls === "partly-cloudy");
  return <div ref={skyRef} data-slot="weather-sky" data-class={cls} data-phase={timing.phase} data-intensity={actualIntensity} data-running={running ? "true" : "false"} data-variant={variant} data-mounted="true" data-paused={paused ? "true" : "false"} style={skyStyle} aria-hidden="true">
    <span data-weather-layer="base" className="weather-sky-base" aria-hidden="true"/>
    <span data-weather-layer="glow" className="weather-sky-glow" aria-hidden="true"/>
    <span data-weather-layer="vignette" className="weather-sky-vignette" aria-hidden="true"/>
    {variant !== "lite" ? <span data-weather-layer="grain" className="weather-sky-grain" aria-hidden="true"/> : null}
    <span data-weather-layer="scrim" className="weather-sky-scrim" aria-hidden="true"/>
    <span data-weather-layer="text-scrim" className="weather-sky-text-scrim" aria-hidden="true"/>
    {hasSun && <><span data-fx="sun"/><span data-fx="sun-rays"/></>}
    {!isDay && cls === "clear" && <>{moon ? <span data-fx="moon-glow" aria-hidden="true"><span data-fx="moon-disc"><MoonDisc phase={moon.phase} illumination={moon.illumination} size={54}/></span></span> : <span data-fx="moon"/>}<Layer list={stars} kind="star" count={paused ? 12 : 72}/></>}
    {(cls !== "clear" || isDay) && <Clouds cls={cls} variant={variant} wind={wind} width={measuredWidth}/>}
    {cls === "fog" && fog.map((p, i) => <span key={i} data-fx="fog" aria-hidden="true" style={style(p)}/>)}
    {(cls === "rain" || cls === "drizzle" || cls === "thunderstorm") && <><Layer list={rain} kind="fall" count={paused ? 12 : count}/><span data-fx="splash"/></>}
    {cls === "snow" && <Layer list={snow} kind="flake" count={paused ? 12 : 60}/>}
    {cls === "thunderstorm" && <><span data-fx="flash"/><svg data-fx="bolt" viewBox="0 0 80 130" aria-hidden="true"><path d="M47 0 12 70h25l-8 60 39-80H43z"/></svg></>}
  </div>;
}

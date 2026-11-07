import { useEffect, useRef, useState, type CSSProperties } from "react";
import { particles, type Particle, type WeatherClass, weatherIntensityOf } from "./weather-condition";
import { MoonDisc } from "./moon-disc";
import { lightningReducedMotion, scheduleStrike } from "./weather-lightning";
import { useSceneRunning } from "./weather-scene-running";
import scene from "./weather-scene.json";
import { cloudDuration, cloudWindFactor, lightPosition, moonFromDate, phaseOf, precipitationCount, precipitationScale, type WeatherVariant } from "./weather-scene";

export interface WeatherMoon {
  phase: string;
  illumination: number;
}

const rain = particles(11, 40, { size: [6, 44], dur: [0.2, 1.5], opacity: [0.3, 0.95] });
const snow = particles(41, 36, { y: [-10, 0], size: scene.precipitation.snow.size as [number, number], dur: [4, 10], opacity: [0.45, 0.9] });
const stars = particles(51, 54, { y: [0, 70], size: [1.5, 3.5], dur: [3, 7], opacity: [0.65, 1] });
const cloudDepths = ["far", "mid", "near"] as const;
const classShapes: Record<WeatherClass, readonly ("a" | "b" | "c")[]> = { clear: ["a", "c"], "partly-cloudy": ["a", "b", "c", "b"], overcast: ["a", "b", "c", "a", "b", "c"], fog: [], drizzle: ["a", "b", "c", "a"], rain: ["a", "b", "c", "a", "b"], snow: ["a", "b", "c"], thunderstorm: ["a", "b", "c", "a", "b", "c"] };
const fog = [18, 48, 72].map((y, i) => ({ x: 0, y, size: 30, dur: [46, 34, 26][i]!, delay: -11 * i, opacity: [0.14, 0.18, 0.12][i]! }));
type Style = CSSProperties & Record<`--${string}`, string | number>;
function style(p: Partial<Particle>): Style {
  return { "--x": p.x ?? 0, "--y": p.y ?? 0, "--s": p.size ?? 0, "--d": `${p.dur ?? 1}s`, "--dl": `${p.delay ?? 0}s`, "--o": p.opacity ?? 0.2 };
}
/**
 * One rain streak. Three depths by index: near (every 4th, x 55 to 100 percent so the long bright ones avoid the text zone),
 * far (every 4th from 2) and mid. Drizzle stays fine: 1.5 px wide, 6 to 9 px long.
 */
function rainDrop(p: Particle, i: number, drizzle: boolean, heavy: boolean, height: number) {
  const cfg = scene.precipitation.rain.drops;
  const depth = drizzle ? "far" : i % cfg.near.every === 0 ? "near" : i % 4 === 2 ? "far" : "mid";
  const spec = depth === "near" ? cfg.near : depth === "mid" ? cfg.mid : cfg.far;
  const u = Math.max(0, Math.min(1, (p.size - 6) / 38));
  const [lo = 0, hi = 0] = spec.length;
  const length = drizzle ? 6 + (i % 4) : Math.round((lo + u * (hi - lo)) * 10) / 10;
  const speed = drizzle ? 180 + (i % 5) * 20 : spec.speed;
  const [nearLo = 55, nearHi = 100] = cfg.near.x;
  const x = depth === "near" && !drizzle ? nearLo + (p.x / 100) * (nearHi - nearLo) : p.x;
  const duration = (height + length + 8) / speed;
  const tilt = drizzle ? 0 : heavy ? cfg.tilt.heavy : cfg.tilt.steady;
  const opacity = drizzle ? 0.3 + (i % 4) * 0.05 : spec.opacity;
  return { depth, style: { "--x": x, "--s": length, "--w": drizzle ? cfg.drizzleWidth : spec.width, "--o": opacity, "--tilt": `${tilt}deg`, "--d": `${duration}s`, "--dl": `${-((i * 0.618034) % 1) * duration}s` } as Style };
}
/** One snow flake: size is depth, so bigger flakes are faster and more opaque. */
function snowFlake(p: Particle, i: number, height: number) {
  const cfg = scene.precipitation.snow;
  const [sizeLo = 2, sizeHi = 11] = cfg.size; const [speedLo = 18, speedHi = 60] = cfg.speed; const [opLo = 0.55, opHi = 0.95] = cfg.opacity;
  const u = Math.max(0, Math.min(1, (p.size - sizeLo) / (sizeHi - sizeLo)));
  const duration = (height + 24) / (speedLo + u * (speedHi - speedLo));
  return { "--x": p.x, "--s": p.size, "--d": `${duration}s`, "--dl": `${-((i * 0.618034) % 1) * duration}s`, "--o": opLo + u * (opHi - opLo) } as Style;
}
function Clouds({ cls, variant, wind, width }: { cls: WeatherClass; variant: WeatherVariant; wind?: number; width: number }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const pendingWind = useRef(wind);
  const factor = cloudWindFactor(wind);
  const baseCount = cls === "clear" ? 2 : scene.clouds.counts[cls];
  const count = variant === "lite" ? Math.min(2, baseCount) : variant === "compact" ? Math.min(4, baseCount) : baseCount + (variant === "wide" && baseCount > 0 ? 1 : 0);
  // Clouds persist across class changes: extra clouds fade out over 1.2 s before they unmount.
  const [shown, setShown] = useState(count);
  if (count > shown) setShown(count);
  useEffect(() => {
    if (shown <= count) return;
    const timer = window.setTimeout(() => setShown(count), scene.crossFade.cloudLeaveMs);
    return () => window.clearTimeout(timer);
  }, [count, shown]);
  const total = Math.max(count, shown);
  const data = Array.from({ length: total }, (_, i) => {
    const depth = cloudDepths[i % 3]!; const d = scene.clouds.depths[depth];
    const shapes = classShapes[cls]; const shape = shapes[i % Math.max(1, shapes.length)] ?? "a";
    const size = `clamp(${d.minWidth}px, ${d.widthCqw}cqw, ${d.width}px)`; const duration = cloudDuration(width, d.width * d.scale, d.speed, factor);
    const yMin = d.y[0] ?? 0; const yMax = d.y[1] ?? yMin;
    const y = yMin + ((i * 7 + 4) % (yMax - yMin + 1));
    return { depth, shape, size, duration, delay: -(i / total) * duration, y, mask: cloudMask(shape, depth), shelf: scene.clouds.shelf[shape], leaving: i >= count };
  });
  useEffect(() => { pendingWind.current = wind; }, [wind]);
  const retime = (el: HTMLSpanElement, i: number) => {
    const p = data[i]; if (!p) return;
    const nextFactor = cloudWindFactor(pendingWind.current);
    const depth = scene.clouds.depths[p.depth];
    el.style.setProperty("--d", `${cloudDuration(width, depth.width * depth.scale, depth.speed, nextFactor)}s`);
  };
  return <>{data.map((p, i) => <span ref={el => { refs.current[i] = el; }} key={i} data-fx="cloud" data-shape={p.shape} data-depth={p.depth} data-leaving={p.leaving ? "true" : undefined} aria-hidden="true" onAnimationIteration={e => retime(e.currentTarget, i)} style={{ "--y": p.y, "--s": p.size, "--d": `${p.duration}s`, "--dl": `${p.delay}s`, "--o": scene.clouds.depths[p.depth].opacity, "--z": scene.clouds.depths[p.depth].z, "--cloud-mask": p.mask, "--shelf": `${p.shelf}%` } as Style}/>)}</>;
}
/**
 * The cloud silhouette: lobed puffs and a base ellipse added together (soft 3 to 10 px rim, no blur). The flat shelf is cut
 * by `clip-path: inset(...)` on the cloud element (the `--shelf` property), not by mask compositing: the browser reduced
 * every mask-composite list to "add" (see CHANGELOG ui-v0.5.518), which turned each cloud into a solid slab.
 */
function cloudMask(shape: "a" | "b" | "c", depth: "far" | "mid" | "near") {
  const puffs = scene.clouds.puffs[shape] as number[][];
  const stop = scene.clouds.mask[depth]; const shelf = scene.clouds.shelf[shape];
  const lobes = puffs.map(puff => { const [x = 0, y = 0, r = 0] = puff; return `radial-gradient(circle calc(var(--s) * ${r / 100}) at ${x}% ${y}%, var(--weather-ink) 0 ${stop}%, transparent 100%)`; });
  const base = `radial-gradient(ellipse 46% 13% at 50% ${shelf}%, var(--weather-ink) 0 92%, transparent)`;
  return [...lobes, base].join(", ");
}

interface SceneSnapshot { cls: WeatherClass; intensity: number }
/**
 * Keeps the previous condition for 500 ms after `cls` changes so its group can fade out
 * while the new group fades in. `changed` is false until the first change, so the first
 * paint has no fade. The swap is derived during render, so the new group never paints
 * once at full opacity before its fade starts.
 */
function useCrossFade(current: SceneSnapshot) {
  const latest = useRef(current);
  const [state, setState] = useState<{ cls: WeatherClass; leaving?: SceneSnapshot; changed: boolean }>({ cls: current.cls, changed: false });
  if (state.cls !== current.cls) setState({ cls: current.cls, leaving: latest.current, changed: true });
  useEffect(() => { latest.current = current; });
  useEffect(() => {
    if (!state.leaving) return;
    const timer = window.setTimeout(() => setState(s => ({ ...s, leaving: undefined })), scene.crossFade.leaveUnmountMs);
    return () => window.clearTimeout(timer);
  }, [state.leaving]);
  return { leaving: state.leaving, changed: state.changed };
}

/**
 * Shared decorative scene: paints the sky gradient, light, clouds and weather behind the words.
 *
 * Props (all optional except `cls` and `isDay`):
 * - `cls`, `isDay`, `code`: the condition class, day or night, and the WMO code (drives `intensity`).
 * - `intensity` (0 to 1): overrides the intensity the code gives.
 * - `elevation` (degrees), or `sunrise` + `sunset` (ISO local) with `now`: the sun position. Without them `isDay` decides.
 * - `wind` (km/h): speeds clouds, snow and fog. `moon`: phase and illumination on a clear night.
 * - `variant`: `full`, `compact`, `wide` or `lite` (see the budgets below). `thunderJolt`: the storm shake.
 * - `width`, `height`: sizes in px when the parent cannot be measured. `running`: forces the scene on or off
 *   (tests); by default it follows the screen and the tab (`useSceneRunning`).
 * - `paused`: @deprecated use variant="lite". It maps to `lite`.
 *
 * Running-animation budgets per variant (checked in weather-sky.test.tsx at the reference size and at 2.2x):
 * full 90, wide 110, compact 50, lite 24. Lite shows 2 clouds, 8 rain drops, 10 flakes (no pendulum, no pile),
 * 18 stars, and no splashes, corona, grain or jolt.
 */
export function WeatherSky({ cls, isDay, code = 0, intensity, elevation, sunrise, sunset, now, wind, width, height, paused = false, variant: variantProp, thunderJolt, seed: _seed, running: runningProp, moon }: { cls: WeatherClass; isDay: boolean; code?: number; intensity?: number; elevation?: number; sunrise?: string; sunset?: string; now?: Date | string | number; wind?: number; width?: number; height?: number; paused?: boolean; variant?: WeatherVariant; thunderJolt?: boolean; seed?: number; running?: boolean; moon?: WeatherMoon }) {
  const variant = paused ? "lite" : (variantProp ?? "full");
  const skyRef = useRef<HTMLDivElement>(null);
  const observedRunning = useSceneRunning(skyRef);
  const running = runningProp ?? observedRunning;
  const [measuredWidth, setMeasuredWidth] = useState(width ?? scene.clouds.defaultWidth);
  const [measuredHeight, setMeasuredHeight] = useState(height ?? 230);
  useEffect(() => {
    if (width !== undefined) { setMeasuredWidth(width); return; }
    const el = skyRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => { const box = entries[0]?.contentRect; if (box?.width) setMeasuredWidth(box.width); if (box?.height) setMeasuredHeight(box.height); });
    observer.observe(el); return () => observer.disconnect();
  }, [width]);
  useEffect(() => { if (height !== undefined) setMeasuredHeight(height); }, [height]);
  const [reduced, setReduced] = useState(lightningReducedMotion);
  const storm = cls === "thunderstorm";
  const jolt = thunderJolt ?? (variant === "full" || variant === "wide");
  useEffect(() => {
    const el = skyRef.current; if (!storm || !el) return;
    const reducedNow = lightningReducedMotion(); setReduced(reducedNow);
    if (reducedNow || !running || paused) return;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { el.removeAttribute("data-strike"); if (fallback !== undefined) clearTimeout(fallback); fallback = undefined; };
    const cancel = scheduleStrike(strike => {
      clear();
      el.style.setProperty("--wx-bolt-x", `${strike.x}%`);
      el.setAttribute("data-strike", strike.bolt);
      fallback = setTimeout(clear, scene.lightning.clearMs);
    });
    return () => { cancel(); clear(); };
  }, [storm, running, paused]);
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
  const moonPosition = lightPosition(variant, timing.dayFraction, "moon");
  const moonData = moon ?? moonFromDate(clock);
  const areaScale = precipitationScale(measuredWidth, measuredHeight);
  const cap = scene.precipitation.rain.pools[variant];
  const snowWind = cloudWindFactor(wind);
  const current: SceneSnapshot = { cls, intensity: actualIntensity };
  const { leaving, changed } = useCrossFade(current);
  const side = timing.phase === "dawn" || (timing.phase === "night" && timing.elevation < 0 && timing.dayFraction < 0.5) ? "dawn" : "dusk";
  const twilight = timing.phase === "dawn" || timing.phase === "dusk" ? timing.phase : side;
  const skyStyle = { "--wx-t": timing.t, "--wx-night": Math.max(0, Math.min(1, 1 - timing.t * 2)), "--wx-night-top": `var(--weather-${cls}-night-top)`, "--wx-night-mid": `var(--weather-${cls}-night-mid)`, "--wx-night-bottom": `var(--weather-${cls}-night-bottom)`, "--wx-twilight-top": `var(--weather-${cls}-${twilight}-top)`, "--wx-twilight-mid": `var(--weather-${cls}-${twilight}-mid)`, "--wx-twilight-bottom": `var(--weather-${cls}-${twilight}-bottom)`, "--wx-day-top": `var(--weather-${cls}-day-top)`, "--wx-day-mid": `var(--weather-${cls}-day-mid)`, "--wx-day-bottom": `var(--weather-${cls}-day-bottom)`, "--wx-glow": `var(--weather-${cls}-${timing.phase}-glow)`, "--wx-scrim": `var(--weather-${cls}-${timing.phase}-scrim)`, "--wx-light-x": `${position.x}%`, "--wx-light-y": `${timing.phase === "dawn" || timing.phase === "dusk" ? scene.sun.twilightY : Math.max(40, position.y)}%`, "--wx-moon-x": `${moonPosition.x}%`, "--wx-moon-y": `${Math.max(12,moonPosition.y)}%`, "--weather-intensity": actualIntensity } as CSSProperties;
  Object.assign(skyStyle, { "--wx-cloud-day-lit": `var(--weather-${cls}-cloud-lit)`, "--wx-cloud-day-shade": `var(--weather-${cls}-cloud-shade)`, "--wx-cloud-night-lit": `var(--weather-${cls}-cloud-night-lit)`, "--wx-cloud-night-shade": `var(--weather-${cls}-cloud-night-shade)`, "--wx-cloud-twilight-lit": `var(--weather-${cls}-cloud-twilight-lit)`, "--wx-cloud-twilight-shade": `var(--weather-${cls}-cloud-twilight-shade)` });
  // One condition group: the sun or moon, stars, fog, precipitation and lightning of one class.
  // Clouds sit outside it because they persist across class changes.
  const group = (g: SceneSnapshot, mode: "steady" | "entering" | "leaving") => {
    const c = g.cls; const ai = g.intensity; const isStorm = c === "thunderstorm";
    const heavy = isStorm && ai >= 0.9;
    const rainBase = c === "drizzle" ? scene.precipitation.rain.drizzle : heavy ? scene.precipitation.rain.heavy : ai < 0.6 ? scene.precipitation.rain.light : scene.precipitation.rain.steady;
    const rainCount = intensity !== undefined ? precipitationCount(rainBase, ai, areaScale, cap) : precipitationCount(rainBase, ai > 0 ? 1 : 0, areaScale, cap);
    const snowBase = variant === "lite" ? scene.precipitation.snow.lite : scene.precipitation.snow.count;
    const snowCount = precipitationCount(snowBase, intensity !== undefined ? ai : ai > 0 ? 1 : 0, areaScale, snowBase);
    const flakes = snow.slice(0, snowCount);
    // The largest flakes are the near ones: soft, and on the pendulum (never in lite).
    const soft = new Set(variant === "lite" ? [] : flakes.map((p, i) => [p.size, i] as const).sort((a, b) => b[0] - a[0]).slice(0, scene.precipitation.snow.pendulum).map(([, i]) => i));
    const splashCount = c === "drizzle" || variant === "lite" ? 0 : Math.floor(rainCount * (heavy ? scene.precipitation.rain.heavySplashRatio : scene.precipitation.rain.splashRatio));
    const hasSun = timing.phase !== "night" && (c === "clear" || c === "partly-cloudy" || c === "fog");
    const hasMoon = timing.phase === "night" && (c === "clear" || c === "partly-cloudy");
    const hasMoonHalo = timing.phase === "night" && (c === "overcast" || c === "snow");
    const starBase = c === "clear" ? 54 : c === "partly-cloudy" ? 30 : c === "overcast" ? 8 : 0;
    const starCount = Math.min(scene.starCaps[variant], starBase);
    const corona = variant === "full" || variant === "wide";
    return <span key={c} data-weather-group="" data-class={c} data-entering={mode === "entering" ? "true" : undefined} data-leaving={mode === "leaving" ? "true" : undefined} aria-hidden="true">
      {hasSun && <span data-fx="sun-group" data-dimmed={c === "fog" ? "true" : undefined}><span data-fx="sun-halo-a"/><span data-fx="sun-halo-b"/>{corona && <span data-fx="sun-corona"/>}<span data-fx="sun"/></span>}
      {(hasMoon || hasMoonHalo) && <span data-fx="moon-group" data-halo-only={hasMoonHalo ? "true" : undefined}><span data-fx="moon-halo"/>{hasMoon && <span data-fx="moon-disc"><MoonDisc phase={moonData.phase} illumination={moonData.illumination} size={variant === "lite" ? 28 : variant === "compact" ? 40 : variant === "wide" ? 64 : 54}/></span>}</span>}
      {timing.phase === "night" && starCount > 0 && <span data-fx="star-field">{stars.slice(0, starCount).map((p, i) => <span key={i} data-fx="star" data-twinkle={i % 3 === 0 ? "true" : undefined} aria-hidden="true" style={{ ...style({ ...p, y: c === "overcast" ? p.y % 20 : p.y }), "--dl": `${-(i % 7) * 0.7}s` } as Style}/>)}</span>}
      {(c === "fog" || c === "drizzle" || (c === "snow" && variant !== "lite")) && fog.slice(0, c === "fog" ? 3 : 1).map((p, i) => <span key={i} data-fx="fog" aria-hidden="true" style={{ ...style({ ...p, dur: c === "drizzle" ? 7 : p.dur / snowWind, opacity: c === "snow" ? scene.precipitation.snow.haze : p.opacity }), "--fog-scale": [1.6,1.3,1][i]!, "--breath": [5,7,9][i]! + "s" } as Style}/>)}
      {(c === "rain" || c === "drizzle" || isStorm) && <>{rain.slice(0, rainCount).map((p, i) => { const drop = rainDrop(p, i, c === "drizzle", heavy, measuredHeight); return <span key={i} data-fx="fall" data-drop={drop.depth} aria-hidden="true" style={drop.style}>{i < splashCount && <i data-fx="splash" aria-hidden="true"/>}</span>; })}</>}
      {c === "snow" && <><span data-fx="snow-field">{flakes.map((p, i) => <span key={i} data-fx="flake" data-soft={soft.has(i) ? "true" : undefined} style={{ ...snowFlake(p, i, measuredHeight), "--wind": wind ?? 0 } as Style}>{soft.has(i) ? <span data-fx="sway" style={{ "--d": `${1.6 + (i % 5) * 0.2}s`, "--dl": `${p.delay}s` } as Style}><span data-fx="snow-core"/></span> : null}</span>)}</span>{variant !== "lite" && <span data-fx="pile" style={{ "--pile-cap": ai < 0.5 ? 0.5 : 1 } as Style} aria-hidden="true"/>}</>}
      {isStorm && <>{(["a", "b", "c"] as const).map(name => <svg key={name} data-fx="strike-bolt" data-bolt={name} viewBox={`0 0 80 ${scene.lightning.boltStepY * 20}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true"><polyline points={scene.lightning.bolts[name].map((x, i) => `${x},${i * scene.lightning.boltStepY}`).join(" ")}/></svg>)}<span data-fx="strike-sheet"/><span data-fx="cloud-light"/></>}
    </span>;
  };
  return <div ref={skyRef} data-slot="weather-sky" data-class={cls} data-phase={timing.phase} data-intensity={actualIntensity} data-running={running ? "true" : "false"} data-variant={variant} data-mounted="true" data-paused={paused ? "true" : "false"} data-jolt={storm && jolt ? "true" : undefined} data-reduced={storm && reduced ? "true" : undefined} style={skyStyle} aria-hidden="true" onAnimationEnd={e => { if (e.target instanceof Element && e.target.getAttribute("data-fx") === "strike-bolt") e.currentTarget.removeAttribute("data-strike"); }}>
    <span data-weather-layer="base" className="weather-sky-base" aria-hidden="true"/>
    <span data-weather-layer="glow" className="weather-sky-glow" aria-hidden="true"/>
    <span data-weather-layer="horizon" className="weather-sky-horizon" aria-hidden="true"/>
    <span data-weather-layer="horizon-day" className="weather-sky-horizon-day" aria-hidden="true"/>
    <span data-weather-layer="vignette" className="weather-sky-vignette" aria-hidden="true"/>
    {variant !== "lite" ? <span data-weather-layer="grain" className="weather-sky-grain" aria-hidden="true"/> : null}
    <span data-weather-layer="scrim" className="weather-sky-scrim" aria-hidden="true"/>
    <span data-weather-layer="text-scrim" className="weather-sky-text-scrim" aria-hidden="true"/>
    {[leaving && leaving.cls !== cls ? group(leaving, "leaving") : null, group(current, changed ? "entering" : "steady")]}
    {(cls !== "clear" || isDay) && <Clouds cls={cls} variant={variant} wind={wind} width={measuredWidth}/>}
  </div>;
}

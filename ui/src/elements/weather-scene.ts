import scene from "./weather-scene.json";

export type WeatherPhase = "night" | "dawn" | "day" | "dusk";
export type WeatherVariant = "full" | "compact" | "wide" | "lite";
export interface PhaseInput { elevation?: number; sunrise?: string; sunset?: string; now?: Date | string | number; isDay: boolean }
export interface PhaseResult { phase: WeatherPhase; elevation: number; t: number; dayFraction: number }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const parseTime = (v: string | Date | number | undefined, fallback?: number) => {
  if (v === undefined) return fallback;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v)) return undefined;
  const local = /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v) ? (v.length === 16 ? `${v}:00` : v) : v;
  return new Date(local).getTime();
};
export function phaseOf(input: PhaseInput): PhaseResult {
  let elevation = input.elevation;
  let dayFraction = 0.5;
  if (elevation === undefined && input.sunrise && input.sunset) {
    const rise = parseTime(input.sunrise)!; const set = parseTime(input.sunset)!; const now = parseTime(input.now, Date.now())!;
    dayFraction = clamp((now - rise) / Math.max(1, set - rise), 0, 1);
    const riseNext = now < rise ? rise : rise + 86400000;
    const setPrev = now >= set ? set : set - 86400000;
    const signedMinutes = now >= rise && now < set ? Math.min(now - rise, set - now) / 60000 : -Math.min(Math.abs(now - riseNext), Math.abs(now - setPrev)) / 60000;
    elevation = clamp(signedMinutes * scene.phase.degreesPerMinute, -scene.phase.elevationClamp, scene.phase.elevationClamp);
  }
  elevation ??= input.isDay ? 30 : -30;
  const u = clamp((elevation - scene.phase.nightBelow) / scene.phase.smoothstepSpan, 0, 1);
  const t = u * u * (3 - 2 * u);
  const phase: WeatherPhase = elevation < scene.phase.nightBelow ? "night" : elevation > scene.phase.dayAbove ? "day" : elevation >= 0 ? "dawn" : "dusk";
  return { phase, elevation, t, dayFraction };
}
export function lightPosition(variant: WeatherVariant, fraction: number, kind: "sun" | "moon" = "sun") {
  void kind;
  if (variant === "compact" || variant === "lite") return { x: scene.light.compactX, y: scene.light.compactYStart - scene.light.compactYTravel * Math.sin(Math.PI * fraction) };
  return { x: scene.light.fullXStart - scene.light.fullXTravel * fraction, y: scene.light.fullYStart - scene.light.fullYTravel * Math.sin(Math.PI * fraction) };
}
export function weatherIntensityOf(code: number) { return scene.intensity[String(code) as keyof typeof scene.intensity] ?? 0; }
export function cloudWindFactor(wind?: number) { return wind === undefined ? 1 : clamp(scene.clouds.wind.base + wind * scene.clouds.wind.perKmh, scene.clouds.wind.min, scene.clouds.wind.max); }
export function cloudDuration(width: number, cloudWidth: number, speed: number, windFactor: number) { return (width + cloudWidth) / (speed * windFactor); }

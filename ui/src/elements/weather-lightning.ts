import scene from "./weather-scene.json";

export type BoltName = "a" | "b" | "c";
export interface Strike { bolt: BoltName; x: number }
export interface StrikeTimers { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void }

const names: readonly BoltName[] = ["a", "b", "c"];
const defaultTimers: StrikeTimers = { setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms), clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>) };

/** True when the person asked for less motion (OS setting or the kit's calm mode). */
export function lightningReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const query = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  return query || document.documentElement.dataset.easeMotion === "calm";
}

/**
 * Schedules strikes: the first 1.5 to 6 s after the start, then gaps of 6 to 18 s.
 * One strike in four is a double whose second strike starts 1 s or more after the first,
 * so no flash repeats more than three times in any one second (WCAG 2.3.1).
 * Returns a function that cancels everything still pending.
 */
export function scheduleStrike(onStrike: (strike: Strike) => void, rng: () => number = Math.random, timers: StrikeTimers = defaultTimers): () => void {
  const cfg = scene.lightning;
  let handle: unknown;
  let cancelled = false;
  const between = (range: readonly number[]) => (range[0] ?? 0) + rng() * ((range[1] ?? 0) - (range[0] ?? 0));
  const later = (ms: number, fn: () => void) => { handle = timers.setTimeout(() => { if (!cancelled) fn(); }, ms); };
  const strike = (second: boolean) => {
    const double = !second && rng() < cfg.doubleChance;
    onStrike({ bolt: names[Math.min(2, Math.floor(rng() * 3))]!, x: between(cfg.boltX) });
    if (double) later(between(cfg.doubleGapMs), () => strike(true));
    else later(between(cfg.gapMs), () => strike(false));
  };
  later(between(cfg.firstMs), () => strike(false));
  return () => { cancelled = true; if (handle !== undefined) timers.clearTimeout(handle); };
}

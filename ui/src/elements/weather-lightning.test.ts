import { afterEach, describe, expect, test } from "bun:test";
import { lightningReducedMotion, scheduleStrike, type Strike, type StrikeTimers } from "./weather-lightning";

/** A virtual clock: timers run in order as time is advanced, no real waiting. */
function clock() {
  let now = 0; let seq = 0;
  const pending = new Map<number, { at: number; fn: () => void }>();
  const timers: StrikeTimers = {
    setTimeout: (fn, ms) => { const id = ++seq; pending.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: handle => { pending.delete(handle as number); },
  };
  const advance = (to: number) => {
    for (;;) {
      const next = [...pending.entries()].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      pending.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = to;
  };
  return { timers, advance, pendingCount: () => pending.size, now: () => now };
}
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function run(seed: number, ms: number) {
  const c = clock(); const hits: { at: number; strike: Strike }[] = [];
  const cancel = scheduleStrike(strike => hits.push({ at: c.now(), strike }), seeded(seed), c.timers);
  c.advance(ms); cancel();
  return hits;
}

describe("scheduleStrike", () => {
  test("the first strike lands 1.5 to 6 s after the start", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const first = run(seed, 60_000)[0]!;
      expect(first.at).toBeGreaterThanOrEqual(1500); expect(first.at).toBeLessThanOrEqual(6000);
    }
  });
  test("gaps are 6 to 18 s, or 1 to 1.6 s inside a double", () => {
    let singleGaps = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const hits = run(seed, 400_000);
      for (let i = 1; i < hits.length; i++) {
        const gap = hits[i]!.at - hits[i - 1]!.at;
        if (gap < 6000) { expect(gap).toBeGreaterThanOrEqual(1000); expect(gap).toBeLessThanOrEqual(1600); } else { singleGaps++; expect(gap).toBeLessThanOrEqual(18_000); }
      }
    }
    expect(singleGaps).toBeGreaterThan(100);
  });
  test("about a quarter of strikes are doubles, and a double never repeats within 1000 ms", () => {
    let strikes = 0; let doubles = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const hits = run(seed, 120_000);
      // Count lead strikes (a strike that follows a long gap or starts the run); a double adds a close follower.
      for (let i = 0; i < hits.length - 1; i++) {
        const prevClose = i > 0 && hits[i]!.at - hits[i - 1]!.at < 6000;
        if (prevClose) continue;
        strikes++;
        const gap = hits[i + 1]!.at - hits[i]!.at;
        if (gap < 6000) { doubles++; expect(gap).toBeGreaterThanOrEqual(1000); }
      }
    }
    const share = doubles / strikes;
    expect(share).toBeGreaterThan(0.18); expect(share).toBeLessThan(0.32);
  });
  test("no more than three flash peaks in any one second (WCAG 2.3.1)", () => {
    for (let seed = 1; seed <= 400; seed++) {
      // One strike has two peaks, at +0 ms and +100 ms (the wx-strike envelope).
      const peaks = run(seed, 200_000).flatMap(h => [h.at, h.at + 100]).sort((a, b) => a - b);
      for (let i = 0; i < peaks.length; i++) {
        const inWindow = peaks.filter(p => p >= peaks[i]! && p < peaks[i]! + 1000).length;
        expect(inWindow).toBeLessThanOrEqual(3);
      }
    }
  });
  test("each strike picks one of three bolts and a position between 20 and 80 percent", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) for (const h of run(seed, 100_000)) { seen.add(h.strike.bolt); expect(h.strike.x).toBeGreaterThanOrEqual(20); expect(h.strike.x).toBeLessThanOrEqual(80); }
    expect([...seen].sort()).toEqual(["a", "b", "c"]);
  });
  test("cancel stops every pending timer and no strike follows", () => {
    const c = clock(); let count = 0;
    const cancel = scheduleStrike(() => { count++; }, seeded(7), c.timers);
    expect(c.pendingCount()).toBe(1);
    cancel();
    expect(c.pendingCount()).toBe(0);
    c.advance(100_000);
    expect(count).toBe(0);
  });
});

describe("lightningReducedMotion", () => {
  const original = window.matchMedia;
  afterEach(() => { window.matchMedia = original; delete document.documentElement.dataset.easeMotion; });
  test("false by default, true for the media query and for calm mode", () => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof window.matchMedia;
    expect(lightningReducedMotion()).toBe(false);
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q })) as typeof window.matchMedia;
    expect(lightningReducedMotion()).toBe(true);
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof window.matchMedia;
    document.documentElement.dataset.easeMotion = "calm";
    expect(lightningReducedMotion()).toBe(true);
  });
});

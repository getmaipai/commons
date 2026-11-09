export type MouthLetter = "A" | "B" | "C" | "D" | "E" | "F";

export const LIFE = {
  holdMs: 70,
  breathPeriod: 4.2,
  breathAmplitude: 0.004,
  levelScale: 0.003,
  swayPeriod: 7.3,
  swayAmplitude: 0.5,
  swaySecondPeriod: 3.1,
  swaySecondAmplitude: 0.25,
  levelSwayAmplitude: 0.35,
  levelSwayPeriod: 1.7,
  driftXPeriod: 9.1,
  driftXAmplitude: 0.35,
  driftYPeriod: 5.3,
  driftYAmplitude: 0.3,
  levelDriftY: 0.45,
} as const;

const OPEN = ["A", "B", "C", "D"] as const;
export function nextMouthLetter(current: MouthLetter | null, target: MouthLetter | null, heldMs: number): MouthLetter | null {
  if (target === current) return current;
  if (current === null) return target;
  if (heldMs < LIFE.holdMs) return current;
  if (!current || !target || !OPEN.includes(current as typeof OPEN[number]) || !OPEN.includes(target as typeof OPEN[number])) return target;
  const from = OPEN.indexOf(current as typeof OPEN[number]);
  const to = OPEN.indexOf(target as typeof OPEN[number]);
  if (from < to) return OPEN[Math.min(to, from + 2)]!;
  return OPEN[Math.max(to, from - 1)]!;
}

export function levelMouthLetter(level: number, hasA: boolean): MouthLetter | null {
  if (level < 0.06) return hasA ? "A" : null;
  if (level < 0.2) return "B";
  if (level < 0.4) return "C";
  return "D";
}

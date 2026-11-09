// PARITY-01: the sleep timer's pure rules, kept apart from the component like playerLogic.ts.

/** The minute choices the menu offers, after "End of episode". */
export const SLEEP_MINUTES = [5, 10, 15, 30, 45, 60] as const;

/** What is armed: stop when the item ends, stop at a clock time, or nothing. */
export type SleepState = { kind: "end" } | { kind: "at"; endsAt: number; minutes: number } | null;

/** A choice from the menu value string: "off", "end" or "15". */
export function sleepFromValue(value: string, now: number): SleepState {
  if (value === "end") return { kind: "end" };
  const minutes = Number(value);
  if (!SLEEP_MINUTES.includes(minutes as (typeof SLEEP_MINUTES)[number])) return null;
  return { kind: "at", endsAt: now + minutes * 60_000, minutes };
}

/** The menu value that matches a state. */
export function sleepValue(state: SleepState): string {
  return state === null ? "off" : state.kind === "end" ? "end" : String(state.minutes);
}

/** Milliseconds left, never negative. */
export function sleepRemainingMs(state: SleepState, now: number): number {
  return state && state.kind === "at" ? Math.max(0, state.endsAt - now) : 0;
}

/** "14:59", or "1:00:00" for an hour. Rounds up, so the last second still reads 0:01. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

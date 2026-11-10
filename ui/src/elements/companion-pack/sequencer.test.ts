import { expect, test } from "bun:test";
import { createSequencer, planSwitch, restHoldMs } from "./sequencer";
import type { PackClip, PackState } from "./types";

const clip = (id: string, weight = 1): PackClip => ({
  id, file: `${id}.mp4`, fps: 24, frames: 117, rest: { first: 0, last: 116 }, weight,
});
const states = (clips: PackClip[]): Record<PackState, PackClip[]> => ({
  idle: clips, listen: clips, think: clips, speak: clips,
});

test("seeded sequences are deterministic and avoid immediate repeats", () => {
  const pool = states([clip("a"), clip("b"), clip("c")]);
  const a = createSequencer(pool, 31), b = createSequencer(pool, 31);
  const first: string[] = [], second: string[] = [];
  for (let i = 0; i < 1000; i += 1) { first.push(a.next("idle")!.id); second.push(b.next("idle")!.id); }
  expect(first).toEqual(second);
  expect(first.every((id, index) => index === 0 || id !== first[index - 1])).toBe(true);
});

test("weighted picks stay within five percent over three thousand draws", () => {
  const seq = createSequencer(states([clip("light", 1), clip("heavy", 3)]), 9);
  let heavy = 0;
  for (let i = 0; i < 3000; i += 1) if (seq.next("idle")?.id === "heavy") heavy += 1;
  expect(heavy / 3000).toBeGreaterThan(.70);
  expect(heavy / 3000).toBeLessThan(.80);
});

test("single clip repeats, holds use bounded intervals, and switches reach rest", () => {
  const only = createSequencer(states([clip("only")]), 2);
  expect(only.next("speak")?.id).toBe("only");
  expect(only.next("speak")?.id).toBe("only");
  expect(restHoldMs("idle", () => 0)).toBe(1200);
  expect(restHoldMs("listen", () => 1)).toBe(900);
  expect(planSwitch({ frame: 30, clip: clip("a"), nextClip: clip("b"), fps: 24, urgent: true })).toEqual({ speedUp: 8, untilFrame: 116 });
  expect(planSwitch({ frame: 116, clip: clip("a"), nextClip: clip("b"), fps: 24, urgent: true })).toEqual({ speedUp: 1, untilFrame: 0 });
  expect(planSwitch({ frame: 30, clip: clip("a"), nextClip: clip("b"), fps: 24 })).toEqual({ speedUp: 1, untilFrame: 116 });
});

import type { PackClip, PackState } from "./types";

export const IDLE_HOLD_MIN_MS = 1200;
export const IDLE_HOLD_MAX_MS = 4400;
export const LISTEN_HOLD_MIN_MS = 300;
export const LISTEN_HOLD_MAX_MS = 900;
export const MAX_SWITCH_RATE = 8;
export type PackStates = Record<PackState, PackClip[]>;

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSequencer(states: PackStates, seed = 1) {
  const rng = seeded(seed);
  const previous = new Map<PackState, string>();
  return {
    next(state: PackState): PackClip | undefined {
      const clips = (states[state] ?? []).filter((clip) => !clip.gesture);
      if (!clips.length) return undefined;
      let choices = clips;
      const last = previous.get(state);
      if (clips.length > 1 && last) {
        const fresh = clips.filter((clip) => clip.id !== last);
        if (fresh.length > 1) choices = fresh;
      }
      const total = choices.reduce((sum, clip) => sum + (clip.weight ?? 1), 0);
      let pick = rng() * total;
      const selected = choices.find((clip) => (pick -= clip.weight ?? 1) < 0) ?? choices[0];
      if (!selected) return undefined;
      previous.set(state, selected.id);
      return selected;
    },
  };
}

export function restHoldMs(state: PackState, rng: () => number = Math.random): number {
  const [min, max] = state === "listen"
    ? [LISTEN_HOLD_MIN_MS, LISTEN_HOLD_MAX_MS]
    : [IDLE_HOLD_MIN_MS, IDLE_HOLD_MAX_MS];
  return min + rng() * (max - min);
}

export type SwitchPlan = { speedUp: number; untilFrame: number };
export function planSwitch({ frame, clip, nextClip: _nextClip, fps, urgent = false }: {
  frame: number;
  clip: PackClip;
  nextClip: PackClip;
  fps: number;
  urgent?: boolean;
}): SwitchPlan {
  const atEnd = frame >= clip.rest.last;
  void fps;
  const untilFrame = atEnd ? clip.rest.first : Math.max(frame, clip.rest.last);
  return { speedUp: urgent && !atEnd ? MAX_SWITCH_RATE : 1, untilFrame };
}

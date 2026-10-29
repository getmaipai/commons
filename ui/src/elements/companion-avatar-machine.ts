import mediaVocab from "@maipai/spec/vocab/companion-media.json";
import emotionMap from "@maipai/spec/vocab/emotion-map.json";

export const COMPANION_STATE_IDS = mediaVocab.states.map(({ id }) => id) as readonly (typeof mediaVocab.states)[number]["id"][];
export type StateId = (typeof COMPANION_STATE_IDS)[number];
export type CompanionClip = { h264?: string; av1?: string; still: string; loop: boolean };
export type CompanionClips = Partial<Record<StateId, CompanionClip>> & { idle: CompanionClip };
export type PictureState = { keyframe?: string | null; still?: string | null };
type EmotionLabel = keyof typeof mediaVocab.emotion_clips;
export function resolveClip(state: StateId, available: readonly StateId[]): StateId {
  const choices = [state, ...(mediaVocab.fallback as Partial<Record<StateId, StateId[]>>)[state] ?? ["idle"]];
  return choices.find((candidate) => available.includes(candidate)) ?? "idle";
}
export function emotionClip(label: string, band: "child" | "teen" | "adult"): StateId | null {
  const mapping = mediaVocab.emotion_clips[label as EmotionLabel];
  if (!mapping) return null;
  const emotion = emotionMap.labels.find(({ label: name }) => name === label);
  if (band === "child" && emotion?.child_band !== "same") return null;
  return mapping.state as StateId;
}
export function pictureFor(_state: StateId, manifestState: PictureState): string | null {
  return manifestState.keyframe || manifestState.still || null;
}
export type WantedInputs = { needs_you: boolean; speaking: boolean; working: boolean; thinking: boolean; listening: boolean; sleeping: boolean };
export const COMPANION_PRIORITY = ["needs_you", "speaking", "working", "thinking", "listening", "sleeping", "idle"] as const satisfies readonly StateId[];
const ONE_SHOTS = mediaVocab.states.filter(({ kind }) => kind === "oneshot").map(({ id }) => id) as StateId[];

export function pickWanted(inputs: Partial<WantedInputs>): StateId {
  return COMPANION_PRIORITY.find((state) => state === "idle" || inputs[state] === true) ?? "idle";
}

export interface CompanionMachineOptions {
  idleLookMinMs?: number;
  idleLookMaxMs?: number;
  random?: () => number;
}

export function createCompanionAvatarMachine(clips: CompanionClips, options: CompanionMachineOptions = {}) {
  let current: StateId = "idle";
  let wanted: StateId = "idle";
  let pending: StateId | null = null;
  const unavailable = new Set<StateId>();
  let idleSince: number | null = null;
  let nextIdleLook: number | null = null;
  const min = options.idleLookMinMs ?? 20_000;
  const max = options.idleLookMaxMs ?? 40_000;
  const random = options.random ?? Math.random;
  const available = (state: StateId) => !!clips[state] && !unavailable.has(state);
  const resolve = (state: StateId) => resolveClip(state, COMPANION_STATE_IDS.filter(available));
  const setCurrent = (state: StateId, nowMs?: number) => {
    const next = resolve(state);
    if (next === current) return;
    current = next;
    if (current === "idle") {
      idleSince = nowMs ?? idleSince;
      nextIdleLook = idleSince === null ? null : idleSince + min + Math.floor(random() * Math.max(0, max - min + 1));
    } else { idleSince = null; nextIdleLook = null; }
  };
  const transitionAtEnd = (nowMs?: number) => {
    if (wanted === "needs_you" || wanted === "speaking") {
      pending = null;
      setCurrent(wanted, nowMs);
      return;
    }
    if (pending && available(pending)) {
      const oneShot = pending;
      pending = null;
      setCurrent(oneShot, nowMs);
      return;
    }
    pending = null;
    setCurrent(wanted, nowMs);
  };
  return {
    current: () => current,
    want(state: StateId) {
      wanted = resolve(state);
      if ((wanted === "needs_you" || wanted === "speaking") && clips[current] && !clips[current]!.loop) {
        setCurrent(wanted);
        return current;
      }
      if ((current === "needs_you" || current === "speaking") && clips[current]?.loop) return current;
      if (!clips[current]) setCurrent("idle");
      return current;
    },
    play(oneShot: StateId) {
      if (!(ONE_SHOTS as readonly StateId[]).includes(oneShot) || !available(oneShot)) return current;
      if (current === "needs_you" || current === "speaking" || wanted === "needs_you" || wanted === "speaking" || pending) return current;
      pending = oneShot;
      return current;
    },
    onClipEnded(nowMs?: number) {
      const clip = clips[current];
      if (!clip) { setCurrent("idle", nowMs); return current; }
      if (clip.loop) {
        if (pending || wanted !== current) transitionAtEnd(nowMs);
      } else transitionAtEnd(nowMs);
      return current;
    },
    tick(nowMs: number) {
      if (current === "idle") {
        if (idleSince === null) { idleSince = nowMs; nextIdleLook = idleSince + min + Math.floor(random() * Math.max(0, max - min + 1)); }
        if (nextIdleLook !== null && nowMs >= nextIdleLook && wanted === "idle" && available("idle_look")) {
          pending = null;
          setCurrent("idle_look", nowMs);
        }
      }
      return current;
    },
    onClipError() {
      if (current === "idle") return { state: "idle" as const, failed: true };
      unavailable.add(current);
      if (pending === current) pending = null;
      setCurrent("idle");
      return { state: "idle" as const, failed: false };
    },
  };
}

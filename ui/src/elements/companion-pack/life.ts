import {
  BLINK_DOWN_SECONDS, BLINK_DURATION_SECONDS, BLINK_MAX_INTERVAL_SECONDS,
  BLINK_MIN_INTERVAL_SECONDS, BLINK_PAUSE_SNAP_SECONDS, BLINK_RATE_PER_SECOND,
  EMO_WORDS, EVENT_MIN_FRAMES, FRAME_SECONDS, FX_BROW_LEAD, FX_ENV_FLOOR,
  FX_GAZE_END_MARGIN, FX_GAZE_START, FX_MICRO_END, FX_MICRO_END_MARGIN,
  FX_MICRO_START, FX_NOD_LAG, FX_PEAK_FLOOR, FX_PEAK_SKIP, FX_POISSON_JITTER_LOW,
  FX_POISSON_JITTER_SPAN, FX_POSE_BROW, FX_POSE_ROLL, FX_POSE_TILT,
  GAZE_MAX_SECONDS, GAZE_MIN_SECONDS, LIFE_CHARACTER, LIFE_JITTER,
  LIFE_LOUD_DEFAULTS, LIFE_PROFILE, MICRO, MICRO_DECOLLISION_PROBABILITY,
  MICRO_DECOLLISION_SECONDS, MICRO_DECOLLISION_SHIFT, MICRO_RATE, MICRO_SCALE,
  PAUSE_SNAP_GAP, PAUSE_SNAP_MIN, PAUSE_SNAP_RADIUS,
} from "./constants";
import type { Cue } from "./cues";
import type { EventWindow, VocalTag } from "./tags";

export type LifeEvent = {
  channel: "brow" | "nod" | "tilt" | "gaze"; direction?: "L" | "R" | "U";
  t0: number; duration: number; amp: number;
};
export type MicroPose = "mBrow" | "mCorner" | "mAsymL" | "mAsymR" | "mUpper" | "mPress" | "mNostril" | "mWrinkle";
export type MicroEvent = {
  channel: "brow" | "lip" | "nose"; pose: MicroPose; t0: number; px: number; sign: number;
  rise: number; hold: number; fall: number;
};
export type LifePlan = LifeEvent[] & {
  micro: MicroEvent[]; inhales: number[]; shoulderPct: number; browShout: number;
  eyeGain: Partial<Record<"squint" | "closed" | "half" | "wide", number>>;
  loud: LifeProfile["loud"];
  blinks: BlinkEvent[];
};
export type BlinkEvent = { t0: number; duration: number; down: number; amp: number };
export type LifeProfile = {
  loud?: { eyeWide?: number; browShout?: number; brow?: number; nodCap?: number; tiltCap?: number; shoulderPct?: number };
  micro?: Partial<Record<"brow" | "corner" | "asym" | "upper" | "press" | "nostril" | "wrinkle", number>>;
  shoulderPct?: number; browShout?: number; eyeGain?: Partial<Record<"squint" | "closed" | "half" | "wide", number>>;
  vocal?: { back?: number; dip?: number };
};

export const LIFE = {
  loud: LIFE_CHARACTER, loudDefaults: LIFE_LOUD_DEFAULTS, micro: MICRO,
  shoulderPct: LIFE_LOUD_DEFAULTS.shoulderPct,
  browShout: LIFE_LOUD_DEFAULTS.brow,
  eyeGain: LIFE_CHARACTER,
};

function randomFor(seed: number): () => number {
  let state = Math.imul(seed >>> 0, 2654435761) >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Demo PROFILE smoothstep attack, hold and release. */
export function PROFILE(time: number, rise: number, hold: number, fall: number): number {
  if (time < 0 || time > rise + hold + fall) return 0;
  const smooth = (value: number) => value * value * (3 - 2 * value);
  return time < rise ? smooth(time / rise)
    : time < rise + hold ? 1 : smooth(1 - (time - rise - hold) / fall);
}

const stressCue = (cue: Cue) => cue.l !== "A" && "CDEFH".includes(cue.l) && cue.p !== "_";
function mean(values: Float32Array, start: number, end: number): number {
  let sum = 0; let count = 0;
  for (let i = Math.floor(start / FRAME_SECONDS); i < Math.min(values.length, Math.ceil(end / FRAME_SECONDS)); i++) {
    sum += values[i]!; count++;
  }
  return count ? sum / count : 0;
}

/** Demo planFx, with gaze memory local to the supplied plan for determinism. */
export function planFx(cues: Cue[], envelope: Float32Array, duration: number, seed = 1): LifeEvent[] {
  const random = randomFor(seed); const events: LifeEvent[] = []; const last: Record<string, number> = {};
  for (const cue of cues) {
    if (!stressCue(cue) || mean(envelope, cue.t0, cue.t1) < FX_ENV_FLOOR || random() < FX_PEAK_SKIP) continue;
    const roll = random();
    const pose = roll < 0.07 && cue.t0 > 0.6 ? "nod"
      : roll >= 0.07 && roll < FX_POSE_BROW ? "brow"
        : roll >= FX_POSE_BROW && roll < FX_POSE_TILT ? "tilt" : null;
    if (!pose) continue;
    const spacing = pose === "tilt" ? 2.5 : pose === "nod" ? 2 : 0.7;
    if ((last[pose] ?? -9) + spacing > cue.t0) continue;
    last[pose] = cue.t0;
    const jitter = 1 - LIFE_JITTER + random() * LIFE_JITTER * 2;
    const t0 = pose === "brow" ? cue.t0 - FX_BROW_LEAD * jitter
      : pose === "nod" ? cue.t0 + FX_NOD_LAG * jitter : cue.t0;
    const amp = pose === "nod" ? 0.14 + 0.08 * random()
      : pose === "brow" ? 0.25 + 0.2 * random() : 0.3 + 0.2 * random();
    events.push({ channel: pose, t0: Math.max(0, t0), duration: pose === "brow" ? 0.5 : pose === "nod" ? 1.05 : 1.5, amp });
  }
  // Loud peaks have their own skipped, spaced nod/tilt track.
  const loudLast: Record<string, number> = {};
  for (const cue of cues) {
    if (!stressCue(cue) || mean(envelope, cue.t0, cue.t1) < FX_PEAK_FLOOR) continue;
    const loud = mean(envelope, cue.t0, cue.t1);
    if (loud < 0.4) continue;
    const roll = random();
    if ((loudLast.nod ?? -9) + 0.45 < cue.t0 && roll < 0.6) {
      loudLast.nod = cue.t0;
      events.push({ channel: "nod", t0: cue.t0 + 0.03, duration: 0.57, amp: 0.5 });
    } else if (roll > 0.85 && (loudLast.tilt ?? -9) + 1.2 < cue.t0) {
      loudLast.tilt = cue.t0;
      events.push({ channel: "tilt", t0: cue.t0, duration: 0.75, amp: 0.5 });
    }
  }
  const pauses: number[] = [];
  for (let i = 1; i < cues.length; i++) {
    if (cues[i]!.t0 - cues[i - 1]!.t1 > PAUSE_SNAP_GAP && cues[i]!.p !== "_") pauses.push(cues[i - 1]!.t1);
  }
  let time = FX_GAZE_START + random() * 1.3; const history: ("L" | "R" | "U")[] = [];
  let first = true;
  while (time < duration - FX_GAZE_END_MARGIN) {
    const pause = pauses.find((value) => value > PAUSE_SNAP_MIN && Math.abs(value - time) < PAUSE_SNAP_RADIUS);
    const t0 = pause ?? time;
    const direction = chooseGaze(random, history, first);
    history.push(direction); first = false;
    events.push({ channel: "gaze", direction, t0, duration: 1.16 + random() * 0.8, amp: 0.3 + 0.12 * random() });
    time = t0 + GAZE_MIN_SECONDS + random() * (GAZE_MAX_SECONDS - GAZE_MIN_SECONDS);
  }
  return events.sort((a, b) => a.t0 - b.t0);
}

function chooseGaze(random: () => number, history: ("L" | "R" | "U")[], first: boolean): "L" | "R" | "U" {
  const weights = { L: 1, R: 1, U: first ? 1.8 : 1 };
  const last = history.at(-1); const lastHorizontal = [...history].reverse().find((value) => value !== "U");
  if (last) weights[last] *= 0.4;
  if (lastHorizontal && last !== lastHorizontal) weights[lastHorizontal] *= 1;
  if (lastHorizontal && last === lastHorizontal) weights[lastHorizontal === "L" ? "R" : "L"] *= 0.3;
  if (history.length >= 2 && history.at(-1) === history.at(-2)) weights[history.at(-1)!] = 0;
  const total = weights.L + weights.R + weights.U; let value = random() * total;
  for (const direction of ["L", "R", "U"] as const) if ((value -= weights[direction]) < 0) return direction;
  return "U";
}

/** Research blink schedule: seeded irregular intervals, snapped to nearby phrase pauses. */
export function planBlinks(cues: Cue[], duration: number, seed = 1): BlinkEvent[] {
  const random = randomFor(seed ^ 0x51ed270b);
  const pauses: number[] = [];
  for (let i = 1; i < cues.length; i++) {
    if (cues[i]!.t0 - cues[i - 1]!.t1 > PAUSE_SNAP_GAP) pauses.push(cues[i - 1]!.t1);
  }
  const result: BlinkEvent[] = []; let time = 0.8;
  while (time < duration) {
    const pause = pauses.find((value) => value > time && value - time < BLINK_PAUSE_SNAP_SECONDS);
    const snapped = pause ?? time;
    result.push({ t0: snapped, duration: BLINK_DURATION_SECONDS, down: BLINK_DOWN_SECONDS, amp: 0.85 + random() * 0.15 });
    const interval = Math.min(BLINK_MAX_INTERVAL_SECONDS,
      Math.max(BLINK_MIN_INTERVAL_SECONDS, -Math.log(1 - random()) / BLINK_RATE_PER_SECOND));
    time = snapped + interval;
  }
  if (duration > 0 && (!result.length || duration - result[result.length - 1]!.t0 > BLINK_MAX_INTERVAL_SECONDS)) {
    result.push({ t0: Math.max(0, duration - BLINK_DOWN_SECONDS), duration: BLINK_DURATION_SECONDS,
      down: BLINK_DOWN_SECONDS, amp: 0.85 + random() * 0.15 });
  }
  return result;
}

/** Samples scheduled head and micro motions without a rendering dependency. */
export function lifeAt(plan: LifePlan, time: number): {
  fx: { event: LifeEvent; weight: number }[];
  micro: { event: MicroEvent; weight: number }[];
  blink: { close: number; open: number };
} {
  const fx = plan.filter((event) => time >= event.t0 && time < event.t0 + event.duration)
    .map((event) => ({ event, weight: event.amp * PROFILE(time - event.t0, 0.15, Math.max(0, event.duration - 0.3), 0.15) }));
  const micro = plan.micro.filter((event) => PROFILE(time - event.t0, event.rise, event.hold, event.fall) > 0)
    .map((event) => ({ event, weight: event.sign * event.px * PROFILE(time - event.t0, event.rise, event.hold, event.fall) }));
  const blink = plan.blinks.find((event) => time >= event.t0 && time <= event.t0 + event.duration);
  const elapsed = blink ? time - blink.t0 : 0;
  const close = blink && elapsed <= blink.down ? blink.amp * (elapsed / blink.down) : 0;
  const open = blink && elapsed > blink.down
    ? blink.amp * Math.max(0, 1 - (elapsed - blink.down) / (blink.duration - blink.down)) : 0;
  return { fx, micro, blink: { close, open } };
}

function poisson(random: () => number, rate: number, start: number, end: number, emit: (time: number) => void): void {
  let time = start + (-Math.log(1 - random()) / rate) * (FX_POISSON_JITTER_LOW + FX_POISSON_JITTER_SPAN * random());
  while (time < end) {
    emit(time);
    time += (-Math.log(1 - random()) / rate) * (FX_POISSON_JITTER_LOW + FX_POISSON_JITTER_SPAN * random());
  }
}

/** Demo planMicro: independent deterministic Poisson-like streams and de-collision. */
export function planMicro(cues: Cue[], envelope: Float32Array, duration: number, seed = 1,
  amplitudes: LifeProfile["micro"] = MICRO): MicroEvent[] {
  const events: MicroEvent[] = [];
  const stream = (id: number) => randomFor((Math.imul(seed + 7, 2654435761) + id * 40503) >>> 0);
  const vowel = (cue: Cue) => stressCue(cue);
  const push = (channel: MicroEvent["channel"], pose: MicroPose, t0: number, px: number, sign: number,
    rise: number, hold: number, fall: number) => events.push({ channel, pose, t0, px, sign, rise, hold, fall });
  {
    const r = stream(1); poisson(r, MICRO_RATE.brow, FX_MICRO_START.brow, duration - FX_MICRO_END_MARGIN,
      (time) => push("brow", "mBrow", time, (amplitudes?.brow ?? MICRO.brow) * (0.5 + 0.5 * r()), r() < 0.7 ? 1 : -1,
        0.25 + 0.15 * r(), 0.08 + 0.25 * r(), 0.3 + 0.1 * r()));
  }
  {
    const r = stream(2); poisson(r, MICRO_RATE.corner, FX_MICRO_START.corner, duration - FX_MICRO_END.corner,
      (time) => push("lip", "mCorner", time, (amplitudes?.corner ?? MICRO.corner) * (0.5 + 0.5 * r()), r() < 0.5 ? 1 : -1,
        0.2 + 0.15 * r(), 0.1 + 0.3 * r(), 0.25 + 0.15 * r()));
  }
  {
    const r = stream(3); poisson(r, MICRO_RATE.asym, FX_MICRO_START.asym, duration - FX_MICRO_END.asym,
      (time) => push("lip", r() < 0.5 ? "mAsymL" : "mAsymR", time, (amplitudes?.asym ?? MICRO.asym) * (0.5 + 0.5 * r()), 1,
        0.3, 0.3 + 0.4 * r(), 0.4));
  }
  {
    const r = stream(4);
    for (const cue of cues) if (vowel(cue) && mean(envelope, cue.t0, cue.t1) > 0.9 && r() < 0.35) {
      push("lip", "mUpper", cue.t0 - 0.03, (amplitudes?.upper ?? MICRO.upper) * (0.7 + 0.3 * r()), 1, 0.07, 0.08, 0.22);
    }
  }
  {
    const r = stream(5);
    for (let i = 1; i < cues.length; i++) if (cues[i]!.t0 - cues[i - 1]!.t1 > 0.25 && cues[i]!.p !== "_") {
      push("lip", "mPress", cues[i - 1]!.t1 - 0.05, (amplitudes?.press ?? MICRO.press) * (0.8 + 0.2 * r()), 1, 0.1, 0.12, 0.25);
    }
    push("lip", "mPress", Math.max(0, duration - 0.3), amplitudes?.press ?? MICRO.press, 1, 0.1, 0.1, 0.25);
  }
  {
    const r = stream(6);
    push("nose", "mNostril", 0, amplitudes?.nostril ?? MICRO.nostril, 1, 0.12, 0.1, 0.3);
    for (let i = 1; i < cues.length; i++) if (cues[i]!.t0 - cues[i - 1]!.t1 > 0.35 && cues[i]!.p !== "_") {
      push("nose", "mNostril", cues[i]!.t0 - 0.2, amplitudes?.nostril ?? MICRO.nostril, 1, 0.12, 0.1, 0.3);
    }
    for (const cue of cues) if (vowel(cue) && mean(envelope, cue.t0, cue.t1) > 1 && r() < 0.3) {
      push("nose", "mNostril", cue.t0 - 0.02, (amplitudes?.nostril ?? MICRO.nostril) * 0.8, 1, 0.08, 0.1, 0.25);
    }
  }
  {
    const r = stream(7); poisson(r, MICRO_RATE.wrinkle, FX_MICRO_START.wrinkle, duration - FX_MICRO_END_MARGIN,
      (time) => push("nose", "mWrinkle", time, (amplitudes?.wrinkle ?? MICRO.wrinkle) * (0.5 + 0.5 * r()), 1, 0.3, 0.3, 0.4));
  }
  const collisionRandom = stream(9); events.sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i < events.length; i++) for (let j = 0; j < i; j++) {
    if (events[j]!.channel !== events[i]!.channel && Math.abs(events[j]!.t0 - events[i]!.t0) < MICRO_DECOLLISION_SECONDS
      && collisionRandom() < MICRO_DECOLLISION_PROBABILITY) {
      events[i]!.t0 += MICRO_DECOLLISION_SHIFT; break;
    }
  }
  return events.sort((a, b) => a.t0 - b.t0);
}

export function planInhales(cues: Cue[], loudness: Float32Array): number[] {
  const result: number[] = [];
  for (let i = 0; i + 1 < cues.length; i++) {
    const cue = cues[i]!; const next = cues[i + 1]!;
    if (cue.p === "_" && cue.t1 - cue.t0 > 0.35 && next.p !== "_"
      && mean(loudness, next.t0, next.t0 + 0.3) > 0.45) result.push(next.t0);
  }
  return result;
}

/** One convenience plan containing the three deterministic planning tracks. */
export function planLife(cues: Cue[], loudness: Float32Array, seed = 1, character?: string | LifeProfile): LifePlan {
  const duration = cues[cues.length - 1]?.t1 ?? 0;
  const profile = typeof character === "string" ? LIFE_CHARACTER_PROFILE(character) : character;
  const fx = planFx(cues, loudness, duration, seed);
  const browScale = (profile?.browShout ?? profile?.loud?.browShout ?? LIFE_LOUD_DEFAULTS.brow) / LIFE_LOUD_DEFAULTS.brow;
  for (const event of fx) if (event.channel === "brow") event.amp *= browScale;
  return Object.assign(fx, { micro: planMicro(cues, loudness, duration, seed, profile?.micro),
    inhales: planInhales(cues, loudness), shoulderPct: LIFE_SHOULDER(profile),
    browShout: LIFE_BROW_SHOUT(profile), eyeGain: profile?.eyeGain ?? {}, loud: profile?.loud ?? {},
    blinks: planBlinks(cues, duration, seed) });
}

export function emotionFor(
  text: string, tags: string[] = [], loud = false,
): "angry" | "excited" | "alarmed" | "sad" | null {
  if (tags.some((tag) => ["laugh", "chuckle", "[laugh]", "[chuckle]"].includes(tag.toLowerCase()))) return "excited";
  const taggedText = `${text} ${tags.join(" ")}`;
  for (const kind of ["alarmed", "angry", "sad", "excited"] as const) {
    if (EMO_WORDS[kind]!.test(taggedText)) return kind;
  }
  return loud ? "excited" : null;
}

export function emotionKind(text: string, voiceMode: "normal" | "shout" = "normal", tags: string[] = []) {
  return emotionFor(text, tags, voiceMode === "shout");
}

export function taggedEvent(events: EventWindow[], tags: VocalTag[], time: number): EventWindow | null {
  const event = events.find((value) => time >= value.t0 - 0.05 && time < value.t1 + 0.12 + (value.type === "gasp" ? 0.4 : 0));
  return event && tags[event.tagIdx]?.type === event.type ? event : null;
}

// Keep source constants referenced here visible to consumers that need the profile scales.
export const LIFE_MICRO_SCALE = MICRO_SCALE;
export const LIFE_PROFILE_TIMES = LIFE_PROFILE;
export const LIFE_MIN_FRAMES = EVENT_MIN_FRAMES;
export const LIFE_JITTER_RANGE = FX_POISSON_JITTER_LOW + FX_POISSON_JITTER_SPAN;
export const LIFE_SHOULDER = (profile: LifeProfile = {}) => profile.shoulderPct ?? profile.loud?.shoulderPct ?? LIFE_LOUD_DEFAULTS.shoulderPct;
export const LIFE_BROW_SHOUT = (profile: LifeProfile = {}) => profile.browShout ?? profile.loud?.browShout ?? LIFE_LOUD_DEFAULTS.brow;
export const LIFE_CHARACTER_PROFILE = (character: string): LifeProfile => {
  const preset = LIFE_CHARACTER[character as keyof typeof LIFE_CHARACTER];
  if (!preset) return { shoulderPct: LIFE_LOUD_DEFAULTS.shoulderPct, browShout: LIFE_LOUD_DEFAULTS.brow };
  return { loud: preset, micro: MICRO, shoulderPct: preset.shoulderPct, browShout: preset.browShout,
    eyeGain: preset.eyeGain, vocal: preset.vocal };
};

void FX_POSE_ROLL;
void FX_MICRO_START;
void FX_MICRO_END_MARGIN;
void MICRO_SCALE;
void EVENT_MIN_FRAMES;
void LIFE_CHARACTER_PROFILE;
void LIFE_SHOULDER;
void LIFE_BROW_SHOUT;
void LIFE_JITTER_RANGE;
void LIFE_PROFILE_TIMES;
void LIFE_MICRO_SCALE;
void taggedEvent;

// VIDEO-STUDIO-04 and -05 (K3): the TrackStudio timeline model. Pure functions and plain data, no DOM, so the math of trim, split,
// delete, join order, ripple, crossfade overlap, level and fade curves is tested without a browser. The Element (track-studio.tsx)
// draws this model; the preview engine (track-studio-engine.ts) plays it; `toPlan` is what Export hands the host.

export type LaneId = "video" | "voice" | "music";
export const LANE_IDS: readonly LaneId[] = ["video", "voice", "music"];

/** The shortest a piece may be, in seconds: a trim or a split never leaves less than this. */
export const MIN_PIECE_S = 0.2;
/** A crossfade is a cut (0) or 0.3 to 1 second (the Stack's `crossfade` op). */
export const CROSSFADE_MIN_S = 0.3;
export const CROSSFADE_MAX_S = 1;
export const LEVEL_DB_MIN = -24;
export const LEVEL_DB_MAX = 12;
export const FADE_MAX_S = 5;

export interface StudioPiece {
  id: string;
  /** The clip id (video lane) or the file id (voice and music lanes) the host knows it by. Goes into the plan. */
  ref: string;
  /** What the preview plays: a same-origin path or an own-origin `blob:` URL. Never part of the plan. */
  src: string;
  label?: string;
  poster?: string;
  /** Seconds into the source where the piece starts and ends. */
  in_s: number;
  out_s: number;
  /** The source's own length when known; a piece can never be dragged past it. */
  source_s?: number;
  /** Voice and music: where the piece starts on the timeline. Video pieces ignore it (they ripple). */
  at_s: number;
  level_db: number;
  fade_in_s: number;
  fade_out_s: number;
  /** Video pieces after the first: seconds this piece overlaps the one before it (0 is a cut). */
  crossfade_s: number;
  /** A music piece: lower it under speech. */
  duck: boolean;
}

export interface StudioLane {
  id: LaneId;
  label: string;
  hue: string;
  /** The lane's own level, in dB, on top of each piece's level. */
  level_db: number;
  muted: boolean;
  pieces: StudioPiece[];
}

export interface StudioState {
  lanes: StudioLane[];
}

export const LANE_DEFAULTS: Record<LaneId, { label: string; hue: string }> = {
  video: { label: "1. Video", hue: "blue" },
  voice: { label: "2. Voice", hue: "pink" },
  music: { label: "3. Music", hue: "orange" },
};

export const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const finite = (n: unknown, fallback: number) => (typeof n === "number" && Number.isFinite(n) ? n : fallback);

export const dbToGain = (db: number): number => 10 ** (db / 20);
export const gainToDb = (gain: number): number => (gain <= 0 ? -Infinity : 20 * Math.log10(gain));

export const pieceDuration = (p: Pick<StudioPiece, "in_s" | "out_s">): number => Math.max(0, p.out_s - p.in_s);

// ---------------------------------------------------------------------------------------------------------------------
// Building a state from the host's row, and reading it back

export interface RawPiece {
  id?: unknown; ref?: unknown; src?: unknown; label?: unknown; poster?: unknown; in_s?: unknown; out_s?: unknown; source_s?: unknown; at_s?: unknown;
  level_db?: unknown; fade_in_s?: unknown; fade_out_s?: unknown; crossfade_s?: unknown; duck?: unknown;
}
export interface RawLane { id?: unknown; label?: unknown; hue?: unknown; level_db?: unknown; muted?: unknown; pieces?: unknown }

/** One piece from a host row. A piece with no usable `src`, or whose cut is empty, is dropped. */
export function readPiece(raw: RawPiece, fallbackId: string): StudioPiece | null {
  const src = typeof raw.src === "string" ? raw.src : "";
  if (!src) return null;
  const inS = Math.max(0, finite(raw.in_s, 0));
  const sourceS = typeof raw.source_s === "number" && Number.isFinite(raw.source_s) && raw.source_s > 0 ? raw.source_s : undefined;
  let outS = finite(raw.out_s, sourceS ?? inS);
  if (sourceS !== undefined) outS = Math.min(outS, sourceS);
  if (outS - inS < MIN_PIECE_S) return null;
  const dur = outS - inS;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    ref: typeof raw.ref === "string" && raw.ref ? raw.ref : typeof raw.id === "string" ? raw.id : fallbackId,
    src,
    label: typeof raw.label === "string" ? raw.label : undefined,
    poster: typeof raw.poster === "string" ? raw.poster : undefined,
    in_s: inS,
    out_s: outS,
    source_s: sourceS,
    at_s: Math.max(0, finite(raw.at_s, 0)),
    level_db: clamp(finite(raw.level_db, 0), LEVEL_DB_MIN, LEVEL_DB_MAX),
    fade_in_s: clamp(finite(raw.fade_in_s, 0), 0, Math.min(FADE_MAX_S, dur)),
    fade_out_s: clamp(finite(raw.fade_out_s, 0), 0, Math.min(FADE_MAX_S, dur)),
    crossfade_s: normalizeCrossfade(finite(raw.crossfade_s, 0)),
    duck: raw.duck === true,
  };
}

/** A state with all three lanes, from the host's `lanes` array (missing lanes are empty; unknown lane ids are ignored). */
export function readState(rawLanes: unknown): StudioState {
  const list = Array.isArray(rawLanes) ? (rawLanes as RawLane[]) : [];
  const lanes = LANE_IDS.map((id): StudioLane => {
    const raw = list.find((l) => l && l.id === id);
    const rawPieces = Array.isArray(raw?.pieces) ? (raw!.pieces as RawPiece[]) : [];
    const pieces: StudioPiece[] = [];
    rawPieces.forEach((p, i) => {
      const piece = p && typeof p === "object" ? readPiece(p, `${id}-${i + 1}`) : null;
      if (piece && !pieces.some((q) => q.id === piece.id)) pieces.push(piece);
    });
    if (id === "video" && pieces[0]) pieces[0] = { ...pieces[0], crossfade_s: 0 };
    return {
      id,
      label: typeof raw?.label === "string" && raw.label ? raw.label : LANE_DEFAULTS[id].label,
      hue: typeof raw?.hue === "string" && /^[a-z]+$/.test(raw.hue) ? raw.hue : LANE_DEFAULTS[id].hue,
      level_db: clamp(finite(raw?.level_db, 0), LEVEL_DB_MIN, LEVEL_DB_MAX),
      muted: raw?.muted === true,
      pieces,
    };
  });
  return { lanes };
}

export const laneOf = (state: StudioState, id: LaneId): StudioLane => state.lanes.find((l) => l.id === id)!;

// ---------------------------------------------------------------------------------------------------------------------
// Layout: where each piece sits on the timeline

export interface Placed { piece: StudioPiece; start: number; end: number }

/** The crossfade a seam really has: never longer than either piece it joins. */
export function effectiveCrossfade(prev: StudioPiece, next: StudioPiece): number {
  const x = next.crossfade_s;
  if (x <= 0) return 0;
  const m = Math.min(x, pieceDuration(prev) - 0.05, pieceDuration(next) - 0.05);
  return m > 0 ? m : 0;
}

/** Video pieces ripple: each starts where the one before it ends, less the crossfade overlap, so deleting or trimming closes the gap. Voice and music
 * pieces sit at their own `at_s`. */
export function layoutLane(lane: StudioLane): Placed[] {
  if (lane.id !== "video") return lane.pieces.map((piece) => ({ piece, start: piece.at_s, end: piece.at_s + pieceDuration(piece) }));
  const out: Placed[] = [];
  let cursor = 0;
  lane.pieces.forEach((piece, i) => {
    const overlap = i === 0 ? 0 : effectiveCrossfade(lane.pieces[i - 1]!, piece);
    const start = Math.max(0, cursor - overlap);
    const end = start + pieceDuration(piece);
    out.push({ piece, start: round(start), end: round(end) });
    cursor = end;
  });
  return out;
}

export const laneEnd = (lane: StudioLane): number => layoutLane(lane).reduce((m, p) => Math.max(m, p.end), 0);

/** The film is as long as the video lane; with no picture it is the longest audio lane. */
export function filmLength(state: StudioState): number {
  const video = laneEnd(laneOf(state, "video"));
  if (video > 0) return video;
  return Math.max(laneEnd(laneOf(state, "voice")), laneEnd(laneOf(state, "music")));
}

export function findPiece(state: StudioState, id: string | null | undefined): { lane: StudioLane; index: number; piece: StudioPiece; placed: Placed } | null {
  if (!id) return null;
  for (const lane of state.lanes) {
    const placed = layoutLane(lane);
    const index = lane.pieces.findIndex((p) => p.id === id);
    if (index >= 0) return { lane, index, piece: lane.pieces[index]!, placed: placed[index]! };
  }
  return null;
}

/** The piece of a lane under a timeline time (the first when two overlap), or null. */
export function pieceAt(lane: StudioLane, t: number): Placed | null {
  const placed = layoutLane(lane);
  // A crossfade overlap belongs to the incoming piece: the preview cuts at its start.
  for (let i = placed.length - 1; i >= 0; i--) if (t >= placed[i]!.start - 1e-6 && t < placed[i]!.end - 1e-6) return placed[i]!;
  return null;
}

/** Where a video piece's preview plays until: its own end, or the start of the next piece when they overlap (the preview cuts where the
 * export dissolves). */
export function previewEnd(lane: StudioLane, index: number): number {
  const placed = layoutLane(lane);
  const here = placed[index]!;
  const next = placed[index + 1];
  return next ? Math.min(here.end, next.start) : here.end;
}

// ---------------------------------------------------------------------------------------------------------------------
// Level and fade curves

/** Fades and the crossfade share one ramp: a seam of length x fades the outgoing piece out and the incoming piece in over x, and the
 * longer of the piece's own fade and the seam wins. Piecewise linear, so Web Audio can schedule it exactly. */
export function envelopePoints(p: StudioPiece, xIn = 0, xOut = 0): { t: number; g: number }[] {
  const dur = pieceDuration(p);
  const fi = clamp(Math.max(p.fade_in_s, xIn), 0, dur);
  const fo = clamp(Math.max(p.fade_out_s, xOut), 0, dur);
  const peak = dbToGain(p.level_db);
  const pts: { t: number; g: number }[] = [];
  pts.push({ t: 0, g: fi > 0 ? 0 : peak });
  if (fi > 0) pts.push({ t: fi, g: peak });
  if (fo > 0) {
    // When the two ramps overlap they meet at the lower of the two heights.
    if (fi + fo > dur) {
      const t = (dur * fi) / (fi + fo);
      const g = peak * (t / fi);
      pts.pop();
      pts.push({ t, g });
    } else pts.push({ t: dur - fo, g: peak });
    pts.push({ t: dur, g: 0 });
  } else pts.push({ t: dur, g: peak });
  return pts;
}

export function gainAt(points: readonly { t: number; g: number }[], t: number): number {
  if (points.length === 0) return 1;
  if (t <= points[0]!.t) return points[0]!.g;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (t <= b.t) return b.t === a.t ? b.g : a.g + ((b.g - a.g) * (t - a.t)) / (b.t - a.t);
  }
  return points[points.length - 1]!.g;
}

/** The crossfade lengths at the two ends of a video piece: how long it fades in from the seam before it and out into the seam after it. */
export function seamsOf(lane: StudioLane, index: number): { xIn: number; xOut: number } {
  if (lane.id !== "video") return { xIn: 0, xOut: 0 };
  const prev = lane.pieces[index - 1];
  const here = lane.pieces[index]!;
  const next = lane.pieces[index + 1];
  return { xIn: prev ? effectiveCrossfade(prev, here) : 0, xOut: next ? effectiveCrossfade(here, next) : 0 };
}

export function pieceEnvelope(lane: StudioLane, index: number): { t: number; g: number }[] {
  const { xIn, xOut } = seamsOf(lane, index);
  return envelopePoints(lane.pieces[index]!, xIn, xOut);
}

/** The gain a whole lane contributes: 0 when muted, or when another lane is solo and this one is not. Solo is a preview choice only. */
export function laneGain(lane: StudioLane, solo: LaneId | null): number {
  if (lane.muted) return 0;
  if (solo && solo !== lane.id) return 0;
  return dbToGain(lane.level_db);
}

/** 0 is a cut; anything from 0.3 to 1 s is a crossfade; a value between is lifted to 0.3. */
export function normalizeCrossfade(s: number): number {
  if (!Number.isFinite(s) || s <= 0.05) return 0;
  return round(clamp(s, CROSSFADE_MIN_S, CROSSFADE_MAX_S), 1);
}

// ---------------------------------------------------------------------------------------------------------------------
// The setters the lane controls and the Volume panel use (VIDEO-STUDIO-04). The editing tools are in track-studio-edit.ts (VIDEO-STUDIO-05).

export function mapLane(state: StudioState, id: LaneId, f: (l: StudioLane) => StudioLane): StudioState {
  return { lanes: state.lanes.map((l) => (l.id === id ? f(l) : l)) };
}
export function mapPiece(state: StudioState, pieceId: string, f: (p: StudioPiece, l: StudioLane) => StudioPiece): StudioState {
  return { lanes: state.lanes.map((l) => (l.pieces.some((p) => p.id === pieceId) ? { ...l, pieces: l.pieces.map((p) => (p.id === pieceId ? f(p, l) : p)) } : l)) };
}
export function setPieceLevel(state: StudioState, pieceId: string, db: number): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, level_db: round(clamp(db, LEVEL_DB_MIN, LEVEL_DB_MAX), 1) }));
}
export function setDuck(state: StudioState, pieceId: string, duck: boolean): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, duck }));
}
export function setLaneLevel(state: StudioState, id: LaneId, db: number): StudioState {
  return mapLane(state, id, (l) => ({ ...l, level_db: round(clamp(db, LEVEL_DB_MIN, LEVEL_DB_MAX), 1) }));
}
export function setLaneMuted(state: StudioState, id: LaneId, muted: boolean): StudioState {
  return mapLane(state, id, (l) => ({ ...l, muted }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Time words and the ruler

export function formatTime(t: number): string {
  const s = Math.max(0, Math.floor(t + 1e-6));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
/** A time a person can say: "6 seconds", "1 minute 5 seconds". */
export function spokenTime(t: number): string {
  const s = Math.max(0, Math.round(t));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return m > 0 ? (r > 0 ? `${part(m, "minute")} ${part(r, "second")}` : part(m, "minute")) : part(r, "second");
}
/** The ruler's tick step in seconds for a scale, so ticks stay at least 44 px apart. */
export function rulerStep(pxPerSec: number): number {
  for (const step of [1, 2, 5, 10, 15, 30, 60]) if (step * pxPerSec >= 44) return step;
  return 60;
}
export function rulerTicks(length: number, pxPerSec: number): number[] {
  const step = rulerStep(pxPerSec);
  const out: number[] = [];
  for (let t = 0; t <= length + 1e-6; t += step) out.push(t);
  return out;
}

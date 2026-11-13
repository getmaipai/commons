// VIDEO-STUDIO-05 (K3): the TrackStudio editing model. Pure functions over the timeline model (track-studio-model.ts): split, delete, add, trim, move, fades,
// crossfade, balances, history and the plan Export hands the host. No DOM, so trim, split, delete, join order, ripple and the limits are tested without a browser.

import { i18n } from "@/kit/i18n"
import {
  FADE_MAX_S, LEVEL_DB_MAX, LEVEL_DB_MIN, MIN_PIECE_S, clamp, effectiveCrossfade, filmLength, findPiece, laneOf, layoutLane, mapLane, mapPiece, normalizeCrossfade,
  pieceAt, pieceDuration, round, isStemLane, type LaneId, type StemLaneId, type StudioPiece, type StudioState,
} from "./track-studio-model";

export interface StudioLimits {
  video_pieces: number;
  audio_pieces: number;
  film_s: number;
}
export const DEFAULT_LIMITS: StudioLimits = { video_pieces: 6, audio_pieces: 2, film_s: 60 };

export interface LevelStep { id: string; label: string; gain_db: number; clip_gain_db: number }
/** The five balances of Home's `MIX_LEVELS` (the default; a page may pass its own `level_steps`). */
export const DEFAULT_LEVEL_STEPS: readonly LevelStep[] = [
  { id: "quiet", get label() { return i18n._({ id: "ui.Quiet", message: "Quiet" }) }, gain_db: -14, clip_gain_db: 0 },
  { id: "soft", get label() { return i18n._({ id: "ui.Soft", message: "Soft" }) }, gain_db: -8, clip_gain_db: 0 },
  { id: "balanced", get label() { return i18n._({ id: "ui.Balanced", message: "Balanced" }) }, gain_db: 0, clip_gain_db: -3 },
  { id: "loud", get label() { return i18n._({ id: "ui.Loud", message: "Loud" }) }, gain_db: 4, clip_gain_db: -6 },
  { id: "very_loud", get label() { return i18n._({ id: "ui.Very loud", message: "Very loud" }) }, gain_db: 8, clip_gain_db: -9 },
];

// ---------------------------------------------------------------------------------------------------------------------
// Editing. Every function returns a new state, or `{ error }` with the one plain line to show.

export type EditResult = { ok: true; state: StudioState; selected?: string | null; seek?: number } | { ok: false; line: string };
const fail = (line: string): EditResult => ({ ok: false, line });

export const FILM_FULL_LINE = (limits: StudioLimits) => i18n._({ id: "ui.A film can be {seconds} seconds long. Shorten a piece to add more.", message: "A film can be {seconds} seconds long. Shorten a piece to add more.", values: { seconds: limits.film_s } });
export const VIDEO_FULL_LINE = (limits: StudioLimits) => i18n._({ id: "ui.A film can have {count} clips. Delete one to add another.", message: "A film can have {count} clips. Delete one to add another.", values: { count: wordNumber(limits.video_pieces) } });
export const AUDIO_FULL_LINE = (limits: StudioLimits, lane: LaneId) => (lane === "voice" ? i18n._({ id: "ui.A film can have {count} voices. Delete one to add another.", message: "A film can have {count} voices. Delete one to add another.", values: { count: wordNumber(limits.audio_pieces) } }) : i18n._({ id: "ui.A film can have {count} songs. Delete one to add another.", message: "A film can have {count} songs. Delete one to add another.", values: { count: wordNumber(limits.audio_pieces) } }));
const words = (): string[] => [i18n._({ id: "ui.zero", message: "zero" }), i18n._({ id: "ui.one", message: "one" }), i18n._({ id: "ui.two", message: "two" }), i18n._({ id: "ui.three", message: "three" }), i18n._({ id: "ui.four", message: "four" }), i18n._({ id: "ui.five", message: "five" }), i18n._({ id: "ui.six", message: "six" }), i18n._({ id: "ui.seven", message: "seven" }), i18n._({ id: "ui.eight", message: "eight" }), i18n._({ id: "ui.nine", message: "nine" }), i18n._({ id: "ui.ten", message: "ten" })];
function wordNumber(n: number): string { return words()[n] ?? String(n); }

let counter = 0;
/** A fresh piece id that no piece of the state uses. */
export function newPieceId(state: StudioState, prefix: string): string {
  const used = new Set(state.lanes.flatMap((l) => l.pieces.map((p) => p.id)));
  let id = "";
  do { counter += 1; id = `${prefix}-n${counter}`; } while (used.has(id));
  return id;
}

/** Split the piece under `t` on `laneId` into two at `t`. */
export function splitAt(state: StudioState, laneId: LaneId, t: number, limits: StudioLimits = DEFAULT_LIMITS): EditResult {
  const lane = laneOf(state, laneId);
  const placed = pieceAt(lane, t);
  if (!placed) return fail(i18n._({ id: "ui.Move the playhead onto a piece to split it.", message: "Move the playhead onto a piece to split it." }));
  const { piece } = placed;
  const local = piece.in_s + (t - placed.start);
  if (local - piece.in_s < MIN_PIECE_S || piece.out_s - local < MIN_PIECE_S) return fail(i18n._({ id: "ui.Move the playhead further from the edge of the piece to split it.", message: "Move the playhead further from the edge of the piece to split it." }));
  if (laneId === "video" && lane.pieces.length >= limits.video_pieces) return fail(VIDEO_FULL_LINE(limits));
  if (laneId !== "video" && lane.pieces.length >= limits.audio_pieces) return fail(AUDIO_FULL_LINE(limits, laneId));
  const left: StudioPiece = { ...piece, out_s: round(local), fade_out_s: 0 };
  const right: StudioPiece = { ...piece, id: newPieceId(state, piece.id), in_s: round(local), at_s: round(t), fade_in_s: 0, crossfade_s: 0 };
  const next = mapLane(state, laneId, (l) => {
    const i = l.pieces.findIndex((p) => p.id === piece.id);
    const pieces = [...l.pieces];
    pieces.splice(i, 1, { ...left, fade_in_s: clamp(left.fade_in_s, 0, pieceDuration(left)) }, { ...right, fade_out_s: clamp(right.fade_out_s, 0, pieceDuration(right)) });
    return { ...l, pieces };
  });
  return { ok: true, state: next, selected: right.id };
}

/** Delete a piece. A video lane closes up (the rest ripple); an audio lane leaves the others where they are. */
export function deletePiece(state: StudioState, pieceId: string): EditResult {
  const found = findPiece(state, pieceId);
  if (!found) return fail(i18n._({ id: "ui.Pick a piece first.", message: "Pick a piece first." }));
  const { lane, index } = found;
  const removedStart = found.placed.start;
  const next = mapLane(state, lane.id, (l) => {
    const pieces = l.pieces.filter((p) => p.id !== pieceId);
    // The seam that joined the deleted piece to its neighbour is gone: the piece that now follows a different one starts as a cut.
    if (l.id === "video" && pieces[index]) pieces[index] = { ...pieces[index]!, crossfade_s: 0 };
    return { ...l, pieces };
  });
  const after = laneOf(next, lane.id).pieces;
  const neighbour = after[Math.min(index, after.length - 1)];
  return { ok: true, state: next, selected: neighbour?.id ?? null, seek: lane.id === "video" ? Math.min(removedStart, filmLength(next)) : undefined };
}

/** Add a piece. A video piece joins the end of the video lane; a voice or music piece starts at `atS` (the playhead). */
export function addPiece(state: StudioState, laneId: LaneId, piece: StudioPiece, atS: number, limits: StudioLimits = DEFAULT_LIMITS): EditResult {
  const lane = laneOf(state, laneId);
  const dur = pieceDuration(piece);
  if (dur < MIN_PIECE_S) return fail(i18n._({ id: "ui.That one is too short to add.", message: "That one is too short to add." }));
  if (laneId === "video" && lane.pieces.length >= limits.video_pieces) return fail(VIDEO_FULL_LINE(limits));
  if (laneId !== "video" && lane.pieces.length >= limits.audio_pieces) return fail(AUDIO_FULL_LINE(limits, laneId));
  const id = state.lanes.some((l) => l.pieces.some((p) => p.id === piece.id)) ? newPieceId(state, laneId) : piece.id;
  const placedAt = laneId === "video" ? 0 : Math.max(0, round(atS));
  const added: StudioPiece = { ...piece, id, at_s: placedAt, crossfade_s: 0 };
  const next = mapLane(state, laneId, (l) => ({ ...l, pieces: [...l.pieces, added] }));
  if (filmLength(next) > limits.film_s + 1e-6) return fail(FILM_FULL_LINE(limits));
  return { ok: true, state: next, selected: id, seek: laneId === "video" ? layoutLane(laneOf(next, "video")).at(-1)!.start : undefined };
}

/** Move the start of a piece by `delta` seconds of source (positive trims off the front). A video piece keeps its place in the order (the rest ripple);
 * a voice or music piece keeps its sound where it was, so its left edge moves. */
export function trimStartBy(state: StudioState, pieceId: string, delta: number): EditResult {
  const found = findPiece(state, pieceId);
  if (!found) return fail(i18n._({ id: "ui.Pick a piece first.", message: "Pick a piece first." }));
  const p = found.piece;
  const newIn = clamp(p.in_s + delta, 0, p.out_s - MIN_PIECE_S);
  const applied = newIn - p.in_s;
  if (Math.abs(applied) < 1e-9) return { ok: true, state };
  const next = mapPiece(state, pieceId, (q, l) => {
    const moved: StudioPiece = { ...q, in_s: round(newIn), at_s: l.id === "video" ? q.at_s : Math.max(0, round(q.at_s + applied)) };
    return keepFadesInside(moved);
  });
  return { ok: true, state: next };
}

/** Move the end of a piece by `delta` seconds of source (positive keeps more; it cannot pass the source's own end). */
export function trimEndBy(state: StudioState, pieceId: string, delta: number, limits: StudioLimits = DEFAULT_LIMITS): EditResult {
  const found = findPiece(state, pieceId);
  if (!found) return fail(i18n._({ id: "ui.Pick a piece first.", message: "Pick a piece first." }));
  const p = found.piece;
  const max = p.source_s ?? Infinity;
  const newOut = clamp(p.out_s + delta, p.in_s + MIN_PIECE_S, max);
  if (Math.abs(newOut - p.out_s) < 1e-9) return { ok: true, state };
  const next = mapPiece(state, pieceId, (q) => keepFadesInside({ ...q, out_s: round(newOut) }));
  if (delta > 0 && filmLength(next) > limits.film_s + 1e-6) return fail(FILM_FULL_LINE(limits));
  return { ok: true, state: next };
}

function keepFadesInside(p: StudioPiece): StudioPiece {
  const dur = pieceDuration(p);
  const fi = Math.min(p.fade_in_s, dur);
  const fo = Math.min(p.fade_out_s, dur);
  return { ...p, fade_in_s: fi, fade_out_s: fo };
}

/** Move a voice or music piece to start at `at`. */
export function movePiece(state: StudioState, pieceId: string, at: number): StudioState {
  return mapPiece(state, pieceId, (p, l) => (l.id === "video" ? p : { ...p, at_s: Math.max(0, round(at)) }));
}

export function setFadeIn(state: StudioState, pieceId: string, s: number): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, fade_in_s: round(clamp(s, 0, Math.min(FADE_MAX_S, pieceDuration(p))), 1) }));
}
export function setFadeOut(state: StudioState, pieceId: string, s: number): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, fade_out_s: round(clamp(s, 0, Math.min(FADE_MAX_S, pieceDuration(p))), 1) }));
}
/** The crossfade at the seam AFTER `pieceId` (it is stored on the next video piece). Returns the state unchanged when there is no next piece. */
export function setCrossfadeAfter(state: StudioState, pieceId: string, s: number): StudioState {
  const found = findPiece(state, pieceId);
  if (!found || found.lane.id !== "video") return state;
  const next = found.lane.pieces[found.index + 1];
  if (!next) return state;
  return mapPiece(state, next.id, (p) => ({ ...p, crossfade_s: normalizeCrossfade(s) }));
}
export function crossfadeAfter(state: StudioState, pieceId: string): number | null {
  const found = findPiece(state, pieceId);
  if (!found || found.lane.id !== "video") return null;
  const next = found.lane.pieces[found.index + 1];
  return next ? next.crossfade_s : null;
}

/** The Level panel: voice and music pieces take the balance's `gain_db`, video pieces its `clip_gain_db`. */
export function applyBalance(state: StudioState, step: LevelStep): StudioState {
  return {
    lanes: state.lanes.map((l) => ({ ...l, pieces: l.pieces.map((p) => ({ ...p, level_db: round(clamp(l.id === "video" ? step.clip_gain_db : step.gain_db, LEVEL_DB_MIN, LEVEL_DB_MAX), 1) })) })),
  };
}
/** The balance every piece sits at, or null when they differ. */
export function currentBalance(state: StudioState, steps: readonly LevelStep[]): string | null {
  const pieces = state.lanes.flatMap((l) => l.pieces.map((p) => ({ lane: l.id, level: p.level_db })));
  if (pieces.length === 0) return null;
  for (const step of steps) if (pieces.every((p) => Math.abs(p.level - (p.lane === "video" ? step.clip_gain_db : step.gain_db)) < 0.05)) return step.id;
  return null;
}

export function resetPieceVolume(state: StudioState, pieceId: string): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, level_db: 0, duck: false }));
}
export function resetPieceFades(state: StudioState, pieceId: string): StudioState {
  return mapPiece(state, pieceId, (p) => ({ ...p, fade_in_s: 0, fade_out_s: 0 }));
}

/** Snap `t` to the nearest of `edges` within `threshold` seconds, else return it unchanged. */
export function snap(t: number, edges: readonly number[], threshold: number): number {
  let best = t;
  let bestD = threshold;
  for (const e of edges) { const d = Math.abs(e - t); if (d <= bestD) { best = e; bestD = d; } }
  return best;
}
/** The edges (start and end of every piece, and 0) of the other pieces, for snapping a moved piece. */
export function snapEdges(state: StudioState, exceptId: string | null, playhead: number): number[] {
  const edges = [0, playhead];
  for (const lane of state.lanes) for (const placed of layoutLane(lane)) if (placed.piece.id !== exceptId) edges.push(placed.start, placed.end);
  return edges;
}

// ---------------------------------------------------------------------------------------------------------------------
// History (Original, Undo, Redo)

export interface History<T> { past: T[]; present: T; future: T[] }
export const HISTORY_LIMIT = 100;
export const startHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [] });
export function pushHistory<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}
export const canUndo = <T,>(h: History<T>) => h.past.length > 0;
export const canRedo = <T,>(h: History<T>) => h.future.length > 0;
export function undoHistory<T>(h: History<T>): History<T> {
  if (!canUndo(h)) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1]!, future: [h.present, ...h.future] };
}
export function redoHistory<T>(h: History<T>): History<T> {
  if (!canRedo(h)) return h;
  return { past: [...h.past, h.present], present: h.future[0]!, future: h.future.slice(1) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The plan Export hands the host (home design 4.5). Home never trusts it; it re-checks every number and id.

export interface PlanPiece { ref: string; in_s: number; out_s: number; level_db: number; fade_in_s: number; fade_out_s: number }
export interface PlanLanePiece { ref: string; in_s: number; out_s: number; start_s: number; level_db: number; fade_in_s: number; fade_out_s: number; duck: boolean }
export interface StudioPlan {
  version: 1;
  film_s: number;
  video: { level_db: number; muted: boolean; pieces: PlanPiece[]; transitions: { kind: "cut" | "crossfade"; seconds: number }[] };
  voice: { level_db: number; muted: boolean; pieces: PlanLanePiece[] };
  music: { level_db: number; muted: boolean; pieces: PlanLanePiece[] };
  /** MP-03: an audio studio's stem lanes, present only when the studio has any (a video plan is unchanged). */
  stems?: { id: StemLaneId; level_db: number; muted: boolean; pieces: PlanLanePiece[] }[];
}

export function toPlan(state: StudioState): StudioPlan {
  const video = laneOf(state, "video");
  const stemIds = state.lanes.map((l) => l.id).filter(isStemLane);
  const audio = (id: "voice" | "music" | StemLaneId) => {
    const lane = laneOf(state, id);
    return {
      level_db: lane.level_db,
      muted: lane.muted,
      pieces: layoutLane(lane).map(({ piece, start }): PlanLanePiece => ({ ref: piece.ref, in_s: piece.in_s, out_s: piece.out_s, start_s: round(start), level_db: piece.level_db, fade_in_s: piece.fade_in_s, fade_out_s: piece.fade_out_s, duck: piece.duck })),
    };
  };
  return {
    version: 1,
    film_s: round(filmLength(state)),
    video: {
      level_db: video.level_db,
      muted: video.muted,
      pieces: video.pieces.map((p): PlanPiece => ({ ref: p.ref, in_s: p.in_s, out_s: p.out_s, level_db: p.level_db, fade_in_s: p.fade_in_s, fade_out_s: p.fade_out_s })),
      transitions: video.pieces.slice(1).map((p, i) => {
        const x = effectiveCrossfade(video.pieces[i]!, p);
        return x > 0 ? { kind: "crossfade" as const, seconds: round(x, 1) } : { kind: "cut" as const, seconds: 0 };
      }),
    },
    voice: audio("voice"),
    music: audio("music"),
    ...(stemIds.length > 0 ? { stems: stemIds.map((id) => ({ id, ...audio(id) })) } : {}),
  };
}

/** True when the state differs from `base` in anything the plan carries (what enables Export). */
export function planChanged(base: StudioState, now: StudioState): boolean {
  return JSON.stringify(toPlan(base)) !== JSON.stringify(toPlan(now));
}


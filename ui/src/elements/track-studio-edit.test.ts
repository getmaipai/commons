import { describe, expect, test } from "bun:test";
import { filmLength, findPiece, laneOf, layoutLane, pieceDuration, pieceEnvelope, readState, gainAt, MIN_PIECE_S, type StudioPiece, type StudioState } from "./track-studio-model";
import {
  DEFAULT_LEVEL_STEPS, DEFAULT_LIMITS, addPiece, applyBalance, canRedo, canUndo, crossfadeAfter, currentBalance, deletePiece, movePiece, planChanged, pushHistory, redoHistory, setCrossfadeAfter,
  setFadeIn, setFadeOut, snap, splitAt, startHistory, toPlan, trimEndBy, trimStartBy, undoHistory,
} from "./track-studio-edit";
import { setLaneLevel, setLaneMuted, setPieceLevel } from "./track-studio-model";

const piece = (id: string, o: Partial<StudioPiece> = {}): StudioPiece => ({ id, ref: id, src: `/f/${id}.mp4`, in_s: 0, out_s: 4, source_s: 10, at_s: 0, level_db: 0, fade_in_s: 0, fade_out_s: 0, crossfade_s: 0, duck: false, ...o });
const base = (): StudioState =>
  readState([
    { id: "video", pieces: [piece("a", { out_s: 4 }), piece("b", { out_s: 6, in_s: 1 }), piece("c", { out_s: 3 })] },
    { id: "voice", pieces: [piece("v", { src: "/f/v.wav", at_s: 2, out_s: 3 })] },
    { id: "music", pieces: [piece("m", { src: "/f/m.wav", at_s: 0, out_s: 9 })] },
  ]);
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => { expect(r.ok).toBe(true); return r as Extract<T, { ok: true }>; };

describe("split", () => {
  test("one piece becomes two that meet at the playhead, the second selected", () => {
    const r = ok(splitAt(base(), "video", 6));
    const lane = laneOf(r.state, "video");
    expect(lane.pieces.map((p) => p.id)).toEqual(["a", lane.pieces[1]!.id, lane.pieces[2]!.id, "c"].map((x, i) => (i === 1 || i === 2 ? x : x)));
    expect(lane.pieces).toHaveLength(4);
    const [, left, right] = lane.pieces as [StudioPiece, StudioPiece, StudioPiece, StudioPiece];
    expect(left.id).toBe("b");
    expect([left.in_s, left.out_s, right.in_s, right.out_s]).toEqual([1, 3, 3, 6]);
    expect(r.selected).toBe(right.id);
    expect(filmLength(r.state)).toBe(12);
    expect(layoutLane(lane).map((p) => p.start)).toEqual([0, 4, 6, 9]);
  });
  test("fades stay on the outer ends", () => {
    let s = setFadeIn(base(), "b", 1);
    s = setFadeOut(s, "b", 2);
    const r = ok(splitAt(s, "video", 6));
    const [, left, right] = laneOf(r.state, "video").pieces as [StudioPiece, StudioPiece, StudioPiece, StudioPiece];
    expect([left.fade_in_s, left.fade_out_s, right.fade_in_s, right.fade_out_s]).toEqual([1, 0, 0, 2]);
  });
  test("not on a piece edge, not off the pieces, not past the piece limit", () => {
    expect(splitAt(base(), "video", 4.05).ok).toBe(false);
    expect(splitAt(base(), "video", 30).ok).toBe(false);
    expect(splitAt(base(), "voice", 1).ok).toBe(false);
    const full = readState([{ id: "video", pieces: Array.from({ length: 6 }, (_, i) => piece(`p${i}`)) }]);
    const r = splitAt(full, "video", 2);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.line).toBe("A film can have six clips. Delete one to add another.");
  });
  test("an audio split moves the second half's start to the playhead", () => {
    const r = ok(splitAt(base(), "music", 4));
    const [m1, m2] = laneOf(r.state, "music").pieces as [StudioPiece, StudioPiece];
    expect([m1.out_s, m2.in_s, m2.at_s]).toEqual([4, 4, 4]);
    expect(findPiece(r.state, m2.id)!.placed.start).toBe(4);
  });
});

describe("delete", () => {
  test("the rest of the video lane closes up and the seam after is a cut", () => {
    const s = setCrossfadeAfter(base(), "a", 0.5);
    const r = ok(deletePiece(s, "a"));
    const l = layoutLane(laneOf(r.state, "video"));
    expect(l.map((p) => [p.piece.id, p.start, p.end])).toEqual([["b", 0, 5], ["c", 5, 8]]);
    expect(laneOf(r.state, "video").pieces[0]!.crossfade_s).toBe(0);
    expect(r.selected).toBe("b");
  });
  test("deleting the last piece selects the one before; the film shrinks", () => {
    const r = ok(deletePiece(base(), "c"));
    expect(r.selected).toBe("b");
    expect(filmLength(r.state)).toBe(9);
  });
  test("an audio lane does not close up", () => {
    const s = ok(addPiece(base(), "voice", piece("v2", { src: "/f/v2.wav", out_s: 2 }), 8)).state;
    const r = ok(deletePiece(s, "v"));
    expect(layoutLane(laneOf(r.state, "voice"))[0]!.start).toBe(8);
  });
  test("a missing piece is refused with a line", () => {
    expect(deletePiece(base(), "zzz").ok).toBe(false);
  });
});

describe("trim", () => {
  test("start trim shortens a video piece and the rest ripple; it cannot pass the end", () => {
    const r = ok(trimStartBy(base(), "a", 1));
    expect(findPiece(r.state, "a")!.piece.in_s).toBe(1);
    expect(layoutLane(laneOf(r.state, "video")).map((p) => p.start)).toEqual([0, 3, 8]);
    const far = ok(trimStartBy(base(), "a", 99));
    expect(pieceDuration(findPiece(far.state, "a")!.piece)).toBeCloseTo(MIN_PIECE_S, 5);
  });
  test("start trim cannot go before the source start", () => {
    const r = ok(trimStartBy(base(), "a", -5));
    expect(findPiece(r.state, "a")!.piece.in_s).toBe(0);
  });
  test("end trim cannot pass the source's own end", () => {
    const r = ok(trimEndBy(base(), "a", 99));
    expect(findPiece(r.state, "a")!.piece.out_s).toBe(10);
    expect(ok(trimEndBy(base(), "a", -99)).state.lanes[0]!.pieces[0]!.out_s).toBeCloseTo(MIN_PIECE_S, 5);
  });
  test("an audio start trim keeps the sound where it was: the piece starts later", () => {
    const r = ok(trimStartBy(base(), "m", 2));
    const placed = findPiece(r.state, "m")!;
    expect([placed.piece.in_s, placed.piece.at_s, placed.placed.start, placed.placed.end]).toEqual([2, 2, 2, 9]);
  });
  test("a trim keeps the fades inside the piece", () => {
    const s = setFadeOut(base(), "a", 3);
    const r = ok(trimEndBy(s, "a", -3));
    expect(findPiece(r.state, "a")!.piece.fade_out_s).toBeCloseTo(1, 5);
  });
  test("extending past the film limit is refused", () => {
    const tight = { ...DEFAULT_LIMITS, film_s: 12 };
    const r = trimEndBy(base(), "c", 1, tight);
    expect(r.ok).toBe(false);
  });
});

describe("add", () => {
  test("a clip joins the end of the video lane and is selected", () => {
    const r = ok(addPiece(base(), "video", piece("d", { out_s: 2 }), 0));
    expect(laneOf(r.state, "video").pieces.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
    expect(r.seek).toBe(12);
    expect(filmLength(r.state)).toBe(14);
  });
  test("a clip whose id is taken gets a new one", () => {
    const r = ok(addPiece(base(), "video", piece("a", { out_s: 2 }), 0));
    const ids = laneOf(r.state, "video").pieces.map((p) => p.id);
    expect(new Set(ids).size).toBe(4);
  });
  test("a voice starts at the playhead; a third voice is refused", () => {
    const s = ok(addPiece(base(), "voice", piece("v2", { out_s: 2 }), 7.123)).state;
    expect(findPiece(s, "v2")!.piece.at_s).toBe(7.123);
    const r = addPiece(s, "voice", piece("v3", { out_s: 2 }), 1);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.line).toBe("A film can have two voices. Delete one to add another.");
  });
  test("limits: seven clips and a film over the length are refused with one line each", () => {
    let s = readState([{ id: "video", pieces: Array.from({ length: 6 }, (_, i) => piece(`p${i}`, { out_s: 2 })) }]);
    const r = addPiece(s, "video", piece("x"), 0);
    expect(!r.ok && r.line).toBe("A film can have six clips. Delete one to add another.");
    s = base();
    const long = addPiece(s, "video", piece("x", { out_s: 5, source_s: 100 }), 0, { ...DEFAULT_LIMITS, film_s: 15 });
    expect(!long.ok && long.line).toBe("A film can be 15 seconds long. Shorten a piece to add more.");
  });
  test("a piece too short to use is refused", () => {
    expect(addPiece(base(), "voice", piece("v2", { out_s: 0.1 }), 0).ok).toBe(false);
  });
});

describe("Level panel balances", () => {
  test("a balance sets voice and music to gain_db and the clip's own sound to clip_gain_db", () => {
    const loud = DEFAULT_LEVEL_STEPS.find((x) => x.id === "loud")!;
    const s = applyBalance(base(), loud);
    expect(findPiece(s, "v")!.piece.level_db).toBe(4);
    expect(findPiece(s, "m")!.piece.level_db).toBe(4);
    expect(findPiece(s, "a")!.piece.level_db).toBe(-6);
    expect(currentBalance(s, DEFAULT_LEVEL_STEPS)).toBe("loud");
    expect(currentBalance(setPieceLevel(s, "v", 1), DEFAULT_LEVEL_STEPS)).toBeNull();
  });
});

describe("history", () => {
  test("push, undo, redo, and a new edit clears redo", () => {
    let h = startHistory(base());
    const s1 = ok(deletePiece(h.present, "a")).state;
    h = pushHistory(h, s1);
    expect(canUndo(h)).toBe(true);
    h = undoHistory(h);
    expect(laneOf(h.present, "video").pieces).toHaveLength(3);
    expect(canRedo(h)).toBe(true);
    h = redoHistory(h);
    expect(laneOf(h.present, "video").pieces).toHaveLength(2);
    h = undoHistory(h);
    h = pushHistory(h, movePiece(h.present, "m", 1));
    expect(canRedo(h)).toBe(false);
    expect(pushHistory(h, h.present)).toBe(h);
  });
});

describe("plan", () => {
  test("pieces in order, a transition per seam, lane pieces at their start", () => {
    const s = setCrossfadeAfter(base(), "b", 0.5);
    const plan = toPlan(s);
    expect(plan.version).toBe(1);
    expect(plan.video.pieces.map((p) => p.ref)).toEqual(["a", "b", "c"]);
    expect(plan.video.transitions).toEqual([{ kind: "cut", seconds: 0 }, { kind: "crossfade", seconds: 0.5 }]);
    expect(plan.voice.pieces[0]).toMatchObject({ ref: "v", start_s: 2, in_s: 0, out_s: 3 });
    expect(plan.film_s).toBe(11.5);
    expect(JSON.stringify(plan)).not.toContain("/f/");
  });
  test("mute and lane level ride in the plan", () => {
    const plan = toPlan(setLaneMuted(setLaneLevel(base(), "music", -3), "music", true));
    expect(plan.music).toMatchObject({ muted: true, level_db: -3 });
  });
  test("planChanged is false for the same plan and true after an edit", () => {
    const s = base();
    expect(planChanged(s, base())).toBe(false);
    expect(planChanged(s, ok(deletePiece(s, "a")).state)).toBe(true);
  });
});

describe("crossfade and fades as edits", () => {
  test("a crossfade is set on the seam after a piece, overlaps the pieces and shortens the film by its length", () => {
    const s = setCrossfadeAfter(base(), "a", 0.5);
    expect(layoutLane(laneOf(s, "video")).map((p) => [p.start, p.end])).toEqual([[0, 4], [3.5, 8.5], [8.5, 11.5]]);
    expect(filmLength(s)).toBe(11.5);
    expect(crossfadeAfter(s, "a")).toBe(0.5);
    expect(crossfadeAfter(s, "c")).toBeNull();
    expect(crossfadeAfter(s, "v")).toBeNull();
    expect(setCrossfadeAfter(s, "c", 0.5)).toBe(s);
  });
  test("a crossfade of 0.1 is lifted to 0.3 and one over a second is a second; 0 is a cut", () => {
    expect(crossfadeAfter(setCrossfadeAfter(base(), "a", 0.1), "a")).toBe(0.3);
    expect(crossfadeAfter(setCrossfadeAfter(base(), "a", 4), "a")).toBe(1);
    expect(crossfadeAfter(setCrossfadeAfter(setCrossfadeAfter(base(), "a", 0.5), "a", 0), "a")).toBe(0);
  });
  test("the sound ramps at a seam follow the crossfade the edit set", () => {
    const s = setCrossfadeAfter(base(), "a", 0.8);
    expect(gainAt(pieceEnvelope(laneOf(s, "video"), 0), 4 - 0.4)).toBeCloseTo(0.5, 6);
    expect(gainAt(pieceEnvelope(laneOf(s, "video"), 1), 0.4)).toBeCloseTo(0.5, 6);
  });
  test("fades are clamped to the piece and to five seconds, and a piece's own longer fade beats the seam", () => {
    let s = setFadeIn(base(), "a", 99);
    expect(findPiece(s, "a")!.piece.fade_in_s).toBe(4);
    s = setFadeIn(setCrossfadeAfter(base(), "a", 0.5), "b", 2);
    expect(gainAt(pieceEnvelope(laneOf(s, "video"), 1), 1)).toBeCloseTo(0.5, 6);
    const long = readState([{ id: "music", pieces: [piece("m", { out_s: 30, source_s: 30 })] }]);
    expect(findPiece(setFadeOut(long, "m", 99), "m")!.piece.fade_out_s).toBe(5);
  });
  test("lane level and mute are state like any other edit and ride the plan", () => {
    const s = setLaneMuted(setLaneLevel(setPieceLevel(base(), "v", -3), "voice", 2), "voice", true);
    expect(toPlan(s).voice).toMatchObject({ muted: true, level_db: 2 });
    expect(toPlan(s).voice.pieces[0]!.level_db).toBe(-3);
  });
});

describe("snap", () => {
  test("snaps to the nearest edge within the threshold", () => {
    expect(snap(3.96, [0, 4, 9], 0.1)).toBe(4);
    expect(snap(3.5, [0, 4, 9], 0.1)).toBe(3.5);
  });
});

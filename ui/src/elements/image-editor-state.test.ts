import { describe, expect, test } from "bun:test";
import {
  FULL_RECT,
  NO_ADJUST,
  PALETTE,
  adjustChanged,
  adjustFilter,
  aspectRatioOf,
  cropChanged,
  croppedPixels,
  dragCrop,
  initialCrop,
  pictureTransform,
  rectForAspect,
  rotatedSize,
  turnCrop,
  arrowHeadPoints,
  canRedoStroke,
  canUndoStroke,
  clampBrush,
  clampZoom,
  clientToImage,
  emptyStrokes,
  fitZoom,
  fromPixels,
  isMeaningfulStroke,
  linkedSide,
  markupStrokePx,
  parseWhole,
  regionFromDrag,
  resizeLabel,
  stepBrush,
  stepVersion,
  stepZoom,
  strokesReducer,
  toPixels,
  validateResize,
  wheelZoom,
  type Stroke,
  type StrokeState,
} from "./image-editor-state";

const pen = (x: number): Stroke => ({ kind: "pen", points: [{ x, y: 0 }], size: 4, color: "red" });

describe("strokes reducer", () => {
  test("add, undo, redo keep order and a new stroke ends the redo line", () => {
    let s: StrokeState = emptyStrokes;
    s = strokesReducer(s, { type: "add", stroke: pen(1) });
    s = strokesReducer(s, { type: "add", stroke: pen(2) });
    expect(s.strokes.map((st) => (st.kind === "pen" ? st.points[0]!.x : -1))).toEqual([1, 2]);
    s = strokesReducer(s, { type: "undo" });
    expect(s.strokes).toHaveLength(1);
    expect(canRedoStroke(s)).toBe(true);
    s = strokesReducer(s, { type: "redo" });
    expect(s.strokes).toHaveLength(2);
    expect(canRedoStroke(s)).toBe(false);
    s = strokesReducer(s, { type: "undo" });
    s = strokesReducer(s, { type: "add", stroke: pen(3) });
    expect(s.redo).toHaveLength(0);
    expect(s.strokes).toHaveLength(2);
  });

  test("undo and redo on empty state return the same object", () => {
    expect(strokesReducer(emptyStrokes, { type: "undo" })).toBe(emptyStrokes);
    expect(strokesReducer(emptyStrokes, { type: "redo" })).toBe(emptyStrokes);
    expect(strokesReducer(emptyStrokes, { type: "clear" })).toBe(emptyStrokes);
    expect(canUndoStroke(emptyStrokes)).toBe(false);
  });

  test("clear empties strokes and redo", () => {
    let s = strokesReducer(emptyStrokes, { type: "add", stroke: pen(1) });
    s = strokesReducer(s, { type: "undo" });
    s = strokesReducer(s, { type: "clear" });
    expect(s).toEqual(emptyStrokes);
  });

  test("meaningful strokes", () => {
    expect(isMeaningfulStroke(pen(1))).toBe(true);
    expect(isMeaningfulStroke({ kind: "pen", points: [], size: 1, color: "red" })).toBe(false);
    expect(isMeaningfulStroke({ kind: "text", at: { x: 0, y: 0 }, text: "  ", size: 12, color: "red" })).toBe(false);
    expect(isMeaningfulStroke({ kind: "rectangle", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, size: 2, color: "red" })).toBe(false);
    expect(isMeaningfulStroke({ kind: "arrow", from: { x: 0, y: 0 }, to: { x: 30, y: 40 }, size: 2, color: "red" })).toBe(true);
  });
});

describe("zoom", () => {
  test("steps climb and fall through the table, from any value", () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
    expect(stepZoom(55, 1)).toBe(67);
    expect(stepZoom(55, -1)).toBe(50);
    expect(stepZoom(400, 1)).toBe(400);
    expect(stepZoom(10, -1)).toBe(10);
    expect(stepZoom(1000, -1)).toBe(300);
  });

  test("clamp and wheel", () => {
    expect(clampZoom(3)).toBe(10);
    expect(clampZoom(999)).toBe(400);
    expect(clampZoom(Number.NaN)).toBe(10);
    expect(wheelZoom(100, -120)).toBe(110);
    expect(wheelZoom(100, 120)).toBe(90);
    expect(wheelZoom(100, 0)).toBe(100);
  });

  test("fit shrinks a big picture, never enlarges a small one, and survives bad input", () => {
    expect(fitZoom({ width: 1000, height: 800 }, { width: 2000, height: 1000 }, 0)).toBe(50);
    expect(fitZoom({ width: 1000, height: 800 }, { width: 2000, height: 1000 }, 24)).toBe(47);
    expect(fitZoom({ width: 1000, height: 800 }, { width: 100, height: 100 })).toBe(100);
    expect(fitZoom({ width: 10, height: 10 }, { width: 100, height: 100 })).toBe(10);
    expect(fitZoom({ width: 500, height: 500 }, { width: 0, height: 0 })).toBe(100);
    expect(fitZoom({ width: 100000, height: 100000 }, { width: 5000, height: 5000 }, 0)).toBe(100);
  });
});

describe("brush and markup size", () => {
  test("[ and ] move 10 percent, at least 1 px, inside 4..200", () => {
    expect(stepBrush(100, 1)).toBe(110);
    expect(stepBrush(100, -1)).toBe(90);
    expect(stepBrush(4, -1)).toBe(4);
    expect(stepBrush(5, 1)).toBe(6);
    expect(stepBrush(195, 1)).toBe(200);
    expect(stepBrush(200, 1)).toBe(200);
    expect(clampBrush(1)).toBe(4);
    expect(clampBrush(999)).toBe(200);
  });

  test("markup stroke width scales with the long side", () => {
    expect(markupStrokePx(4, { width: 2000, height: 1000 })).toBe(20);
    expect(markupStrokePx(1, { width: 100, height: 100 })).toBe(1);
    expect(markupStrokePx(99, { width: 400, height: 400 })).toBe(20);
  });
});

describe("coordinates and regions", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  const natural = { width: 2000, height: 1000 };

  test("client to picture pixels, clamped", () => {
    expect(clientToImage({ x: 200, y: 100 }, rect, natural)).toEqual({ x: 1000, y: 500 });
    expect(clientToImage({ x: 0, y: 0 }, rect, natural)).toEqual({ x: 0, y: 0 });
    expect(clientToImage({ x: 9999, y: 9999 }, rect, natural)).toEqual({ x: 2000, y: 1000 });
    expect(clientToImage({ x: 5, y: 5 }, { left: 0, top: 0, width: 0, height: 0 }, natural)).toEqual({ x: 0, y: 0 });
  });

  test("a tiny drag is a point, a real drag is a normalised box in any direction", () => {
    expect(regionFromDrag({ x: 500, y: 250 }, { x: 502, y: 251 }, natural)).toEqual({ x: 0.25, y: 0.25, width: 0, height: 0 });
    const r = regionFromDrag({ x: 1000, y: 500 }, { x: 500, y: 250 }, natural);
    expect(r).toEqual({ x: 0.25, y: 0.25, width: 0.25, height: 0.25 });
    const clipped = regionFromDrag({ x: -50, y: 0 }, { x: 4000, y: 1000 }, natural);
    expect(clipped).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  test("arrow head barbs sit behind the tip", () => {
    const [a, b] = arrowHeadPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 2);
    expect(a.x).toBeLessThan(100);
    expect(b.x).toBeLessThan(100);
    expect(a.y).toBeCloseTo(-b.y, 6);
  });
});

describe("version cursor", () => {
  const versions = [{ id: "a" }, { id: "b" }, { id: "c" }];
  test("steps in array order and stops at the ends", () => {
    expect(stepVersion(versions, "b", -1)?.id).toBe("a");
    expect(stepVersion(versions, "b", 1)?.id).toBe("c");
    expect(stepVersion(versions, "a", -1)).toBeNull();
    expect(stepVersion(versions, "c", 1)).toBeNull();
    expect(stepVersion(versions, "zzz", 1)).toBeNull();
  });
});

describe("resize math", () => {
  const base = { width: 1200, height: 800 };

  test("parseWhole accepts only positive whole numbers", () => {
    expect(parseWhole("12")).toBe(12);
    expect(parseWhole(" 7 ")).toBe(7);
    for (const bad of ["", "0", "-3", "1.5", "1e3", "abc", "12px"]) expect(parseWhole(bad)).toBeNull();
  });

  test("aspect lock keeps the ratio in pixels and shares the number in percent", () => {
    expect(linkedSide("width", 600, base, "px")).toBe(400);
    expect(linkedSide("height", 400, base, "px")).toBe(600);
    expect(linkedSide("width", 50, base, "%")).toBe(50);
    expect(linkedSide("width", 1, { width: 1000, height: 1 }, "px")).toBe(1);
  });

  test("units convert both ways", () => {
    expect(toPixels(50, 25, "%", base)).toEqual({ width: 600, height: 200 });
    expect(toPixels(640, 480, "px", base)).toEqual({ width: 640, height: 480 });
    expect(fromPixels({ width: 600, height: 400 }, "%", base)).toEqual({ width: 50, height: 50 });
    expect(fromPixels({ width: 600, height: 400 }, "px", base)).toEqual({ width: 600, height: 400 });
  });

  test("validation: whole numbers, positive, at most 8000 per side", () => {
    expect(validateResize("600", "400", "px", base)).toEqual({ ok: true, width: 600, height: 400 });
    expect(validateResize("50", "50", "%", base)).toEqual({ ok: true, width: 600, height: 400 });
    expect(validateResize("8000", "8000", "px", base).ok).toBe(true);
    const tooBig = validateResize("8001", "10", "px", base);
    expect(tooBig).toEqual({ ok: false, error: "Each side can be at most 8000 pixels." });
    const percentTooBig = validateResize("1000", "1000", "%", base);
    expect(percentTooBig.ok).toBe(false);
    const bad = validateResize("0", "10", "px", base);
    expect(bad).toEqual({ ok: false, error: "Width and height must be whole numbers above zero." });
    expect(validateResize("", "", "px", base).ok).toBe(false);
  });

  test("label", () => {
    expect(resizeLabel(640, 480)).toBe("Resized to 640 x 480");
  });
});

describe("palette", () => {
  test("eight swatches, all kit tokens, unique keys", () => {
    expect(PALETTE).toHaveLength(8);
    expect(new Set(PALETTE.map((c) => c.key)).size).toBe(8);
    for (const c of PALETTE) expect(c.cssVar.startsWith("--")).toBe(true);
  });
});

describe("crop math (IMG-STUDIO-01)", () => {
  const frame = { width: 1200, height: 800 };
  test("aspect presets give the right pixel ratio and Free gives none", () => {
    expect(aspectRatioOf("free", frame)).toBeNull();
    expect(aspectRatioOf("original", frame)).toBeCloseTo(1.5);
    expect(aspectRatioOf("1:1", frame)).toBe(1);
    expect(aspectRatioOf("4:5", frame)).toBeCloseTo(0.8);
    expect(aspectRatioOf("16:9", frame)).toBeCloseTo(16 / 9);
    expect(aspectRatioOf("9:16", frame)).toBeCloseTo(9 / 16);
  });
  test("a preset rectangle is the largest centred one and has exactly that ratio in pixels", () => {
    for (const ratio of [1, 0.8, 16 / 9, 9 / 16]) {
      const r = rectForAspect(ratio, frame);
      expect((r.width * frame.width) / (r.height * frame.height)).toBeCloseTo(ratio, 5);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.max(r.width, r.height)).toBeCloseTo(1, 5);
    }
  });
  test("a quarter turn swaps the frame, keeps the chosen shape re-fitted, and Free resets to the whole frame", () => {
    expect(rotatedSize(frame, 90)).toEqual({ width: 800, height: 1200 });
    expect(rotatedSize(frame, 180)).toEqual(frame);
    const free = turnCrop({ ...initialCrop, rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 } }, 1, frame);
    expect(free.rotate).toBe(90);
    expect(free.rect).toEqual(FULL_RECT);
    const square = turnCrop({ ...initialCrop, aspect: "1:1", rect: rectForAspect(1, frame) }, 1, frame);
    expect((square.rect.width * 800) / (square.rect.height * 1200)).toBeCloseTo(1, 5);
    const original = turnCrop({ ...initialCrop, aspect: "original" }, 1, frame);
    expect(original.rect).toEqual(FULL_RECT);
    expect(turnCrop(initialCrop, -1, frame).rotate).toBe(270);
    expect(turnCrop(turnCrop(initialCrop, 1, frame), 1, frame).rotate).toBe(180);
  });
  test("a change is only reported when something moved", () => {
    expect(cropChanged(initialCrop)).toBe(false);
    expect(cropChanged({ ...initialCrop, flipHorizontal: true })).toBe(true);
    expect(cropChanged({ ...initialCrop, rect: { x: 0.1, y: 0, width: 0.9, height: 1 } })).toBe(true);
    expect(croppedPixels({ ...initialCrop, rect: { x: 0, y: 0, width: 0.5, height: 0.5 } }, frame)).toEqual({ width: 600, height: 400 });
    expect(croppedPixels({ ...initialCrop, rotate: 90 }, frame)).toEqual({ width: 800, height: 1200 });
  });
  test("moving keeps the rectangle inside the picture", () => {
    const r = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    expect(dragCrop(r, "move", 0.9, -0.9, null, frame)).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
  });
  test("a free edge drag changes one side and is clamped to the picture and a minimum size", () => {
    const r = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    const wider = dragCrop(r, "e", 0.1, 0.4, null, frame);
    expect(wider.width).toBeCloseTo(0.6);
    expect(wider.height).toBeCloseTo(0.5);
    expect(wider.x).toBeCloseTo(0.2);
    expect(dragCrop(r, "w", -0.9, 0, null, frame).x).toBe(0);
    const tiny = dragCrop(r, "e", -0.9, 0, null, frame);
    expect(tiny.width).toBeCloseTo(0.05);
  });
  test("a locked corner drag keeps the ratio and stays in the picture", () => {
    const ratio = 1;
    const start = rectForAspect(ratio, frame);
    const smaller = dragCrop(start, "se", -0.1, -0.1, ratio, frame);
    expect((smaller.width * frame.width) / (smaller.height * frame.height)).toBeCloseTo(ratio, 5);
    expect(smaller.x).toBeCloseTo(start.x);
    expect(smaller.y).toBeCloseTo(start.y);
    const bigger = dragCrop({ x: 0.3, y: 0.3, width: 0.2, height: 0.3 }, "se", 0.9, 0.9, ratio, frame);
    expect((bigger.width * frame.width) / (bigger.height * frame.height)).toBeCloseTo(ratio, 5);
    expect(bigger.x + bigger.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(bigger.y + bigger.height).toBeLessThanOrEqual(1 + 1e-9);
  });
  test("a locked edge drag keeps the ratio too", () => {
    const ratio = 16 / 9;
    const start = rectForAspect(ratio, frame);
    for (const handle of ["n", "s", "e", "w"] as const) {
      const r = dragCrop({ ...start, x: 0.2, width: 0.5, height: 0.5 * (frame.width / frame.height) / ratio, y: 0.2 }, handle, 0.05, 0.05, ratio, frame);
      expect((r.width * frame.width) / (r.height * frame.height)).toBeCloseTo(ratio, 4);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("adjust math (IMG-STUDIO-01)", () => {
  test("no change is not a change, any slider is", () => {
    expect(adjustChanged(NO_ADJUST)).toBe(false);
    expect(adjustChanged({ ...NO_ADJUST, warmth: -5 })).toBe(true);
  });
  test("the preview filter follows the sliders", () => {
    expect(adjustFilter(NO_ADJUST)).toBe("brightness(1.000) contrast(1.000) saturate(1.000)");
    const f = adjustFilter({ brightness: 50, contrast: -50, saturation: -100, warmth: 100 });
    expect(f).toContain("brightness(1.500)");
    expect(f).toContain("contrast(0.500)");
    expect(f).toContain("saturate(0.000)");
    expect(f).toContain("sepia(0.400)");
    expect(adjustFilter({ ...NO_ADJUST, warmth: -50 })).toContain("hue-rotate(6.0deg)");
  });
  test("the picture transform turns then flips, centred", () => {
    expect(pictureTransform({ ...initialCrop, rotate: 90, flipHorizontal: true })).toBe("translate(-50%, -50%) scale(-1, 1) rotate(90deg)");
  });
});

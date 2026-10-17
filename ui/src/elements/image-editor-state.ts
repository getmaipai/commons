/**
 * Pure state and math for the ImageEditor Element: undo/redo of strokes,
 * zoom steps, aspect-locked resize, region and coordinate conversion, and the
 * version-history cursor. No React, no DOM, so every rule is tested directly.
 */

// ---------------------------------------------------------------- geometry

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** A normalised 0..1 region of the picture. */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clampNumber = (value: number, min: number, max: number) =>
  Number.isNaN(value) ? min : Math.min(max, Math.max(min, value));

/**
 * A pointer position on the drawing surface as a picture-pixel position.
 * `rect` is the surface's on-screen box, `natural` the picture's pixel size.
 * A zero-size box (not laid out yet) maps to the origin instead of NaN.
 */
export function clientToImage(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
  natural: Size,
): Point {
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 };
  return {
    x: clampNumber(((client.x - rect.left) / rect.width) * natural.width, 0, natural.width),
    y: clampNumber(((client.y - rect.top) / rect.height) * natural.height, 0, natural.height),
  };
}

/** Two picture-pixel corners as a normalised region. Tiny drags become a point (width and height 0). */
export function regionFromDrag(a: Point, b: Point, natural: Size, minDragPx = 6): Region {
  const w = Math.max(1, natural.width);
  const h = Math.max(1, natural.height);
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx < minDragPx && dy < minDragPx) {
    return { x: clampNumber(a.x / w, 0, 1), y: clampNumber(a.y / h, 0, 1), width: 0, height: 0 };
  }
  const x0 = clampNumber(Math.min(a.x, b.x) / w, 0, 1);
  const y0 = clampNumber(Math.min(a.y, b.y) / h, 0, 1);
  const x1 = clampNumber(Math.max(a.x, b.x) / w, 0, 1);
  const y1 = clampNumber(Math.max(a.y, b.y) / h, 0, 1);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** The two barbs of an arrow head at `to`, for an arrow drawn from `from`. */
export function arrowHeadPoints(from: Point, to: Point, strokePx: number): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.max(strokePx * 4, 12);
  const spread = Math.PI / 7;
  return [
    { x: to.x - length * Math.cos(angle - spread), y: to.y - length * Math.sin(angle - spread) },
    { x: to.x - length * Math.cos(angle + spread), y: to.y - length * Math.sin(angle + spread) },
  ];
}

// -------------------------------------------------------------------- zoom

export const ZOOM_MIN = 10;
export const ZOOM_MAX = 400;
export const ZOOM_STEPS = [10, 15, 20, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400] as const;

export const clampZoom = (percent: number) => Math.round(clampNumber(percent, ZOOM_MIN, ZOOM_MAX));

/** The next zoom step above (+1) or below (-1) `percent`; the ends hold. */
export function stepZoom(percent: number, direction: 1 | -1): number {
  const current = clampZoom(percent);
  if (direction === 1) return ZOOM_STEPS.find((step) => step > current) ?? ZOOM_MAX;
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
    const step = ZOOM_STEPS[i]!;
    if (step < current) return step;
  }
  return ZOOM_MIN;
}

/**
 * The zoom percent that fits `natural` inside `stage` (both in CSS pixels)
 * with `padding` px kept free on each side. Never above 100 so a small picture
 * is not blown up, never outside the zoom range.
 */
export function fitZoom(stage: Size, natural: Size, padding = 24): number {
  if (!(natural.width > 0) || !(natural.height > 0)) return 100;
  const availW = stage.width - padding * 2;
  const availH = stage.height - padding * 2;
  if (!(availW > 0) || !(availH > 0)) return ZOOM_MIN;
  const ratio = Math.min(availW / natural.width, availH / natural.height);
  return clampZoom(Math.floor(Math.min(1, ratio) * 100));
}

/** Zoom after a Ctrl/Cmd+wheel tick: up for a negative delta, one step at a time. */
export function wheelZoom(percent: number, deltaY: number): number {
  if (deltaY === 0) return clampZoom(percent);
  return stepZoom(percent, deltaY < 0 ? 1 : -1);
}

// ------------------------------------------------------------------- brush

export const BRUSH_MIN = 4;
export const BRUSH_MAX = 200;

/** `[` and `]`: change the brush by 10 percent, always by at least 1 px, inside 4..200. */
export function stepBrush(size: number, direction: 1 | -1): number {
  const delta = Math.max(1, Math.round(size * 0.1));
  return Math.round(clampNumber(size + direction * delta, BRUSH_MIN, BRUSH_MAX));
}

export const clampBrush = (size: number) => Math.round(clampNumber(size, BRUSH_MIN, BRUSH_MAX));

export const MARKUP_SIZE_MIN = 1;
export const MARKUP_SIZE_MAX = 20;

/** The markup size slider (1..20) as a stroke width in picture pixels: 1 step is 0.25 percent of the long side. */
export function markupStrokePx(step: number, natural: Size): number {
  const longSide = Math.max(natural.width, natural.height, 1);
  return Math.max(1, Math.round((clampNumber(step, MARKUP_SIZE_MIN, MARKUP_SIZE_MAX) * longSide) / 400));
}

// ------------------------------------------------------------------ strokes

export type MarkupTool = "pen" | "highlighter" | "arrow" | "rectangle" | "ellipse" | "text";

export interface PaletteColor {
  key: string;
  label: string;
  /** Kit CSS custom property that holds the colour. */
  cssVar: string;
}

/** Eight swatches, all from the kit's own tokens. */
export const PALETTE: readonly PaletteColor[] = [
  { key: "red", label: "Red", cssVar: "--hue-red" },
  { key: "orange", label: "Orange", cssVar: "--hue-orange" },
  { key: "yellow", label: "Yellow", cssVar: "--hue-yellow" },
  { key: "green", label: "Green", cssVar: "--hue-green" },
  { key: "blue", label: "Blue", cssVar: "--hue-blue" },
  { key: "violet", label: "Violet", cssVar: "--hue-violet" },
  { key: "pink", label: "Pink", cssVar: "--hue-pink" },
  { key: "ink", label: "Black or white", cssVar: "--foreground" },
];

export type Stroke =
  | { kind: "pen" | "highlighter" | "erase"; points: Point[]; size: number; color: string }
  | { kind: "arrow" | "rectangle" | "ellipse"; from: Point; to: Point; size: number; color: string }
  | { kind: "text"; at: Point; text: string; size: number; color: string };

export interface StrokeState {
  strokes: Stroke[];
  /** Undone strokes, most recently undone last. */
  redo: Stroke[];
}

export type StrokeAction =
  | { type: "add"; stroke: Stroke }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "clear" };

export const emptyStrokes: StrokeState = { strokes: [], redo: [] };

export function strokesReducer(state: StrokeState, action: StrokeAction): StrokeState {
  switch (action.type) {
    case "add":
      // A new stroke ends the redo line, like every editor.
      return { strokes: [...state.strokes, action.stroke], redo: [] };
    case "undo": {
      const last = state.strokes[state.strokes.length - 1];
      if (!last) return state;
      return { strokes: state.strokes.slice(0, -1), redo: [...state.redo, last] };
    }
    case "redo": {
      const next = state.redo[state.redo.length - 1];
      if (!next) return state;
      return { strokes: [...state.strokes, next], redo: state.redo.slice(0, -1) };
    }
    case "clear":
      return state.strokes.length === 0 && state.redo.length === 0 ? state : emptyStrokes;
    default:
      return state;
  }
}

export const canUndoStroke = (state: StrokeState) => state.strokes.length > 0;
export const canRedoStroke = (state: StrokeState) => state.redo.length > 0;

/** A freehand stroke needs a point; a shape needs a drag; text needs text. */
export function isMeaningfulStroke(stroke: Stroke): boolean {
  switch (stroke.kind) {
    case "pen":
    case "highlighter":
    case "erase":
      return stroke.points.length > 0;
    case "text":
      return stroke.text.trim().length > 0;
    default:
      return Math.hypot(stroke.to.x - stroke.from.x, stroke.to.y - stroke.from.y) >= 2;
  }
}

// ----------------------------------------------------------------- versions

export interface VersionLike {
  id: string;
}

/** The version one step back (-1) or forward (+1) in array order, or null at an end or when `currentId` is unknown. */
export function stepVersion<T extends VersionLike>(versions: readonly T[], currentId: string, direction: 1 | -1): T | null {
  const index = versions.findIndex((version) => version.id === currentId);
  if (index === -1) return null;
  return versions[index + direction] ?? null;
}

// ------------------------------------------------------------------- resize

export const RESIZE_MAX = 8000;
export type ResizeUnit = "px" | "%";

/** Parse a field: a plain positive whole number, nothing else. */
export function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

/**
 * With the aspect lock on, the other side of a size after one side changed.
 * In pixels the ratio of `base` is kept; in percent both sides share the number.
 */
export function linkedSide(changed: "width" | "height", value: number, base: Size, unit: ResizeUnit): number {
  if (unit === "%") return value;
  if (changed === "width") return Math.max(1, Math.round((value * base.height) / Math.max(1, base.width)));
  return Math.max(1, Math.round((value * base.width) / Math.max(1, base.height)));
}

/** A (width, height) pair in `unit` as picture pixels. */
export function toPixels(width: number, height: number, unit: ResizeUnit, base: Size): Size {
  if (unit === "px") return { width, height };
  return {
    width: Math.max(1, Math.round((base.width * width) / 100)),
    height: Math.max(1, Math.round((base.height * height) / 100)),
  };
}

/** Pixel size `size` expressed in `unit`. */
export function fromPixels(size: Size, unit: ResizeUnit, base: Size): Size {
  if (unit === "px") return size;
  return {
    width: Math.max(1, Math.round((size.width / Math.max(1, base.width)) * 100)),
    height: Math.max(1, Math.round((size.height / Math.max(1, base.height)) * 100)),
  };
}

export type ResizeCheck = { ok: true; width: number; height: number } | { ok: false; error: string };

export function validateResize(widthText: string, heightText: string, unit: ResizeUnit, base: Size): ResizeCheck {
  const width = parseWhole(widthText);
  const height = parseWhole(heightText);
  if (width === null || height === null) {
    return { ok: false, error: "Width and height must be whole numbers above zero." };
  }
  const px = toPixels(width, height, unit, base);
  if (px.width > RESIZE_MAX || px.height > RESIZE_MAX) {
    return { ok: false, error: `Each side can be at most ${RESIZE_MAX} pixels.` };
  }
  return { ok: true, width: px.width, height: px.height };
}

export const resizeLabel = (width: number, height: number) => `Resized to ${width} x ${height}`;

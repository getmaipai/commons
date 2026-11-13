import { i18n } from "@/kit/i18n"
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
  { key: "red", get label() { return i18n._({ id: "ui.Red", message: "Red" }) }, cssVar: "--hue-red" },
  { key: "orange", get label() { return i18n._({ id: "ui.Orange", message: "Orange" }) }, cssVar: "--hue-orange" },
  { key: "yellow", get label() { return i18n._({ id: "ui.Yellow", message: "Yellow" }) }, cssVar: "--hue-yellow" },
  { key: "green", get label() { return i18n._({ id: "ui.Green", message: "Green" }) }, cssVar: "--hue-green" },
  { key: "blue", get label() { return i18n._({ id: "ui.Blue", message: "Blue" }) }, cssVar: "--hue-blue" },
  { key: "violet", get label() { return i18n._({ id: "ui.Violet", message: "Violet" }) }, cssVar: "--hue-violet" },
  { key: "pink", get label() { return i18n._({ id: "ui.Pink", message: "Pink" }) }, cssVar: "--hue-pink" },
  { key: "ink", get label() { return i18n._({ id: "ui.Black or white", message: "Black or white" }) }, cssVar: "--foreground" },
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

export interface SizedVersion extends VersionLike {
  width?: number;
  height?: number;
}

const SHAPE_TOLERANCE = 0.005;

/** True when two sizes are the same shape (width over height, within half a percent). An unknown size cannot prove a difference, so it matches. */
export function sameShape(a: { width: number; height: number } | null | undefined, b: { width: number; height: number } | null | undefined): boolean {
  if (!a || !b || !(a.width > 0) || !(a.height > 0) || !(b.width > 0) || !(b.height > 0)) return true;
  return Math.abs(a.width / a.height - b.width / b.height) <= (a.width / a.height) * SHAPE_TOLERANCE;
}

/**
 * The picture Compare shows on the "before" side: the newest version earlier than the current one that has the same shape as what is
 * shown on the "after" side (a crop or a turn changes the shape, and a picture stretched into another shape is not a comparison).
 * With a pending preview the current version itself is a candidate (the preview is its result). `sizeOf` supplies a size the version
 * itself does not carry (measured from the loaded picture). Null when there is none.
 */
export function compareBase<T extends SizedVersion>(
  versions: readonly T[],
  currentId: string,
  after: { width: number; height: number } | null,
  pending: boolean,
  sizeOf?: (version: T) => { width: number; height: number } | null,
): T | null {
  const index = versions.findIndex((version) => version.id === currentId);
  if (index === -1) return null;
  for (let at = pending ? index : index - 1; at >= 0; at -= 1) {
    const version = versions[at]!;
    const size = version.width && version.height ? { width: version.width, height: version.height } : (sizeOf?.(version) ?? null);
    if (sameShape(size, after)) return version;
  }
  return null;
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
    return { ok: false, error: i18n._({ id: "ui.Width and height must be whole numbers above zero.", message: "Width and height must be whole numbers above zero." }) };
  }
  const px = toPixels(width, height, unit, base);
  if (px.width > RESIZE_MAX || px.height > RESIZE_MAX) {
    return { ok: false, error: i18n._({ id: "ui.Each side can be at most {max} pixels.", message: "Each side can be at most {max} pixels.", values: { max: RESIZE_MAX } }) };
  }
  return { ok: true, width: px.width, height: px.height };
}

export const resizeLabel = (width: number, height: number) => i18n._({ id: "ui.Resized to {width} x {height}", message: "Resized to {width} x {height}", values: { width, height } });


// ------------------------------------------------------------- crop (IMG-STUDIO-01)

export type CropAspect = "free" | "original" | "1:1" | "4:5" | "16:9" | "9:16";
export const CROP_ASPECTS: readonly CropAspect[] = ["free", "original", "1:1", "4:5", "16:9", "9:16"];
export type CropRotation = 0 | 90 | 180 | 270;
export type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

/** The crop rectangle is normalised (0..1) in the frame AFTER rotate and flip. */
export interface CropState {
  rect: Region;
  aspect: CropAspect;
  rotate: CropRotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export const FULL_RECT: Region = { x: 0, y: 0, width: 1, height: 1 };
export const initialCrop: CropState = { rect: FULL_RECT, aspect: "free", rotate: 0, flipHorizontal: false, flipVertical: false };
const CROP_MIN = 0.05;

/** The frame size after rotating a picture (a quarter turn swaps the sides). */
export const rotatedSize = (natural: Size, rotate: CropRotation): Size =>
  rotate === 90 || rotate === 270 ? { width: natural.height, height: natural.width } : natural;

/** Width over height in picture pixels for a preset, or null for Free. */
export function aspectRatioOf(aspect: CropAspect, frame: Size): number | null {
  switch (aspect) {
    case "free":
      return null;
    case "original":
      return frame.width / Math.max(1, frame.height);
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
  }
}

/** The largest centred rectangle of `ratio` (pixels, width over height) that fits the frame. */
export function rectForAspect(ratio: number, frame: Size): Region {
  const frameRatio = frame.width / Math.max(1, frame.height);
  if (ratio >= frameRatio) {
    const height = frameRatio / ratio;
    return { x: 0, y: (1 - height) / 2, width: 1, height };
  }
  const width = ratio / frameRatio;
  return { x: (1 - width) / 2, y: 0, width, height: 1 };
}

const sameRect = (a: Region, b: Region) =>
  Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.width - b.width) < 1e-6 && Math.abs(a.height - b.height) < 1e-6;

export const cropChanged = (crop: CropState) =>
  !sameRect(crop.rect, FULL_RECT) || crop.rotate !== 0 || crop.flipHorizontal || crop.flipVertical;

/** A quarter turn. The shape the person chose is kept and re-fitted to the new frame; Free resets to the whole frame. */
export function turnCrop(crop: CropState, direction: 1 | -1, natural: Size): CropState {
  const rotate = ((crop.rotate + (direction === 1 ? 90 : 270)) % 360) as CropRotation;
  const ratio = aspectRatioOf(crop.aspect, rotatedSize(natural, rotate));
  const frame = rotatedSize(natural, rotate);
  return { ...crop, rotate, rect: ratio === null ? FULL_RECT : rectForAspect(ratio, frame) };
}

/** Move or resize `rect` by a normalised drag `(dx, dy)`. `ratio` (pixels, width over height) locks the shape. */
export function dragCrop(rect: Region, handle: CropHandle, dx: number, dy: number, ratio: number | null, frame: Size): Region {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  if (handle === "move") {
    return {
      ...rect,
      x: clamp(rect.x + dx, 0, 1 - rect.width),
      y: clamp(rect.y + dy, 0, 1 - rect.height),
    };
  }
  let l = rect.x;
  let t = rect.y;
  let r = rect.x + rect.width;
  let b = rect.y + rect.height;
  if (handle.includes("w")) l = clamp(l + dx, 0, r - CROP_MIN);
  if (handle.includes("e")) r = clamp(r + dx, l + CROP_MIN, 1);
  if (handle.includes("n")) t = clamp(t + dy, 0, b - CROP_MIN);
  if (handle.includes("s")) b = clamp(b + dy, t + CROP_MIN, 1);
  if (ratio === null) return { x: l, y: t, width: r - l, height: b - t };
  // Locked shape. In frame fractions, width_px / height_px = ratio means (w * W) / (h * H) = ratio.
  const k = ratio * (frame.height / Math.max(1, frame.width)); // w = k * h
  const corner = handle.length === 2;
  if (corner) {
    const anchorX = handle.includes("w") ? r : l;
    const anchorY = handle.includes("n") ? b : t;
    const spanX = handle.includes("w") ? anchorX : 1 - anchorX;
    const spanY = handle.includes("n") ? anchorY : 1 - anchorY;
    let w = Math.max(r - l, (b - t) * k);
    let h = w / k;
    if (w > spanX) { w = spanX; h = w / k; }
    if (h > spanY) { h = spanY; w = h * k; }
    w = Math.max(w, CROP_MIN);
    h = w / k;
    return { x: handle.includes("w") ? anchorX - w : anchorX, y: handle.includes("n") ? anchorY - h : anchorY, width: w, height: h };
  }
  if (handle === "e" || handle === "w") {
    const centreY = rect.y + rect.height / 2;
    let w = r - l;
    let h = w / k;
    if (h > 1) { h = 1; w = h * k; }
    const y = clamp(centreY - h / 2, 0, 1 - h);
    const x = handle === "w" ? r - w : l;
    return { x: clamp(x, 0, 1 - w), y, width: w, height: h };
  }
  const centreX = rect.x + rect.width / 2;
  let h = b - t;
  let w = h * k;
  if (w > 1) { w = 1; h = w / k; }
  const x = clamp(centreX - w / 2, 0, 1 - w);
  const y = handle === "n" ? b - h : t;
  return { x, y: clamp(y, 0, 1 - h), width: w, height: h };
}

/** Pixel size the crop produces from a picture of `natural` size. */
export function croppedPixels(crop: CropState, natural: Size): Size {
  const frame = rotatedSize(natural, crop.rotate);
  return { width: Math.max(1, Math.round(frame.width * crop.rect.width)), height: Math.max(1, Math.round(frame.height * crop.rect.height)) };
}

// ------------------------------------------------------------ adjust (IMG-STUDIO-01)

/** The four sliders the Home `picture.adjust` operation takes, each -100..100 (0 = unchanged). */
export interface AdjustValues {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}
export const ADJUST_KEYS = ["brightness", "contrast", "saturation", "warmth"] as const satisfies readonly (keyof AdjustValues)[];
export const NO_ADJUST: AdjustValues = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
export const adjustChanged = (v: AdjustValues) => ADJUST_KEYS.some((key) => v[key] !== 0);

/** A CSS filter that approximates the adjustment for a live preview (the applied result is the host's). */
export function adjustFilter(v: AdjustValues): string {
  const parts = [`brightness(${(1 + v.brightness / 100).toFixed(3)})`, `contrast(${(1 + v.contrast / 100).toFixed(3)})`, `saturate(${Math.max(0, 1 + v.saturation / 100).toFixed(3)})`];
  if (v.warmth > 0) parts.push(`sepia(${(v.warmth / 250).toFixed(3)})`);
  else if (v.warmth < 0) parts.push(`hue-rotate(${(-v.warmth * 0.12).toFixed(1)}deg)`);
  return parts.join(" ");
}

/** The CSS transform for the rotated and flipped preview of a picture. */
export function pictureTransform(crop: CropState): string {
  const fx = crop.flipHorizontal ? -1 : 1;
  const fy = crop.flipVertical ? -1 : 1;
  return `translate(-50%, -50%) scale(${fx}, ${fy}) rotate(${crop.rotate}deg)`;
}

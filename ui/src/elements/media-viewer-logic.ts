// LIBRARY-REVAMP-06 slice B: the maths of MediaViewer's zoom, pan, pinch, wheel and swipe, with no DOM,
// so each rule has a plain test.

export interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_SCALE = 1;
export const DEFAULT_MAX_SCALE = 4;
/** One press of the zoom button or the + and - keys. */
export const ZOOM_STEP = 1.5;
/** A double tap or double click on a fitted picture. */
export const DOUBLE_TAP_SCALE = 2.5;
/** How far a finger must travel sideways for a swipe, in pixels. */
export const SWIPE_MIN_PX = 56;
/** A touch that moves less than this is a tap. */
export const TAP_SLOP_PX = 12;
export const DOUBLE_TAP_MS = 320;
/** Arrow keys pan a zoomed picture by this much. */
export const KEY_PAN_PX = 64;

export const IDENTITY: ViewTransform = { scale: MIN_SCALE, x: 0, y: 0 };

export function clampScale(scale: number, max: number = DEFAULT_MAX_SCALE): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(Math.max(scale, MIN_SCALE), Math.max(MIN_SCALE, max));
}

/** Zooms to `scale`, keeping the point `anchor` (measured from the centre of the stage) where it is under the finger or pointer.
 * Back at the fitted size the picture is centred. */
export function zoomTo(current: ViewTransform, scale: number, max: number = DEFAULT_MAX_SCALE, anchor: Point = { x: 0, y: 0 }): ViewTransform {
  const next = clampScale(scale, max);
  if (next <= MIN_SCALE) return IDENTITY;
  const ratio = next / current.scale;
  return { scale: next, x: anchor.x - (anchor.x - current.x) * ratio, y: anchor.y - (anchor.y - current.y) * ratio };
}

export function zoomBy(current: ViewTransform, factor: number, max: number = DEFAULT_MAX_SCALE, anchor?: Point): ViewTransform {
  return zoomTo(current, current.scale * factor, max, anchor);
}

/** Keeps a zoomed picture over the stage: it cannot be pulled further than its own edge. `content` is the picture's fitted size
 * (before the zoom). A size of zero means "not measured", and the pan is left free. */
export function clampPan(current: ViewTransform, stage: Size, content: Size): ViewTransform {
  if (current.scale <= MIN_SCALE) return IDENTITY;
  const limit = (stageSize: number, contentSize: number) =>
    stageSize > 0 && contentSize > 0 ? Math.max(0, (contentSize * current.scale - stageSize) / 2) : Number.POSITIVE_INFINITY;
  const lx = limit(stage.width, content.width);
  const ly = limit(stage.height, content.height);
  return { scale: current.scale, x: Math.min(Math.max(current.x, -lx), lx), y: Math.min(Math.max(current.y, -ly), ly) };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The scale a pinch asks for: the scale it began at, times how much the fingers spread. */
export function pinchScale(startScale: number, startDistance: number, nowDistance: number, max: number = DEFAULT_MAX_SCALE): number {
  if (!(startDistance > 0)) return clampScale(startScale, max);
  return clampScale(startScale * (nowDistance / startDistance), max);
}

/** A sideways swipe: left (a negative dx) moves to the next item, right to the previous. Mostly-vertical movement is not a swipe. */
export function swipeDirection(dx: number, dy: number): "next" | "previous" | null {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "previous";
}

/** The zoom factor for one wheel event. A trackpad pinch arrives as a wheel event with Ctrl held and small steps, so it is made stronger. */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const clamped = Math.max(-240, Math.min(240, pixels));
  return Math.exp(-clamped * (ctrlKey ? 0.01 : 0.002));
}

/** Where a double tap goes: back to fitted from any zoom, else to the double-tap scale. */
export function doubleTapTarget(current: ViewTransform, max: number = DEFAULT_MAX_SCALE): number {
  return current.scale > MIN_SCALE ? MIN_SCALE : clampScale(DOUBLE_TAP_SCALE, max);
}

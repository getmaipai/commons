import { describe, expect, test } from "bun:test";
import {
  clampPan,
  clampScale,
  DEFAULT_MAX_SCALE,
  doubleTapTarget,
  IDENTITY,
  midpoint,
  pinchScale,
  SWIPE_MIN_PX,
  swipeDirection,
  wheelFactor,
  zoomBy,
  zoomTo,
} from "./media-viewer-logic";

describe("zoom maths", () => {
  test("scale stays between fitted and the maximum, and bad numbers fall back to fitted", () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(9)).toBe(DEFAULT_MAX_SCALE);
    expect(clampScale(9, 6)).toBe(6);
    expect(clampScale(Number.NaN)).toBe(1);
    expect(clampScale(3, 0.5)).toBe(1);
  });

  test("zooming keeps the point under the pointer where it was", () => {
    const anchor = { x: 100, y: -40 };
    const next = zoomTo(IDENTITY, 2, 4, anchor);
    // The point's place on screen is anchor = x + scale * p, so p is unchanged by the zoom.
    expect((anchor.x - next.x) / next.scale).toBeCloseTo(anchor.x, 6);
    expect((anchor.y - next.y) / next.scale).toBeCloseTo(anchor.y, 6);
    const again = zoomBy(next, 1.5, 4, anchor);
    expect((anchor.x - again.x) / again.scale).toBeCloseTo(anchor.x, 6);
  });

  test("zooming to the middle needs no pan, and zooming back out to fitted centres the picture", () => {
    expect(zoomTo(IDENTITY, 2)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(zoomTo({ scale: 3, x: 80, y: -20 }, 1)).toEqual(IDENTITY);
    expect(zoomBy({ scale: 2, x: 10, y: 10 }, 0.1)).toEqual(IDENTITY);
  });

  test("the zoom cannot pass the maximum", () => {
    expect(zoomBy({ scale: 3, x: 0, y: 0 }, 5).scale).toBe(4);
    expect(zoomBy({ scale: 1, x: 0, y: 0 }, 5, 2).scale).toBe(2);
  });
});

describe("pan limits", () => {
  const stage = { width: 800, height: 600 };
  const content = { width: 800, height: 400 };

  test("at the fitted size there is nothing to pan", () => {
    expect(clampPan({ scale: 1, x: 50, y: 50 }, stage, content)).toEqual(IDENTITY);
  });

  test("a zoomed picture cannot be dragged past its own edge", () => {
    // 800 wide at 2x is 1600: 400 each way. 400 high at 2x is 800 on a 600 stage: 100 each way.
    expect(clampPan({ scale: 2, x: 999, y: -999 }, stage, content)).toEqual({ scale: 2, x: 400, y: -100 });
    expect(clampPan({ scale: 2, x: 120, y: 30 }, stage, content)).toEqual({ scale: 2, x: 120, y: 30 });
  });

  test("a picture that still fits one way does not pan that way", () => {
    expect(clampPan({ scale: 1.2, x: 50, y: 50 }, stage, { width: 800, height: 300 }).y).toBe(0);
  });

  test("an unmeasured stage leaves the pan free", () => {
    expect(clampPan({ scale: 2, x: 999, y: 999 }, { width: 0, height: 0 }, { width: 0, height: 0 })).toEqual({ scale: 2, x: 999, y: 999 });
  });
});

describe("pinch, wheel, swipe and double tap", () => {
  test("a pinch scales by how far the fingers spread, within limits", () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
    expect(pinchScale(2, 100, 50)).toBe(1);
    expect(pinchScale(2, 100, 1000)).toBe(4);
    expect(pinchScale(2, 0, 100)).toBe(2);
    expect(midpoint({ x: 0, y: 10 }, { x: 10, y: 30 })).toEqual({ x: 5, y: 20 });
  });

  test("a wheel turned up zooms in and down zooms out, and a trackpad pinch (Ctrl) is stronger", () => {
    expect(wheelFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0, false)).toBeLessThan(1);
    expect(wheelFactor(-4, 0, true)).toBeGreaterThan(wheelFactor(-4, 0, false));
    expect(wheelFactor(0, 0, false)).toBe(1);
    // Line mode counts as pixels and a huge flick is capped.
    expect(wheelFactor(-3, 1, false)).toBeCloseTo(wheelFactor(-48, 0, false), 6);
    expect(wheelFactor(-100000, 0, false)).toBe(wheelFactor(-240, 0, false));
  });

  test("a swipe is a mostly-sideways move of at least the minimum", () => {
    expect(swipeDirection(-SWIPE_MIN_PX, 0)).toBe("next");
    expect(swipeDirection(SWIPE_MIN_PX, 10)).toBe("previous");
    expect(swipeDirection(SWIPE_MIN_PX - 1, 0)).toBeNull();
    expect(swipeDirection(-80, 70)).toBeNull();
    expect(swipeDirection(-80, 20)).toBe("next");
  });

  test("a double tap zooms in from fitted and out from any zoom", () => {
    expect(doubleTapTarget(IDENTITY)).toBe(2.5);
    expect(doubleTapTarget({ scale: 2, x: 0, y: 0 })).toBe(1);
    expect(doubleTapTarget(IDENTITY, 2)).toBe(2);
  });
});

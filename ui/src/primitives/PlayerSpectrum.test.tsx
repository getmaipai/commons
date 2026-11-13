import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { Player } from "@/kit/primitives/Player";
import { drawSpectrum, PlayerSpectrum } from "@/kit/primitives/PlayerSpectrum";

afterEach(cleanup);

const fakeCtx = () => {
  const rects: number[][] = [];
  return { rects, ctx: { clearRect: mock(() => {}), fillRect: (...a: number[]) => { rects.push(a); }, fillStyle: "", globalAlpha: 1 } };
};

describe("drawSpectrum", () => {
  test("bars rise from the bottom edge, clamp 0..1, skip silence, use the given colour at low alpha", () => {
    const { rects, ctx } = fakeCtx();
    drawSpectrum(ctx, 100, 50, [1, 0, 0.5, 2, Number.NaN], "rgb(1, 2, 3)");
    expect(ctx.fillStyle).toBe("rgb(1, 2, 3)");
    expect(rects.length).toBe(3);
    for (const [, y, , h] of rects) expect(y! + h!).toBe(50);
    expect(rects[1]![3]).toBe(25);
    expect(rects[2]![3]).toBe(50);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 50);
  });
  test("empty levels draw nothing", () => {
    const { rects, ctx } = fakeCtx();
    drawSpectrum(ctx, 100, 50, [], "red");
    expect(rects.length).toBe(0);
  });
});

describe("PlayerSpectrum loop", () => {
  const withCanvas = () => {
    const original = HTMLCanvasElement.prototype.getContext;
    const ctx = { clearRect: () => {}, fillRect: () => {}, setTransform: () => {}, fillStyle: "", globalAlpha: 1 };
    HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
    return () => { HTMLCanvasElement.prototype.getContext = original; };
  };
  test("runs requestAnimationFrame while active and stops when paused", () => {
    const restore = withCanvas();
    const origRaf = globalThis.requestAnimationFrame, origCancel = globalThis.cancelAnimationFrame;
    const raf = mock((_cb: FrameRequestCallback) => 7);
    const cancel = mock((_id: number) => {});
    globalThis.requestAnimationFrame = raf as never;
    globalThis.cancelAnimationFrame = cancel as never;
    const levels = () => [0.5];
    const { rerender, container } = render(<PlayerSpectrum levels={levels} active />);
    expect(raf).toHaveBeenCalled();
    expect(container.querySelector("canvas")!.getAttribute("aria-hidden")).toBe("true");
    rerender(<PlayerSpectrum levels={levels} active={false} />);
    expect(cancel).toHaveBeenCalledWith(7);
    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCancel;
    restore();
  });
  test("reduced motion draws one static frame and starts no loop", () => {
    const restore = withCanvas();
    const origMM = window.matchMedia, origRaf = globalThis.requestAnimationFrame;
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as never;
    const raf = mock(() => 1);
    globalThis.requestAnimationFrame = raf as never;
    const levels = mock(() => [0.4]);
    render(<PlayerSpectrum levels={levels} active />);
    expect(raf).not.toHaveBeenCalled();
    expect(levels).toHaveBeenCalledTimes(1);
    window.matchMedia = origMM;
    globalThis.requestAnimationFrame = origRaf;
    restore();
  });
});

describe("Player spectrum prop", () => {
  const media = () => document.createElement("audio");
  test("absent: no canvas in the mini bar", () => {
    const { container } = render(<Player layout="mini" src="/a.mp3" title="T" media={media()} />);
    expect(container.querySelector("[data-slot=player-spectrum]")).toBeNull();
  });
  test("present: the canvas sits behind the mini bar, pointer-events none", () => {
    const { container } = render(<Player layout="mini" src="/a.mp3" title="T" media={media()} spectrum={{ levels: () => [0.2] }} />);
    const c = container.querySelector("[data-slot=player-spectrum]")!;
    expect(c).not.toBeNull();
    expect(c.className).toContain("pointer-events-none");
    act(() => {});
  });
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ImageEditorSurface, drawStrokes, renderMarkupPng, renderMaskPng } from "./image-editor-surface";
import type { Stroke } from "./image-editor-state";

type Call = [string, ...unknown[]];

function fakeContext(calls: Call[]) {
  return new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "fillStyle" || prop === "strokeStyle") return "";
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
        };
      },
      set(_t, prop: string, value) {
        calls.push([`set:${prop}`, value]);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

const original = {
  getContext: HTMLCanvasElement.prototype.getContext,
  toBlob: HTMLCanvasElement.prototype.toBlob,
  rect: HTMLElement.prototype.getBoundingClientRect,
  Image: globalThis.Image,
};
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  HTMLCanvasElement.prototype.getContext = (() => fakeContext(calls)) as never;
  HTMLCanvasElement.prototype.toBlob = ((cb: (b: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" }))) as never;
  HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, x: 0, y: 0, toJSON() {} }) as DOMRect;
  class FakeImage {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 400;
    naturalHeight = 200;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  globalThis.Image = FakeImage as never;
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = original.getContext;
  HTMLCanvasElement.prototype.toBlob = original.toBlob;
  HTMLElement.prototype.getBoundingClientRect = original.rect;
  globalThis.Image = original.Image;
});

const natural = { width: 400, height: 200 };
const base = {
  natural,
  scale: 1,
  markupTool: "pen" as const,
  color: "red",
  strokePx: 4,
  brushPx: 20,
  strokes: [] as Stroke[],
  onStroke: () => {},
  onTextAt: () => {},
  onRegion: () => {},
};

describe("ImageEditorSurface", () => {
  test("has no canvas context in some environments and still renders", () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    const { container } = render(<ImageEditorSurface {...base} mode="markup" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("canvas keeps touch-action none and the picture's bitmap size", () => {
    const { container } = render(<ImageEditorSurface {...base} mode="markup" />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas.style.touchAction).toBe("none");
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
  });

  test("a pen drag commits one stroke in picture pixels", () => {
    const strokes: Stroke[] = [];
    const { container } = render(<ImageEditorSurface {...base} mode="markup" onStroke={(s) => strokes.push(s)} />);
    const canvas = container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 25, clientY: 25, pointerId: 1, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 25, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 75, clientY: 25, pointerId: 1 });
    expect(strokes).toHaveLength(1);
    const stroke = strokes[0]!;
    expect(stroke.kind).toBe("pen");
    if (stroke.kind === "pen") {
      expect(stroke.points[0]).toEqual({ x: 100, y: 100 });
      expect(stroke.points.at(-1)).toEqual({ x: 300, y: 100 });
      expect(stroke.size).toBe(4);
      expect(stroke.color).toBe("red");
    }
  });

  test("a cancelled pointer commits nothing", () => {
    const strokes: Stroke[] = [];
    const { container } = render(<ImageEditorSurface {...base} mode="markup" onStroke={(s) => strokes.push(s)} />);
    const canvas = container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 25, clientY: 25, pointerId: 1, button: 0 });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    expect(strokes).toHaveLength(0);
  });

  test("a rectangle with no drag is dropped; a real one is kept", () => {
    const strokes: Stroke[] = [];
    const { container } = render(
      <ImageEditorSurface {...base} markupTool="rectangle" mode="markup" onStroke={(s) => strokes.push(s)} />,
    );
    const canvas = container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(strokes).toHaveLength(0);
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 2, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 60, clientY: 40, pointerId: 2 });
    expect(strokes).toHaveLength(1);
    expect(strokes[0]!.kind).toBe("rectangle");
  });

  test("the text tool reports the spot instead of drawing", () => {
    const spots: unknown[] = [];
    const { container } = render(
      <ImageEditorSurface {...base} markupTool="text" mode="markup" onTextAt={(p) => spots.push(p)} />,
    );
    fireEvent.pointerDown(container.querySelector("canvas")!, { clientX: 50, clientY: 25, pointerId: 1, button: 0 });
    expect(spots).toEqual([{ x: 200, y: 100 }]);
  });

  test("comment mode reports a normalised region, a click is a point", () => {
    const regions: unknown[] = [];
    const { container } = render(<ImageEditorSurface {...base} mode="comment" onRegion={(r) => regions.push(r)} />);
    const canvas = container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 25, pointerId: 1, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 50, clientY: 25, pointerId: 1 });
    expect(regions).toEqual([{ x: 0.5, y: 0.5, width: 0, height: 0 }]);
  });

  test("mode none ignores the pointer", () => {
    const strokes: Stroke[] = [];
    const { container } = render(<ImageEditorSurface {...base} mode="none" onStroke={(s) => strokes.push(s)} />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas.style.pointerEvents).toBe("none");
    fireEvent.pointerDown(canvas, { clientX: 25, clientY: 25, pointerId: 1, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 25, clientY: 25, pointerId: 1 });
    expect(strokes).toHaveLength(0);
  });

  test("erase mode shows a brush the size of the brush at the current zoom", () => {
    const { container } = render(<ImageEditorSurface {...base} scale={0.5} brushPx={40} mode="erase" />);
    const canvas = container.querySelector("canvas")!;
    expect(container.querySelector('[data-slot="image-editor-brush"]')).toBeNull();
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20, pointerId: 1 });
    const brush = container.querySelector<HTMLElement>('[data-slot="image-editor-brush"]')!;
    expect(brush.style.width).toBe("20px");
    expect(brush.style.height).toBe("20px");
    expect(canvas.style.opacity).toBe("0.5");
  });
});

describe("drawing and export", () => {
  test("drawStrokes covers each kind", () => {
    const kinds: Stroke[] = [
      { kind: "pen", points: [{ x: 1, y: 1 }, { x: 5, y: 5 }], size: 3, color: "red" },
      { kind: "highlighter", points: [{ x: 1, y: 1 }], size: 3, color: "red" },
      { kind: "arrow", from: { x: 0, y: 0 }, to: { x: 40, y: 0 }, size: 3, color: "red" },
      { kind: "rectangle", from: { x: 0, y: 0 }, to: { x: 40, y: 20 }, size: 3, color: "red" },
      { kind: "ellipse", from: { x: 0, y: 0 }, to: { x: 40, y: 20 }, size: 3, color: "red" },
      { kind: "text", at: { x: 3, y: 3 }, text: "hi", size: 20, color: "red" },
    ];
    drawStrokes(fakeContext(calls), kinds, () => "red");
    const names = calls.map((c) => c[0]);
    for (const expected of ["stroke", "strokeRect", "ellipse", "fillText"]) expect(names).toContain(expected);
    expect(calls.filter((c) => c[0] === "save")).toHaveLength(6);
    expect(calls.filter((c) => c[0] === "restore")).toHaveLength(6);
  });

  test("the mask is black with white strokes at the picture's pixel size", async () => {
    const blob = await renderMaskPng([{ kind: "erase", points: [{ x: 5, y: 5 }], size: 20, color: "blue" }], { width: 640, height: 480 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe("image/png");
    const fills = calls.filter((c) => c[0] === "set:fillStyle").map((c) => c[1]);
    expect(fills[0]).toBe("#000");
    expect(calls.filter((c) => c[0] === "set:strokeStyle").every((c) => c[1] === "#fff")).toBe(true);
    expect(calls.find((c) => c[0] === "fillRect")).toEqual(["fillRect", 0, 0, 640, 480]);
  });

  test("markup export draws the picture, then the strokes, as a PNG", async () => {
    const blob = await renderMarkupPng(
      "https://example.test/p.png",
      [{ kind: "pen", points: [{ x: 1, y: 1 }], size: 3, color: "red" }],
      natural,
      () => "red",
    );
    expect(blob).toBeInstanceOf(Blob);
    const order = calls.map((c) => c[0]);
    expect(order.indexOf("drawImage")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("drawImage")).toBeLessThan(order.indexOf("stroke"));
    expect(calls.find((c) => c[0] === "drawImage")!.slice(2)).toEqual([0, 0, 400, 200]);
  });

  test("export without a canvas context returns null instead of throwing", async () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    expect(await renderMaskPng([], natural)).toBeNull();
    expect(await renderMarkupPng("x", [], natural, () => "red")).toBeNull();
  });
});

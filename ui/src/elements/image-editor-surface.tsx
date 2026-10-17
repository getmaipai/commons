"use client";

/**
 * The ImageEditor's one hand-drawn piece: a <canvas> laid over the picture.
 * It turns pointer events (mouse, touch, pen) into strokes in picture pixels,
 * draws them, and exports a mask or a flattened markup PNG. It carries no kit
 * styling: only the geometry and cursor the drawing itself needs. Everything
 * else in the editor is kit parts.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  PALETTE,
  arrowHeadPoints,
  clientToImage,
  isMeaningfulStroke,
  regionFromDrag,
  type MarkupTool,
  type Point,
  type Region,
  type Size,
  type Stroke,
} from "./image-editor-state";

export type SurfaceMode = "none" | "markup" | "erase" | "comment";

/** Longest side of the on-screen overlay bitmap; exports are always at the picture's own size. */
const OVERLAY_MAX = 4096;

/** A colour key to a CSS colour, read from the kit token on `el` so theme changes apply. */
export function resolveColor(key: string, el?: Element | null): string {
  const entry = PALETTE.find((color) => color.key === key);
  if (!entry || typeof getComputedStyle !== "function") return "currentColor";
  const target = el ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) return "currentColor";
  const value = getComputedStyle(target).getPropertyValue(entry.cssVar).trim();
  return value || "currentColor";
}

type Ctx = CanvasRenderingContext2D;

function drawFreehand(ctx: Ctx, points: readonly Point[], width: number) {
  const first = points[0];
  if (!first) return;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  if (points.length === 1) ctx.lineTo(first.x + 0.01, first.y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i]!.x, points[i]!.y);
  ctx.stroke();
}

/** Draw `strokes` onto `ctx` in picture pixels. `paint` overrides every stroke colour (mask export). */
export function drawStrokes(ctx: Ctx, strokes: readonly Stroke[], colorOf: (key: string) => string, paint?: string) {
  for (const stroke of strokes) {
    ctx.save();
    const color = paint ?? colorOf(stroke.color);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    switch (stroke.kind) {
      case "pen":
      case "erase":
        drawFreehand(ctx, stroke.points, stroke.size);
        break;
      case "highlighter":
        ctx.globalAlpha = 0.35;
        drawFreehand(ctx, stroke.points, stroke.size * 3);
        break;
      case "arrow": {
        ctx.lineWidth = stroke.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.from.x, stroke.from.y);
        ctx.lineTo(stroke.to.x, stroke.to.y);
        const [a, b] = arrowHeadPoints(stroke.from, stroke.to, stroke.size);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(stroke.to.x, stroke.to.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        break;
      }
      case "rectangle": {
        ctx.lineWidth = stroke.size;
        ctx.lineJoin = "round";
        ctx.strokeRect(
          Math.min(stroke.from.x, stroke.to.x),
          Math.min(stroke.from.y, stroke.to.y),
          Math.abs(stroke.to.x - stroke.from.x),
          Math.abs(stroke.to.y - stroke.from.y),
        );
        break;
      }
      case "ellipse": {
        ctx.lineWidth = stroke.size;
        ctx.beginPath();
        ctx.ellipse(
          (stroke.from.x + stroke.to.x) / 2,
          (stroke.from.y + stroke.to.y) / 2,
          Math.max(0.5, Math.abs(stroke.to.x - stroke.from.x) / 2),
          Math.max(0.5, Math.abs(stroke.to.y - stroke.from.y) / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        break;
      }
      case "text": {
        ctx.font = `${stroke.size}px system-ui, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(stroke.text, stroke.at.x, stroke.at.y);
        break;
      }
    }
    ctx.restore();
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

/** The erase mask: white strokes on black, exactly the picture's pixel size. */
export async function renderMaskPng(strokes: readonly Stroke[], natural: Size): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(natural.width));
  canvas.height = Math.max(1, Math.round(natural.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStrokes(ctx, strokes, () => "#fff", "#fff");
  return toBlob(canvas);
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The picture with the markup flattened on, at the picture's natural resolution. */
export async function renderMarkupPng(
  imageUrl: string,
  strokes: readonly Stroke[],
  natural: Size,
  colorOf: (key: string) => string,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const img = await loadImage(imageUrl);
  if (!img) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || Math.max(1, Math.round(natural.width));
  canvas.height = img.naturalHeight || Math.max(1, Math.round(natural.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  drawStrokes(ctx, strokes, colorOf);
  return toBlob(canvas);
}

export interface ImageEditorSurfaceProps {
  /** The picture's pixel size; stroke coordinates are in these pixels. */
  natural: Size;
  /** Zoom as a fraction (1 = 100 percent); sizes the brush preview. */
  scale: number;
  mode: SurfaceMode;
  markupTool: MarkupTool;
  /** Palette key from `PALETTE`. */
  color: string;
  /** Stroke width in picture pixels for markup shapes and pens. */
  strokePx: number;
  /** Brush width in picture pixels for erase. */
  brushPx: number;
  /** Strokes of the active layer (markup or erase mask). */
  strokes: readonly Stroke[];
  onStroke: (stroke: Stroke) => void;
  /** Text tool: a spot was chosen, in picture pixels. */
  onTextAt: (at: Point) => void;
  /** Comment tool: a point or rectangle was chosen, normalised. */
  onRegion: (region: Region) => void;
}

export function ImageEditorSurface({
  natural,
  scale,
  mode,
  markupTool,
  color,
  strokePx,
  brushPx,
  strokes,
  onStroke,
  onTextAt,
  onRegion,
}: ImageEditorSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftRef = useRef<{ start: Point; stroke: Stroke | null; pointerId: number } | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  const overlayScale = Math.min(1, OVERLAY_MAX / Math.max(natural.width, natural.height, 1));
  const bitmapW = Math.max(1, Math.round(natural.width * overlayScale));
  const bitmapH = Math.max(1, Math.round(natural.height * overlayScale));

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d") ?? null;
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(overlayScale, 0, 0, overlayScale, 0, 0);
    const colorOf = (key: string) => resolveColor(key, canvas);
    // The erase mask is drawn opaque on the bitmap and shown translucent by the canvas opacity.
    drawStrokes(ctx, strokes, mode === "erase" ? () => resolveColor("blue", canvas) : colorOf);
    const draft = draftRef.current?.stroke;
    if (draft) drawStrokes(ctx, [draft], mode === "erase" ? () => resolveColor("blue", canvas) : colorOf);
  }, [strokes, mode, overlayScale]);

  useEffect(() => {
    redraw();
  }, [redraw, bitmapW, bitmapH]);

  const pointOf = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clientToImage({ x: event.clientX, y: event.clientY }, rect, natural);
  };

  const strokeFor = (start: Point, now: Point, previous: Stroke | null): Stroke | null => {
    if (mode === "erase") {
      const points = previous && "points" in previous ? [...previous.points, now] : [start];
      return { kind: "erase", points, size: brushPx, color: "blue" };
    }
    if (mode === "comment") {
      return { kind: "rectangle", from: start, to: now, size: Math.max(2, Math.round(natural.width / 300)), color: "blue" };
    }
    switch (markupTool) {
      case "pen":
      case "highlighter": {
        const points = previous && "points" in previous ? [...previous.points, now] : [start];
        return { kind: markupTool, points, size: strokePx, color };
      }
      case "arrow":
      case "rectangle":
      case "ellipse":
        return { kind: markupTool, from: start, to: now, size: strokePx, color };
      default:
        return null;
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode === "none" || (event.pointerType === "mouse" && event.button !== 0)) return;
    const start = pointOf(event);
    if (mode === "markup" && markupTool === "text") {
      onTextAt(start);
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draftRef.current = { start, stroke: strokeFor(start, start, null), pointerId: event.pointerId };
    redraw();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode === "erase") {
      const rect = event.currentTarget.getBoundingClientRect();
      setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
    const draft = draftRef.current;
    if (!draft || draft.pointerId !== event.pointerId) return;
    draft.stroke = strokeFor(draft.start, pointOf(event), draft.stroke);
    redraw();
  };

  const finish = (event: ReactPointerEvent<HTMLCanvasElement>, commit: boolean) => {
    const draft = draftRef.current;
    if (!draft || draft.pointerId !== event.pointerId) return;
    draftRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (commit) {
      const end = pointOf(event);
      if (mode === "comment") {
        onRegion(regionFromDrag(draft.start, end, natural));
      } else {
        const stroke = strokeFor(draft.start, end, draft.stroke);
        if (stroke && isMeaningfulStroke(stroke)) onStroke(stroke);
      }
    }
    redraw();
  };

  const brushCss = Math.max(2, brushPx * scale);

  return (
    <div data-slot="image-editor-surface" data-mode={mode} className="absolute inset-0">
      {/* A drawing surface is pointer-only by nature; the keyboard routes to the same actions are the toolbar, the whole-picture comment and the resize fields. */}
      <canvas
        ref={canvasRef}
        width={bitmapW}
        height={bitmapH}
        aria-hidden="true"
        data-slot="image-editor-canvas"
        className="absolute inset-0 size-full"
        style={{
          touchAction: "none",
          cursor: mode === "none" ? "default" : mode === "erase" ? "none" : "crosshair",
          opacity: mode === "erase" ? 0.5 : 1,
          pointerEvents: mode === "none" ? "none" : "auto",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, true)}
        onPointerCancel={(event) => finish(event, false)}
        onPointerLeave={() => setCursor(null)}
      />
      {mode === "erase" && cursor ? (
        <div
          aria-hidden="true"
          data-slot="image-editor-brush"
          className="pointer-events-none absolute rounded-full border border-solid"
          style={{
            width: brushCss,
            height: brushCss,
            left: cursor.x - brushCss / 2,
            top: cursor.y - brushCss / 2,
            borderColor: "var(--primary)",
            backgroundColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        />
      ) : null}
    </div>
  );
}

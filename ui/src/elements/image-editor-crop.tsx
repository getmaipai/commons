"use client";

/**
 * The ImageEditor's crop frame (IMG-STUDIO-01): a rectangle over the picture with eight drag handles,
 * a dimmed outside and arrow-key nudging. It owns no state: the rectangle is a normalised region of the
 * (rotated) frame and every change goes out through `onChange`. Colours are kit tokens only.
 */

import { useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { i18n } from "@/kit/i18n";
import { dragCrop, type CropHandle, type Region, type Size } from "./image-editor-state";

const HANDLES: ReadonlyArray<{ handle: Exclude<CropHandle, "move">; style: CSSProperties; cursor: string }> = [
  { handle: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" },
  { handle: "n", style: { left: "50%", top: 0 }, cursor: "ns-resize" },
  { handle: "ne", style: { left: "100%", top: 0 }, cursor: "nesw-resize" },
  { handle: "e", style: { left: "100%", top: "50%" }, cursor: "ew-resize" },
  { handle: "se", style: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
  { handle: "s", style: { left: "50%", top: "100%" }, cursor: "ns-resize" },
  { handle: "sw", style: { left: 0, top: "100%" }, cursor: "nesw-resize" },
  { handle: "w", style: { left: 0, top: "50%" }, cursor: "ew-resize" },
];

export interface ImageEditorCropProps {
  rect: Region;
  /** Width over height in picture pixels, or null for Free. */
  ratio: number | null;
  /** The rotated frame in picture pixels (turns the ratio into fractions). */
  frame: Size;
  disabled?: boolean;
  onChange: (rect: Region) => void;
}

export function ImageEditorCrop({ rect, ratio, frame, disabled, onChange }: ImageEditorCropProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ handle: CropHandle; x: number; y: number; start: Region; pointerId: number } | null>(null);

  const begin = (handle: CropHandle) => (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { handle, x: event.clientX, y: event.clientY, start: rect, pointerId: event.pointerId };
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const box = boxRef.current?.parentElement?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !box || !(box.width > 0) || !(box.height > 0)) return;
    onChange(dragCrop(drag.start, drag.handle, (event.clientX - drag.x) / box.width, (event.clientY - drag.y) / box.height, ratio, frame));
  };
  const end = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;
    const step = 0.01;
    const arrow = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[event.key];
    if (!arrow) return;
    event.preventDefault();
    // Arrows move the frame; Shift + arrows resize it from its bottom right corner.
    onChange(dragCrop(rect, event.shiftKey ? "se" : "move", arrow[0], arrow[1], ratio, frame));
  };

  return (
    <div data-slot="image-editor-crop" className="pointer-events-none absolute inset-0">
      <div
        ref={boxRef}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label={i18n._({ id: "ui.Crop frame. Arrow keys move it, Shift and arrow keys resize it.", message: "Crop frame. Arrow keys move it, Shift and arrow keys resize it." })}
        data-slot="image-editor-crop-frame"
        className="border-primary focus-visible:ring-ring/50 pointer-events-auto absolute border-2 outline-none focus-visible:ring-[3px]"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.width * 100}%`,
          height: `${rect.height * 100}%`,
          boxShadow: "0 0 0 9999px color-mix(in srgb, var(--background) 62%, transparent)",
          cursor: "move",
          touchAction: "none",
        }}
        onPointerDown={begin("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
      >
        {/* Rule-of-thirds lines. */}
        <div aria-hidden className="border-primary/40 pointer-events-none absolute inset-y-0 left-1/3 w-1/3 border-x" />
        <div aria-hidden className="border-primary/40 pointer-events-none absolute inset-x-0 top-1/3 h-1/3 border-y" />
        {HANDLES.map(({ handle, style, cursor }) => (
          <span
            key={handle}
            data-handle={handle}
            aria-hidden
            // A 44 px touch target around a small visible knob.
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ ...style, cursor, touchAction: "none" }}
            onPointerDown={begin(handle)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <span className="bg-primary border-background size-3 rounded-full border" />
          </span>
        ))}
      </div>
    </div>
  );
}

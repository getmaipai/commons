"use client";

/**
 * The ImageEditor's before and after view (IMG-STUDIO-01): the original under the current picture, split by a
 * divider the person drags (or moves with the arrow keys). Two images and one slider; tokens only.
 */

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { MoveHorizontalIcon } from "lucide-react";
import { SafeImage } from "../primitives/SafeImage";
import { i18n } from "@/kit/i18n";

export interface ImageEditorCompareProps {
  beforeUrl: string;
  afterUrl: string;
  alt: string;
}

export function ImageEditorCompare({ beforeUrl, afterUrl, alt }: ImageEditorCompareProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(50);
  const dragging = useRef<number | null>(null);

  const place = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || !(rect.width > 0)) return;
    setAt(Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100))));
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragging.current = event.pointerId;
    place(event.clientX);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current === event.pointerId) place(event.clientX);
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current !== event.pointerId) return;
    dragging.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const key = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") setAt((v) => Math.max(0, v - step));
    else if (event.key === "ArrowRight") setAt((v) => Math.min(100, v + step));
    else if (event.key === "Home") setAt(0);
    else if (event.key === "End") setAt(100);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      data-slot="image-editor-compare"
      className="absolute inset-0 select-none"
      style={{ touchAction: "none", cursor: "ew-resize" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <SafeImage src={beforeUrl} alt={i18n._({ id: "ui.Original picture", message: "Original picture" })} draggable={false} className="pointer-events-none absolute inset-0 size-full" />
      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 0 0 ${at}%)` }} data-slot="image-editor-compare-after">
        <SafeImage src={afterUrl} alt={alt} draggable={false} className="absolute inset-0 size-full" />
      </div>
      <span className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 left-2 rounded-full border px-2 py-0.5 text-xs">{i18n._({ id: "ui.Before", message: "Before" })}</span>
      <span className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 right-2 rounded-full border px-2 py-0.5 text-xs">{i18n._({ id: "ui.After", message: "After" })}</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={i18n._({ id: "ui.Before and after divider", message: "Before and after divider" })}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={at}
        data-slot="image-editor-compare-handle"
        className="focus-visible:ring-ring/50 absolute inset-y-0 -translate-x-1/2 outline-none focus-visible:ring-[3px]"
        style={{ left: `${at}%`, width: 44 }}
        onKeyDown={key}
      >
        <span className="bg-primary pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" />
        <span className="bg-primary text-primary-foreground pointer-events-none absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md">
          <MoveHorizontalIcon aria-hidden className="size-4" />
        </span>
      </div>
    </div>
  );
}

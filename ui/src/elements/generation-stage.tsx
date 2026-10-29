"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "cn";
import { paper } from "./surfaces";
import { SafeImage, type ImageFallbackKind } from "../primitives/SafeImage";

const DOTS = Array.from({ length: 64 }, (_, i) => i);

/** The blur, in pixels, of a preview taken after `step` of `steps` steps: heavy early, none on the last step. */
export function previewBlur(step: number | undefined, steps: number | undefined): number {
  if (!step || !steps || steps <= 0) return 0;
  return Math.max(0, Math.round((1 - Math.min(1, step / steps)) * 10));
}

/**
 * The newest preview that has finished loading. A new `src` is fetched in the background and swapped in once it is
 * ready, so the picture never blinks to empty between steps; `visible` turns true one frame after the first one
 * arrives so the placeholder cross-fades into it.
 */
function useLoadedPreview(src: string | undefined): { shown: string | undefined; visible: boolean } {
  const [shown, setShown] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!src) {
      setShown(undefined);
      setVisible(false);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setShown(src);
    };
    probe.onerror = () => {
      if (!cancelled) setShown(src);
    };
    probe.src = src;
    return () => {
      cancelled = true;
      probe.onload = null;
    };
  }, [src]);
  useEffect(() => {
    if (!shown) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [shown]);
  return { shown, visible };
}

/**
 * The picture area of a generation card: the dotted shimmer while nothing has been drawn, and the engine's latest
 * preview cross-fading in over it (blurred early, sharper with each step). Used by ImageGeneration and VideoPlayer.
 * Every source and size is a prop; nothing here reaches the network.
 */
export function GenerationStage({
  generating,
  previewSrc,
  previewStep,
  steps,
  previewAlt,
  fallbackKind,
  showPreviewWhenSettled = false,
  aspectRatio = "1 / 1",
  className,
  children,
  underlay,
  shape = "card",
  caption,
}: {
  generating: boolean;
  previewSrc?: string;
  /** The step the preview shows, out of `steps`; unset means a settled frame with no blur. */
  previewStep?: number;
  steps?: number;
  /** Alternative text for a settled image; previews are decorative when omitted. */
  previewAlt?: string;
  fallbackKind?: ImageFallbackKind;
  /** Keep the final preview visible after generation completes. */
  showPreviewWhenSettled?: boolean;
  /** CSS aspect-ratio of the area, "1 / 1" or "16 / 9". */
  aspectRatio?: string;
  className?: string;
  /** Drawn above the shimmer and the preview (size mark, caption, progress). */
  children?: ReactNode;
  /** Drawn between the shimmer and the preview (the finished-picture placeholder). */
  underlay?: ReactNode;
  /** "panel" (KIT-3S-01) is the large soft-cornered preview panel of the companion flow, with a theme-token frame. Default "card" is unchanged. */
  shape?: "card" | "panel";
  /** A short line drawn along the bottom edge over the picture (the animation preview's caption). */
  caption?: ReactNode;
}) {
  const { shown, visible } = useLoadedPreview(generating || showPreviewWhenSettled ? previewSrc : undefined);
  const blur = previewBlur(previewStep, steps);
  const style: CSSProperties = { aspectRatio };
  return (
    <div data-slot="generation-stage" data-shape={shape === "panel" ? "panel" : undefined} data-preview={shown ? "true" : undefined} className={cn(paper, "relative w-full overflow-hidden", shape === "panel" ? "rounded-3xl bg-muted/40 dark:bg-muted/40" : "rounded-2xl", className)} style={style}>
      <div
        className={cn("absolute inset-0 grid grid-cols-8 place-items-center p-6 transition-opacity duration-700 motion-reduce:transition-none", shown && visible && "opacity-0")}
        aria-hidden
      >
        {DOTS.map((dot) => {
          const row = Math.floor(dot / 8);
          const col = dot % 8;
          return (
            <span
              key={dot}
              className={cn("bg-foreground/20 size-1 rounded-full transition-opacity duration-500", generating ? "animate-pulse motion-reduce:animate-none" : "opacity-0")}
              style={{ animationDelay: `${(row + col) * 90}ms` }}
            />
          );
        })}
      </div>
      {underlay}
      {shown ? (
        <SafeImage
          data-slot="generation-preview"
          data-blur={blur}
          src={shown}
          alt={previewAlt ?? ""}
          aria-hidden={previewAlt ? undefined : true}
          kind={fallbackKind}
          draggable={false}
          className={cn("absolute inset-0 size-full object-cover transition-[opacity,filter,transform] duration-700 ease-out motion-reduce:transition-none", visible ? "opacity-100" : "opacity-0", blur > 0 && "scale-105")}
          style={{ filter: blur > 0 ? `blur(${blur}px)` : undefined }}
        />
      ) : null}
      {children}
      {caption ? <div data-slot="generation-caption" className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-4 pb-3 pt-8 text-center text-sm text-foreground">{caption}</div> : null}
    </div>
  );
}

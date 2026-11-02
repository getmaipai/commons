"use client";

import { useEffect, useRef, useState } from "react";
import { RadioGroup } from "radix-ui";
import { cn } from "cn";
import { SafeImage } from "../primitives/SafeImage";

export interface OptionCard {
  value: string | number;
  label: string;
  /** A resolved address of a short silent mp4 loop, or an image (png, jpg, webp, svg). Absent: a plain tile with the label. */
  media?: string;
}

export interface OptionCardsProps {
  /** Names the group for assistive tech. */
  label: string;
  options: readonly OptionCard[];
  value: string | number;
  onValueChange: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
  /** Stamped on the group as `data-chip` so a screen can find it. */
  chipId?: string;
  /** VIDEO-UI-03: `grid` draws three cards to a row at every width (the prompt bar's bottom sheet) instead of the default sideways scroll on a phone. */
  columns?: "auto" | "three";
}

function useMatches(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

const isVideo = (src: string) => /\.(mp4|m4v|webm)(\?|#|$)/i.test(src);

function play(el: HTMLVideoElement | null) {
  try { void el?.play?.()?.catch?.(() => {}); } catch { /* a refused play leaves the first frame showing */ }
}
function rewind(el: HTMLVideoElement | null) {
  if (!el) return;
  try { el.pause?.(); el.currentTime = 0; } catch { /* nothing to rewind yet */ }
}

/** One card's picture: a muted, looped, inline video that plays on hover on a wide pointer screen and while in view on a phone,
 * and shows its first frame under reduced motion; or an image. */
function CardMedia({ src, hovered, wide, reduced }: { src: string; hovered: boolean; wide: boolean; reduced: boolean }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el || wide || reduced || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { for (const e of entries) setInView(e.isIntersecting); }, { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [wide, reduced, src]);
  const playing = !reduced && (wide ? hovered : inView);
  useEffect(() => { if (playing) play(video.current); else rewind(video.current); }, [playing]);
  if (!isVideo(src)) return <SafeImage src={src} alt="" draggable={false} className="size-full object-cover" />;
  return (
    <video
      ref={(el) => { video.current = el; if (el) { el.muted = true; el.defaultMuted = true; } }}
      src={`${src}#t=0.001`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      className="size-full object-cover"
    />
  );
}

/** A still thumbnail of a card's picture or the first frame of its loop, for a control that shows the current choice (the prompt bar's Style trigger). Never plays. */
export function OptionThumb({ src, className }: { src: string; className?: string }) {
  if (!isVideo(src)) return <SafeImage src={src} alt="" draggable={false} className={cn("size-full object-cover", className)} />;
  return <video src={`${src}#t=0.001`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className={cn("size-full object-cover", className)} />;
}

/** A grid of picture cards that chooses one value: a radio group (arrow keys move the choice, Space or Enter selects), the chosen card
 * drawn with the theme's primary border, a visible focus ring, and the grid scrolling sideways on a phone. */
export function OptionCards({ label, options, value, onValueChange, disabled = false, className, chipId, columns = "auto" }: OptionCardsProps) {
  const wide = useMatches("(hover: hover) and (min-width: 640px)");
  const reduced = useMatches("(prefers-reduced-motion: reduce)");
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <RadioGroup.Root
      data-slot="option-cards"
      data-chip={chipId}
      aria-label={label}
      disabled={disabled}
      value={String(value)}
      orientation="horizontal"
      onValueChange={(next) => {
        const picked = options.find((o) => String(o.value) === next);
        if (picked) onValueChange(picked.value);
      }}
      className={cn(columns === "three" ? "grid min-w-0 grid-cols-3 gap-3" : "flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:snap-none sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] sm:overflow-visible", className)}
    >
      {options.map((option) => {
        const key = String(option.value);
        return (
          <RadioGroup.Item
            key={key}
            value={key}
            aria-label={option.label}
            data-slot="option-card"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onValueChange(option.value); } }}
            className={cn("group flex min-h-[48px] shrink-0 flex-col overflow-hidden rounded-lg border-2 border-border bg-card text-left text-card-foreground outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 data-[state=checked]:border-primary", columns === "three" ? "w-auto min-w-0" : "w-36 snap-start sm:w-auto")}
          >
            <span className="flex aspect-video w-full items-center justify-center bg-muted">
              {option.media ? <CardMedia src={option.media} hovered={hovered === key} wide={wide} reduced={reduced} /> : null}
            </span>
            <span className="truncate px-2 py-1.5 text-sm font-medium">{option.label}</span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}

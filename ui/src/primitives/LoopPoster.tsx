"use client";

import { useEffect, useRef, useState } from "react";
import { SafeImage, type ImageFallbackKind } from "./SafeImage";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/**
 * VIDEO-UI-14 (item 8, `media_shelf.media_loop`): a poster with a muted, looped clip over it. The poster is always drawn, so a
 * tile is never empty while the clip loads or when it cannot play. The clip plays only while the tile is in view (paused and
 * rewound off screen) and not at all under reduced motion, which shows the poster and does not even fetch the clip. Fills its
 * box (`size-full`); the shelf gives that box its aspect ratio. Same behaviour as the Look and Camera cards (`option-cards`).
 */
export function LoopPoster({ poster, loop, kind = "video", className }: { poster?: string | null; loop?: string | null; kind?: ImageFallbackKind; className?: string }) {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [showing, setShowing] = useState(false);
  const active = Boolean(loop) && !reduced;
  useEffect(() => {
    const el = video.current;
    if (!el || !active || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { for (const e of entries) setInView(e.isIntersecting); }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, loop]);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && inView) {
      try { void el.play?.()?.catch?.(() => {}); } catch { /* a refused play leaves the poster showing */ }
    } else {
      try { el.pause?.(); el.currentTime = 0; } catch { /* nothing to rewind yet */ }
      setShowing(false);
    }
  }, [active, inView]);
  return (
    <>
      <SafeImage src={poster ?? null} kind={kind} alt="" className={className ?? "h-full w-full object-cover"} />
      {active ? (
        <video
          ref={(el) => { video.current = el; if (el) { el.muted = true; el.defaultMuted = true; } }}
          data-slot="loop-poster-video"
          data-playing={showing ? "true" : "false"}
          src={loop ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setShowing(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${showing ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </>
  );
}

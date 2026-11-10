"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HeartIcon, PlayIcon, Volume2Icon, VolumeXIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { i18n } from "@/kit/i18n";
import { Button } from "@/kit/ui/button";
import { Slider } from "@/kit/ui/slider";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/kit/ui/carousel";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { LIKE_POP_CLASS, likeHaptic, useLikePop } from "@/kit/primitives/likeFeedback";
import { VideoPlayer } from "./video-player";

/** One clip of the feed. */
export interface ClipFeedClip {
  id: string;
  src: string;
  poster: string;
  title: string;
  subtitle?: string;
  durationS: number;
  liked?: boolean;
}

/** The words the feed draws; each defaults to the kit's catalog text. */
export interface ClipFeedCopy {
  close?: string;
  mute?: string;
  unmute?: string;
  play?: string;
  pause?: string;
  like?: string;
  remake?: string;
  seek?: string;
}

const defaultCopy = (): Required<ClipFeedCopy> => ({
  close: i18n._({ id: "ui.Close", message: "Close" }),
  mute: i18n._({ id: "ui.Mute", message: "Mute" }),
  unmute: i18n._({ id: "ui.Unmute", message: "Unmute" }),
  play: i18n._({ id: "ui.Play", message: "Play" }),
  pause: i18n._({ id: "ui.Pause", message: "Pause" }),
  like: i18n._({ id: "ui.Like", message: "Like" }),
  remake: i18n._({ id: "ui.Make another", message: "Make another" }),
  seek: i18n._({ id: "ui.Seek", message: "Seek" }),
});

export interface ClipFeedProps {
  clips: readonly ClipFeedClip[];
  /** The clip to open on; absent or not found opens the first. */
  startId?: string;
  /** False: nothing plays or advances by itself (poster and a Play button), the setting for a child band. Reduced motion does the same. */
  autoplay?: boolean;
  /** Always drawn: the way out of the immersive screen. */
  onClose: () => void;
  /** Absent: no Like button. Receives the new liked value. */
  onLike?: (clip: ClipFeedClip, liked: boolean) => void;
  /** Absent: no Make another button. */
  onRemake?: (clip: ClipFeedClip) => void;
  /** While set, Make another is disabled and this line shows (the host's making notice). */
  remakeNotice?: string;
  /** The status card for a feed with no clips. */
  empty: ReactNode;
  copy?: ClipFeedCopy;
  className?: string;
}

/** The person's mute choice, kept per browser. Muted unless they unmuted. */
export const CLIP_FEED_MUTE_KEY = "maipai.clips.muted";

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(CLIP_FEED_MUTE_KEY) !== "0";
  } catch {
    return true;
  }
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useTabVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

const RAIL_BUTTON = "size-12 rounded-full bg-[var(--art-overlay)] text-[var(--art-foreground)] backdrop-blur-sm hover:bg-[var(--art-overlay)] hover:text-[var(--art-foreground)]";
const WHEEL_LOCK_MS = 500;

/**
 * CLIPS-FEED-01: a full-screen vertical feed of short clips, one per screen. It is a composition of the shipped parts: the
 * carousel in its vertical orientation snaps the column and the `VideoPlayer` Element draws each loaded clip (`bare`).
 * The visible clip and the next one are loaded; every other clip is its poster only, so a long feed holds two videos.
 */
export function ClipFeed({ clips, startId, autoplay = true, onClose, onLike, onRemake, remakeNotice, empty, copy, className }: ClipFeedProps) {
  const text = { ...defaultCopy(), ...copy };
  const reducedMotion = useReducedMotion();
  const tabVisible = useTabVisible();
  const mayAutoplay = autoplay && !reducedMotion;
  const startIndex = Math.max(0, clips.findIndex((clip) => clip.id === startId));
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(readMuted);
  const [wantPlay, setWantPlay] = useState(mayAutoplay);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [likedNow, setLikedNow] = useState<Record<string, boolean>>({});
  const [time, setTime] = useState({ t: 0, d: 0 });
  const [mountTick, setMountTick] = useState(0);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const wheelLock = useRef(false);

  // The carousel tells us which clip is in front; each new clip starts as the person's setting allows.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActive(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => { api.off("select", onSelect); api.off("reInit", onSelect); };
  }, [api]);
  const activeClip = clips[active] ?? clips[0];
  const activeId = activeClip?.id;
  useEffect(() => {
    setWantPlay(mayAutoplay);
    setTime({ t: 0, d: 0 });
  }, [activeId, mayAutoplay]);

  // Exactly one clip plays: the visible one, while the tab is shown and the person has not paused it.
  useEffect(() => {
    for (const [id, el] of videos.current) {
      if (id === activeId && wantPlay && tabVisible && !failed.has(id)) {
        el.muted = muted;
        try {
          const started = el.play();
          started?.catch?.(() => {
            // The browser refused (for example sound before a tap): fall back to muted, else wait for the Play button.
            if (!el.muted) { el.muted = true; setMuted(true); void el.play()?.catch?.(() => setWantPlay(false)); }
            else setWantPlay(false);
          });
        } catch {
          setWantPlay(false);
        }
      } else {
        try { el.pause(); } catch { /* nothing to pause */ }
      }
    }
  }, [activeId, wantPlay, tabVisible, muted, failed, mountTick]);

  // The progress bar follows the visible clip.
  useEffect(() => {
    const el = activeId ? videos.current.get(activeId) : undefined;
    if (!el) return;
    const update = () => setTime({ t: el.currentTime || 0, d: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0 });
    update();
    el.addEventListener("timeupdate", update);
    el.addEventListener("loadedmetadata", update);
    return () => { el.removeEventListener("timeupdate", update); el.removeEventListener("loadedmetadata", update); };
  }, [activeId, mountTick]);

  // The Element hands its ref over on every render (a new function each time), so only a different element counts as news;
  // elements that left the page are dropped when the effects next run.
  const register = useCallback((id: string) => (el: HTMLVideoElement | null) => {
    if (!el || videos.current.get(id) === el) return;
    videos.current.set(id, el);
    setMountTick((n) => n + 1);
  }, []);
  useEffect(() => {
    for (const [id, el] of videos.current) if (!el.isConnected) videos.current.delete(id);
  }, [mountTick, active]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { window.localStorage.setItem(CLIP_FEED_MUTE_KEY, next ? "1" : "0"); } catch { /* the choice lasts for this visit */ }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); api?.scrollNext(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); api?.scrollPrev(); }
    else if (event.key === " " && event.target === event.currentTarget) { event.preventDefault(); setWantPlay((v) => !v); }
  };
  const onWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) < 30 || wheelLock.current) return;
    wheelLock.current = true;
    window.setTimeout(() => { wheelLock.current = false; }, WHEEL_LOCK_MS);
    if (event.deltaY > 0) api?.scrollNext(); else api?.scrollPrev();
  };

  const frame = cn(
    "relative isolate flex w-full flex-col overflow-hidden bg-background text-[var(--art-foreground)]",
    "h-[calc(100dvh-var(--phone-header-height,0px)-var(--phone-nav-offset,0px))] sm:h-[calc(100dvh-4rem)]",
    className,
  );
  const closeButton = (
    <Button type="button" variant="ghost" size="icon" data-slot="clip-feed-close" aria-label={text.close} onClick={onClose} className={cn(RAIL_BUTTON, "absolute start-3 top-3 z-20")}>
      <XIcon aria-hidden />
    </Button>
  );

  if (clips.length === 0) {
    return (
      <section data-slot="clip-feed" data-state="empty" aria-label={i18n._({ id: "ui.Clips", message: "Clips" })} className={cn(frame, "items-center justify-center text-foreground")}>
        {closeButton}
        {empty}
      </section>
    );
  }

  return (
    <section data-slot="clip-feed" aria-label={i18n._({ id: "ui.Clips", message: "Clips" })} className={frame} onKeyDown={onKeyDown} onWheel={onWheel}>
      <Carousel
        orientation="vertical"
        opts={{ startIndex, align: "start", loop: false, containScroll: false }}
        setApi={setApi}
        className="size-full [&>[data-slot=carousel-content]]:size-full"
      >
        <CarouselContent className="mt-0 size-full">
          {clips.map((clip, index) => {
            const isActive = index === active;
            const loaded = (isActive || index === active + 1) && !failed.has(clip.id);
            const liked = likedNow[clip.id] ?? clip.liked ?? false;
            return (
              <CarouselItem key={clip.id} aria-label={i18n._({ id: "ui.Clip {n} of {total}", message: "Clip {n} of {total}", values: { n: index + 1, total: clips.length } })} className="size-full min-h-0 pt-0">
                <div data-slot="clip-feed-stage" data-active={isActive ? "true" : "false"} className="relative mx-auto size-full overflow-hidden bg-muted sm:aspect-[9/16] sm:h-full sm:w-auto sm:max-w-full">
                  {loaded ? (
                    <VideoPlayer
                      bare
                      status="ready"
                      prompt={clip.title}
                      src={clip.src}
                      poster={clip.poster}
                      muted={muted}
                      preload="auto"
                      loop
                      mediaRef={register(clip.id)}
                      onMediaError={() => setFailed((prev) => new Set(prev).add(clip.id))}
                    />
                  ) : (
                    <SafeImage src={clip.poster} alt="" kind="video" className="size-full object-cover" />
                  )}
                  {isActive ? (
                    <button
                      type="button"
                      data-slot="clip-feed-tap"
                      aria-label={wantPlay ? text.pause : text.play}
                      onClick={() => setWantPlay((v) => !v)}
                      className="absolute inset-0 z-0 cursor-pointer focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    />
                  ) : null}
                  {isActive && !wantPlay && !failed.has(clip.id) ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <Button type="button" variant="ghost" size="icon" data-slot="clip-feed-play" aria-label={text.play} onClick={() => setWantPlay(true)} className={cn(RAIL_BUTTON, "pointer-events-auto size-16")}>
                        <PlayIcon aria-hidden className="size-8 fill-current" />
                      </Button>
                    </div>
                  ) : null}
                  <div data-slot="clip-feed-scrim" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 px-4 pt-16 pe-20 pb-6" style={{ backgroundImage: "var(--art-scrim)" }}>
                    <h2 className="text-lg font-semibold break-words">{clip.title}</h2>
                    {clip.subtitle ? <p className="text-base text-[var(--art-foreground-muted)]">{clip.subtitle}</p> : null}
                    {isActive && remakeNotice && onRemake ? <p role="status" data-slot="clip-feed-notice" className="text-sm text-[var(--art-foreground-muted)]">{remakeNotice}</p> : null}
                  </div>
                  {isActive ? (
                    <div data-slot="clip-feed-rail" className="absolute end-3 bottom-24 z-20 flex flex-col items-center gap-3">
                      {onLike ? <LikeButton label={text.like} liked={liked} onToggle={() => { const next = !liked; setLikedNow((prev) => ({ ...prev, [clip.id]: next })); onLike(clip, next); }} /> : null}
                      {onRemake ? (
                        <Button type="button" variant="ghost" size="icon" data-slot="clip-feed-remake" aria-label={text.remake} title={remakeNotice ?? text.remake} disabled={Boolean(remakeNotice)} onClick={() => onRemake(clip)} className={RAIL_BUTTON}>
                          <WandSparklesIcon aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {isActive ? (
                    <div data-slot="clip-feed-progress" className="absolute inset-x-0 bottom-0 z-20 px-2">
                      <Slider
                        aria-label={text.seek}
                        min={0}
                        max={Math.max(1, time.d || clip.durationS)}
                        step={0.1}
                        value={[Math.min(time.t, Math.max(1, time.d || clip.durationS))]}
                        onValueChange={([value]) => {
                          const el = videos.current.get(clip.id);
                          if (el && value !== undefined) { el.currentTime = value; setTime((prev) => ({ ...prev, t: value })); }
                        }}
                        className="h-4 [&_[data-slot=slider-track]]:h-0.5"
                      />
                    </div>
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      {closeButton}
      <Button type="button" variant="ghost" size="icon" data-slot="clip-feed-mute" aria-pressed={muted} aria-label={muted ? text.unmute : text.mute} onClick={toggleMute} className={cn(RAIL_BUTTON, "absolute end-3 top-3 z-20")}>
        {muted ? <VolumeXIcon aria-hidden /> : <Volume2Icon aria-hidden />}
      </Button>
    </section>
  );
}

function LikeButton({ label, liked, onToggle }: { label: string; liked: boolean; onToggle: () => void }) {
  const pops = useLikePop(liked);
  return (
    <Button type="button" variant="ghost" size="icon" data-slot="clip-feed-like" aria-pressed={liked} aria-label={label} onClick={() => { if (!liked) likeHaptic(); onToggle(); }} className={RAIL_BUTTON}>
      <HeartIcon key={pops} aria-hidden className={cn(liked && "fill-current", liked && pops > 0 && LIKE_POP_CLASS)} />
    </Button>
  );
}

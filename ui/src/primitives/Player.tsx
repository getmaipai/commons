import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  MediaAirplayButton,
  MediaCaptionsButton,
  MediaCastButton,
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaMuteButton,
  MediaPipButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import { getIcon } from "@/kit/icons";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { Button } from "@/kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/kit/ui/dropdown-menu";
import { cn } from "@/kit/utils";
import {
  ARROW_SEEK_S,
  chapterIndexAt,
  chaptersToVtt,
  clampTime,
  formatTime,
  HOLD_MS,
  HOLD_RATE,
  normalizeChapters,
  PLAYBACK_RATES,
  PROGRESS_INTERVAL_MS,
  PULL_DOCK_PX,
  RESUME_LINE_MS,
  shouldResume,
  skipOffer,
  TAP_CHAIN_MS,
  TapChain,
  tapZone,
  type PlayerChapter,
  type ProgressReason,
} from "@/kit/primitives/playerLogic";

export type { PlayerChapter, ProgressReason } from "@/kit/primitives/playerLogic";

/** A captions or subtitles track (WebVTT). */
export interface PlayerTextTrack {
  src: string;
  srclang: string;
  label: string;
  kind?: "subtitles" | "captions";
  default?: boolean;
}

/** What plays after this item. */
export interface PlayerUpNext {
  id: string;
  title: string;
  subtitle?: string;
  art?: string;
}

/** Media Session metadata. When left out it is built from `title`, `subtitle` and `poster`. */
export interface PlayerMetadata {
  title: string;
  artist?: string;
  album?: string;
  artwork?: Array<{ src: string; sizes?: string; type?: string }>;
}

/** One progress report: where playback is, why it was sent, and whether the item finished. */
export interface PlayerProgress {
  position_s: number;
  duration_s: number;
  reason: ProgressReason;
  completed: boolean;
}

/** Every word the Player says, so a kid-mode or translated copy can replace them. */
export interface PlayerCopy {
  play: string;
  pause: string;
  back: (s: number) => string;
  ahead: (s: number) => string;
  speed: string;
  chapters: string;
  captions: string;
  pip: string;
  fullscreen: string;
  mute: string;
  cast: string;
  dock: string;
  expand: string;
  previous: string;
  next: string;
  resumedFrom: (time: string) => string;
  startOver: string;
  skipIntro: string;
  skipCredits: string;
  upNext: string;
  upNextIn: (s: number) => string;
  playNow: string;
  cancel: string;
  holdSpeed: string;
}

export const DEFAULT_PLAYER_COPY: PlayerCopy = {
  play: "Play",
  pause: "Pause",
  back: (s) => `Back ${s} seconds`,
  ahead: (s) => `Ahead ${s} seconds`,
  speed: "Playback speed",
  chapters: "Chapters",
  captions: "Captions",
  pip: "Picture in picture",
  fullscreen: "Full screen",
  mute: "Mute",
  cast: "Play on another screen",
  dock: "Shrink the player",
  expand: "Open the player",
  previous: "Previous",
  next: "Next",
  resumedFrom: (time) => `Resuming from ${time}`,
  startOver: "Start over",
  skipIntro: "Skip intro",
  skipCredits: "Skip credits",
  upNext: "Up next",
  upNextIn: (s) => `Up next in ${s}`,
  playNow: "Play now",
  cancel: "Cancel",
  holdSpeed: "2x speed",
};

export type PlayerLayout = "video" | "audio" | "mini";

export interface PlayerProps {
  /** The media address (a hub file route). */
  src: string;
  /** The element that plays it. Kept across layout changes, so docking to `mini` never restarts playback. */
  kind?: "video" | "audio";
  /** `video`: the picture with controls over it. `audio`: art, title and controls (Now playing). `mini`: the docked bar. */
  layout?: PlayerLayout;
  /** Audio artwork and controls may respond to the player's own width instead of the viewport. */
  audioLayout?: "viewport" | "container";
  /** MIME type of `src`, when the address does not say it. */
  type?: string;
  title: string;
  subtitle?: string;
  /** The video poster, or the art for audio and the mini bar. */
  poster?: string;
  /** Alternative text for audio artwork. Decorative by default. */
  posterAlt?: string;
  chapters?: readonly PlayerChapter[];
  /** A storyboard WebVTT (sprite `#xywh=` cues) for preview thumbnails on the time range. */
  thumbnails?: string;
  captions?: readonly PlayerTextTrack[];
  /** Stored position in seconds. Playback opens there with the resume line, unless `completed`. */
  resumeFrom?: number;
  completed?: boolean;
  upNext?: PlayerUpNext;
  /** Count down and play `upNext` when this item ends. Off by default and off in kid mode. */
  autoplayNext?: boolean;
  countdownSeconds?: number;
  autoPlay?: boolean;
  /** Playback rate to apply (the person's speed setting). Hold-for-2x never reports through onRateChange. */
  rate?: number;
  onRateChange?: (rate: number) => void;
  /** Every 10 s while playing, on pause, after a seek, at the end and on unload. */
  onProgress?: (progress: PlayerProgress) => void;
  onEnded?: () => void;
  /** Play the next item (the Up next card, the next-track button and the Media Session handler). */
  onNext?: (id?: string) => void;
  onPrevious?: () => void;
  /** Dock to the mini bar: the chevron, and pulling the picture down on touch. */
  onDock?: () => void;
  /** Leave the mini bar for the full player. */
  onExpand?: () => void;
  /** Extra cast targets (the household's screens), drawn beside the browser's own cast and AirPlay buttons. */
  castSlot?: ReactNode;
  /** Extra controls in the audio and mini layouts (shuffle, sleep timer, like). */
  actionsSlot?: ReactNode;
  /** Publish Media Session metadata and handlers. The shell's audio session may turn this off to own them. */
  mediaSession?: boolean;
  metadata?: PlayerMetadata;
  copy?: Partial<PlayerCopy>;
  mediaRef?: Ref<HTMLMediaElement>;
  /** MEDIA-POLISH-01: a media element the host owns (Home's audio session), adopted while this Player is mounted
   * instead of one of its own. The Player moves it into its controls and, when it unmounts or changes layout, into
   * the kit's hidden parking spot, never out of the document, so playback carries on from a watch page to the
   * docked mini bar and back without a restart. The host sets nothing else: the Player keeps `src` and the poster
   * in step and listens to the element's events itself. */
  media?: HTMLMediaElement | null;
  /** MEDIA-POLISH-01: `dock` pins the mini layout to the bottom of the scrolling area it sits in, over the page with a
   * top border and a blurred card fill (the docked mini bar). Default `inline`. */
  placement?: "inline" | "dock";
}

/** MEDIA-POLISH-01: where a host-owned media element waits between Players: a hidden spot at the end of the body.
 * A media element moved out of the document pauses; moved here in the same task, it keeps playing. */
export function parkMedia(el: HTMLMediaElement): void {
  if (typeof document === "undefined") return;
  let spot = document.querySelector<HTMLElement>('[data-slot="player-parking"]');
  if (!spot) {
    spot = document.createElement("div");
    spot.setAttribute("data-slot", "player-parking");
    spot.hidden = true;
    document.body.appendChild(spot);
  }
  if (el.parentNode !== spot) spot.appendChild(el);
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref && typeof ref === "object") (ref as { current: T | null }).current = value;
}

function Icon({ name, className = "size-6", slot }: { name: string; className?: string; slot?: string }) {
  const Glyph = getIcon(name);
  // Slotted straight into a Media Chrome button, the svg takes its --media-button-icon-height. Media Chrome fills
  // slotted icons; lucide draws with strokes, so only play and pause keep a fill.
  return <Glyph slot={slot} className={cn(className, name === "play" || name === "pause" ? "fill-current" : "fill-none")} aria-hidden />;
}

// Media Chrome's own theme variables, set from kit tokens only (Kibo UI's video-player mapping, extended).
const MEDIA_VARS = {
  "--media-primary-color": "var(--art-foreground)",
  "--media-secondary-color": "transparent",
  "--media-text-color": "var(--art-foreground)",
  "--media-icon-color": "var(--art-foreground)",
  "--media-background-color": "var(--art-surface)",
  "--media-control-background": "transparent",
  "--media-control-hover-background": "color-mix(in srgb, var(--art-foreground) 14%, transparent)",
  "--media-font-family": "var(--font-sans)",
  "--media-font-size": "16px",
  "--media-range-bar-color": "var(--progress-accent)",
  "--media-range-thumb-background": "var(--progress-accent)",
  "--media-range-track-background": "var(--art-track)",
  "--media-time-range-buffered-color": "color-mix(in srgb, var(--art-foreground) 45%, transparent)",
  "--media-control-height": "24px",
  "--media-button-icon-height": "24px",
  "--media-button-padding": "12px",
  "--media-preview-thumbnail-border-radius": "var(--art-radius)",
  "--media-preview-time-border-radius": "var(--art-radius)",
  "--media-tooltip-display": "none",
} as CSSProperties;

// The centred play button over the picture: a round overlay disc (the mockup's), from tokens.
const BIG_PLAY = {
  "--media-control-background": "var(--art-overlay)",
  "--media-control-hover-background": "var(--art-overlay)",
  "--media-control-height": "40px",
  "--media-button-icon-height": "40px",
  "--media-button-padding": "20px",
} as CSSProperties;

// Now playing's main button: the page's text color as the disc (the mockup's white disc in the dark theme).
const BIG_PLAY_PAGE = {
  ...BIG_PLAY,
  "--media-control-background": "var(--foreground)",
  "--media-control-hover-background": "var(--foreground)",
  "--media-icon-color": "var(--background)",
  "--media-primary-color": "var(--background)",
  color: "var(--background)",
} as CSSProperties;

/** The kit media player: Media Chrome's controls and time range (chapter segments, storyboard previews), restyled by
 * tokens, plus the kit's rate and chapter menus, skip intro and credits, the resume line, the Up next countdown,
 * Media Session, FileTube's touch gestures and the keyboard (space, arrows 5 s, f, m, c). */
export function Player(props: PlayerProps) {
  const {
    src,
    kind = "video",
    layout = kind === "audio" ? "audio" : "video",
    audioLayout = "viewport",
    type,
    title,
    subtitle,
    poster,
    posterAlt = "",
    thumbnails,
    captions = [],
    resumeFrom,
    completed = false,
    upNext,
    autoplayNext = false,
    countdownSeconds = 5,
    autoPlay = false,
    rate,
    onRateChange,
    onProgress,
    onEnded,
    onNext,
    onPrevious,
    onDock,
    onExpand,
    castSlot,
    actionsSlot,
    mediaSession = true,
    metadata,
    mediaRef,
    media: external = null,
    placement = "inline",
  } = props;
  const copy = useMemo(() => ({ ...DEFAULT_PLAYER_COPY, ...props.copy }), [props.copy]);
  const chapters = useMemo(() => normalizeChapters(props.chapters), [props.chapters]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLElement | null>(null);
  const media = useRef<HTMLMediaElement | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [playing, setPlaying] = useState(false);
  const [currentRate, setCurrentRate] = useState(rate ?? 1);
  const [resumeLine, setResumeLine] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [chaptersUrl, setChaptersUrl] = useState<string | null>(null);

  const attachMedia = useCallback(
    (el: HTMLMediaElement | null) => {
      // Kept after detach: the unmount's "unload" progress report still reads the last position.
      if (el) media.current = el;
      setRef(mediaRef, el);
    },
    [mediaRef],
  );

  // Fullscreen takes the Player root, so the kit's overlays and menus stay visible in it.
  useEffect(() => {
    const controller = controllerRef.current as (HTMLElement & { fullscreenElement?: HTMLElement }) | null;
    if (controller && rootRef.current) controller.fullscreenElement = rootRef.current;
  }, [layout]);

  // ---- progress ----
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const resumingRef = useRef(false);
  const startedRef = useRef(false);
  const report = useCallback((reason: ProgressReason) => {
    const el = media.current;
    if (!el || !progressRef.current) return;
    // Nothing is reported until the person has played this item: opening a page and leaving it (or React's
    // development double mount) must never overwrite a stored position with 0.
    if (!startedRef.current || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const d = el.duration;
    progressRef.current({ position_s: el.currentTime, duration_s: d, reason, completed: reason === "ended" || el.currentTime >= d - 0.5 });
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => report("interval"), PROGRESS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, report]);

  useEffect(() => {
    const onHide = () => report("unload");
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      report("unload");
    };
  }, [report]);

  // A new item starts unplayed.
  useEffect(() => {
    startedRef.current = false;
  }, [src]);

  // ---- rate ----
  useEffect(() => {
    if (rate !== undefined && media.current && !holding) media.current.playbackRate = rate;
  }, [rate, holding]);

  const chooseRate = useCallback(
    (value: number) => {
      if (media.current) media.current.playbackRate = value;
      setCurrentRate(value);
      onRateChange?.(value);
    },
    [onRateChange],
  );

  // ---- chapters track for Media Chrome's segments ----
  useEffect(() => {
    if (chapters.length === 0 || typeof URL.createObjectURL !== "function") {
      setChaptersUrl(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([chaptersToVtt(chapters, duration)], { type: "text/vtt" }));
    setChaptersUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [chapters, duration]);

  // ---- media events ----
  const onLoadedMetadata = () => {
    const el = media.current;
    if (!el) return;
    setDuration(el.duration);
    if (rate !== undefined) el.playbackRate = rate;
    if (shouldResume(resumeFrom, el.duration, completed)) {
      resumingRef.current = true;
      el.currentTime = clampTime(resumeFrom!, el.duration);
      setResumeLine(resumeFrom!);
    }
  };
  const onSeeked = () => {
    if (resumingRef.current) {
      resumingRef.current = false;
      return;
    }
    // A seek is the person choosing a place, so it counts as starting the item.
    startedRef.current = true;
    report("seek");
  };
  const onPause = () => {
    setPlaying(false);
    if (!media.current?.ended) report("pause");
  };
  const onPlay = () => {
    startedRef.current = true;
    setPlaying(true);
    setEnded(false);
    setCountdown(null);
  };
  const onEndedEvent = () => {
    setPlaying(false);
    setEnded(true);
    report("ended");
    onEnded?.();
    if (upNext && autoplayNext) setCountdown(Math.max(1, countdownSeconds));
  };

  // ---- resume line: two seconds, held open while pointed at or focused ----
  const resumeHeld = useRef(false);
  useEffect(() => {
    if (resumeLine === null) return;
    const id = setTimeout(function hide() {
      if (resumeHeld.current) return;
      setResumeLine(null);
    }, RESUME_LINE_MS);
    return () => clearTimeout(id);
  }, [resumeLine]);
  const startOver = () => {
    if (media.current) media.current.currentTime = 0;
    setResumeLine(null);
  };

  // ---- Up next countdown ----
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (upNext) onNext?.(upNext.id);
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, upNext, onNext]);

  // ---- Media Session ----
  useEffect(() => {
    if (!mediaSession || !playing || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const meta = metadata ?? { title, artist: subtitle, artwork: poster ? [{ src: poster }] : undefined };
    if (typeof MediaMetadata !== "undefined") session.metadata = new MediaMetadata(meta);
    const el = () => media.current;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ["play", () => void el()?.play()],
      ["pause", () => el()?.pause()],
      ["seekbackward", (d) => { const m = el(); if (m) m.currentTime = clampTime(m.currentTime - (d.seekOffset ?? 10), m.duration); }],
      ["seekforward", (d) => { const m = el(); if (m) m.currentTime = clampTime(m.currentTime + (d.seekOffset ?? 10), m.duration); }],
      ["seekto", (d) => { const m = el(); if (m && d.seekTime !== undefined) m.currentTime = clampTime(d.seekTime, m.duration); }],
      ["previoustrack", onPrevious ? () => onPrevious() : null],
      ["nexttrack", onNext ? () => onNext(upNext?.id) : null],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // A browser that does not know an action refuses it; the others still register.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, [mediaSession, playing, metadata, title, subtitle, poster, onPrevious, onNext, upNext?.id]);

  // ---- commands ----
  const seekBy = useCallback((delta: number) => {
    const el = media.current;
    if (el) el.currentTime = clampTime(el.currentTime + delta, el.duration);
  }, []);
  const seekTo = useCallback((t: number) => {
    const el = media.current;
    if (el) el.currentTime = clampTime(t, el.duration);
  }, []);
  const togglePlay = useCallback(() => {
    const el = media.current;
    if (!el) return;
    if (el.paused) void el.play()?.catch?.(() => {});
    else el.pause();
  }, []);
  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root || typeof document === "undefined") return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void root.requestFullscreen?.()?.catch?.(() => {});
  }, []);
  const toggleCaptions = useCallback(() => {
    const el = media.current;
    if (!el?.textTracks) return;
    const text = Array.from(el.textTracks).filter((t) => t.kind === "subtitles" || t.kind === "captions");
    if (text.length === 0) return;
    const showing = text.some((t) => t.mode === "showing");
    text.forEach((t) => (t.mode = "disabled"));
    if (!showing) {
      const preferred = captions.findIndex((c) => c.default);
      text[Math.max(0, preferred)]!.mode = "showing";
    }
  }, [captions]);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
  }, []);
  useEffect(() => {
    if (flash === null || holding) return;
    const id = setTimeout(() => setFlash(null), TAP_CHAIN_MS);
    return () => clearTimeout(id);
  }, [flash, holding]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [role=menu], [role=menuitem], [role=menuitemradio], [role=slider]")) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (key === " " || key === "k") {
      if (target.closest("button, [role=button]") && key === " ") return;
      event.preventDefault();
      togglePlay();
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-ARROW_SEEK_S);
    } else if (key === "ArrowRight") {
      event.preventDefault();
      seekBy(ARROW_SEEK_S);
    } else if (key === "f" && kind === "video") {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === "m") {
      event.preventDefault();
      if (media.current) media.current.muted = !media.current.muted;
    } else if (key === "c") {
      event.preventDefault();
      toggleCaptions();
    }
  };

  // ---- FileTube's gestures (the video picture) ----
  const chain = useRef(new TapChain());
  const press = useRef<{ x: number; y: number; type: string; id: number; moved: boolean; pulled: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateBeforeHold = useRef(1);

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    press.current = { x: event.clientX, y: event.clientY, type: event.pointerType, id: event.pointerId, moved: false, pulled: false };
    endHold();
    holdTimer.current = setTimeout(() => {
      const el = media.current;
      if (!press.current || press.current.moved || !el || el.paused) return;
      rateBeforeHold.current = el.playbackRate;
      el.playbackRate = HOLD_RATE;
      setHolding(true);
      setFlash(copy.holdSpeed);
    }, HOLD_MS);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = event.clientX - p.x;
    const dy = event.clientY - p.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) p.moved = true;
    if (p.type !== "mouse" && onDock && !holding && dy > PULL_DOCK_PX && Math.abs(dx) < dy) p.pulled = true;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    endHold();
    if (holding) {
      if (media.current) media.current.playbackRate = rateBeforeHold.current;
      setHolding(false);
      setFlash(null);
      return;
    }
    if (!p) return;
    if (p.pulled) {
      onDock?.();
      return;
    }
    if (p.moved) return;
    if (p.type === "mouse") {
      togglePlay();
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const zone = tapZone(event.clientX - box.left, box.width);
    const skip = chain.current.tap(zone, event.timeStamp || performance.now());
    if (skip !== 0) {
      seekBy(skip);
      const total = chain.current.total;
      showFlash(skip < 0 ? `-${total} s` : `+${total} s`);
    }
  };
  const onPointerCancel = () => {
    press.current = null;
    endHold();
    if (holding) {
      if (media.current) media.current.playbackRate = rateBeforeHold.current;
      setHolding(false);
      setFlash(null);
    }
  };

  // ---- a host-owned element (MEDIA-POLISH-01) ----
  // The same handlers the Player's own element gets as React props, read through a ref so the listeners added once stay current.
  const mediaHandlers = {
    loadedmetadata: () => onLoadedMetadata(),
    durationchange: () => media.current && setDuration(media.current.duration),
    timeupdate: () => media.current && setTime(media.current.currentTime),
    play: () => onPlay(),
    pause: () => onPause(),
    seeked: () => onSeeked(),
    ended: () => onEndedEvent(),
    ratechange: () => {
      if (!holding && media.current) setCurrentRate(media.current.playbackRate);
    },
  };
  const handlersRef = useRef(mediaHandlers);
  handlersRef.current = mediaHandlers;

  useLayoutEffect(() => {
    const el = external;
    const controller = controllerRef.current;
    if (!el || !controller) return;
    el.setAttribute("slot", "media");
    el.setAttribute("data-slot", "player-media");
    el.preload = "metadata";
    el.crossOrigin = "anonymous";
    if (el instanceof HTMLVideoElement) {
      el.playsInline = true;
      if (layout === "video" && poster) el.poster = poster;
    }
    // Under the audio and mini layouts a video plays without its picture (the bar shows the art instead).
    el.style.display = layout === "video" || el instanceof HTMLAudioElement ? "" : "none";
    if (!type && el.getAttribute("src") !== src) el.setAttribute("src", src);
    controller.insertBefore(el, controller.firstChild);
    attachMedia(el);
    // An element that already played (back from the mini bar) carries on where it is; a fresh one resumes as usual.
    if (el.readyState >= 1) {
      setDuration(el.duration);
      setTime(el.currentTime);
      setPlaying(!el.paused);
      if (el.currentTime > 0 || !el.paused) startedRef.current = true;
      else handlersRef.current.loadedmetadata();
    }
    const names = Object.keys(handlersRef.current) as Array<keyof typeof mediaHandlers>;
    const listeners = names.map((name) => {
      const listener = () => handlersRef.current[name]();
      el.addEventListener(name, listener);
      return () => el.removeEventListener(name, listener);
    });
    return () => {
      listeners.forEach((off) => off());
      if (el.parentNode === controller) parkMedia(el);
    };
    // `src` and the poster are applied on adoption; a new item is a new element from the host.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external, layout]);

  // ---- derived ----
  const chapterIndex = chapterIndexAt(chapters, time);
  const offer = skipOffer(chapters, time, duration);
  const progressPct = Number.isFinite(duration) && duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  const MediaTag = kind === "audio" ? "audio" : "video";
  const mediaElement = external ? null : (
    // Captions come from `captions` as <track> children; a caller that has none passes none.
    <MediaTag
      key="media"
      slot="media"
      ref={attachMedia as never}
      src={type ? undefined : src}
      poster={kind === "video" ? poster : undefined}
      preload="metadata"
      playsInline
      autoPlay={autoPlay}
      crossOrigin="anonymous"
      onLoadedMetadata={onLoadedMetadata}
      onDurationChange={(e) => setDuration((e.currentTarget as HTMLMediaElement).duration)}
      onTimeUpdate={(e) => setTime((e.currentTarget as HTMLMediaElement).currentTime)}
      onPlay={onPlay}
      onPause={onPause}
      onSeeked={onSeeked}
      onEnded={onEndedEvent}
      onRateChange={(e) => {
        if (!holding) setCurrentRate((e.currentTarget as HTMLMediaElement).playbackRate);
      }}
      data-slot="player-media"
    >
      {type ? <source src={src} type={type} /> : null}
      {captions.map((c) => (
        <track key={c.src} kind={c.kind ?? "subtitles"} src={c.src} srcLang={c.srclang} label={c.label} default={c.default} />
      ))}
      {thumbnails ? <track kind="metadata" label="thumbnails" src={thumbnails} default /> : null}
      {chaptersUrl ? <track kind="chapters" src={chaptersUrl} srcLang="en" label={copy.chapters} default /> : null}
    </MediaTag>
  );

  const container = rootRef.current;

  const rateMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${copy.speed}: ${currentRate}x`} data-slot="player-rate">
          <span className="text-sm font-semibold tabular-nums">{currentRate}x</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent container={container} align="end">
        <DropdownMenuLabel>{copy.speed}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(currentRate)} onValueChange={(v) => chooseRate(Number(v))}>
          {PLAYBACK_RATES.map((r) => (
            <DropdownMenuRadioItem key={r} value={String(r)}>
              {r}x
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const chapterMenu =
    chapters.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={copy.chapters} data-slot="player-chapters">
            <Icon name="list-video" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent container={container} align="end" className="max-h-80">
          <DropdownMenuLabel>{copy.chapters}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={String(Math.max(0, chapterIndex))} onValueChange={(v) => seekTo(chapters[Number(v)]!.start_s)}>
            {chapters.map((c, i) => (
              <DropdownMenuRadioItem key={`${c.start_s}`} value={String(i)}>
                <span className="text-muted-foreground w-14 shrink-0 tabular-nums">{formatTime(c.start_s)}</span>
                <span className="min-w-0 truncate">{c.title}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const playButton = (big = false) => (
    <MediaPlayButton
      data-slot="player-play"
      aria-label={playing ? copy.pause : copy.play}
      style={big ? (layout === "video" ? BIG_PLAY : BIG_PLAY_PAGE) : undefined}
      // Tailwind's preflight resets every element's padding, Media Chrome's :host padding included, so the
      // kit sets it here (Kibo UI's video player does the same).
      className={big ? "rounded-full p-5" : "p-3"}
    >
      <Icon slot="play" name="play" className={big ? "size-8" : "size-6"} />
      <Icon slot="pause" name="pause" className={big ? "size-8" : "size-6"} />
    </MediaPlayButton>
  );

  const castButtons = (
    <>
      <MediaCastButton className="p-3 [&[mediacastunavailable]]:hidden" aria-label={copy.cast}>
        <Icon slot="enter" name="cast" />
        <Icon slot="exit" name="cast" />
      </MediaCastButton>
      <MediaAirplayButton className="p-3 max-sm:hidden [&[mediaairplayunavailable]]:hidden" aria-label={copy.cast}>
        <Icon slot="icon" name="airplay" />
      </MediaAirplayButton>
      {castSlot}
    </>
  );

  const overlays = (
    <>
      {flash ? (
        <div
          role="status"
          data-slot="player-flash"
          className="pointer-events-none absolute top-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--art-overlay)] px-4 py-2 text-base font-semibold text-[var(--art-foreground)]"
        >
          {flash}
        </div>
      ) : null}
      {resumeLine !== null ? (
        <div
          role="status"
          data-slot="player-resume"
          onPointerEnter={() => (resumeHeld.current = true)}
          onPointerLeave={() => {
            resumeHeld.current = false;
            setTimeout(() => !resumeHeld.current && setResumeLine(null), RESUME_LINE_MS);
          }}
          onFocus={() => (resumeHeld.current = true)}
          onBlur={() => {
            resumeHeld.current = false;
            setTimeout(() => !resumeHeld.current && setResumeLine(null), RESUME_LINE_MS);
          }}
          className="dark absolute right-2 top-2 z-20 flex sm:top-auto sm:right-auto sm:bottom-24 sm:left-4 items-center gap-3 rounded-[var(--art-radius)] bg-[var(--art-overlay)] py-1 pr-1 pl-4 text-base text-[var(--art-foreground)]"
        >
          <span>{copy.resumedFrom(formatTime(resumeLine))}</span>
          <Button variant="secondary" size="sm" onClick={startOver}>
            {copy.startOver}
          </Button>
        </div>
      ) : null}
      {offer && !ended ? (
        <div className="dark absolute top-2 right-2 z-20 sm:top-auto sm:right-4 sm:bottom-24">
          <Button variant="secondary" onClick={() => seekTo(offer.to)} data-slot="player-skip">
            {offer.kind === "intro" ? copy.skipIntro : copy.skipCredits}
          </Button>
        </div>
      ) : null}
      {ended && upNext ? (
        <div
          data-slot="player-upnext"
          className="dark absolute inset-0 z-30 flex items-center justify-center bg-[var(--art-overlay)] p-4 text-[var(--art-foreground)]"
        >
          <div className="flex max-w-md flex-col gap-3" role="group" aria-label={copy.upNext}>
            <p className="text-sm font-semibold tracking-wide uppercase" aria-live="polite">
              {countdown !== null ? copy.upNextIn(countdown) : copy.upNext}
            </p>
            <div className="flex items-center gap-3">
              <SafeImage src={upNext.art} alt="" kind={kind === "video" ? "video" : "music"} className="aspect-video w-32 shrink-0 rounded-[var(--art-radius)] object-cover" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{upNext.title}</p>
                {upNext.subtitle ? <p className="truncate text-sm opacity-80">{upNext.subtitle}</p> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCountdown(null);
                  onNext?.(upNext.id);
                }}
              >
                <Icon name="play" className="size-5" />
                {copy.playNow}
              </Button>
              {countdown !== null ? (
                <Button variant="secondary" onClick={() => setCountdown(null)}>
                  {copy.cancel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  const controllerStyle = { ...MEDIA_VARS, width: "100%" } as CSSProperties;

  if (layout === "video") {
    return (
      // Shortcuts are delegated from the focused control inside, the way a media player takes them.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={rootRef}
        data-slot="player"
        data-layout="video"
        onKeyDown={onKeyDown}
        className="relative w-full overflow-hidden rounded-[var(--player-radius)] bg-[var(--art-surface)]"
      >
        <MediaController
          key="controller"
          ref={controllerRef as never}
          noHotkeys
          gesturesDisabled
          defaultStreamType="on-demand"
          style={{ ...controllerStyle, aspectRatio: "16 / 9", display: "block" }}
          aria-label={title}
        >
          {mediaElement}
          <div
            slot="gestures-chrome"
            data-slot="player-gestures"
            aria-hidden
            className="absolute inset-0 touch-pan-y select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
          />
          {onDock ? (
            <div slot="top-chrome" className="dark p-2">
              <Button variant="ghost" size="icon" aria-label={copy.dock} onClick={onDock}>
                <Icon name="chevron-down" />
              </Button>
            </div>
          ) : null}
          {ended && upNext ? null : <div slot="centered-chrome">{playButton(true)}</div>}
          <div className="dark flex w-full flex-col bg-[image:var(--art-scrim)] pt-8" data-slot="player-controls">
            <MediaTimeRange aria-label={title} className="p-2.5 w-full" />
            <MediaControlBar className="w-full">
              {playButton()}
              <MediaSeekBackwardButton className="p-3 max-sm:hidden" seekOffset={10} aria-label={copy.back(10)}>
                <Icon slot="icon" name="rotate-ccw" />
              </MediaSeekBackwardButton>
              <MediaSeekForwardButton className="p-3 max-sm:hidden" seekOffset={10} aria-label={copy.ahead(10)}>
                <Icon slot="icon" name="rotate-cw" />
              </MediaSeekForwardButton>
              <MediaMuteButton aria-label={copy.mute} className="p-3 max-sm:hidden">
                <Icon slot="off" name="volume-x" />
                <Icon slot="low" name="volume-1" />
                <Icon slot="medium" name="volume-1" />
                <Icon slot="high" name="volume-2" />
              </MediaMuteButton>
              <MediaVolumeRange className="p-2.5 max-md:hidden" />
              <MediaTimeDisplay showDuration className="p-2.5 tabular-nums" />
              <span className="flex-1" aria-hidden />
              {rateMenu}
              <span className="contents max-sm:hidden">{chapterMenu}</span>
              {captions.length > 0 ? (
                <MediaCaptionsButton className="p-3" aria-label={copy.captions}>
                  <Icon slot="on" name="captions" />
                  <Icon slot="off" name="captions-off" />
                </MediaCaptionsButton>
              ) : null}
              {castButtons}
              <MediaPipButton aria-label={copy.pip} className="p-3 max-sm:hidden [&[mediapipunavailable]]:hidden">
                <Icon slot="enter" name="picture-in-picture" />
                <Icon slot="exit" name="picture-in-picture" />
              </MediaPipButton>
              <MediaFullscreenButton className="p-3" aria-label={copy.fullscreen}>
                <Icon slot="enter" name="maximize" />
                <Icon slot="exit" name="minimize" />
              </MediaFullscreenButton>
            </MediaControlBar>
          </div>
        </MediaController>
        {overlays}
      </div>
    );
  }

  const art = (size: string) => (
    <SafeImage src={poster} alt={posterAlt} kind={kind === "video" ? "video" : "music"} className={cn("shrink-0 rounded-[var(--art-radius)] bg-muted object-cover", size)} />
  );

  const transport = (big: boolean) => (
    <div className="flex items-center gap-1" data-slot="player-transport">
      {onPrevious ? (
        <Button variant="ghost" size="icon" aria-label={copy.previous} onClick={onPrevious}>
          <Icon name="skip-back" />
        </Button>
      ) : null}
      {big ? (
        <MediaSeekBackwardButton className="p-3" seekOffset={15} aria-label={copy.back(15)}>
          <Icon slot="icon" name="rotate-ccw" />
        </MediaSeekBackwardButton>
      ) : null}
      {playButton(big)}
      {big ? (
        <MediaSeekForwardButton className="p-3" seekOffset={30} aria-label={copy.ahead(30)}>
          <Icon slot="icon" name="rotate-cw" />
        </MediaSeekForwardButton>
      ) : null}
      {onNext ? (
        <Button variant="ghost" size="icon" aria-label={copy.next} onClick={() => onNext(upNext?.id)}>
          <Icon name="skip-forward" />
        </Button>
      ) : null}
    </div>
  );

  // The audio and mini layouts read the page's own tokens (no picture under them), so they follow the theme.
  const audioVars = {
    ...controllerStyle,
    "--media-primary-color": "var(--foreground)",
    "--media-text-color": "var(--foreground)",
    "--media-icon-color": "var(--foreground)",
    "--media-background-color": "transparent",
    "--media-control-hover-background": "var(--accent)",
    "--media-range-track-background": "var(--muted)",
    "--media-time-range-buffered-color": "color-mix(in srgb, var(--foreground) 25%, transparent)",
  } as CSSProperties;

  if (layout === "mini") {
    return (
      // Shortcuts are delegated from the focused control inside, the way a media player takes them.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={rootRef}
        data-slot="player"
        data-layout="mini"
        data-placement={placement}
        onKeyDown={onKeyDown}
        className={cn(
          "relative w-full bg-card text-card-foreground",
          placement === "dock" && "sticky bottom-0 z-30 border-t border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] backdrop-blur-md",
        )}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-muted">
          <div className="h-full bg-[var(--progress-accent)]" style={{ width: `${progressPct}%` }} />
        </div>
        <MediaController key="controller" ref={controllerRef as never} audio noHotkeys autohide="-1" defaultStreamType="on-demand" style={audioVars}>
          {mediaElement}
          <div className="flex w-full items-center gap-3 px-3 py-2">
            {onExpand ? (
              <Button
                variant="ghost"
                align="start"
                height="auto"
                onClick={onExpand}
                aria-label={`${copy.expand}: ${title}`}
                className="min-w-0 flex-1 gap-3 px-1"
              >
                {art("size-12")}
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{title}</span>
                  {subtitle ? <span className="text-muted-foreground block truncate text-sm">{subtitle}</span> : null}
                </span>
              </Button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {art("size-12")}
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{title}</span>
                  {subtitle ? <span className="text-muted-foreground block truncate text-sm">{subtitle}</span> : null}
                </span>
              </div>
            )}
            {transport(false)}
            <div className="flex items-center max-sm:hidden">
              {actionsSlot}
              {castButtons}
            </div>
          </div>
        </MediaController>
      </div>
    );
  }

  // layout === "audio": Now playing.
  return (
    // Shortcuts are delegated from the focused control inside, the way a media player takes them.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={rootRef} data-slot="player" data-layout="audio" onKeyDown={onKeyDown} className={audioLayout === "container" ? "@container/player relative w-full" : "relative w-full"}>
      <MediaController key="controller" ref={controllerRef as never} audio noHotkeys autohide="-1" defaultStreamType="on-demand" style={audioVars}>
        {mediaElement}
        <div className={audioLayout === "container" ? "grid w-full gap-6 @md/player:grid-cols-2 @md/player:items-center" : "grid w-full gap-6 sm:grid-cols-2 sm:items-center"}>
          {art("aspect-square w-full max-w-md justify-self-center")}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold">{title}</p>
              {subtitle ? <p className="text-muted-foreground truncate text-lg">{subtitle}</p> : null}
              {chapterIndex >= 0 ? <p className="text-muted-foreground truncate text-sm">{chapters[chapterIndex]!.title}</p> : null}
            </div>
            <MediaTimeRange aria-label={title} className="p-2.5 w-full" />
            <div className="text-muted-foreground flex justify-between text-sm tabular-nums">
              <span>{formatTime(time)}</span>
              <span>-{formatTime(Number.isFinite(duration) ? Math.max(0, duration - time) : 0)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">{transport(true)}</div>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {actionsSlot}
              {rateMenu}
              {chapterMenu}
              {castButtons}
            </div>
            {resumeLine !== null ? (
              <div role="status" data-slot="player-resume" className="flex items-center justify-center gap-3 text-base">
                <span>{copy.resumedFrom(formatTime(resumeLine))}</span>
                <Button variant="secondary" size="sm" onClick={startOver}>
                  {copy.startOver}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </MediaController>
    </div>
  );
}

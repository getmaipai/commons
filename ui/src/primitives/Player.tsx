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
import { AmbientGlow } from "@/kit/primitives/AmbientGlow";
import { LyricsList, type TimedLyricLine } from "@/kit/elements/lyrics-list";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { Badge } from "@/kit/ui/badge";
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
  isSwipeUp,
  swipeSideways,
  RESUME_LINE_MS,
  shouldResume,
  skipOffer,
  TAP_CHAIN_MS,
  TapChain,
  tapZone,
  type PlayerChapter,
  type ProgressReason,
} from "@/kit/primitives/playerLogic";
import { ArtGradient } from "@/kit/primitives/ArtGradient";
import { LIKE_POP_CLASS, likeHaptic, useLikePop } from "@/kit/primitives/likeFeedback";
import { SleepTimer } from "@/kit/primitives/SleepTimer";
import type { SleepState } from "@/kit/primitives/sleepLogic";
import { TranscriptPanel, type TranscriptLine } from "@/kit/primitives/TranscriptPanel";
import { i18n } from "@/kit/i18n";

export type { TranscriptLine } from "@/kit/primitives/TranscriptPanel";
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

export interface PlayerVoiceover {
  /** Address of the spoken line (a hub file route). */
  src: string;
  /** Track time at which to speak; defaults to the beginning. */
  at?: "start" | number;
  /** Cut the line if it would continue into the first lyric. */
  firstLyricS?: number;
  /** Independent voice level, from 0 to 1. */
  volume?: number;
  /** Called once when playback ends, is cut, or fails. */
  onDone?: (reason: "ended" | "cut" | "error") => void;
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
  close: string;
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
  live: string;
  shuffle: string;
  repeatOff: string;
  repeatAll: string;
  repeatOne: string;
  like: string;
  unlike: string;
  share: string;
}

export const defaultPlayerCopy = (): PlayerCopy => ({
  play: i18n._({ id: "ui.Play", message: "Play" }),
  pause: i18n._({ id: "ui.Pause", message: "Pause" }),
  back: (s) => i18n._({ id: "ui.Back {seconds} seconds", message: "Back {seconds} seconds", values: { seconds: s } }),
  ahead: (s) => i18n._({ id: "ui.Ahead {seconds} seconds", message: "Ahead {seconds} seconds", values: { seconds: s } }),
  speed: i18n._({ id: "ui.Playback speed", message: "Playback speed" }),
  chapters: i18n._({ id: "ui.Chapters", message: "Chapters" }),
  captions: i18n._({ id: "ui.Captions", message: "Captions" }),
  pip: i18n._({ id: "ui.Picture in picture", message: "Picture in picture" }),
  fullscreen: i18n._({ id: "ui.Full screen", message: "Full screen" }),
  mute: i18n._({ id: "ui.Mute", message: "Mute" }),
  cast: i18n._({ id: "ui.Play on another screen", message: "Play on another screen" }),
  dock: i18n._({ id: "ui.Shrink the player", message: "Shrink the player" }),
  expand: i18n._({ id: "ui.Open the player", message: "Open the player" }),
  close: i18n._({ id: "ui.Close player", message: "Close player" }),
  previous: i18n._({ id: "ui.Previous", message: "Previous" }),
  next: i18n._({ id: "ui.Next", message: "Next" }),
  resumedFrom: (time) => i18n._({ id: "ui.Resuming from {time}", message: "Resuming from {time}", values: { time } }),
  startOver: i18n._({ id: "ui.Start over", message: "Start over" }),
  skipIntro: i18n._({ id: "ui.Skip intro", message: "Skip intro" }),
  skipCredits: i18n._({ id: "ui.Skip credits", message: "Skip credits" }),
  upNext: i18n._({ id: "ui.Up next", message: "Up next" }),
  upNextIn: (s) => i18n._({ id: "ui.Up next in {seconds}", message: "Up next in {seconds}", values: { seconds: s } }),
  playNow: i18n._({ id: "ui.Play now", message: "Play now" }),
  cancel: i18n._({ id: "ui.Cancel", message: "Cancel" }),
  holdSpeed: i18n._({ id: "ui.2x speed", message: "2x speed" }),
  live: i18n._({ id: "ui.Live", message: "Live" }),
  shuffle: i18n._({ id: "ui.Shuffle", message: "Shuffle" }),
  repeatOff: i18n._({ id: "ui.Repeat off", message: "Repeat off" }),
  repeatAll: i18n._({ id: "ui.Repeat all", message: "Repeat all" }),
  repeatOne: i18n._({ id: "ui.Repeat one", message: "Repeat one" }),
  like: i18n._({ id: "ui.Like", message: "Like" }),
  unlike: i18n._({ id: "ui.Unlike", message: "Unlike" }),
  share: i18n._({ id: "ui.Share", message: "Share" }),
});

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
  /** Optional spoken line mixed over the music. */
  voiceover?: PlayerVoiceover;
  subtitle?: string;
  /** The video poster, or the art for audio and the mini bar. */
  poster?: string;
  /** Alternative text for audio artwork. Decorative by default. */
  posterAlt?: string;
  /** Optional song lyrics shown in the audio layout. */
  lyrics?: { lines?: readonly TimedLyricLine[]; text?: string };
  lyricsLabel?: string;
  lyricsEmptyText?: string;
  /** Shows a waiting message while the host looks up missing lyrics. */
  lyricsLoading?: boolean;
  onLyricsOpen?: () => void;
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
  onClose?: () => void;
  /** Extra cast targets (the household's screens), drawn beside the browser's own cast and AirPlay buttons. */
  castSlot?: ReactNode;
  /** Extra controls in the audio and mini layouts (shuffle, sleep timer, like). */
  actionsSlot?: ReactNode;
  /** Publish Media Session metadata and handlers. The shell's audio session may turn this off to own them. */
  mediaSession?: boolean;
  metadata?: PlayerMetadata;
  copy?: Partial<PlayerCopy>;
  /** RADIO-07: a live stream (a radio station). Draws a Live badge instead of the time range, the time and the seek
   * buttons, and arrow keys and Media Session seeks do nothing. A stream whose element reports an infinite duration
   * counts as live without this prop. */
  live?: boolean;
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
  /** MUSIC-KIT-01: in the `mini` layout, dragging up on the bar (touch or pen) calls `onExpand`, like tapping it. The
   * bar keeps its horizontal scroll; the swipe never fires a tap. Default off. */
  swipeUpToExpand?: boolean;
  /** In the `mini` layout, a horizontal swipe (touch or pen) on the bar calls `onNext` (left) or `onPrevious` (right) when the
   * host passes them. Only acts when the travel is mostly sideways, so it never fights the swipe up. Default off. */
  swipeToSkip?: boolean;
  /** MUSIC-KIT-01: in the `audio` layout, the art rests smaller (`--art-resting-scale`) while paused and springs to full
   * size on play (`--art-spring-duration`, `--art-spring-ease`). Under reduced motion the art stays full size. Default off. */
  artSpring?: boolean;
  /** MUSIC-KIT-01: in the `audio` layout, lyrics blur and fade by distance from the active line (LyricsList `blurByDistance`). Default off. */
  lyricsBlur?: boolean;
  /** NOW-PLAYING-01: in the `audio` layout, the Now Playing controls a music host wires up. `shuffle` and `repeat` are the
   * host's play mode (`repeat` is "off", "all" or "one"; "one" draws a 1 badge); the buttons appear when their callback is
   * passed. Passing either callback also drops the default 15 and 30 second skip buttons (pass `skip` to keep them). */
  shuffle?: boolean;
  repeat?: "off" | "all" | "one";
  onShuffle?: () => void;
  onRepeat?: () => void;
  /** NOW-PLAYING-01: the heart (with the kit's like pop) appears when `onLike` is passed; `liked` is its state. */
  liked?: boolean;
  onLike?: () => void;
  /** NOW-PLAYING-01: the Up next (queue) and Share buttons in the secondary row appear when their callback is passed. */
  onQueue?: () => void;
  onShare?: () => void;
  /** PARITY-01: draw the sleep timer (Off, End of episode, 5 to 60 minutes) with a live countdown. Off by default. */
  sleepTimer?: boolean;
  /** PARITY-01: called when the sleep timer ends playback: "end" when the item finished, "timer" when the countdown ran out.
   * "End of episode" also keeps `onEnded` and the Up next countdown from running, so the host does not start another item. */
  onSleep?: (reason: "end" | "timer") => void;
  /** PARITY-01: skip buttons that jump back and forward by these many seconds (a podcast: 15 and 30). Drawn on every
   * screen size in the `video` layout; the `audio` layout defaults to 15 and 30. */
  skip?: { back: number; forward: number };
  /** PARITY-01: transcript paragraphs. In the `audio` layout a Transcript button swaps the art for the reader (current
   * paragraph bright, the others dim, tap a paragraph to seek, a search box). */
  transcript?: readonly TranscriptLine[];
  transcriptLabel?: string;
  /** PARITY-01: video touch gestures and the Picture in picture button. All on by default (the Player's existing
   * behavior); `false` turns one off. Double taps on the sides seek and stack; holding the picture plays at 2x. */
  doubleTapSeek?: boolean;
  longPressSpeed?: boolean;
  pip?: boolean;
  /** In the `video` layout, a soft blurred glow behind the player takes its colors from the poster and the playing frame
   * (about once a second; poster only under reduced motion). Presentational. On by default; `false` opts out. */
  ambient?: boolean;
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

/** A seek button's icon. With `seconds` it carries the number inside the arrow (Apple's 15 and 30), as a slotted icon. */
function SkipGlyph({ name, seconds }: { name: string; seconds?: number }) {
  if (seconds === undefined) return <Icon slot="icon" name={name} />;
  return (
    <span slot="icon" className="relative inline-flex size-6 items-center justify-center" data-slot="player-skip-glyph">
      <Icon name={name} />
      <span aria-hidden className="absolute text-[9px] leading-none font-bold tabular-nums">{seconds}</span>
    </span>
  );
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
    lyrics,
    lyricsLabel = i18n._({ id: "ui.Lyrics", message: "Lyrics" }),
    lyricsEmptyText,
    lyricsLoading = false,
    onLyricsOpen,
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
    onClose,
    castSlot,
    actionsSlot,
    mediaSession = true,
    metadata,
    mediaRef,
    media: external = null,
    placement = "inline",
    swipeUpToExpand = false,
    ambient = true,
    swipeToSkip = false,
    artSpring = false,
    lyricsBlur = false,
    voiceover,
    sleepTimer = false,
    onSleep,
    skip,
    transcript,
    transcriptLabel = i18n._({ id: "ui.Transcript", message: "Transcript" }),
    doubleTapSeek = true,
    longPressSpeed = true,
    pip = true,
    shuffle,
    repeat,
    onShuffle,
    onRepeat,
    liked = false,
    onLike,
    onQueue,
    onShare,
  } = props;
  const copy = { ...defaultPlayerCopy(), ...props.copy };
  const liveProp = props.live === true;
  const chapters = useMemo(() => normalizeChapters(props.chapters), [props.chapters]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLElement | null>(null);
  const media = useRef<HTMLMediaElement | null>(null);
  const [time, setTime] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const likePops = useLikePop(liked);
  const [sleep, setSleep] = useState<SleepState>(null);
  const sleepRef = useRef<SleepState>(null);
  sleepRef.current = sleep;
  const requestedLyricsFor = useRef<string | null>(null);
  const previousLyricsSrc = useRef(src);
  if (previousLyricsSrc.current !== src) {
    previousLyricsSrc.current = src;
    requestedLyricsFor.current = null;
    setLyricsOpen(false);
  }
  const [duration, setDuration] = useState(Number.NaN);
  const live = liveProp || duration === Number.POSITIVE_INFINITY;
  const liveRef = useRef(live);
  liveRef.current = live;
  const [playing, setPlaying] = useState(false);
  // MUSIC-KIT-01: the touch that may become a swipe up on the mini bar.
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const [currentRate, setCurrentRate] = useState(rate ?? 1);
  const [resumeLine, setResumeLine] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [chaptersUrl, setChaptersUrl] = useState<string | null>(null);

  // The voice element is deliberately detached from React's rendered tree. Its source and event lifecycle belong to
  // this Player instance, including when the music element is supplied by a host.
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const voiceStarted = useRef(false);
  const voiceDone = useRef(false);
  const bedTarget = useRef<number | null>(null);
  const musicVolume = useRef(1);
  const fadeTimers = useRef(new Map<HTMLMediaElement, ReturnType<typeof setInterval>>());
  const cutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceConfig = useRef(voiceover);
  voiceConfig.current = voiceover;
  const voiceVersion = useRef(0);

  const stopFade = (el?: HTMLMediaElement) => {
    if (el) {
      const timer = fadeTimers.current.get(el);
      if (timer) clearInterval(timer);
      fadeTimers.current.delete(el);
      return;
    }
    fadeTimers.current.forEach(clearInterval);
    fadeTimers.current.clear();
  };
  const ramp = (el: HTMLMediaElement, from: number, to: number, ms: number, done?: () => void) => {
    stopFade(el);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - startedAt) / ms);
      el.volume = from + (to - from) * p;
      if (p >= 1) {
        stopFade(el);
        done?.();
      }
    }, 16);
    fadeTimers.current.set(el, timer);
  };
  const restoreBed = () => {
    const el = media.current;
    if (!el || bedTarget.current === null) return;
    const target = bedTarget.current;
    bedTarget.current = null;
    ramp(el, el.volume, target, 300);
  };
  const finishVoice = (reason: "ended" | "cut" | "error") => {
    if (voiceDone.current) return;
    voiceDone.current = true;
    if (cutTimer.current) clearTimeout(cutTimer.current);
    cutTimer.current = null;
    const voice = voiceRef.current;
    if (reason !== "ended") {
      if (reason === "cut" && voice) ramp(voice, voice.volume, 0, 200, () => voice.pause());
      else voice?.pause();
    }
    restoreBed();
    try { voiceConfig.current?.onDone?.(reason); } catch { /* caller errors never escape Player */ }
  };
  const finishVoiceRef = useRef(finishVoice);
  finishVoiceRef.current = finishVoice;
  const syncVoiceover = () => {
    const music = media.current;
    const voice = voiceRef.current;
    const config = voiceConfig.current;
    if (!music || !voice || !config || voiceDone.current) return;
    if (music.paused) { voice.pause(); return; }
    const trigger = config.at === undefined || config.at === "start" ? 0 : config.at;
    if (!voiceStarted.current && music.currentTime >= trigger) {
      voiceStarted.current = true;
      bedTarget.current = music.volume;
      ramp(music, music.volume, music.volume * 0.35, 300);
      voice.volume = Math.max(0, Math.min(1, config.volume ?? 1));
      void voice.play().catch(() => finishVoice("error"));
      if (config.firstLyricS !== undefined) {
        const until = config.firstLyricS - music.currentTime;
        if (until <= 0) finishVoice("cut");
        else cutTimer.current = setTimeout(() => finishVoice("cut"), until * 1000);
      }
    } else if (voiceStarted.current && voice.paused) void voice.play().catch(() => finishVoice("error"));
  };

  useEffect(() => {
    if (!voiceConfig.current) return;
    const voice = new Audio();
    const version = ++voiceVersion.current;
    voiceRef.current = voice;
    voice.preload = "metadata";
    voice.volume = Math.max(0, Math.min(1, voiceConfig.current?.volume ?? 1));
    voice.src = voiceConfig.current!.src;
    const onEnded = () => { if (version === voiceVersion.current) finishVoiceRef.current("ended"); };
    const onError = () => { if (version === voiceVersion.current) finishVoiceRef.current("error"); };
    const onMetadata = () => {
      const firstLyric = voiceConfig.current?.firstLyricS;
      const music = media.current;
      if (version !== voiceVersion.current || firstLyric === undefined || !music || !Number.isFinite(voice.duration)) return;
      const trigger = voiceConfig.current?.at === "start" || voiceConfig.current?.at === undefined ? 0 : voiceConfig.current.at;
      const until = firstLyric - trigger;
      if (until <= 0) return finishVoiceRef.current("cut");
      if (voice.duration > until && voiceStarted.current) {
        if (cutTimer.current) clearTimeout(cutTimer.current);
        cutTimer.current = setTimeout(() => finishVoiceRef.current("cut"), Math.max(0, (until - voice.currentTime) * 1000));
      }
    };
    voice.addEventListener("ended", onEnded);
    voice.addEventListener("error", onError);
    voice.addEventListener("loadedmetadata", onMetadata);
    voiceDone.current = false;
    voiceStarted.current = false;
    const detach = () => {
      voiceVersion.current++;
      voice.removeEventListener("ended", onEnded);
      voice.removeEventListener("error", onError);
      voice.removeEventListener("loadedmetadata", onMetadata);
      if (cutTimer.current) clearTimeout(cutTimer.current);
      stopFade();
      voice.pause();
      if (media.current && bedTarget.current !== null) media.current.volume = bedTarget.current;
      bedTarget.current = null;
      voiceRef.current = null;
    };
    return detach;
  }, [voiceover?.src]);

  useEffect(() => {
    const music = media.current;
    if (!music || bedTarget.current === null) return;
    const onVolume = () => {
      if (voiceRef.current && !voiceRef.current.paused && !voiceDone.current) {
        musicVolume.current = music.volume;
        bedTarget.current = music.volume;
      }
    };
    music.addEventListener("volumechange", onVolume);
    return () => music.removeEventListener("volumechange", onVolume);
  }, [playing]);

  useEffect(() => () => {
    stopFade();
    if (cutTimer.current) clearTimeout(cutTimer.current);
    voiceRef.current?.pause();
    if (media.current && bedTarget.current !== null) media.current.volume = bedTarget.current;
    bedTarget.current = null;
  }, []);

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
    setTime(media.current?.currentTime ?? 0);
    syncVoiceover();
  };
  const onTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setTime(e.currentTarget.currentTime);
    syncVoiceover();
  };
  const onPauseMedia = () => {
    voiceRef.current?.pause();
    onPause();
  };
  const onEndedEvent = () => {
    setPlaying(false);
    setEnded(true);
    report("ended");
    // "End of episode": the sleep timer stops here, so neither the host's onEnded nor the Up next countdown runs.
    if (sleepRef.current?.kind === "end") {
      setSleep(null);
      onSleep?.("end");
      return;
    }
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
      ["seekbackward", (d) => { const m = el(); if (m && !liveRef.current) m.currentTime = clampTime(m.currentTime - (d.seekOffset ?? 10), m.duration); }],
      ["seekforward", (d) => { const m = el(); if (m && !liveRef.current) m.currentTime = clampTime(m.currentTime + (d.seekOffset ?? 10), m.duration); }],
      ["seekto", (d) => { const m = el(); if (m && !liveRef.current && d.seekTime !== undefined) m.currentTime = clampTime(d.seekTime, m.duration); }],
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
    if (el && !liveRef.current) el.currentTime = clampTime(el.currentTime + delta, el.duration);
  }, []);
  const seekTo = useCallback((t: number) => {
    const el = media.current;
    if (el && !liveRef.current) el.currentTime = clampTime(t, el.duration);
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
    if (!longPressSpeed) return;
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
    if (!doubleTapSeek) return;
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
    timeupdate: () => { if (media.current) { setTime(media.current.currentTime); syncVoiceover(); } },
    play: () => onPlay(),
    pause: () => onPauseMedia(),
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

  const liveBadge = (
    <Badge variant="secondary" data-slot="player-live">
      {copy.live}
    </Badge>
  );

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
      onTimeUpdate={onTimeUpdate}
      onPlay={onPlay}
      onPause={onPauseMedia}
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

  const sleepControl = sleepTimer ? (
    <SleepTimer value={sleep} onChange={setSleep} getMedia={() => media.current} container={container} onFire={() => onSleep?.("timer")} />
  ) : null;
  const skipBack = skip?.back ?? 10;
  const skipForward = skip?.forward ?? 10;
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

  // The glow's wrapper is in every layout (layout-neutral `contents` when the glow is off), so docking to the mini bar and
  // back keeps the same keyed MediaController and the playing element is never remounted.
  const ambientOn = ambient && layout === "video" && !(external instanceof HTMLAudioElement);
  const withAmbient = (node: ReactNode) => (
    <div data-slot={ambientOn ? "player-ambient" : undefined} className={ambientOn ? "relative isolate w-full" : "contents"} style={ambientOn ? { maxWidth: "max(22rem, calc((100dvh - 14rem) * 16 / 9))" } : undefined}>
      {ambientOn ? <AmbientGlow ambient getVideo={() => (media.current instanceof HTMLVideoElement ? media.current : null)} poster={poster} /> : null}
      {node}
    </div>
  );

  if (layout === "video") {
    const videoNode = (
      // Shortcuts are delegated from the focused control inside, the way a media player takes them.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={rootRef}
        data-slot="player"
        data-layout="video"
        onKeyDown={onKeyDown}
        // A 16:9 picture as wide as its column is taller than the window on a wide screen, which pushes the title and the
        // buttons below the fold. The width stops where the picture is as tall as the window less the header and the title
        // block (never under 22rem), so the title shows under the picture the way it does on a video site.
        style={{ maxWidth: "max(22rem, calc((100dvh - 14rem) * 16 / 9))" }}
        // shrink-0: overflow-hidden lets a flex or grid parent squeeze the box below its 16:9 height, which clipped the control bar on a phone.
        className="relative h-auto w-full shrink-0 overflow-hidden rounded-[var(--player-radius)] bg-[var(--art-surface)]"
      >
        <MediaController
          key="controller"
          ref={controllerRef as never}
          noHotkeys
          gesturesDisabled
          defaultStreamType="on-demand"
          // minHeight keeps the whole bar (seek line, buttons) inside the box on a 320 px wide screen, where 16:9 is only 180 px.
          style={{ ...controllerStyle, aspectRatio: "16 / 9", display: "block", minHeight: "11rem" }}
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
          <div className="dark flex w-full flex-col bg-transparent pt-8" data-slot="player-controls">
            {live ? null : <MediaTimeRange aria-label={title} className="p-2.5 w-full" />}
            <MediaControlBar className="w-full">
              {playButton()}
              {live ? null : (
                <MediaSeekBackwardButton className={skip ? "p-3" : "p-3 max-sm:hidden"} seekOffset={skipBack} aria-label={copy.back(skipBack)}>
                  <SkipGlyph name="rotate-ccw" seconds={skip ? skipBack : undefined} />
                </MediaSeekBackwardButton>
              )}
              {live ? null : (
                <MediaSeekForwardButton className={skip ? "p-3" : "p-3 max-sm:hidden"} seekOffset={skipForward} aria-label={copy.ahead(skipForward)}>
                  <SkipGlyph name="rotate-cw" seconds={skip ? skipForward : undefined} />
                </MediaSeekForwardButton>
              )}
              <MediaMuteButton aria-label={copy.mute} className="p-3 max-sm:hidden">
                <Icon slot="off" name="volume-x" />
                <Icon slot="low" name="volume-1" />
                <Icon slot="medium" name="volume-1" />
                <Icon slot="high" name="volume-2" />
              </MediaMuteButton>
              <MediaVolumeRange className="p-2.5 max-md:hidden" />
              {live ? <span className="p-2.5">{liveBadge}</span> : <MediaTimeDisplay showDuration className="p-2.5 tabular-nums" />}
              <span className="flex-1" aria-hidden />
              {sleepControl}
              {rateMenu}
              <span className="contents max-sm:hidden">{chapterMenu}</span>
              {captions.length > 0 ? (
                <MediaCaptionsButton className="p-3" aria-label={copy.captions}>
                  <Icon slot="on" name="captions" />
                  <Icon slot="off" name="captions-off" />
                </MediaCaptionsButton>
              ) : null}
              {castButtons}
              {pip ? (
                <MediaPipButton aria-label={copy.pip} className="p-3 max-sm:hidden [&[mediapipunavailable]]:hidden">
                  <Icon slot="enter" name="picture-in-picture" />
                  <Icon slot="exit" name="picture-in-picture" />
                </MediaPipButton>
              ) : null}
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
    return withAmbient(videoNode);
  }

  const art = (size: string, spring = false, radius = "rounded-[var(--art-radius)]") => (
    <SafeImage
      src={poster}
      alt={posterAlt}
      kind={kind === "video" ? "video" : "music"}
      className={cn(
        "shrink-0 bg-muted object-cover",
        radius,
        spring && "motion-safe:transition-transform motion-safe:duration-[var(--art-spring-duration)] motion-safe:ease-[var(--art-spring-ease)]",
        spring && (playing ? "motion-safe:scale-100" : "motion-safe:scale-[var(--art-resting-scale)]"),
        size,
      )}
    />
  );
  // MUSIC-KIT-01: a drag up on the mini bar opens the full player. Mouse is left alone (it has the expand button).
  const upOn = Boolean(swipeUpToExpand && onExpand);
  const skipOn = Boolean(swipeToSkip && (onNext || onPrevious));
  const swipeHandlers = upOn || skipOn
    ? {
        onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
          swiped.current = false;
          swipe.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY, id: event.pointerId };
        },
        onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (upOn && isSwipeUp(dx, dy)) {
            swiped.current = true;
            onExpand?.();
            return;
          }
          const side = skipOn ? swipeSideways(dx, dy) : 0;
          if (side === -1 && onNext) { swiped.current = true; onNext(upNext?.id); }
          else if (side === 1 && onPrevious) { swiped.current = true; onPrevious(); }
        },
        onPointerCancel: () => { swipe.current = null; },
        // The click that follows a swipe on the expand button must not open it a second time.
        onClickCapture: (event: { stopPropagation: () => void; preventDefault: () => void }) => {
          if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation(); }
        },
      }
    : {};

  const transport = (big: boolean) => (
    <div className="flex items-center gap-1" data-slot="player-transport">
      {onPrevious ? (
        <Button variant="ghost" size="icon" aria-label={copy.previous} onClick={onPrevious}>
          <Icon name="skip-back" />
        </Button>
      ) : null}
      {big && !live ? (
        <MediaSeekBackwardButton className="p-3" seekOffset={skip?.back ?? 15} aria-label={copy.back(skip?.back ?? 15)}>
          <SkipGlyph name="rotate-ccw" seconds={skip?.back} />
        </MediaSeekBackwardButton>
      ) : null}
      {playButton(big)}
      {big && !live ? (
        <MediaSeekForwardButton className="p-3" seekOffset={skip?.forward ?? 30} aria-label={copy.ahead(skip?.forward ?? 30)}>
          <SkipGlyph name="rotate-cw" seconds={skip?.forward} />
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
    return withAmbient(
      // Shortcuts are delegated from the focused control inside, the way a media player takes them.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={rootRef}
        data-slot="player"
        data-layout="mini"
        data-placement={placement}
        data-swipe-up={upOn ? "true" : undefined}
        data-swipe-skip={skipOn ? "true" : undefined}
        onKeyDown={onKeyDown}
        {...swipeHandlers}
        className={cn(
          "relative w-full bg-card text-card-foreground",
          upOn && !skipOn && "touch-pan-x",
          skipOn && !upOn && "touch-pan-y",
          upOn && skipOn && "touch-none",
          placement === "dock" && "sticky bottom-0 z-30 border-t border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] backdrop-blur-md",
        )}
      >
        {live ? null : (
          <div aria-hidden data-slot="player-hairline" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-border">
            <div className="h-full bg-[var(--progress-accent)]" style={{ width: `${progressPct}%` }} />
          </div>
        )}
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
                {live ? liveBadge : null}
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
            {onClose ? <Button variant="ghost" size="icon" aria-label={`${copy.close}: ${title}`} title={`${copy.close}: ${title}`} onClick={onClose}><Icon name="x" /></Button> : null}
          </div>
        </MediaController>
      </div>
    );
  }

  // layout === "audio": Now playing (NOW-PLAYING-01). A large square cover over a static gradient from its colors, the title
  // and artist, the scrubber with elapsed and remaining time, shuffle, previous, a large play disc, next and repeat, then a
  // quiet row of tools. Wide screens put the cover on the left and the controls on the right.
  const musicMode = onShuffle !== undefined || onRepeat !== undefined;
  const seekButtons = !live && (skip !== undefined || !musicMode);
  const tool = "";
  const repeatMode = repeat ?? "off";
  const repeatLabel = repeatMode === "one" ? copy.repeatOne : repeatMode === "all" ? copy.repeatAll : copy.repeatOff;
  const HeartGlyph = getIcon("heart");
  return withAmbient(
    // Shortcuts are delegated from the focused control inside, the way a media player takes them.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={rootRef} data-slot="player" data-layout="audio" onKeyDown={onKeyDown} className={cn("relative isolate w-full", audioLayout === "container" && "@container/player")}>
      <ArtGradient art={poster} className="h-full" />
      <MediaController key="controller" ref={controllerRef as never} audio noHotkeys autohide="-1" defaultStreamType="on-demand" style={audioVars}>
        {mediaElement}
        <div className={audioLayout === "container" ? "grid w-full gap-8 @md/player:grid-cols-2 @md/player:items-center" : "grid w-full gap-8 sm:grid-cols-2 sm:items-center"}>
          {transcriptOpen && transcript?.length ? <div className="aspect-square w-full max-w-md justify-self-center max-sm:w-[60vw] overflow-hidden rounded-[var(--radius-card)] bg-card p-4" data-slot="player-transcript"><TranscriptPanel lines={transcript} getMedia={() => media.current} onSeek={seekTo} label={transcriptLabel} className="h-full" /></div> : lyricsOpen ? <div className="aspect-square w-full max-w-md justify-self-center max-sm:w-[60vw] overflow-y-auto rounded-[var(--radius-card)] bg-card p-5" data-slot="player-lyrics"><LyricsList lines={lyrics?.lines} text={lyrics?.text} currentTime={time} onSeek={t => { if (media.current) media.current.currentTime = t; }} labels={{ label: lyricsLabel, empty: lyricsLoading ? i18n._({ id: "ui.Looking for lyrics...", message: "Looking for lyrics..." }) : lyricsEmptyText }} largeCurrent blurByDistance={lyricsBlur} /></div> : art("aspect-square w-full max-w-md justify-self-center max-sm:w-[60vw]", artSpring, "rounded-[var(--radius-card)]")}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="min-w-0" data-slot="player-titles">
              <p className="truncate text-2xl font-bold tracking-tight">{title}</p>
              {subtitle ? <p className="text-muted-foreground truncate text-lg">{subtitle}</p> : null}
              {chapterIndex >= 0 ? <p className="text-muted-foreground truncate text-sm">{chapters[chapterIndex]!.title}</p> : null}
            </div>
            {live ? (
              <div className="flex justify-center">{liveBadge}</div>
            ) : (
              <div className="flex flex-col" data-slot="player-scrubber">
                <MediaTimeRange aria-label={title} className="p-2.5 w-full" />
                <div className="text-muted-foreground flex justify-between px-2.5 text-sm tabular-nums">
                  <span>{formatTime(time)}</span>
                  <span>-{formatTime(Number.isFinite(duration) ? Math.max(0, duration - time) : 0)}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3" data-slot="player-transport">
              {onShuffle ? (
                <Button type="button" variant="ghost" size="icon" className={cn(tool, shuffle && "text-primary")} aria-label={copy.shuffle} aria-pressed={shuffle === true} data-slot="player-shuffle" onClick={onShuffle}>
                  <Icon name="shuffle" />
                </Button>
              ) : null}
              {onPrevious ? (
                <Button variant="ghost" size="icon" className={tool} aria-label={copy.previous} onClick={onPrevious}>
                  <Icon name="skip-back" />
                </Button>
              ) : null}
              {seekButtons ? (
                <MediaSeekBackwardButton className="p-3" seekOffset={skip?.back ?? 15} aria-label={copy.back(skip?.back ?? 15)}>
                  <SkipGlyph name="rotate-ccw" seconds={skip?.back} />
                </MediaSeekBackwardButton>
              ) : null}
              {playButton(true)}
              {seekButtons ? (
                <MediaSeekForwardButton className="p-3" seekOffset={skip?.forward ?? 30} aria-label={copy.ahead(skip?.forward ?? 30)}>
                  <SkipGlyph name="rotate-cw" seconds={skip?.forward} />
                </MediaSeekForwardButton>
              ) : null}
              {onNext ? (
                <Button variant="ghost" size="icon" className={tool} aria-label={copy.next} onClick={() => onNext(upNext?.id)}>
                  <Icon name="skip-forward" />
                </Button>
              ) : null}
              {onRepeat ? (
                <Button type="button" variant="ghost" size="icon" className={cn(tool, "relative", repeatMode !== "off" && "text-primary")} aria-label={repeatLabel} aria-pressed={repeatMode !== "off"} data-slot="player-repeat" data-mode={repeatMode} onClick={onRepeat}>
                  <Icon name="repeat" />
                  {repeatMode === "one" ? <span aria-hidden data-slot="player-repeat-one" className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none font-bold text-primary-foreground">1</span> : null}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1" data-slot="player-tools">
              {onLike ? (
                <Button type="button" variant="ghost" size="icon" className={tool} aria-label={liked ? copy.unlike : copy.like} aria-pressed={liked} data-slot="player-like" onClick={() => { if (!liked) likeHaptic(); onLike(); }}>
                  <HeartGlyph key={likePops} aria-hidden className={cn("size-6", liked && "fill-current text-primary", liked && likePops > 0 && LIKE_POP_CLASS)} />
                </Button>
              ) : null}
              {actionsSlot}
              {onQueue ? <Button type="button" variant="ghost" size="icon" className={tool} aria-label={copy.upNext} data-slot="player-queue" onClick={onQueue}><Icon name="list-music" /></Button> : null}
              {lyrics ? <Button type="button" variant={lyricsOpen ? "secondary" : "ghost"} size="icon" className={tool} aria-label={lyricsLabel} aria-pressed={lyricsOpen} onClick={() => { if (!lyricsOpen && !lyrics?.text && !lyrics?.lines?.length && requestedLyricsFor.current !== src) { requestedLyricsFor.current = src; onLyricsOpen?.(); } setTranscriptOpen(false); setLyricsOpen(value => !value); }}><Icon name="mic-vocal" /></Button> : null}
              {transcript?.length ? <Button type="button" variant={transcriptOpen ? "secondary" : "ghost"} size="icon" className={tool} aria-label={transcriptLabel} aria-pressed={transcriptOpen} data-slot="player-transcript-toggle" onClick={() => { setLyricsOpen(false); setTranscriptOpen((value) => !value); }}><Icon name="scroll-text" /></Button> : null}
              {sleepControl}
              {onShare ? <Button type="button" variant="ghost" size="icon" className={tool} aria-label={copy.share} data-slot="player-share" onClick={onShare}><Icon name="share" /></Button> : null}
              {rateMenu}
              {chapterMenu}
              {castButtons}
              <span className="flex items-center max-sm:hidden" data-slot="player-volume">
                <MediaMuteButton aria-label={copy.mute} className="p-3">
                  <Icon slot="off" name="volume-x" />
                  <Icon slot="low" name="volume-1" />
                  <Icon slot="medium" name="volume-1" />
                  <Icon slot="high" name="volume-2" />
                </MediaMuteButton>
                <MediaVolumeRange className="p-2.5 max-md:hidden" />
              </span>
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

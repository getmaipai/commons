"use client";

// VIDEO-STUDIO-04 and -05 (K3, K4): TrackStudio, the kit's timeline editor with a client-side preview. Three fixed lanes (Video, Voice, Music) with a
// ruler, thumbnails and waveforms drawn inside the Element, one playhead, a transport, trim handles, Split, Delete piece, Add a clip, voice and music,
// per-lane Level, Mute and Solo, and the panels Volume, Fades, Crossfade and Level, which act on the selected piece. The preview plays in the browser
// (track-studio-engine.ts) and renders nothing: it cuts where the export dissolves, and says so. Draws on the studio tokens only. The plan, the peaks,
// the thumbnails and every media element live in this component's own state and are gone when it unmounts or the clip relocks (K4).

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ContrastIcon, XIcon, PauseIcon, PlayIcon, PlusIcon, Redo2Icon, RepeatIcon, ScissorsIcon, SkipBackIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { cn, FOCUS_RING, hueTintBackground } from "@/kit/utils";
import { useIsPhoneLayout } from "@/kit/hooks/useIsPhoneLayout";
import { Button } from "@/kit/ui/button";
import { Slider } from "@/kit/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/kit/ui/tooltip";
import { Switch } from "@/kit/ui/switch";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { eyebrow } from "./surfaces";
import { LockTile } from "./adult-lock";
import { MAX_AUDIO_ELEMENTS, PreviewEngine, type EngineStats } from "./track-studio-engine";
import {
  COMPRESSOR_LIMITS, EQ_BANDS_HZ, EQ_GAIN_MAX_DB, EQ_GAIN_MIN_DB, bandText, compressorIsNeutral, effectsAreNeutral, eqIsFlat, makeSelection, readEffects, readSelection, resetCompressor, resetEq,
  setCompressor, setEqBand, type CompressorSettings, type StudioEffects, type StudioSelection,
} from "./track-studio-fx";
import { THUMB_STEP_S, decodePeaks, fetchGivenPeaks, makeThumbnails, sliceBars } from "./track-studio-media";
import { resolveCompare, type StudioCompare } from "./track-studio-compare";
import { StudioCompareBar } from "./track-studio-compare-bar";
import {
  CROSSFADE_MAX_S, FADE_MAX_S, LEVEL_DB_MAX, LEVEL_DB_MIN, MIN_PIECE_S, effectiveCrossfade, filmLength, findPiece, formatTime, laneOf, layoutLane, pieceDuration, pieceEnvelope, readState, rulerTicks,
  isStemLane, setDuck, setLaneLevel, setLaneMuted, setPieceLevel, spokenTime, type LaneId, type StudioLane, type StudioPiece, type StudioState,
} from "./track-studio-model";
import {
  DEFAULT_LEVEL_STEPS, DEFAULT_LIMITS, addPiece, applyBalance, canRedo, canUndo, crossfadeAfter, currentBalance, deletePiece, movePiece, planChanged, pushHistory,
  redoHistory, resetPieceFades, resetPieceVolume, setCrossfadeAfter, setFadeIn, setFadeOut, snap, snapEdges, splitAt, startHistory, toPlan, trimEndBy, trimStartBy, undoHistory,
  type EditResult, type History, type LevelStep, type StudioLimits, type StudioPlan,
} from "./track-studio-edit";
import { i18n, kitLocaleTag } from "@/kit/i18n";

export type { StudioPiece, StudioLane, StudioState } from "./track-studio-model";
export type { StudioPlan, LevelStep, StudioLimits } from "./track-studio-edit";
export { toPlan } from "./track-studio-edit";
export { readState, STEM_IDS, STEM_LANE_IDS, isStemLane, type StemId, type StemLaneId, type LaneId } from "./track-studio-model";
export { EQ_BANDS_HZ, defaultEffects, readEffects, makeSelection, type StudioEffects, type CompressorSettings, type StudioSelection } from "./track-studio-fx";

export type StudioTool = "split" | "delete" | "add_clip" | "add_voice" | "add_music";
export type StudioPanel = "volume" | "fades" | "crossfade" | "level" | "eq" | "compressor";
export const ALL_TOOLS: readonly StudioTool[] = ["split", "delete", "add_clip", "add_voice", "add_music"];
export const ALL_PANELS: readonly StudioPanel[] = ["volume", "fades", "crossfade", "level"];
/** MP-03: what an audio studio (`kind="audio"`) shows when the host passes no `panels`. */
export const AUDIO_PANELS: readonly StudioPanel[] = ["volume", "fades", "eq", "compressor"];

/** What the host answers when the person adds a clip, a voice or a song. */
export interface StudioAdded { ref: string; src: string; label?: string; duration_s: number; poster?: string }
export interface StudioMakeMore { key: string; label: string; badge?: string; disabledReason?: string; onSelect: (context: { piece: StudioPiece | null; at_s: number }) => void }

export interface TrackStudioProps {
  /** The clip's raw lanes (see `readState`). Read once per `resetKey`. */
  lanes: unknown;
  /** Changes when a different clip opens; the plan, undo history and everything drawn start over. */
  resetKey?: string;
  title?: string;
  poster?: string;
  /** `video` draws the monitor; `audio` draws no monitor and a clock from the wall. */
  kind?: "video" | "audio";
  /** Audio: what Compare plays against the song. Two sources, or the versions with the current one named (the newest earlier version is used). Absent: no Compare control. */
  compare?: StudioCompare;
  /** A locked clip: draws ONE lock tile and nothing else. No element, request, peak, thumbnail or plan. */
  locked?: boolean;
  lockedMaking?: boolean;
  onUnlock?: () => void;
  tools?: readonly StudioTool[];
  toolReasons?: Partial<Record<"add_clip" | "add_voice" | "add_music", string>>;
  panels?: readonly StudioPanel[];
  limits?: Partial<StudioLimits>;
  levelSteps?: readonly LevelStep[];
  exportLabel?: string;
  exportDisabledReason?: string;
  /** Press of Export: the plan. The Element keeps the plan after it. */
  onExport?: (plan: StudioPlan) => void;
  /** Press of an Add button: resolves with the piece to add, or null when the person cancels. Absent: the three Add buttons are not drawn. */
  onAdd?: (kind: "clip" | "voice" | "music") => Promise<StudioAdded | null>;
  makeMore?: readonly StudioMakeMore[];
  /** The export job's card, drawn in the monitor's place with Keep editing. */
  exportCard?: ReactNode;
  onKeepEditing?: () => void;
  /** MP-03 (audio): the EQ and compressor the preview plays. Controlled when given; otherwise the Element keeps them and starts from flat. The preview is
   * listening only: the host persists them when the person applies. */
  effects?: StudioEffects;
  /** Every change to the EQ or the compressor, and whether the result differs from flat (nothing to apply when false). */
  onEffectsChange?: (effects: StudioEffects, changed: boolean) => void;
  /** The EQ and compressor controls are drawn disabled with this reason (for example while a job runs). */
  effectsDisabledReason?: string;
  /** The panel the person opened. */
  onPanelChange?: (panel: StudioPanel) => void;
  /** MP-03 (audio): a time range in seconds, so the host can run an effect on a region. Controlled when given (null is no selection). */
  selection?: StudioSelection | null;
  onSelectionChange?: (selection: StudioSelection | null) => void;
  /** Called with the plan after every change, and whether it differs from the clip as opened. */
  onPlanChange?: (plan: StudioPlan, changed: boolean) => void;
  /** Measurements for the build: `thumbs_ms` (a strip), `peaks_ms` (a waveform), `seam_ms` (a cut between video pieces). */
  onMetric?: (name: string, value: number, detail: string) => void;
  /** Tests and the harness: where Web Audio comes from. Return null for none. */
  audioContext?: () => AudioContext | null;
}

const laneWord = (): Record<LaneId, string> => ({ "stem-vocals": i18n._({ id: "ui.Vocals", message: "Vocals" }), "stem-drums": i18n._({ id: "ui.Drums", message: "Drums" }), "stem-bass": i18n._({ id: "ui.Bass", message: "Bass" }), "stem-other": i18n._({ id: "ui.Other", message: "Other" }), video: i18n._({ id: "ui.Video", message: "Video" }), voice: i18n._({ id: "ui.Voice", message: "Voice" }), music: i18n._({ id: "ui.Music", message: "Music" }) });
const helpLine = (): string => i18n._({ id: "ui.Drag the handles at each end to trim. Press S to cut at the playhead.", message: "Drag the handles at each end to trim. Press S to cut at the playhead." });
const previewLine = (): string => i18n._({ id: "ui.The preview is what you hear in the Studio. It cuts where the export dissolves, and the final loudness is set at export. Export makes a new clip and keeps the old one.", message: "The preview is what you hear in the Studio. It cuts where the export dissolves, and the final loudness is set at export. Export makes a new clip and keeps the old one." });
const splitLabel = (): string => i18n._({ id: "ui.Split at playhead", message: "Split at playhead" });
// Constant forms for callers and tests that want the English text; rendering uses the functions above.
export const HELP_LINE = helpLine();
export const PREVIEW_LINE = previewLine();
export const SPLIT_LABEL = splitLabel();

const NUDGE_S = 0.1;
const NUDGE_BIG_S = 1;
const LABEL_W = 160;
const LABEL_W_PHONE = 112;
const LANE_H = 60;

// ---------------------------------------------------------------------------------------------------------------------
// The playhead time is read by many small parts at up to 40 Hz; it lives outside React state so only they re-render.

interface TimeStore { get(): number; set(t: number): void; subscribe(fn: () => void): () => void }
function createTimeStore(): TimeStore {
  let t = 0;
  const subs = new Set<() => void>();
  return { get: () => t, set: (v) => { if (v !== t) { t = v; subs.forEach((f) => f()); } }, subscribe: (f) => { subs.add(f); return () => { subs.delete(f); }; } };
}
function useTime(store: TimeStore, step = 0.05): number {
  // Quantised (down, so the clock never shows a second it has not reached) so a 40 Hz clock re-renders a small part a few times a second at most.
  return useSyncExternalStore(store.subscribe, () => Math.floor(store.get() / step + 1e-6) * step, () => 0);
}

// ---------------------------------------------------------------------------------------------------------------------
// History with coalescing: a drag or a slider is one undo step.

interface Hist { h: History<StudioState>; key: string | null; at: number }

// ---------------------------------------------------------------------------------------------------------------------

export function TrackStudio(props: TrackStudioProps) {
  if (props.locked) return <LockTile making={props.lockedMaking} onUnlock={props.onUnlock} shape="card" />;
  return <StudioBody key={props.resetKey ?? "clip"} {...props} />;
}

function StudioBody(props: TrackStudioProps) {
  const { onPlanChange, onMetric } = props;
  const tools = props.tools ?? ALL_TOOLS;
  const audioKind = (props.kind ?? "video") === "audio";
  const panels = props.panels ?? (audioKind ? AUDIO_PANELS : ALL_PANELS);
  const limits: StudioLimits = useMemo(() => ({ ...DEFAULT_LIMITS, ...props.limits }), [props.limits]);
  const steps = props.levelSteps ?? DEFAULT_LEVEL_STEPS;
  const isPhone = useIsPhoneLayout();
  const showVideo = (props.kind ?? "video") === "video";
  const initial = useMemo(() => readState(props.lanes), []); // eslint-disable-line react-hooks/exhaustive-deps -- one read per clip (resetKey remounts)
  const [hist, setHist] = useState<Hist>(() => ({ h: startHistory(initial), key: null, at: 0 }));
  const state = hist.h.present;
  const [selected, setSelected] = useState<string | null>(null);
  const [solo, setSolo] = useState<LaneId | null>(null);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<StudioPanel>(panels[0] ?? "volume");
  const [zoom, setZoom] = useState<number | null>(null);
  const [fxLocal, setFxLocal] = useState<StudioEffects>(() => readEffects(props.effects));
  const [selLocal, setSelLocal] = useState<StudioSelection | null>(null);
  const [showCard, setShowCard] = useState(false);
  const timeStore = useMemo(createTimeStore, []);
  const monitorRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  /** After a split or a delete the piece the person was on may be gone: focus moves to the piece now selected, or to the tracks. */
  const pendingFocus = useRef<string | null>(null);
  const [viewW, setViewW] = useState(0);

  const film = filmLength(state);
  const fx = useMemo(() => (props.effects !== undefined ? readEffects(props.effects) : fxLocal), [props.effects, fxLocal]);
  const { onEffectsChange, onSelectionChange, onPanelChange } = props;
  const changeFx = useCallback((next: StudioEffects) => { setFxLocal(next); onEffectsChange?.(next, !effectsAreNeutral(next)); }, [onEffectsChange]);
  const selection = useMemo(() => readSelection(props.selection !== undefined ? props.selection : selLocal, film), [props.selection, selLocal, film]);
  const setSelection = useCallback((next: StudioSelection | null) => { setSelLocal(next); onSelectionChange?.(next); }, [onSelectionChange]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const labelW = isPhone ? LABEL_W_PHONE : LABEL_W;
  const fitPps = Math.min(80, Math.max(12, Math.floor((viewW - labelW - 16) / (Math.max(film, 10) + 2))));
  const pps = zoom ?? (viewW > 0 ? fitPps : 36);
  const timeW = Math.max(viewW - labelW, (film + 2) * pps);

  // -- history ---------------------------------------------------------------------------------------------------------
  const commit = useCallback((next: StudioState, key?: string) => {
    setHist((cur) => {
      if (next === cur.h.present) return cur;
      const now = Date.now();
      if (key && cur.key === key && now - cur.at < 1200 && canUndo(cur.h)) return { h: { ...cur.h, present: next, future: [] }, key, at: now };
      return { h: pushHistory(cur.h, next), key: key ?? null, at: now };
    });
  }, []);
  const apply = useCallback((result: EditResult, key?: string): boolean => {
    if (!result.ok) { setLine(result.line); return false; }
    setLine("");
    commit(result.state, key);
    if (result.selected !== undefined) { setSelected(result.selected); pendingFocus.current = result.selected ?? "group"; }
    if (result.seek !== undefined) void seekTo(result.seek);
    return true;
  }, [commit]); // eslint-disable-line react-hooks/exhaustive-deps -- seekTo is stable below

  const changed = useMemo(() => planChanged(initial, state), [initial, state]);
  const plan = useMemo(() => toPlan(state), [state]);
  useEffect(() => { onPlanChange?.(plan, changed); }, [plan, changed, onPlanChange]);

  // -- engine ----------------------------------------------------------------------------------------------------------
  useEffect(() => {
    const engine = new PreviewEngine(stateRef.current, {
      videoHost: showVideo ? monitorRef.current : null,
      poster: props.poster,
      videoLabel: props.title ? i18n._({ id: "ui.Preview of {title}", message: "Preview of {title}", values: { title: props.title } }) : i18n._({ id: "ui.Preview", message: "Preview" }),
      videoClass: "size-full object-contain",
      host: hostRef.current,
      audioContext: props.audioContext,
      maxAudio: audioKind ? Math.max(MAX_AUDIO_ELEMENTS, 8) : undefined,
      onTime: (t) => timeStore.set(t),
      onPlaying: setPlaying,
      onError: (l) => setLine(l),
    });
    engineRef.current = engine;
    engine.setState(stateRef.current);
    void engine.seek(0);
    const metrics = engine.stats;
    return () => {
      // The relock path (K4): stop, remove every src, release the graph; React then drops the plan, peaks and thumbnails with the component.
      engineRef.current = null;
      if (onMetric && metrics.seamsMs.length > 0) onMetric("seam_ms", Math.max(...metrics.seamsMs), metrics.seamsMs.join(","));
      engine.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one engine per clip
  useEffect(() => { engineRef.current?.setState(state); }, [state]);
  useEffect(() => { engineRef.current?.setEffects(fx); }, [fx]);
  useEffect(() => {
    const want = pendingFocus.current;
    if (!want) return;
    pendingFocus.current = null;
    const el = want === "group" ? scrollRef.current : sectionRef.current?.querySelector<HTMLElement>(`[data-piece="${CSS.escape(want)}"]`);
    el?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => { engineRef.current?.setSolo(solo); }, [solo]);
  useEffect(() => { engineRef.current?.setLoop(loop); }, [loop]);
  // The measurement hook for the build: the live engine stats, readable by the harness through `onMetric("stats", ...)`.
  useEffect(() => {
    if (!onMetric) return;
    const id = setInterval(() => { const e = engineRef.current; if (e) onMetric("stats", e.stats.driftsMs.length, JSON.stringify(statsSummary(e.stats))); }, 1000);
    return () => clearInterval(id);
  }, [onMetric]);

  const seekTo = useCallback(async (t: number) => { await engineRef.current?.seek(t); }, []);
  const togglePlay = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    if (e.isPlaying) e.pause(); else void e.play();
  }, []);

  // -- sources: peaks and thumbnails, made here and kept here ----------------------------------------------------------
  const media = useSourceMedia(state, onMetric);

  // -- layout measuring ------------------------------------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Keep the playhead in view while it plays.
  useEffect(() => timeStore.subscribe(() => {
    const el = scrollRef.current;
    if (!el || !engineRef.current?.isPlaying) return;
    const x = labelW + timeStore.get() * pps;
    if (x > el.scrollLeft + el.clientWidth - 24 || x < el.scrollLeft + labelW) el.scrollLeft = Math.max(0, x - labelW - 60);
  }), [timeStore, pps, labelW]);

  // -- actions ---------------------------------------------------------------------------------------------------------
  const playhead = () => timeStore.get();
  const sel = findPiece(state, selected);
  const doSplit = () => {
    const t = playhead();
    const s = sel;
    // Split the selected piece when the playhead is on it, else the video piece (or the first audio piece) under the playhead.
    const all = state.lanes.map((l) => l.id);
    const lanes: LaneId[] = s ? [s.lane.id, ...all.filter((l) => l !== s.lane.id)] : all;
    let last = "";
    for (const id of lanes) {
      const r = splitAt(state, id, t, limits);
      if (r.ok) { apply(r); return; }
      if (!last && laneOf(state, id).pieces.length > 0) last = r.line;
      if (id === lanes[0]) last = r.line;
    }
    setLine(last || i18n._({ id: "ui.Move the playhead onto a piece to split it.", message: "Move the playhead onto a piece to split it." }));
  };
  const doDelete = () => { if (!selected) { setLine(i18n._({ id: "ui.Pick a piece first.", message: "Pick a piece first." })); return; } apply(deletePiece(state, selected)); };
  const doAdd = async (kind: "clip" | "voice" | "music") => {
    if (!props.onAdd || busy) return;
    setBusy(kind);
    setLine("");
    try {
      const added = await props.onAdd(kind);
      if (!added) return;
      const piece: StudioPiece = {
        id: `${kind}-${added.ref}`, ref: added.ref, src: added.src, label: added.label, poster: added.poster, in_s: 0, out_s: added.duration_s, source_s: added.duration_s,
        at_s: 0, level_db: 0, fade_in_s: 0, fade_out_s: 0, crossfade_s: 0, duck: false,
      };
      apply(addPiece(stateRef.current, kind === "clip" ? "video" : kind, piece, playhead(), limits));
    } catch (e) {
      setLine(e instanceof Error && e.message ? e.message : i18n._({ id: "ui.That could not be added. Try again.", message: "That could not be added. Try again." }));
    } finally {
      setBusy(null);
    }
  };
  const undo = () => setHist((c) => ({ h: undoHistory(c.h), key: null, at: 0 }));
  const redo = () => setHist((c) => ({ h: redoHistory(c.h), key: null, at: 0 }));
  const doExport = () => {
    if (!props.onExport) return;
    engineRef.current?.pause();
    setShowCard(true);
    props.onExport(plan);
  };

  // -- the range selection (audio): a drag on the ruler or a lane; a plain press still moves the playhead ----------------------------------
  const dragRange = useRef<{ anchor: number; x: number; moved: boolean } | null>(null);
  const range: RangeHandlers | null = audioKind
    ? {
        start: (clientX, t) => { dragRange.current = { anchor: t, x: clientX, moved: false }; },
        move: (clientX, t) => {
          const d = dragRange.current;
          if (!d) return false;
          if (!d.moved && Math.abs(clientX - d.x) < 4) return false;
          d.moved = true;
          setSelection(makeSelection(d.anchor, t, film));
          return true;
        },
        end: () => { dragRange.current = null; },
      }
    : null;
  // An audio studio with stems shows the stems, not three empty lanes; the video lane is never drawn without a picture.
  // An audio studio draws only lanes that have content, the stem lanes the host listed, and the lanes the host offers an Add for.
  const offers = (id: LaneId) => !!props.onAdd && tools.includes(id === "voice" ? "add_voice" : "add_music");
  const visibleLanes = audioKind ? state.lanes.filter((l) => l.id !== "video" && (isStemLane(l.id) || l.pieces.length > 0 || ((l.id === "voice" || l.id === "music") && offers(l.id)))) : state.lanes;
  // Compare (audio): the earlier version against the current one, the same rule as the ImageEditor's.
  const comparePair = useMemo(() => (audioKind ? resolveCompare(props.compare) : null), [audioKind, props.compare]);
  const [comparing, setComparing] = useState(false);
  const canCompare = !!comparePair;
  const toggleCompare = () => {
    if (!comparePair) return;
    setComparing((on) => { if (!on) engineRef.current?.pause(); return !on; });
  };

  // -- keyboard --------------------------------------------------------------------------------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [role='slider'], [role='radio']")) {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z")) return;
    }
    const onButton = target.closest("button") && !target.closest("[data-piece]");
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape" && selectionRef.current && !mod) { e.preventDefault(); setSelection(null); return; }
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod || e.altKey) return;
    if ((e.key === "c" || e.key === "C") && audioKind && props.compare) { e.preventDefault(); toggleCompare(); return; }
    if (e.key === " " && !onButton) { e.preventDefault(); togglePlay(); return; }
    if (onButton) return;
    if (audioKind && (e.key === "[" || e.key === "]")) {
      e.preventDefault();
      const p = playhead();
      const cur = selectionRef.current;
      if (e.key === "[") setSelection(makeSelection(p, cur && cur.end_s > p ? cur.end_s : film, film));
      else setSelection(makeSelection(cur && cur.start_s < p ? cur.start_s : 0, p, film));
      return;
    }
    const step = e.shiftKey ? NUDGE_BIG_S : NUDGE_S;
    if (e.key === "ArrowLeft") { e.preventDefault(); void seekTo(Math.max(0, playhead() - step)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); void seekTo(Math.min(film, playhead() + step)); }
    else if (e.key === "Home") { e.preventDefault(); void seekTo(0); }
    else if (e.key === "End") { e.preventDefault(); void seekTo(film); }
    else if (e.key.toLowerCase() === "s" && tools.includes("split")) { e.preventDefault(); doSplit(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && tools.includes("delete")) { e.preventDefault(); doDelete(); }
  };

  // -- the parts -------------------------------------------------------------------------------------------------------
  const toolButtons = (
    <div className="flex flex-wrap gap-2" role="group" aria-label={i18n._({ id: "ui.Edit", message: "Edit" })}>
      {tools.includes("split") ? <ToolButton icon={<ScissorsIcon />} onClick={doSplit}>{splitLabel()}</ToolButton> : null}
      {tools.includes("delete") ? <ToolButton icon={<Trash2Icon />} onClick={doDelete} disabled={!selected}>{i18n._({ id: "ui.Delete piece", message: "Delete piece" })}</ToolButton> : null}
      {props.onAdd && tools.includes("add_clip") ? <ToolButton icon={<PlusIcon />} onClick={() => void doAdd("clip")} disabled={!!busy || !!props.toolReasons?.add_clip} title={props.toolReasons?.add_clip}>{i18n._({ id: "ui.Add a clip", message: "Add a clip" })}</ToolButton> : null}
      {props.onAdd && tools.includes("add_voice") ? <ToolButton icon={<PlusIcon />} onClick={() => void doAdd("voice")} disabled={!!busy || !!props.toolReasons?.add_voice} title={props.toolReasons?.add_voice}>{i18n._({ id: "ui.Add a voice", message: "Add a voice" })}</ToolButton> : null}
      {props.onAdd && tools.includes("add_music") ? <ToolButton icon={<PlusIcon />} onClick={() => void doAdd("music")} disabled={!!busy || !!props.toolReasons?.add_music} title={props.toolReasons?.add_music}>{i18n._({ id: "ui.Add music", message: "Add music" })}</ToolButton> : null}
    </div>
  );
  const reasons = (["add_clip", "add_voice", "add_music"] as const).map((k) => (props.onAdd && tools.includes(k) ? props.toolReasons?.[k] : undefined)).find(Boolean);

  const fxReason = props.effectsDisabledReason;
  const panelBodies: Record<StudioPanel, { title: string; reset: () => void; body: ReactNode }> = {
    volume: {
      title: i18n._({ id: "ui.Volume", message: "Volume" }),
      reset: () => selected && commit(resetPieceVolume(state, selected)),
      body: <VolumePanel state={state} selected={sel} commit={commit} />,
    },
    fades: {
      title: i18n._({ id: "ui.Fades", message: "Fades" }),
      reset: () => selected && commit(resetPieceFades(state, selected)),
      body: <FadesPanel selected={sel} state={state} commit={commit} />,
    },
    crossfade: {
      title: i18n._({ id: "ui.Crossfade", message: "Crossfade" }),
      reset: () => selected && commit(setCrossfadeAfter(state, selected, 0)),
      body: <CrossfadePanel state={state} selected={sel} commit={commit} />,
    },
    level: {
      title: i18n._({ id: "ui.Level", message: "Level" }),
      reset: () => commit(applyBalance(state, steps.find((s) => s.id === "balanced") ?? steps[Math.floor(steps.length / 2)]!)),
      body: <LevelPanel state={state} steps={steps} commit={commit} />,
    },
    eq: {
      title: i18n._({ id: "ui.EQ", message: "EQ" }),
      reset: () => changeFx(resetEq(fx)),
      body: <EqPanel fx={fx} change={changeFx} reason={fxReason} />,
    },
    compressor: {
      title: i18n._({ id: "ui.Compressor", message: "Compressor" }),
      reset: () => changeFx(resetCompressor(fx)),
      body: <CompressorPanel fx={fx} change={changeFx} reason={fxReason} />,
    },
  };

  return (
    <section ref={sectionRef} aria-label={i18n._({ id: "ui.Studio", message: "Studio" })} data-slot="track-studio" className="text-foreground grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" onKeyDown={onKeyDown}>
      <div ref={hostRef} hidden data-studio-host />
      <div role="status" aria-live="polite" className={cn("lg:col-span-2", line ? "text-destructive text-sm" : "sr-only")} data-slot="track-studio-line">{line}</div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1" data-slot="track-studio-export">
        {props.onExport ? (
          <>
            <Button size="lg" className="rounded-full" onClick={doExport} disabled={!changed || !!props.exportDisabledReason} data-slot="track-studio-export-button">
              {props.exportLabel ?? i18n._({ id: "ui.Export as a new clip", message: "Export as a new clip" })}
            </Button>
            {props.exportDisabledReason ? <p className="text-muted-foreground text-sm">{props.exportDisabledReason}</p> : !changed ? <p className="text-muted-foreground text-sm">{i18n._({ id: "ui.Change something to export it.", message: "Change something to export it." })}</p> : null}
          </>
        ) : null}
        <p className="text-muted-foreground hidden text-sm lg:block">{previewLine()}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1" data-slot="track-studio-main">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]" data-slot="track-studio-top">
        {showVideo ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface-stage)]" data-slot="track-studio-monitor">
            <div ref={monitorRef} className={cn("size-full", showCard && props.exportCard ? "hidden" : "")} data-slot="track-studio-video-host" />
            {showCard && props.exportCard ? (
              <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-2" data-slot="track-studio-export-card">
                {props.exportCard}
                <Button variant="secondary" size="sm" className="self-start rounded-full" onClick={() => { setShowCard(false); props.onKeepEditing?.(); }}>{i18n._({ id: "ui.Keep editing", message: "Keep editing" })}</Button>
              </div>
            ) : (
              <>
                <span className="bg-background/70 text-foreground absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold">{i18n._({ id: "ui.Preview", message: "Preview" })}</span>
                <TimeChip store={timeStore} film={film} />
              </>
            )}
          </div>
        ) : null}
        <div className="bg-card flex min-w-0 flex-col gap-3 rounded-2xl p-4" data-slot="track-studio-tools">
          <div className="flex items-center justify-between gap-2">
            <h3 className={eyebrow}>{i18n._({ id: "ui.Edit", message: "Edit" })}</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={i18n._({ id: "ui.Undo", message: "Undo" })} disabled={!canUndo(hist.h)} onClick={undo}><Undo2Icon /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={i18n._({ id: "ui.Redo", message: "Redo" })} disabled={!canRedo(hist.h)} onClick={redo}><Redo2Icon /></Button>
            </div>
          </div>
          {toolButtons}
          {reasons ? <p className="text-muted-foreground text-sm">{reasons}</p> : null}
          {props.makeMore && props.makeMore.length > 0 ? (
            <>
              <h3 className={eyebrow}>{i18n._({ id: "ui.Make more", message: "Make more" })}</h3>
              <div className="flex flex-wrap gap-2" role="group" aria-label={i18n._({ id: "ui.Make more", message: "Make more" })}>
                {props.makeMore.map((m) => (
                  <ToolButton key={m.key} onClick={() => m.onSelect({ piece: sel?.piece ?? null, at_s: playhead() })} disabled={!!m.disabledReason} title={m.disabledReason}>
                    {m.label}
                    {m.badge ? <span className="border-border rounded-full border px-1.5 text-[10px] leading-4">{m.badge}</span> : null}
                  </ToolButton>
                ))}
              </div>
            </>
          ) : null}
          <p className="text-muted-foreground text-sm">{helpLine()}</p>
        </div>
      </div>

      <div className="bg-card min-w-0 rounded-2xl" data-slot="track-studio-tracks">
        <div className="flex items-center justify-between gap-4 px-4 pt-3 pb-2"><h3 className={eyebrow}>{i18n._({ id: "ui.Tracks", message: "Tracks" })}</h3>{isPhone ? <div className="w-32"><ZoomControl pps={pps} setZoom={setZoom} compact /></div> : null}</div>
        {/* A scrollable region must be reachable by keyboard (axe scrollable-region-focusable); arrows then move the playhead. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div ref={scrollRef} className="relative overflow-x-auto overflow-y-hidden pb-2" role="group" aria-label={i18n._({ id: "ui.Tracks. Left and right arrows move the playhead. Space plays.", message: "Tracks. Left and right arrows move the playhead. Space plays." })} tabIndex={0}>
          <div className="relative" style={{ width: labelW + timeW }}>
            <Ruler store={timeStore} film={film} pps={pps} labelW={labelW} timeW={timeW} seek={(t) => void seekTo(t)} engine={engineRef} range={range} />
            {visibleLanes.map((lane) => (
              <LaneRow
                key={lane.id}
                lane={lane}
                state={state}
                pps={pps}
                labelW={labelW}
                timeW={timeW}
                selected={selected}
                solo={solo}
                media={media}
                select={setSelected}
                commit={commit}
                setSolo={(on) => setSolo(on ? lane.id : null)}
                seek={(t) => void seekTo(t)}
                playhead={playhead}
                setLine={setLine}
                range={range}
              />
            ))}
            {selection ? <SelectionBand selection={selection} pps={pps} labelW={labelW} /> : null}
            <Playhead store={timeStore} pps={pps} labelW={labelW} />
          </div>
        </div>
      </div>

      <div className={cn("bg-card flex min-w-0 flex-wrap items-center gap-3 rounded-2xl p-3", !audioKind && "z-10 max-sm:sticky max-sm:shadow-lg")} data-slot="track-studio-transport">
        <Button size={isPhone ? "default" : "lg"} className="rounded-full" onClick={togglePlay} aria-label={playing ? i18n._({ id: "ui.Pause", message: "Pause" }) : i18n._({ id: "ui.Play", message: "Play" })}>{playing ? <PauseIcon /> : <PlayIcon />}{playing ? i18n._({ id: "ui.Pause", message: "Pause" }) : i18n._({ id: "ui.Play", message: "Play" })}</Button>
        {isPhone ? (
          <Button variant="secondary" size="icon" className="rounded-full" aria-label={i18n._({ id: "ui.Back to start", message: "Back to start" })} onClick={() => void seekTo(0)}><SkipBackIcon /></Button>
        ) : (
          <Button variant="secondary" size="lg" className="rounded-full" onClick={() => void seekTo(0)}><SkipBackIcon />{i18n._({ id: "ui.Back to start", message: "Back to start" })}</Button>
        )}
        {isPhone ? (
          <Button variant="outline" size="icon" className="rounded-full" aria-label={i18n._({ id: "ui.Loop", message: "Loop" })} aria-pressed={loop} onClick={() => setLoop((v) => !v)}><RepeatIcon /></Button>
        ) : (
          <Button variant="outline" size="lg" className="rounded-full" aria-pressed={loop} onClick={() => setLoop((v) => !v)}><RepeatIcon />{i18n._({ id: "ui.Loop", message: "Loop" })}</Button>
        )}
        {isPhone ? null : <ZoomControl pps={pps} setZoom={setZoom} />}
        {audioKind && props.compare ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A span carries the tooltip when the button is disabled (a disabled button gets no pointer events). */}
                <span tabIndex={canCompare ? undefined : 0}>
                  <Button type="button" variant="outline" size="sm" className="rounded-full" aria-pressed={comparing} aria-keyshortcuts="C" disabled={!canCompare} data-slot="track-studio-compare-toggle" onClick={toggleCompare}>
                    <ContrastIcon aria-hidden />{i18n._({ id: "ui.Compare", message: "Compare" })}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {canCompare
                  ? i18n._({ id: "ui.Compare with the earlier version (C)", message: "Compare with the earlier version (C)" })
                  : i18n._({ id: "ui.Nothing to compare yet: this is the first version.", message: "Nothing to compare yet: this is the first version." })}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        <TimeText store={timeStore} film={film} />
      </div>
      {comparing && comparePair ? <StudioCompareBar pair={comparePair} startAt={playhead()} onClose={() => setComparing(false)} /> : null}
      {audioKind ? (
        <div className="bg-card flex min-w-0 flex-wrap items-center gap-3 rounded-2xl p-3" data-slot="track-studio-selection">
          <p role="status" aria-live="polite" className="text-sm" data-slot="track-studio-selection-readout">
            {selection
              ? i18n._({ id: "ui.Selection: {start} to {end}, {length}.", message: "Selection: {start} to {end}, {length}.", values: { start: formatClock(selection.start_s), end: formatClock(selection.end_s), length: spokenTime(selection.end_s - selection.start_s) } })
              : <span className="text-muted-foreground">{i18n._({ id: "ui.No selection. Drag on the ruler or a track to pick a range, or press [ and ] at the playhead.", message: "No selection. Drag on the ruler or a track to pick a range, or press [ and ] at the playhead." })}</span>}
          </p>
          <Button variant="secondary" size="sm" className="ml-auto rounded-full" onClick={() => setSelection(null)} disabled={!selection} title={selection ? undefined : i18n._({ id: "ui.There is no selection to clear.", message: "There is no selection to clear." })}>
            <XIcon />{i18n._({ id: "ui.Clear selection", message: "Clear selection" })}
          </Button>
        </div>
      ) : null}
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2" data-slot="track-studio-panels">
        <div className="bg-card flex flex-col gap-3 rounded-2xl p-4">
          <div role="radiogroup" aria-label={i18n._({ id: "ui.Panel", message: "Panel" })} className="grid grid-cols-2 gap-2">
            {panels.map((p) => (
              <Button key={p} variant={panelTab === p ? "default" : "secondary"} size={isPhone ? "sm" : "default"} role="radio" aria-checked={panelTab === p} className="rounded-full px-2" onClick={() => { setPanelTab(p); onPanelChange?.(p); }}>{panelBodies[p].title}</Button>
            ))}
          </div>
          <section aria-label={panelBodies[panelTab]?.title ?? panelBodies[panels[0]!]!.title}>
            <PanelBody panel={panelBodies[panelTab] ?? panelBodies[panels[0]!]} />
          </section>
        </div>
        <p className="text-muted-foreground mt-3 text-sm lg:hidden">{previewLine()}</p>
      </div>
    </section>
  );
}

function ZoomControl({ pps, setZoom, compact = false }: { pps: number; setZoom: (v: number) => void; compact?: boolean }) {
  return (
    <div className={cn("flex min-w-32 flex-1 flex-col gap-1", compact && "min-w-0")}>
      {compact ? null : <span className={eyebrow} aria-hidden="true">{i18n._({ id: "ui.Zoom", message: "Zoom" })}</span>}
      <Slider min={12} max={120} step={1} value={[pps]} onValueChange={([v]) => setZoom(v ?? pps)} aria-label={i18n._({ id: "ui.Zoom", message: "Zoom" })} />
    </div>
  );
}

function statsSummary(s: EngineStats) {
  const d = [...s.driftsMs].sort((a, b) => a - b);
  const q = (p: number) => (d.length ? d[Math.min(d.length - 1, Math.floor(p * d.length))]! : 0);
  return { samples: d.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: d.length ? d[d.length - 1]! : 0, corrections: s.corrections, seamsMs: s.seamsMs };
}

// ---------------------------------------------------------------------------------------------------------------------
// Small parts

function ToolButton({ children, icon, ...rest }: { children: ReactNode; icon?: ReactNode } & Omit<React.ComponentProps<typeof Button>, "children">) {
  return <Button variant="secondary" size="sm" className="rounded-full" {...rest}>{icon}{children}</Button>;
}

function PanelBody({ panel }: { panel: { title: string; reset: () => void; body: ReactNode } }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn(eyebrow, "text-foreground")}>{panel.title}</h3>
        <Button variant="ghost" size="sm" onClick={panel.reset}>{i18n._({ id: "ui.Reset", message: "Reset" })}<span className="sr-only"> {panel.title}</span></Button>
      </div>
      {panel.body}
    </>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between"><span className={eyebrow}>{label}</span><span className="text-sm tabular-nums">{value}</span></div>
      {children}
    </div>
  );
}

const formatFixed = (value: number, digits: number) => new Intl.NumberFormat(kitLocaleTag(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const dbText = (db: number) => `${db > 0 ? "+" : ""}${formatFixed(db, Math.abs(db % 1) < 0.05 ? 0 : 1)} dB`;
const secText = (s: number) => `${formatFixed(s, 1)} s`;

function Selected({ sel, none }: { sel: ReturnType<typeof findPiece>; none: string }) {
  return <p className="text-muted-foreground text-sm">{sel ? i18n._({ id: "ui.Selected: {name}", message: "Selected: {name}", values: { name: sel.piece.label ?? i18n._({ id: "ui.{lane} piece", message: "{lane} piece", values: { lane: laneWord()[sel.lane.id] } }) } }) : none}</p>;
}

function VolumePanel({ state, selected, commit }: { state: StudioState; selected: ReturnType<typeof findPiece>; commit: (s: StudioState, key?: string) => void }) {
  const p = selected?.piece;
  return (
    <>
      <Selected sel={selected} none={i18n._({ id: "ui.Pick a piece to change its volume.", message: "Pick a piece to change its volume." })} />
      <Field label={i18n._({ id: "ui.Level", message: "Level" })} value={p ? dbText(p.level_db) : "—"}>
        <Slider min={LEVEL_DB_MIN} max={LEVEL_DB_MAX} step={0.5} value={[p?.level_db ?? 0]} disabled={!p} aria-label={i18n._({ id: "ui.Level in decibels", message: "Level in decibels" })} onValueChange={([v]) => p && commit(setPieceLevel(state, p.id, v ?? 0), `level:${p.id}`)} />
      </Field>
      {selected?.lane.id === "music" ? (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className={eyebrow}>{i18n._({ id: "ui.Lower under speech", message: "Lower under speech" })}</span>
          <Switch checked={p!.duck} onCheckedChange={(v) => commit(setDuck(state, p!.id, v))} aria-label={i18n._({ id: "ui.Lower under speech", message: "Lower under speech" })} />
        </label>
      ) : null}
    </>
  );
}

function FadesPanel({ state, selected, commit }: { state: StudioState; selected: ReturnType<typeof findPiece>; commit: (s: StudioState, key?: string) => void }) {
  const p = selected?.piece;
  const max = p ? Math.min(FADE_MAX_S, pieceDuration(p)) : FADE_MAX_S;
  return (
    <>
      <Selected sel={selected} none={i18n._({ id: "ui.Pick a piece to fade it.", message: "Pick a piece to fade it." })} />
      <Field label={i18n._({ id: "ui.Fade in", message: "Fade in" })} value={p ? secText(p.fade_in_s) : "—"}>
        <Slider min={0} max={max} step={0.1} value={[p?.fade_in_s ?? 0]} disabled={!p} aria-label={i18n._({ id: "ui.Fade in, seconds", message: "Fade in, seconds" })} onValueChange={([v]) => p && commit(setFadeIn(state, p.id, v ?? 0), `fi:${p.id}`)} />
      </Field>
      <Field label={i18n._({ id: "ui.Fade out", message: "Fade out" })} value={p ? secText(p.fade_out_s) : "—"}>
        <Slider min={0} max={max} step={0.1} value={[p?.fade_out_s ?? 0]} disabled={!p} aria-label={i18n._({ id: "ui.Fade out, seconds", message: "Fade out, seconds" })} onValueChange={([v]) => p && commit(setFadeOut(state, p.id, v ?? 0), `fo:${p.id}`)} />
      </Field>
    </>
  );
}

function CrossfadePanel({ state, selected, commit }: { state: StudioState; selected: ReturnType<typeof findPiece>; commit: (s: StudioState, key?: string) => void }) {
  const x = selected ? crossfadeAfter(state, selected.piece.id) : null;
  const ready = x !== null;
  return (
    <>
      <p className="text-muted-foreground text-sm">{ready ? i18n._({ id: "ui.At the seam after {name}.", message: "At the seam after {name}.", values: { name: selected!.piece.label ?? i18n._({ id: "ui.this clip", message: "this clip" }) } }) : i18n._({ id: "ui.Pick a clip that has another clip after it.", message: "Pick a clip that has another clip after it." })}</p>
      <Field label={i18n._({ id: "ui.Length at the seam", message: "Length at the seam" })} value={ready ? (x === 0 ? i18n._({ id: "ui.Cut", message: "Cut" }) : secText(x)) : "—"}>
        <Slider min={0} max={CROSSFADE_MAX_S} step={0.1} value={[x ?? 0]} disabled={!ready} aria-label={i18n._({ id: "ui.Crossfade length, seconds", message: "Crossfade length, seconds" })} onValueChange={([v]) => ready && commit(setCrossfadeAfter(state, selected!.piece.id, v ?? 0), `x:${selected!.piece.id}`)} />
      </Field>
      <p className="text-muted-foreground text-sm">{i18n._({ id: "ui.Blends the two pictures and their sound where they meet. 0.3 to 1 second; 0 is a cut. The preview cuts the picture; the export dissolves it.", message: "Blends the two pictures and their sound where they meet. 0.3 to 1 second; 0 is a cut. The preview cuts the picture; the export dissolves it." })}</p>
    </>
  );
}

function LevelPanel({ state, steps, commit }: { state: StudioState; steps: readonly LevelStep[]; commit: (s: StudioState, key?: string) => void }) {
  const current = currentBalance(state, steps);
  return (
    <>
      <div role="radiogroup" aria-label={i18n._({ id: "ui.Level", message: "Level" })} className="flex flex-wrap gap-1.5">
        {steps.map((step) => (
          <Button key={step.id} variant={current === step.id ? "default" : "secondary"} size="sm" role="radio" aria-checked={current === step.id} className="rounded-full px-3" onClick={() => commit(applyBalance(state, step))}>{step.label}</Button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">{i18n._({ id: "ui.How loud the voice and music sit against the clip's own sound.", message: "How loud the voice and music sit against the clip's own sound." })}</p>
    </>
  );
}

function EqPanel({ fx, change, reason }: { fx: StudioEffects; change: (fx: StudioEffects) => void; reason?: string }) {
  const off = !!reason;
  return (
    <>
      <div className="grid grid-cols-6 gap-1" role="group" aria-label={i18n._({ id: "ui.Six-band equalizer", message: "Six-band equalizer" })} data-slot="track-studio-eq">
        {EQ_BANDS_HZ.map((hz, i) => (
          <div key={hz} className="flex min-w-0 flex-col items-center gap-2">
            <span className="text-xs tabular-nums" data-eq-value={i}>{dbText(fx.eq[i] ?? 0)}</span>
            <Slider orientation="vertical" min={EQ_GAIN_MIN_DB} max={EQ_GAIN_MAX_DB} step={0.5} value={[fx.eq[i] ?? 0]} disabled={off} aria-label={i18n._({ id: "ui.EQ {band}, gain in decibels", message: "EQ {band}, gain in decibels", values: { band: bandText(hz) } })} onValueChange={([v]) => change(setEqBand(fx, i, v ?? 0))} />
            <span className={cn(eyebrow, "text-[10px]")}>{bandText(hz)}</span>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">{reason ?? (eqIsFlat(fx.eq) ? i18n._({ id: "ui.Flat. Move a band to shape the sound. You hear it in the preview; the saved song changes when you apply it.", message: "Flat. Move a band to shape the sound. You hear it in the preview; the saved song changes when you apply it." }) : i18n._({ id: "ui.You hear this in the preview. The saved song changes when you apply it.", message: "You hear this in the preview. The saved song changes when you apply it." }))}</p>
    </>
  );
}

function CompressorPanel({ fx, change, reason }: { fx: StudioEffects; change: (fx: StudioEffects) => void; reason?: string }) {
  const c = fx.compressor;
  const L = COMPRESSOR_LIMITS;
  const off = !!reason;
  const row = (key: keyof CompressorSettings, label: string, aria: string, value: string) => (
    <Field label={label} value={value} key={key}>
      <Slider min={L[key].min} max={L[key].max} step={L[key].step} value={[c[key]]} disabled={off} aria-label={aria} onValueChange={([v]) => change(setCompressor(fx, { [key]: v ?? c[key] }))} />
    </Field>
  );
  return (
    <>
      {row("threshold_db", i18n._({ id: "ui.Threshold", message: "Threshold" }), i18n._({ id: "ui.Compressor threshold, decibels", message: "Compressor threshold, decibels" }), dbText(c.threshold_db))}
      {row("ratio", i18n._({ id: "ui.Ratio", message: "Ratio" }), i18n._({ id: "ui.Compressor ratio", message: "Compressor ratio" }), `${formatFixed(c.ratio, 1)}:1`)}
      {row("attack_ms", i18n._({ id: "ui.Attack", message: "Attack" }), i18n._({ id: "ui.Compressor attack, milliseconds", message: "Compressor attack, milliseconds" }), `${formatFixed(c.attack_ms, 0)} ms`)}
      {row("release_ms", i18n._({ id: "ui.Release", message: "Release" }), i18n._({ id: "ui.Compressor release, milliseconds", message: "Compressor release, milliseconds" }), `${formatFixed(c.release_ms, 0)} ms`)}
      {row("makeup_db", i18n._({ id: "ui.Makeup", message: "Makeup" }), i18n._({ id: "ui.Compressor makeup gain, decibels", message: "Compressor makeup gain, decibels" }), dbText(c.makeup_db))}
      <p className="text-muted-foreground text-sm">{reason ?? (compressorIsNeutral(c) ? i18n._({ id: "ui.Off. Raise the ratio above 1 to turn it on. You hear it in the preview; the saved song changes when you apply it.", message: "Off. Raise the ratio above 1 to turn it on. You hear it in the preview; the saved song changes when you apply it." }) : i18n._({ id: "ui.You hear this in the preview. The saved song changes when you apply it.", message: "You hear this in the preview. The saved song changes when you apply it." }))}</p>
    </>
  );
}

function TimeChip({ store, film }: { store: TimeStore; film: number }) {
  const t = useTime(store, 0.25);
  return <span className="bg-background/70 text-foreground absolute bottom-2 left-2 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums" aria-hidden="true">{formatTime(t)} / {formatTime(film)}</span>;
}
function TimeText({ store, film }: { store: TimeStore; film: number }) {
  const t = useTime(store, 0.25);
  return <span className="ml-auto font-mono text-sm tabular-nums" role="timer" aria-label={i18n._({ id: "ui.{current} of {total}", message: "{current} of {total}", values: { current: spokenTime(t), total: spokenTime(film) } })}>{formatTime(t)} / {formatTime(film)}</span>;
}

function Playhead({ store, pps, labelW }: { store: TimeStore; pps: number; labelW: number }) {
  const t = useTime(store, 0.02);
  return <div aria-hidden="true" data-slot="track-studio-playhead" className="bg-foreground pointer-events-none absolute top-0 bottom-0 z-20 w-px" style={{ left: labelW + t * pps }} />;
}

/** The press, move and release of a range drag (audio studios). `move` answers true while it is drawing a range, so the caller does not also seek. */
interface RangeHandlers { start: (clientX: number, t: number) => void; move: (clientX: number, t: number) => boolean; end: () => void }

const formatClock = (t: number): string => `${formatTime(t)}.${String(Math.floor((t % 1) * 10 + 1e-6))}`;

function SelectionBand({ selection, pps, labelW }: { selection: StudioSelection; pps: number; labelW: number }) {
  return <div aria-hidden="true" data-slot="track-studio-selection-band" className="bg-primary/15 border-primary pointer-events-none absolute top-0 bottom-0 z-10 border-x" style={{ left: labelW + selection.start_s * pps, width: Math.max(2, (selection.end_s - selection.start_s) * pps) }} />;
}

function Ruler({ store, film, pps, labelW, timeW, seek, engine, range }: { store: TimeStore; film: number; pps: number; labelW: number; timeW: number; seek: (t: number) => void; engine: React.RefObject<PreviewEngine | null>; range: RangeHandlers | null }) {
  const t = useTime(store, 0.05);
  const ticks = rulerTicks(Math.max(film, timeW / pps), pps);
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ wasPlaying: boolean } | null>(null);
  const at = (e: ReactPointerEvent) => {
    const r = rowRef.current!.getBoundingClientRect();
    return Math.min(film, Math.max(0, (e.clientX - r.left) / pps));
  };
  return (
    <div className="flex" data-slot="track-studio-ruler">
      <div className="bg-card sticky left-0 z-30 shrink-0" style={{ width: labelW }} />
      <div
        ref={rowRef}
        className="border-border relative h-8 cursor-pointer border-b"
        style={{ width: timeW }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { wasPlaying: engine.current?.isPlaying ?? false };
          if (drag.current.wasPlaying) engine.current?.pause();
          range?.start(e.clientX, at(e));
          seek(at(e));
        }}
        onPointerMove={(e) => { if (range?.move(e.clientX, at(e))) return; if (drag.current) seek(at(e)); }}
        onPointerUp={() => { const d = drag.current; drag.current = null; range?.end(); if (d?.wasPlaying) void engine.current?.play(); }}
        onPointerCancel={() => { drag.current = null; range?.end(); }}
      >
        {ticks.map((tick) => (
          <span key={tick} aria-hidden="true" className="text-muted-foreground border-border absolute top-0 h-full border-l pl-1 font-mono text-[11px] leading-8 select-none" style={{ left: tick * pps }}>{formatTime(tick)}</span>
        ))}
        <div
          role="slider"
          tabIndex={0}
          aria-label={i18n._({ id: "ui.Playhead", message: "Playhead" })}
          aria-valuemin={0}
          aria-valuemax={Math.round(film * 10) / 10}
          aria-valuenow={Math.round(t * 10) / 10}
          aria-valuetext={i18n._({ id: "ui.{current} of {total}", message: "{current} of {total}", values: { current: spokenTime(t), total: spokenTime(film) } })}
          className={cn("bg-foreground absolute top-0 z-10 h-3 w-3 -translate-x-1/2 rounded-b-sm [clip-path:polygon(0_0,100%_0,50%_100%)]", FOCUS_RING)}
          style={{ left: t * pps }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? NUDGE_BIG_S : NUDGE_S;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); seek(Math.max(0, store.get() - step)); }
            else if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); seek(Math.min(film, store.get() + step)); }
            else if (e.key === "Home") { e.preventDefault(); e.stopPropagation(); seek(0); }
            else if (e.key === "End") { e.preventDefault(); e.stopPropagation(); seek(film); }
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A lane

interface MediaState {
  peaks: Record<string, { peaks: number[]; duration: number } | "failed" | undefined>;
  thumbs: Record<string, { frames: string[]; duration: number } | undefined>;
}

interface LaneRowProps {
  lane: StudioLane;
  state: StudioState;
  pps: number;
  labelW: number;
  timeW: number;
  selected: string | null;
  solo: LaneId | null;
  media: MediaState;
  select: (id: string | null) => void;
  commit: (s: StudioState, key?: string) => void;
  setSolo: (on: boolean) => void;
  seek: (t: number) => void;
  playhead: () => number;
  setLine: (l: string) => void;
  range: RangeHandlers | null;
}

function LaneRow({ lane, state, pps, labelW, timeW, selected, solo, media, select, commit, setSolo, seek, playhead, setLine, range }: LaneRowProps) {
  const placed = layoutLane(lane);
  const hue = `--hue-${lane.hue}`;
  const name = laneWord()[lane.id];
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div className="border-border flex border-b last:border-b-0" data-lane={lane.id}>
      <div className="bg-card sticky left-0 z-30 flex shrink-0 gap-2 px-2 py-1.5" style={{ width: labelW, height: LANE_H, boxShadow: `inset 4px 0 0 var(${hue})` }}>
        <div className="flex min-w-0 flex-1 flex-col justify-between pl-2">
          <div className="flex items-start gap-1.5">
            <LaneToggle label={i18n._({ id: "ui.Mute {lane}", message: "Mute {lane}", values: { lane: name } })} text="M" on={lane.muted} onClick={() => commit(setLaneMuted(state, lane.id, !lane.muted))} />
            <span className="min-w-0 flex-1 text-xs leading-tight font-semibold break-words">{lane.label}</span>
            <LaneToggle label={i18n._({ id: "ui.Solo {lane}", message: "Solo {lane}", values: { lane: name } })} text="S" on={solo === lane.id} onClick={() => setSolo(solo !== lane.id)} />
          </div>
          <Slider min={LEVEL_DB_MIN} max={LEVEL_DB_MAX} step={0.5} value={[lane.level_db]} aria-label={i18n._({ id: "ui.{lane} level, decibels", message: "{lane} level, decibels", values: { lane: name } })} onValueChange={([v]) => commit(setLaneLevel(state, lane.id, v ?? 0), `lane:${lane.id}`)} />
        </div>
      </div>
      <div
        ref={bodyRef}
        role="group"
        aria-label={i18n._({ id: "ui.{lane} pieces", message: "{lane} pieces", values: { lane: name } })}
        className={cn("relative", lane.muted && "opacity-50")}
        style={{ width: timeW, height: LANE_H }}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          select(null);
          const r = e.currentTarget.getBoundingClientRect();
          const t = Math.max(0, (e.clientX - r.left) / pps);
          if (range) { e.currentTarget.setPointerCapture?.(e.pointerId); range.start(e.clientX, t); }
          seek(t);
        }}
        onPointerMove={range ? (e) => { const r = e.currentTarget.getBoundingClientRect(); range.move(e.clientX, Math.max(0, (e.clientX - r.left) / pps)); } : undefined}
        onPointerUp={range ? () => range.end() : undefined}
        onPointerCancel={range ? () => range.end() : undefined}
      >
        {placed.length === 0 ? <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs">{isStemLane(lane.id) ? i18n._({ id: "ui.No {lane} yet.", message: "No {lane} yet.", values: { lane: name.toLowerCase() } }) : lane.id === "voice" ? i18n._({ id: "ui.No voice yet.", message: "No voice yet." }) : lane.id === "music" ? i18n._({ id: "ui.No music yet.", message: "No music yet." }) : i18n._({ id: "ui.No clip.", message: "No clip." })}</span> : null}
        {placed.map((pl, i) => (
          <PieceView key={pl.piece.id} lane={lane} state={state} index={i} start={pl.start} piece={pl.piece} pps={pps} hue={hue} selected={selected === pl.piece.id} count={placed.length} media={media} select={select} commit={commit} playhead={playhead} setLine={setLine} />
        ))}
      </div>
    </div>
  );
}

function LaneToggle({ label, text, on, onClick }: { label: string; text: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold before:absolute before:-inset-3 before:content-['']", on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground", FOCUS_RING)}>{text}</button>
  );
}

interface PieceViewProps {
  lane: StudioLane; state: StudioState; index: number; start: number; piece: StudioPiece; pps: number; hue: string; selected: boolean; count: number; media: MediaState;
  select: (id: string | null) => void; commit: (s: StudioState, key?: string) => void; playhead: () => number; setLine: (l: string) => void;
}

let dragSeq = 0;

function PieceView({ lane, state, index, start, piece, pps, hue, selected, count, media, select, commit, playhead, setLine }: PieceViewProps) {
  const dur = pieceDuration(piece);
  const width = Math.max(8, dur * pps);
  const left = start * pps;
  const name = laneWord()[lane.id];
  const label = piece.label ?? i18n._({ id: "ui.{lane} {number}", message: "{lane} {number}", values: { lane: name, number: index + 1 } });
  const seam = lane.id === "video" && index > 0 ? effectiveCrossfade(lane.pieces[index - 1]!, piece) : 0;
  const origin = useRef<StudioState | null>(null);

  // Drag the piece (voice and music only: video pieces keep their order and ripple).
  const dragMove = useRef<{ x: number; at: number; key: string } | null>(null);
  const onBodyDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    select(piece.id);
    if (lane.id === "video") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragMove.current = { x: e.clientX, at: piece.at_s, key: `move:${piece.id}:${++dragSeq}` };
    origin.current = state;
  };
  const onBodyMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragMove.current;
    if (!d || !origin.current) return;
    const raw = d.at + (e.clientX - d.x) / pps;
    if (Math.abs(e.clientX - d.x) < 3) return;
    const edges = snapEdges(origin.current, piece.id, playhead());
    // Snap the start edge, then the end edge, to the other pieces (8 px).
    const thr = 8 / pps;
    const a = snap(raw, edges, thr);
    const b = snap(raw + dur, edges, thr);
    const at = a !== raw ? a : b !== raw + dur ? b - dur : raw;
    commit(movePiece(origin.current, piece.id, Math.max(0, at)), d.key);
  };
  const onBodyUp = () => { dragMove.current = null; origin.current = null; };

  const nudgeMove = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (lane.id === "video" || !e.altKey) return;
    const step = e.shiftKey ? NUDGE_BIG_S : NUDGE_S;
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); commit(movePiece(state, piece.id, Math.max(0, piece.at_s - step)), `move:${piece.id}`); }
    else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); commit(movePiece(state, piece.id, piece.at_s + step), `move:${piece.id}`); }
  };

  // Trim handles.
  const handle = (side: "start" | "end") => {
    const apply = (from: StudioState, delta: number): { ok: boolean; line?: string } => {
      const r = side === "start" ? trimStartBy(from, piece.id, delta) : trimEndBy(from, piece.id, delta);
      if (!r.ok) return { ok: false, line: r.line };
      commit(r.state, `trim:${side}:${piece.id}:${dragSeq}`);
      return { ok: true };
    };
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); select(piece.id); origin.current = state; dragSeq++; (e.currentTarget as HTMLElement).dataset.x = String(e.clientX); },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const x0 = Number((e.currentTarget as HTMLElement).dataset.x);
        if (!origin.current || Number.isNaN(x0)) return;
        const r = apply(origin.current, (e.clientX - x0) / pps);
        if (!r.ok && r.line) setLine(r.line);
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => { delete (e.currentTarget as HTMLElement).dataset.x; origin.current = null; dragSeq++; },
      onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
        const step = e.shiftKey ? NUDGE_BIG_S : NUDGE_S;
        const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        e.stopPropagation();
        const r = apply(state, dir * step);
        if (!r.ok && r.line) setLine(r.line);
      },
    };
  };
  const hs = handle("start");
  const he = handle("end");
  const hasPrev = true;

  const fadeIn = piece.fade_in_s;
  const fadeOut = piece.fade_out_s;
  const spokenVals = { lane: name, position: index + 1, count, label, time: spokenTime(dur) };
  const spoken = selected ? i18n._({ id: "ui.{lane} piece {position} of {count}, {label}, {time}, selected", message: "{lane} piece {position} of {count}, {label}, {time}, selected", values: spokenVals }) : i18n._({ id: "ui.{lane} piece {position} of {count}, {label}, {time}", message: "{lane} piece {position} of {count}, {label}, {time}", values: spokenVals });
  const env = useMemo(() => pieceEnvelope(lane, index), [lane, index]);

  return (
    <div className="absolute top-1 bottom-1" style={{ left, width }} data-piece-wrap={piece.id}>
      <button
        type="button"
        data-piece={piece.id}
        aria-pressed={selected}
        aria-label={spoken}
        onPointerDown={onBodyDown}
        onPointerMove={onBodyMove}
        onPointerUp={onBodyUp}
        onKeyDown={nudgeMove}
        onClick={() => select(piece.id)}
        className={cn("relative block size-full overflow-hidden rounded-md border text-left", lane.id === "video" ? "cursor-pointer" : "cursor-grab", selected ? "ring-primary ring-2" : "", FOCUS_RING)}
        style={{ borderColor: `var(${hue})`, background: hueTintBackground(hue), color: `var(${hue})` }}
      >
        {lane.id === "video" ? <Thumbs piece={piece} pps={pps} thumbs={media.thumbs[piece.src]} /> : <Wave piece={piece} pps={pps} width={width} peaks={media.peaks[piece.src]} />}
        <FadeRamps env={env} width={width} piece={piece} fadeIn={fadeIn} fadeOut={fadeOut} />
        <span className="bg-background/70 text-foreground pointer-events-none absolute top-0.5 left-1 max-w-[calc(100%-8px)] truncate rounded px-1 text-[11px] leading-4 font-semibold">{label}</span>
        {seam > 0 ? <span aria-hidden="true" data-seam className="border-primary pointer-events-none absolute inset-y-0 left-0 border-r bg-[repeating-linear-gradient(135deg,var(--primary)_0_2px,transparent_2px_5px)] opacity-70" style={{ width: Math.min(width, seam * pps) }} /> : null}
      </button>
      {selected && hasPrev ? (
        <>
          <TrimHandle side="start" label={i18n._({ id: "ui.Trim start of {label}", message: "Trim start of {label}", values: { label } })} valueText={i18n._({ id: "ui.Starts {time} into the file", message: "Starts {time} into the file", values: { time: spokenTime(piece.in_s) } })} now={piece.in_s} min={0} max={piece.out_s - MIN_PIECE_S} {...hs} />
          <TrimHandle side="end" label={i18n._({ id: "ui.Trim end of {label}", message: "Trim end of {label}", values: { label } })} valueText={i18n._({ id: "ui.Ends {time} into the file", message: "Ends {time} into the file", values: { time: spokenTime(piece.out_s) } })} now={piece.out_s} min={piece.in_s + MIN_PIECE_S} max={piece.source_s ?? piece.out_s + 600} {...he} />
        </>
      ) : null}
    </div>
  );
}

function TrimHandle({ side, label, valueText, now, min, max, ...rest }: { side: "start" | "end"; label: string; valueText: string; now: number; min: number; max: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={Math.round(min * 10) / 10}
      aria-valuemax={Math.round(max * 10) / 10}
      aria-valuenow={Math.round(now * 10) / 10}
      aria-valuetext={valueText}
      data-handle={side}
      className={cn("bg-primary absolute inset-y-0 z-10 w-2.5 cursor-ew-resize touch-none before:absolute before:-inset-x-3 before:inset-y-0 before:content-[''] after:bg-primary-foreground after:absolute after:inset-y-3 after:left-1/2 after:w-px", side === "start" ? "-left-1 rounded-l-md" : "-right-1 rounded-r-md", FOCUS_RING)}
      {...rest}
    />
  );
}

function Thumbs({ piece, pps, thumbs }: { piece: StudioPiece; pps: number; thumbs: { frames: string[]; duration: number } | undefined }) {
  const dur = pieceDuration(piece);
  const tileW = 96;
  const n = Math.max(1, Math.ceil((dur * pps) / tileW));
  const tileS = dur / n;
  return (
    <span aria-hidden="true" className="absolute inset-0 flex">
      {Array.from({ length: n }, (_, k) => {
        const t = piece.in_s + (k + 0.5) * tileS;
        const frame = thumbs?.frames[Math.min(thumbs.frames.length - 1, Math.max(0, Math.floor(t / THUMB_STEP_S)))];
        return frame ? <SafeImage key={k} src={frame} alt="" kind="video" loading="eager" draggable={false} className="h-full shrink-0 object-cover" style={{ width: (dur * pps) / n }} /> : <span key={k} className="bg-muted/60 h-full shrink-0" style={{ width: (dur * pps) / n }} />;
      })}
    </span>
  );
}

function Wave({ piece, pps, width, peaks: peaksIn }: { piece: StudioPiece; pps: number; width: number; peaks: { peaks: number[]; duration: number } | "failed" | undefined }) {
  const H = LANE_H - 8;
  let peaks = peaksIn;
  // Not decoded yet, or it could not be: a plain neutral bar, no error text (the audio still plays).
  if (peaks === "failed") peaks = undefined;
  const bars = Math.max(1, Math.min(600, Math.floor(width / 3)));
  const data = peaks ? sliceBars(peaks.peaks, peaks.duration, piece.in_s, piece.out_s, bars) : [];
  const step = width / bars;
  const d = data.map((v, i) => { const h = Math.max(1.5, v * (H - 6)); return `M${(i * step + step / 2).toFixed(1)} ${((H - h) / 2).toFixed(1)}v${h.toFixed(1)}`; }).join("");
  void pps;
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none">
      {peaks ? <path d={d} stroke="currentColor" strokeWidth={Math.max(1, Math.min(2.5, step * 0.6))} strokeLinecap="round" fill="none" opacity={0.9} /> : <rect x="0" y={H / 2 - 1} width={width} height="2" fill="currentColor" opacity={0.25} />}
    </svg>
  );
}

function FadeRamps({ env, width, piece, fadeIn, fadeOut }: { env: { t: number; g: number }[]; width: number; piece: StudioPiece; fadeIn: number; fadeOut: number }) {
  if (fadeIn <= 0 && fadeOut <= 0 && env.length <= 2) return null;
  const dur = pieceDuration(piece);
  const H = LANE_H - 8;
  const peak = Math.max(...env.map((p) => p.g), 1e-6);
  const pts = env.map((p) => `${((p.t / dur) * width).toFixed(1)},${(H - (p.g / peak) * (H - 2) - 1).toFixed(1)}`).join(" ");
  if (env.length <= 2 && fadeIn <= 0 && fadeOut <= 0) return null;
  return (
    <svg aria-hidden="true" data-fades className="text-foreground pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.85} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Peaks and thumbnails, made here and gone with the component

function useSourceMedia(state: StudioState, onMetric: TrackStudioProps["onMetric"]): MediaState {
  const [media, setMedia] = useState<MediaState>({ peaks: {}, thumbs: {} });
  const [generation, setGeneration] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const started = useRef(new Set<string>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const metric = useRef(onMetric);
  metric.current = onMetric;

  // One AbortController per mount (a dev double mount makes a second one): it is the relock and unmount path, aborting every fetch and
  // scratch video; the component's state, and with it every peak and frame, is dropped by React.
  useEffect(() => {
    const ctl = new AbortController();
    controller.current = ctl;
    started.current = new Set();
    queue.current = Promise.resolve();
    setGeneration((g) => g + 1);
    return () => { ctl.abort(); setMedia({ peaks: {}, thumbs: {} }); };
  }, []);

  const key = useMemo(() => state.lanes.flatMap((l) => l.pieces.map((p) => `${l.id}|${p.src}`)).join("\n"), [state]);
  // What the host handed over per source (its own peaks, or a file of them): used before any decode.
  const given = useRef(new Map<string, { peaks?: number[]; peaks_url?: string; duration: number }>());
  for (const l of state.lanes) for (const p of l.pieces) if (l.id !== "video" && !given.current.has(p.src)) given.current.set(p.src, { peaks: p.peaks, peaks_url: p.peaks_url, duration: p.source_s ?? p.out_s });
  useEffect(() => {
    const ctl = controller.current;
    if (!generation || !ctl || ctl.signal.aborted) return;
    for (const entry of key.split("\n")) {
      if (!entry) continue;
      const lane = entry.slice(0, entry.indexOf("|"));
      const src = entry.slice(entry.indexOf("|") + 1);
      const id = `${lane === "video" ? "t" : "p"}:${src}`;
      if (started.current.has(id)) continue;
      started.current.add(id);
      if (lane === "video") {
        // Thumbnails one source at a time: seeking is the cost, and several scratch videos at once would only fight.
        queue.current = queue.current.then(async () => {
          if (ctl.signal.aborted) return;
          try {
            const run = await makeThumbnails(src, ctl.signal, (i, url, duration) => {
              if (ctl.signal.aborted) return;
              setMedia((m) => {
                const cur = m.thumbs[src];
                const frames = cur ? [...cur.frames] : [];
                frames[i] = url;
                return { ...m, thumbs: { ...m.thumbs, [src]: { frames, duration } } };
              });
            });
            metric.current?.("thumbs_ms", run.ms, `${src}|${run.frames.length} frames|${run.duration.toFixed(2)} s`);
          } catch { /* aborted, or the file cannot be seeked: the tiles stay as placeholders */ }
        });
      } else {
        const t0 = performance.now();
        const own = given.current.get(src);
        const put = (p: { peaks: number[]; duration: number }, how: string) => { if (ctl.signal.aborted) return; setMedia((m) => ({ ...m, peaks: { ...m.peaks, [src]: p } })); metric.current?.("peaks_ms", Math.round(performance.now() - t0), `${src}|${p.peaks.length} bars|${p.duration.toFixed(2)} s|${how}`); };
        const decode = () => decodePeaks(src, ctl.signal).then(
          (p) => put(p, "decoded"),
          () => { if (!ctl.signal.aborted) setMedia((m) => ({ ...m, peaks: { ...m.peaks, [src]: "failed" } })); },
        );
        // The host's own peaks first: with them the browser never decodes the song. Its low-rate decode is the fallback, then a plain bar.
        if (own?.peaks && own.peaks.length >= 2 && own.duration > 0) put({ peaks: own.peaks, duration: own.duration }, "given");
        else if (own?.peaks_url && own.duration > 0) fetchGivenPeaks(own.peaks_url, own.duration, ctl.signal).then((p) => put(p, "given"), () => { if (!ctl.signal.aborted) void decode(); });
        else void decode();
      }
    }
  }, [key, generation]);
  return media;
}

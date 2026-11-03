"use client";

// VIDEO-STUDIO-04 (K3, K4): TrackStudio, the kit's timeline with a client-side preview. Three fixed lanes (Video, Voice, Music) with a ruler, thumbnails and
// waveforms drawn inside the Element, one playhead, a transport, per-lane Level, Mute and Solo, and the Volume panel, which acts on the selected piece. The
// preview plays in the browser (track-studio-engine.ts) and renders nothing: it cuts where the export dissolves, and says so. Draws on the studio tokens only.
// The peaks, the thumbnails and every media element live in this component's own state and are gone when it unmounts or the clip relocks (K4).
// Editing (trim, split, delete, add, fades, crossfade, level, export) is VIDEO-STUDIO-05.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PauseIcon, PlayIcon, RepeatIcon, SkipBackIcon } from "lucide-react";
import { cn, FOCUS_RING, hueTintBackground } from "@/kit/utils";
import { useIsPhoneLayout } from "@/kit/hooks/useIsPhoneLayout";
import { Button } from "@/kit/ui/button";
import { Slider } from "@/kit/ui/slider";
import { Switch } from "@/kit/ui/switch";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { eyebrow } from "./surfaces";
import { LockTile } from "./adult-lock";
import { PreviewEngine, type EngineStats } from "./track-studio-engine";
import { THUMB_STEP_S, decodePeaks, makeThumbnails, sliceBars } from "./track-studio-media";
import {
  LANE_IDS, LEVEL_DB_MAX, LEVEL_DB_MIN, effectiveCrossfade, filmLength, findPiece, formatTime, laneOf, layoutLane, pieceDuration, pieceEnvelope, readState, rulerTicks, setDuck,
  setLaneLevel, setLaneMuted, setPieceLevel, spokenTime, type LaneId, type StudioLane, type StudioPiece, type StudioState,
} from "./track-studio-model";

export type { StudioPiece, StudioLane, StudioState } from "./track-studio-model";
export { readState } from "./track-studio-model";

export interface TrackStudioProps {
  /** The clip's raw lanes (see `readState`). Read once per `resetKey`. */
  lanes: unknown;
  /** Changes when a different clip opens; everything drawn starts over. */
  resetKey?: string;
  title?: string;
  poster?: string;
  /** `video` draws the monitor; `audio` draws no monitor and a clock from the wall. */
  kind?: "video" | "audio";
  /** A locked clip: draws ONE lock tile and nothing else. No element, request, peak or thumbnail. */
  locked?: boolean;
  lockedMaking?: boolean;
  onUnlock?: () => void;
  /** Measurements for the build: `thumbs_ms` (a strip), `peaks_ms` (a waveform), `seam_ms` (a cut between video pieces), `stats` (drift). */
  onMetric?: (name: string, value: number, detail: string) => void;
  /** Tests and the harness: where Web Audio comes from. Return null for none. */
  audioContext?: () => AudioContext | null;
}

const LANE_WORD: Record<LaneId, string> = { video: "Video", voice: "Voice", music: "Music" };
export const PREVIEW_LINE = "The preview is what you hear in the Studio. It cuts where the export dissolves, and the final loudness is set at export.";

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

export function TrackStudio(props: TrackStudioProps) {
  if (props.locked) return <LockTile making={props.lockedMaking} onUnlock={props.onUnlock} shape="card" />;
  return <StudioBody key={props.resetKey ?? "clip"} {...props} />;
}

function StudioBody(props: TrackStudioProps) {
  const { onMetric } = props;
  const isPhone = useIsPhoneLayout();
  const showVideo = (props.kind ?? "video") === "video";
  const initial = useMemo(() => readState(props.lanes), []); // eslint-disable-line react-hooks/exhaustive-deps -- one read per clip (resetKey remounts)
  const [state, setState] = useState<StudioState>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [solo, setSolo] = useState<LaneId | null>(null);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState("");
  const [zoom, setZoom] = useState<number | null>(null);
  const timeStore = useMemo(createTimeStore, []);
  const monitorRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);

  const film = filmLength(state);
  const labelW = isPhone ? LABEL_W_PHONE : LABEL_W;
  const fitPps = Math.min(80, Math.max(12, Math.floor((viewW - labelW - 16) / (Math.max(film, 10) + 2))));
  const pps = zoom ?? (viewW > 0 ? fitPps : 36);
  const timeW = Math.max(viewW - labelW, (film + 2) * pps);
  const commit = useCallback((next: StudioState) => setState(next), []);

  // -- engine ----------------------------------------------------------------------------------------------------------
  useEffect(() => {
    const engine = new PreviewEngine(stateRef.current, {
      videoHost: showVideo ? monitorRef.current : null,
      poster: props.poster,
      videoLabel: props.title ? `Preview of ${props.title}` : "Preview",
      videoClass: "size-full object-contain",
      host: hostRef.current,
      audioContext: props.audioContext,
      onTime: (t) => timeStore.set(t),
      onPlaying: setPlaying,
      onError: (l) => setLine(l),
    });
    engineRef.current = engine;
    engine.setState(stateRef.current);
    void engine.seek(0);
    const metrics = engine.stats;
    return () => {
      // The relock path (K4): stop, remove every src, release the graph; React then drops the peaks and thumbnails with the component.
      engineRef.current = null;
      if (onMetric && metrics.seamsMs.length > 0) onMetric("seam_ms", Math.max(...metrics.seamsMs), metrics.seamsMs.join(","));
      engine.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one engine per clip
  useEffect(() => { engineRef.current?.setState(state); }, [state]);
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

  const sel = findPiece(state, selected);

  // -- keyboard --------------------------------------------------------------------------------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [role='slider'], [role='radio']")) return;
    const onButton = target.closest("button") && !target.closest("[data-piece]");
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === " " && !onButton) { e.preventDefault(); togglePlay(); return; }
    if (onButton) return;
    const step = e.shiftKey ? NUDGE_BIG_S : NUDGE_S;
    if (e.key === "ArrowLeft") { e.preventDefault(); void seekTo(Math.max(0, timeStore.get() - step)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); void seekTo(Math.min(film, timeStore.get() + step)); }
    else if (e.key === "Home") { e.preventDefault(); void seekTo(0); }
    else if (e.key === "End") { e.preventDefault(); void seekTo(film); }
  };

  const volume = { title: "Volume", reset: () => selected && commit(setDuck(setPieceLevel(state, selected, 0), selected, false)), body: <VolumePanel state={state} selected={sel} commit={commit} /> };

  return (
    <section aria-label="Studio" data-slot="track-studio" className="text-foreground grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" onKeyDown={onKeyDown}>
      <div ref={hostRef} hidden data-studio-host />
      <div role="status" aria-live="polite" className={cn("lg:col-span-2", line ? "text-destructive text-sm" : "sr-only")} data-slot="track-studio-line">{line}</div>

      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1" data-slot="track-studio-main">
        {showVideo ? (
          <div className="relative aspect-video w-full max-w-[21rem] overflow-hidden rounded-2xl bg-[var(--surface-stage)]" data-slot="track-studio-monitor">
            <div ref={monitorRef} className="size-full" data-slot="track-studio-video-host" />
            <span className="bg-background/70 text-foreground absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold">Preview</span>
            <TimeChip store={timeStore} film={film} />
          </div>
        ) : null}

        <div className="bg-card min-w-0 rounded-2xl" data-slot="track-studio-tracks">
          <div className="flex items-center justify-between gap-4 px-4 pt-3 pb-2"><h3 className={eyebrow}>Tracks</h3>{isPhone ? <div className="w-32"><ZoomControl pps={pps} setZoom={setZoom} compact /></div> : null}</div>
          {/* A scrollable region must be reachable by keyboard (axe scrollable-region-focusable); arrows then move the playhead. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div ref={scrollRef} className="relative overflow-x-auto pb-2" role="group" aria-label="Tracks. Left and right arrows move the playhead. Space plays." tabIndex={0}>
            <div className="relative" style={{ width: labelW + timeW }}>
              <Ruler store={timeStore} film={film} pps={pps} labelW={labelW} timeW={timeW} seek={(t) => void seekTo(t)} engine={engineRef} />
              {state.lanes.map((lane) => (
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
                />
              ))}
              <Playhead store={timeStore} pps={pps} labelW={labelW} />
            </div>
          </div>
        </div>

        <div className="bg-card z-10 flex min-w-0 flex-wrap items-center gap-3 rounded-2xl p-3 max-sm:sticky max-sm:shadow-lg" data-slot="track-studio-transport">
          <Button size={isPhone ? "default" : "lg"} className="rounded-full" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <PauseIcon /> : <PlayIcon />}{playing ? "Pause" : "Play"}</Button>
          {isPhone ? (
            <Button variant="secondary" size="icon" className="rounded-full" aria-label="Back to start" onClick={() => void seekTo(0)}><SkipBackIcon /></Button>
          ) : (
            <Button variant="secondary" size="lg" className="rounded-full" onClick={() => void seekTo(0)}><SkipBackIcon />Back to start</Button>
          )}
          {isPhone ? (
            <Button variant="outline" size="icon" className="rounded-full" aria-label="Loop" aria-pressed={loop} onClick={() => setLoop((v) => !v)}><RepeatIcon /></Button>
          ) : (
            <Button variant="outline" size="lg" className="rounded-full" aria-pressed={loop} onClick={() => setLoop((v) => !v)}><RepeatIcon />Loop</Button>
          )}
          {isPhone ? null : <ZoomControl pps={pps} setZoom={setZoom} />}
          <TimeText store={timeStore} film={film} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1" data-slot="track-studio-panels">
        <section aria-label={volume.title} className="bg-card flex flex-col gap-3 rounded-2xl p-4"><PanelBody panel={volume} /></section>
        <p className="text-muted-foreground text-sm">{PREVIEW_LINE}</p>
      </div>
    </section>
  );
}

function ZoomControl({ pps, setZoom, compact = false }: { pps: number; setZoom: (v: number) => void; compact?: boolean }) {
  return (
    <div className={cn("flex min-w-32 flex-1 flex-col gap-1", compact && "min-w-0")}>
      {compact ? null : <span className={eyebrow} aria-hidden="true">Zoom</span>}
      <Slider min={12} max={120} step={1} value={[pps]} onValueChange={([v]) => setZoom(v ?? pps)} aria-label="Zoom" />
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

function PanelBody({ panel }: { panel: { title: string; reset: () => void; body: ReactNode } }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn(eyebrow, "text-foreground")}>{panel.title}</h3>
        <Button variant="ghost" size="sm" onClick={panel.reset}>Reset<span className="sr-only"> {panel.title}</span></Button>
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

const dbText = (db: number) => `${db > 0 ? "+" : ""}${db.toFixed(Math.abs(db % 1) < 0.05 ? 0 : 1)} dB`;
function Selected({ sel, none }: { sel: ReturnType<typeof findPiece>; none: string }) {
  return <p className="text-muted-foreground text-sm">{sel ? `Selected: ${sel.piece.label ?? `${LANE_WORD[sel.lane.id]} piece`}` : none}</p>;
}

function VolumePanel({ state, selected, commit }: { state: StudioState; selected: ReturnType<typeof findPiece>; commit: (s: StudioState) => void }) {
  const p = selected?.piece;
  return (
    <>
      <Selected sel={selected} none="Pick a piece to change its volume." />
      <Field label="Level" value={p ? dbText(p.level_db) : "—"}>
        <Slider min={LEVEL_DB_MIN} max={LEVEL_DB_MAX} step={0.5} value={[p?.level_db ?? 0]} disabled={!p} aria-label="Level in decibels" onValueChange={([v]) => p && commit(setPieceLevel(state, p.id, v ?? 0))} />
      </Field>
      {selected?.lane.id === "music" ? (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className={eyebrow}>Lower under speech</span>
          <Switch checked={p!.duck} onCheckedChange={(v) => commit(setDuck(state, p!.id, v))} aria-label="Lower under speech" />
        </label>
      ) : null}
    </>
  );
}

function TimeChip({ store, film }: { store: TimeStore; film: number }) {
  const t = useTime(store, 0.25);
  return <span className="bg-background/70 text-foreground absolute bottom-2 left-2 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums" aria-hidden="true">{formatTime(t)} / {formatTime(film)}</span>;
}
function TimeText({ store, film }: { store: TimeStore; film: number }) {
  const t = useTime(store, 0.25);
  return <span className="ml-auto font-mono text-sm tabular-nums" role="timer" aria-label={`${spokenTime(t)} of ${spokenTime(film)}`}>{formatTime(t)} / {formatTime(film)}</span>;
}

function Playhead({ store, pps, labelW }: { store: TimeStore; pps: number; labelW: number }) {
  const t = useTime(store, 0.02);
  return <div aria-hidden="true" data-slot="track-studio-playhead" className="bg-foreground pointer-events-none absolute top-0 bottom-0 z-20 w-px" style={{ left: labelW + t * pps }} />;
}

function Ruler({ store, film, pps, labelW, timeW, seek, engine }: { store: TimeStore; film: number; pps: number; labelW: number; timeW: number; seek: (t: number) => void; engine: React.RefObject<PreviewEngine | null> }) {
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
          seek(at(e));
        }}
        onPointerMove={(e) => { if (drag.current) seek(at(e)); }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (d?.wasPlaying) void engine.current?.play(); }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {ticks.map((tick) => (
          <span key={tick} aria-hidden="true" className="text-muted-foreground border-border absolute top-0 h-full border-l pl-1 font-mono text-[11px] leading-8 select-none" style={{ left: tick * pps }}>{formatTime(tick)}</span>
        ))}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Playhead"
          aria-valuemin={0}
          aria-valuemax={Math.round(film * 10) / 10}
          aria-valuenow={Math.round(t * 10) / 10}
          aria-valuetext={`${spokenTime(t)} of ${spokenTime(film)}`}
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
  commit: (s: StudioState) => void;
  setSolo: (on: boolean) => void;
  seek: (t: number) => void;
}

function LaneRow({ lane, state, pps, labelW, timeW, selected, solo, media, select, commit, setSolo, seek }: LaneRowProps) {
  const placed = layoutLane(lane);
  const hue = `--hue-${lane.hue}`;
  const name = LANE_WORD[lane.id];
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <div className="border-border flex border-b last:border-b-0" data-lane={lane.id}>
      <div className="bg-card sticky left-0 z-30 flex shrink-0 gap-2 px-2 py-1.5" style={{ width: labelW, height: LANE_H, boxShadow: `inset 4px 0 0 var(${hue})` }}>
        <div className="flex min-w-0 flex-1 flex-col justify-between pl-2">
          <div className="flex items-start gap-1.5">
            <LaneToggle label={`Mute ${name}`} text="M" on={lane.muted} onClick={() => commit(setLaneMuted(state, lane.id, !lane.muted))} />
            <span className="min-w-0 flex-1 text-xs leading-tight font-semibold break-words">{lane.label}</span>
            <LaneToggle label={`Solo ${name}`} text="S" on={solo === lane.id} onClick={() => setSolo(solo !== lane.id)} />
          </div>
          <Slider min={LEVEL_DB_MIN} max={LEVEL_DB_MAX} step={0.5} value={[lane.level_db]} aria-label={`${name} level, decibels`} onValueChange={([v]) => commit(setLaneLevel(state, lane.id, v ?? 0))} />
        </div>
      </div>
      <div
        ref={bodyRef}
        role="group"
        aria-label={`${name} pieces`}
        className={cn("relative", lane.muted && "opacity-50")}
        style={{ width: timeW, height: LANE_H }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) { select(null); const r = e.currentTarget.getBoundingClientRect(); seek(Math.max(0, (e.clientX - r.left) / pps)); } }}
      >
        {placed.length === 0 ? <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs">{lane.id === "voice" ? "No voice yet." : lane.id === "music" ? "No music yet." : "No clip."}</span> : null}
        {placed.map((pl, i) => (
          <PieceView key={pl.piece.id} lane={lane} index={i} start={pl.start} piece={pl.piece} pps={pps} hue={hue} selected={selected === pl.piece.id} count={placed.length} media={media} select={select} />
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
  lane: StudioLane; index: number; start: number; piece: StudioPiece; pps: number; hue: string; selected: boolean; count: number; media: MediaState;
  select: (id: string | null) => void;
}

function PieceView({ lane, index, start, piece, pps, hue, selected, count, media, select }: PieceViewProps) {
  const dur = pieceDuration(piece);
  const width = Math.max(8, dur * pps);
  const left = start * pps;
  const name = LANE_WORD[lane.id];
  const label = piece.label ?? `${name} ${index + 1}`;
  const seam = lane.id === "video" && index > 0 ? effectiveCrossfade(lane.pieces[index - 1]!, piece) : 0;
  const env = useMemo(() => pieceEnvelope(lane, index), [lane, index]);
  const spoken = `${name} piece ${index + 1} of ${count}, ${label}, ${spokenTime(dur)}${selected ? ", selected" : ""}`;
  return (
    <div className="absolute top-1 bottom-1" style={{ left, width }} data-piece-wrap={piece.id}>
      <button
        type="button"
        data-piece={piece.id}
        aria-pressed={selected}
        aria-label={spoken}
        onClick={() => select(piece.id)}
        className={cn("relative block size-full cursor-pointer overflow-hidden rounded-md border text-left", selected ? "ring-primary ring-2" : "", FOCUS_RING)}
        style={{ borderColor: `var(${hue})`, background: hueTintBackground(hue), color: `var(${hue})` }}
      >
        {lane.id === "video" ? <Thumbs piece={piece} pps={pps} thumbs={media.thumbs[piece.src]} /> : <Wave piece={piece} pps={pps} width={width} peaks={media.peaks[piece.src]} />}
        <FadeRamps env={env} width={width} piece={piece} fadeIn={piece.fade_in_s} fadeOut={piece.fade_out_s} />
        <span className="bg-background/70 text-foreground pointer-events-none absolute top-0.5 left-1 max-w-[calc(100%-8px)] truncate rounded px-1 text-[11px] leading-4 font-semibold">{label}</span>
        {seam > 0 ? <span aria-hidden="true" data-seam className="border-primary pointer-events-none absolute inset-y-0 left-0 border-r bg-[repeating-linear-gradient(135deg,var(--primary)_0_2px,transparent_2px_5px)] opacity-70" style={{ width: Math.min(width, seam * pps) }} /> : null}
      </button>
    </div>
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

function Wave({ piece, pps, width, peaks }: { piece: StudioPiece; pps: number; width: number; peaks: { peaks: number[]; duration: number } | "failed" | undefined }) {
  const H = LANE_H - 8;
  if (peaks === "failed") return <span className="text-muted-foreground absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] leading-tight">This audio could not be drawn. It still plays.</span>;
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

  const key = useMemo(() => LANE_IDS.flatMap((id) => laneOf(state, id).pieces.map((p) => `${id}|${p.src}`)).join("\n"), [state]);
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
        decodePeaks(src, ctl.signal).then(
          (p) => { if (ctl.signal.aborted) return; setMedia((m) => ({ ...m, peaks: { ...m.peaks, [src]: p } })); metric.current?.("peaks_ms", Math.round(performance.now() - t0), `${src}|${p.peaks.length} bars|${p.duration.toFixed(2)} s`); },
          () => { if (!ctl.signal.aborted) setMedia((m) => ({ ...m, peaks: { ...m.peaks, [src]: "failed" } })); },
        );
      }
    }
  }, [key, generation]);
  return media;
}

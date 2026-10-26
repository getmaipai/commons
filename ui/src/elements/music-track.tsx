"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DownloadIcon, PauseIcon, PlayIcon, Share2Icon, BookOpenIcon, PencilIcon, LibraryIcon, WandSparklesIcon, SquareIcon, RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon, GaugeIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/kit/ui/alert";
import { Button } from "@/kit/ui/button";
import { Card, CardContent } from "@/kit/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Slider } from "@/kit/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/kit/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/kit/ui/dropdown-menu";
import { TooltipIconButton } from "./tooltip-icon-button";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { GenerationStage } from "./generation-stage";
import { stepVersion, type VersionLike } from "./image-editor-state";
import { formatClock } from "./video-player";
import { LyricsList } from "./lyrics-list";
import type { PlayerCopy, PlayerMetadata } from "@/kit/primitives/Player";

export type MusicTrackStatus = "queued" | "generating" | "ready" | "failed" | "cancelled";
export interface MusicTrackCopy {
  queued: string; generating: string; stop: string; download: string; share: string; saveToLibrary: string; makeAnother: string; retry: string; stopped: string; failed: string; lyrics: string; previous: string; next: string; useVersion: string; edit: string; play: string; pause: string; speed: string; waitingForMemory: string;
  versionOf: (n: number, total: number) => string; queuePosition: (position: number) => string; progress: (value: number, elapsed: string | undefined) => string;
  player: Partial<PlayerCopy>;
}
const DEFAULT_COPY: MusicTrackCopy = {
  queued: "Waiting its turn", generating: "Making the music", stop: "Stop", download: "Download", share: "Share", saveToLibrary: "Save to Music", makeAnother: "Make another", retry: "Try again", stopped: "Stopped. Nothing was kept.", failed: "I couldn't make that song.", lyrics: "Lyrics", previous: "Previous", next: "Next", useVersion: "Use this version", edit: "Edit", play: "Play", pause: "Pause", speed: "Playback speed", waitingForMemory: "Waiting for memory, your song starts when there is room",
  versionOf: (n, total) => `Version ${n} of ${total}`, queuePosition: (position) => `Place in line: ${position}`, progress: (value, elapsed) => `${value} percent${elapsed ? `, ${elapsed} so far` : ""}`, player: {},
};
const DEFAULT_STAGES = ["Queued", "Loading", "Planning", "Making", "Mixing", "Finishing"].map((label, i) => ({ id: String(i), label }));
const formatSeconds = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`;
function download(src: string, name: string) { const link = document.createElement("a"); link.href = src; link.download = name; link.rel = "noopener"; document.body.append(link); link.click(); link.remove(); }
function legacyEditLayout(content: ReactNode): { modes: Array<{ id: string; label: string; content: ReactNode; disabledReason?: string }>; full?: ReactNode; extra: ReactNode[] } | undefined {
  const flatten = (children: ReactNode): ReactNode[] => Children.toArray(children).flatMap(child => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flatten(child.props.children) : [child]);
  const nodes = flatten(content), taken = new Set<number>(), prompts: Array<{ id: string; label: string; content: ReactNode; disabledReason?: string }> = [];
  let full: ReactNode = undefined;
  nodes.forEach((node, i) => {
    if (!isValidElement<{ children?: ReactNode; [key: string]: unknown }>(node)) return;
    const label = node.props["aria-label"];
    if (typeof label === "string" && (label.toLowerCase().includes("how should it change") || label.toLowerCase().includes("describe the new cover"))) {
      const isCover = label.toLowerCase().includes("cover");
      const nextNode = nodes[i + 1];
      const make = isValidElement<{ children?: ReactNode; disabled?: boolean }>(nextNode) && nextNode.props.children === "Make" ? nextNode : null;
      taken.add(i);
      if (make) taken.add(i + 1);
      const hasPrompt = typeof node.props.value === "string" && node.props.value.trim().length > 0;
      const disabledReason = make?.props.disabled ? hasPrompt ? "Wait for the current change to finish." : isCover ? "Describe a new cover to enable Make." : "Describe a song change to enable Make." : undefined;
      prompts.push({ id: isCover ? "cover" : "song", label: isCover ? "New cover" : "Change the song", content: <div className="grid gap-2">{node}{make}</div>, ...(disabledReason ? { disabledReason } : {}) });
    }
    if (node.props.children === "Make it full") { full = node; taken.add(i); }
  });
  if (!prompts.some(mode => mode.id === "song") || !prompts.some(mode => mode.id === "cover")) return undefined;
  return { modes: prompts, full, extra: nodes.filter((_, i) => !taken.has(i)) };
}

/** A generated song. The host owns sources, version selection and all I/O. */
export function MusicTrack({
  status, title, description, src, progress, phaseLabel, queuePosition, startedAt, estimateMs = 120_000, etaLabel, hint, error, downloadName = "song.m4a", lyrics, timedLyrics, cover, coverAlt, coverActions,
  versions = [], currentId, onSelectVersion, onUseVersion, onStop, onRetry, onDownload, onShare, onSaveToLibrary, onMakeAnother, actions, metadata, copy, width = "default", editContent, editLabel = "Edit", editPanelLabel,
  stages = DEFAULT_STAGES, currentStage, elapsedSeconds, etaSeconds, waitingForMemory = false, editModes, quickSong = false, onMakeFull, defaultEditOpen = false, byline,
}: {
  status: MusicTrackStatus; title: string; description?: string; src?: string; progress?: number | null; phaseLabel?: string; queuePosition?: number | null; startedAt?: number; estimateMs?: number; etaLabel?: string; hint?: string; error?: string; downloadName?: string; lyrics?: string; cover?: string; coverAlt?: string; coverActions?: ReactNode; timedLyrics?: { t: number; line: string; section?: string | null }[];
  versions?: Array<VersionLike & { label: string }>; currentId?: string; onSelectVersion?: (id: string) => void; onUseVersion?: (id: string) => void; onStop?: () => void; onRetry?: () => void; onDownload?: () => void; onShare?: () => void; onSaveToLibrary?: () => void; onMakeAnother?: () => void; actions?: ReactNode; metadata?: PlayerMetadata; copy?: Partial<MusicTrackCopy>; width?: "default" | "full"; editContent?: ReactNode; editLabel?: string; editPanelLabel?: string; className?: string;
  stages?: Array<{ id: string; label: string }>; currentStage?: number; elapsedSeconds?: number; etaSeconds?: number | null; waitingForMemory?: boolean;
  editModes?: Array<{ id: string; label: string; content: ReactNode; disabledReason?: string }>; quickSong?: boolean; onMakeFull?: () => void; defaultEditOpen?: boolean; byline?: ReactNode;
}) {
  const text = { ...DEFAULT_COPY, ...copy };
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const editId = useId();
  const [now, setNow] = useState(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState("1");
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(defaultEditOpen);
  const live = status === "queued" || status === "generating";
  const adaptedEdit = editModes?.length ? undefined : editContent ? legacyEditLayout(editContent) : undefined;
  const shownEditModes = editModes?.length ? editModes : adaptedEdit?.modes;
  useEffect(() => { if (!live) return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [live]);
  useEffect(() => {
    if (status !== "ready" || !src || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({ title: metadata?.title ?? title, artist: metadata?.artist ?? description, album: metadata?.album, artwork: metadata?.artwork });
    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => { try { session.setActionHandler(action, handler); } catch { /* Browser may not support an action. */ } };
    setHandler("play", () => { void audioRef.current?.play(); });
    setHandler("pause", () => audioRef.current?.pause());
    setHandler("seekbackward", details => { const audio = audioRef.current; if (audio) audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10)); });
    setHandler("seekforward", details => { const audio = audioRef.current; if (audio) audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (details.seekOffset ?? 10)); });
    setHandler("seekto", details => { const audio = audioRef.current; if (audio && details.seekTime !== undefined) audio.currentTime = details.seekTime; });
    return () => { for (const action of ["play", "pause", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]) setHandler(action, null); };
  }, [description, metadata, src, status, title]);
  const elapsed = elapsedSeconds !== undefined ? formatClock(elapsedSeconds * 1000) : startedAt === undefined ? undefined : formatClock(Math.max(0, now - startedAt));
  const elapsedValue = elapsedSeconds ?? (startedAt === undefined ? 0 : Math.max(0, (now - startedAt) / 1000));
  const activeStage = currentStage ?? (status === "queued" ? 0 : 1);
  const value = typeof progress === "number" ? Math.round(Math.max(0, Math.min(1, progress > 1 ? progress / 100 : progress)) * 100) : Math.max(0, Math.min(95, Math.round(elapsedValue * 100_000 / estimateMs)));
  const doneStages = Math.max(0, Math.min(stages.length, activeStage));
  const currentStageLabel = stages[doneStages]?.label;
  const index = versions.findIndex((version) => version.id === currentId);
  const previous = stepVersion(versions, currentId ?? "", -1), next = stepVersion(versions, currentId ?? "", 1);
  const seek = (values: number[]) => { const media = audioRef.current; if (media && Number.isFinite(media.duration)) { media.currentTime = values[0] ?? 0; setCurrentTime(media.currentTime); } };
  const actionButtons = <div className="flex min-w-0 flex-wrap items-center gap-1">
    {src ? <TooltipIconButton tooltip={text.download} aria-label={text.download} hitArea48 onClick={() => onDownload ? onDownload() : download(src, downloadName)}><DownloadIcon aria-hidden /></TooltipIconButton> : null}
    {onShare ? <TooltipIconButton tooltip={text.share} aria-label={text.share} hitArea48 onClick={onShare}><Share2Icon aria-hidden /></TooltipIconButton> : null}
    {(timedLyrics || lyrics) && status === "ready" ? <Collapsible open={lyricsOpen} onOpenChange={setLyricsOpen}>
      <CollapsibleTrigger asChild><TooltipIconButton tooltip={text.lyrics} aria-label={text.lyrics} hitArea48><BookOpenIcon aria-hidden /></TooltipIconButton></CollapsibleTrigger>
      <CollapsibleContent><div className="max-h-48 overflow-y-auto pt-2"><LyricsList lines={timedLyrics} text={lyrics} currentTime={currentTime} onSeek={t => { seek([t]); void audioRef.current?.play(); }} labels={{ label: text.lyrics }} /></div></CollapsibleContent>
    </Collapsible> : null}
    {(editModes?.length || editContent !== undefined && editContent !== null) ? <Popover open={editOpen} onOpenChange={setEditOpen}><PopoverTrigger asChild><TooltipIconButton tooltip={editLabel || text.edit} aria-label={editLabel || text.edit} hitArea48><PencilIcon aria-hidden /></TooltipIconButton></PopoverTrigger><PopoverContent align="start" width="auto" className="max-h-[min(80vh,36rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto" aria-label={editPanelLabel ?? editLabel}>
      {shownEditModes?.length ? <Tabs defaultValue={shownEditModes[0]!.id}><TabsList className="w-full">{shownEditModes.map(mode => <TabsTrigger key={mode.id} value={mode.id}>{mode.label}</TabsTrigger>)}</TabsList>{shownEditModes.map(mode => <TabsContent key={mode.id} value={mode.id} className="pt-2">{mode.content}{mode.disabledReason ? <p className="text-muted-foreground pt-1 text-xs">{mode.disabledReason}</p> : null}</TabsContent>)}{adaptedEdit?.full ?? (quickSong && onMakeFull ? <div className="pt-3"><Button type="button" variant="outline" className="w-full" onClick={onMakeFull}>Make it full</Button></div> : null)}{adaptedEdit?.extra.map((node, i) => <div key={i} className="pt-2">{node}</div>)}</Tabs> : <div id={editId} className="flex min-w-0 flex-col gap-3">{quickSong && onMakeFull ? <Button type="button" variant="outline" onClick={onMakeFull}>Make it full</Button> : null}{editContent}</div>}
    </PopoverContent></Popover> : null}
    <DropdownMenu><DropdownMenuTrigger asChild><TooltipIconButton tooltip={`${text.speed}: ${rate}x`} aria-label={`${text.speed}: ${rate}x`} hitArea48><GaugeIcon aria-hidden /></TooltipIconButton></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>{text.speed}</DropdownMenuLabel><DropdownMenuRadioGroup value={rate} onValueChange={nextRate => { setRate(nextRate); if (audioRef.current) audioRef.current.playbackRate = Number(nextRate); }}><DropdownMenuRadioItem value="0.75">0.75x</DropdownMenuRadioItem><DropdownMenuRadioItem value="1">1x</DropdownMenuRadioItem><DropdownMenuRadioItem value="1.25">1.25x</DropdownMenuRadioItem><DropdownMenuRadioItem value="1.5">1.5x</DropdownMenuRadioItem><DropdownMenuRadioItem value="2">2x</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
    {onSaveToLibrary ? <TooltipIconButton tooltip={text.saveToLibrary} aria-label={text.saveToLibrary} hitArea48 onClick={onSaveToLibrary}><LibraryIcon aria-hidden /></TooltipIconButton> : null}{onMakeAnother ? <TooltipIconButton tooltip={text.makeAnother} aria-label={text.makeAnother} hitArea48 onClick={onMakeAnother}><WandSparklesIcon aria-hidden /></TooltipIconButton> : null}{cover && coverActions ? coverActions : null}{actions}
  </div>;
  const coverTile = <GenerationStage
    generating={live}
    previewSrc={cover ?? undefined}
    previewAlt={coverAlt ?? (cover ? `Cover art for ${title}` : undefined)}
    fallbackKind="music"
    showPreviewWhenSettled
    aspectRatio="1 / 1"
    className="w-full rounded-md"
    underlay={live ? <div aria-hidden className="size-full bg-primary/10" /> : <SafeImage src={undefined} alt={cover ? "" : coverAlt ?? ""} kind="music" className="size-full" />}
  />;
  return <Card data-slot="music-track" data-status={status} data-width={width} aria-label={title} className={`w-full gap-0 overflow-hidden py-0 ${width === "full" ? "min-w-0 max-w-none" : "max-w-xl"}`}>
    <CardContent className="flex min-w-0 flex-col gap-3 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative aspect-square w-20 shrink-0 sm:w-24">{coverTile}{status === "ready" && src ? <Button type="button" variant="secondary" size="icon" aria-label={playing ? text.pause : text.play} className="absolute inset-0 m-auto size-12 rounded-full shadow-md" onClick={() => { const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); }}><span className="sr-only">{playing ? text.pause : text.play}</span>{playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}</Button> : null}</div>
        <div className="flex min-h-20 min-w-0 flex-1 flex-col justify-center gap-1 sm:min-h-24">
          <p className="break-words text-sm font-semibold leading-tight">{title}</p>{description ? <p className="text-muted-foreground line-clamp-2 break-words text-xs">{description}</p> : null}
          {live ? waitingForMemory ? <p role="status" className="text-muted-foreground mt-1 text-xs">{text.waitingForMemory}</p> : <div className="mt-1 flex min-w-0 flex-col gap-1.5">
            {stages.length > 0 ? <>
              <p role="status" className="text-muted-foreground truncate text-xs sm:hidden">Step {Math.min(doneStages + 1, stages.length)} of {stages.length} · {currentStageLabel ?? phaseLabel ?? stages.at(-1)?.label}</p>
              <div data-slot="generation-stages" role="group" aria-label="Generation stages" className="hidden min-w-0 gap-1 sm:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
                {stages.map((stage, i) => {
                  const isDone = i < doneStages;
                  const isCurrent = i === doneStages && doneStages < stages.length;
                  const segmentValue = isDone ? 100 : isCurrent ? value : 0;
                  return <div key={stage.id} aria-current={isCurrent ? "step" : undefined} className="min-w-0 text-center">
                    <div role="progressbar" aria-label={stage.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={segmentValue} className="bg-muted relative h-2 overflow-hidden rounded-full">
                      <div className="bg-primary absolute inset-y-0 start-0 rounded-full" style={{ width: `${segmentValue}%` }} />
                      {isDone ? <span aria-hidden className="text-primary-foreground absolute inset-0 flex items-center justify-center text-xs leading-none">✓</span> : null}
                    </div>
                    <span className={`mt-1 block truncate text-xs leading-tight ${isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</span>
                  </div>;
                })}
              </div>
            </> : null}
            <p className="text-muted-foreground text-xs tabular-nums">{[`${value}%`, elapsed, etaSeconds !== undefined && etaSeconds !== null ? `about ${Math.max(1, Math.round(etaSeconds))} seconds left` : etaSeconds === undefined ? etaLabel : undefined].filter(Boolean).join(" · ")}</p>
          </div> : null}
          {status === "ready" && src ? <div className="mt-1 flex min-w-0 flex-col gap-1"><Slider aria-label={`Seek ${title}`} min={0} max={duration || 1} step={1} value={[Math.min(currentTime, duration || 1)]} onValueChange={seek} disabled={!duration} /><div className="text-muted-foreground flex justify-between text-xs tabular-nums"><span>{formatSeconds(currentTime)}</span><span>{formatSeconds(duration)}</span></div></div> : null}
          {status === "ready" && src ? (
            // Song lyrics are exposed through the Lyrics action instead of an always-on caption track.
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio ref={audioRef} src={src} preload="metadata" className="sr-only" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={() => setPlaying(false)} />
          ) : null}
        </div>
      </div>
      {live && onStop ? <div className="flex min-w-0 justify-end"><Button type="button" variant="outline" size="sm" className="min-h-12 shrink-0" onClick={onStop}><SquareIcon aria-hidden />{text.stop}</Button></div> : null}
      {status === "ready" ? actionButtons : null}
      {status === "ready" && versions.length >= 2 && index >= 0 ? <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="icon" aria-label={text.previous} disabled={!previous || !onSelectVersion} onClick={() => previous && onSelectVersion?.(previous.id)}><ChevronLeftIcon aria-hidden /></Button><span className="text-muted-foreground text-sm">{text.versionOf(index + 1, versions.length)}</span><Button type="button" variant="outline" size="icon" aria-label={text.next} disabled={!next || !onSelectVersion} onClick={() => next && onSelectVersion?.(next.id)}><ChevronRightIcon aria-hidden /></Button>{next && onUseVersion && currentId ? <Button type="button" variant="outline" size="sm" onClick={() => onUseVersion(currentId)}>{text.useVersion}</Button> : null}</div> : null}
      {status === "failed" ? <><Alert variant="destructive"><AlertDescription>{error ?? text.failed}</AlertDescription></Alert>{onRetry ? <Button type="button" variant="outline" className="min-h-12" onClick={onRetry}><RefreshCwIcon aria-hidden />{text.retry}</Button> : null}</> : null}
      {status === "cancelled" ? <p className="text-muted-foreground text-sm">{text.stopped}</p> : null}
      {status === "queued" && queuePosition && queuePosition > 0 ? <p className="text-muted-foreground text-xs">{text.queuePosition(queuePosition)}</p> : null}
      {hint && live ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {byline && status === "ready" ? <div data-slot="music-track-byline" className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 border-t border-border pt-3 text-xs">{byline}</div> : null}
    </CardContent>
  </Card>;
}

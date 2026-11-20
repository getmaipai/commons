"use client";

import { SafeImage } from "../primitives/SafeImage";
import { i18n } from "@/kit/i18n"
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { CheckIcon, CircleAlertIcon, CircleSlashIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { announced, clamp, pct, progressOf, take } from "./range";
import { Progress } from "@/primitives/Progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/ui/sheet";
import { StatusCard } from "@/kit/elements/status-card";
import { Button } from "../ui/button";
import { getIcon } from "../icons";

export interface JobStage {
  name: string;
  weight: number;
}

export interface JobProgressItem {
  id: string;
  label: string;
  completedBytes: number;
  totalBytes: number;
  state: "queued" | "running" | "paused" | "stalled" | "verifying" | "failed" | "done";
}

export interface JobProgressCopy {
  stalled?: string;
  checksumFailed?: string;
  outOfSpace?: string;
  details?: string;
  resume?: string;
  retry?: string;
}

export interface JobProgressAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  primary?: boolean;
}

export type JobProgressShotState = "queued" | "running" | "done" | "held" | "failed";

export interface JobProgressShot {
  id: string;
  label: string;
  state: JobProgressShotState;
  /** Running only: how far along, 0 to 1. Unset draws no bar rather than a guess. */
  progress?: number;
  /** Seconds left for this shot. Unset draws no time (a running shot then says "Time left unknown"). */
  etaSeconds?: number;
  /** A picture for the shot (an image address). */
  thumb?: string;
  /** A small calm line under the shot, as the server words it ("Fixed on its own: a small noise at the very start was trimmed."). */
  note?: string;
  /** Why a held shot waits ("Your picture job goes first, about 6 minutes"). */
  heldReason?: string;
  /** A failed shot: what went wrong and the next step, with the choices ("Try again", "Use the best take anyway", "Open the shot"). */
  failure?: { message: string; actions?: readonly JobProgressAction[] };
}

function formatBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = safe;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit += 1; }
  return `${unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function stateLabel(state: JobProgressItem["state"]): string {
  switch (state) {
    case "queued": return i18n._({ id: "ui.queued", message: "queued" });
    case "running": return i18n._({ id: "ui.running", message: "running" });
    case "paused": return i18n._({ id: "ui.paused", message: "paused" });
    case "stalled": return i18n._({ id: "ui.stalled", message: "stalled" });
    case "verifying": return i18n._({ id: "ui.verifying", message: "verifying" });
    case "failed": return i18n._({ id: "ui.failed", message: "failed" });
    case "done": return i18n._({ id: "ui.done", message: "done" });
  }
}

function formatEta(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes < 60 ? i18n._({ id: "ui.About {count, plural, one {# minute} other {# minutes}} left", message: "About {count, plural, one {# minute} other {# minutes}} left", values: { count: minutes } }) : i18n._({ id: "ui.About {count, plural, one {# hour} other {# hours}} left", message: "About {count, plural, one {# hour} other {# hours}} left", values: { count: Math.ceil(minutes / 60) } });
}

const knownEta = (seconds: number | undefined): seconds is number => seconds !== undefined && Number.isFinite(seconds) && seconds >= 0;

function shotStateWord(state: JobProgressShotState): string {
  switch (state) {
    case "queued": return i18n._({ id: "ui.Queued", message: "Queued" });
    case "running": return i18n._({ id: "ui.Working", message: "Working" });
    case "done": return i18n._({ id: "ui.Ready", message: "Ready" });
    case "held": return i18n._({ id: "ui.Waiting its turn", message: "Waiting its turn" });
    case "failed": return i18n._({ id: "ui.Did not finish", message: "Did not finish" });
  }
}

function ShotRow({ shot }: { shot: JobProgressShot }) {
  const Check = getIcon("check");
  const Clock = getIcon("clock");
  const Spinner = getIcon("loader");
  const Alert = getIcon("circle-alert");
  const Film = getIcon("film");
  const { state } = shot;
  const eta = state === "done" || state === "failed" ? undefined : knownEta(shot.etaSeconds) ? formatEta(shot.etaSeconds) : state === "running" ? i18n._({ id: "ui.Time left unknown", message: "Time left unknown" }) : undefined;
  const failure = state === "failed" ? shot.failure : undefined;
  return (
    <li data-slot="job-progress-shot" data-state={state} className={cn("flex flex-col gap-2 rounded-xl border p-2.5", state === "failed" ? "border-destructive/40 bg-muted/40" : "border-border/60")}>
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:w-36">
          {shot.thumb ? <SafeImage src={shot.thumb} alt="" tintSeed={shot.label} className="size-full object-cover" /> : <Film aria-hidden className="size-5" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span data-slot="job-progress-shot-label" className="text-[14px] leading-snug font-medium break-words">{shot.label}</span>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className={cn("inline-flex items-center gap-1", state === "failed" && "text-foreground")}>
              {state === "done" ? <Check aria-hidden className="text-status-ok size-3.5" /> : state === "running" ? <Spinner aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> : state === "failed" ? <Alert aria-hidden className="text-destructive size-3.5" /> : <Clock aria-hidden className="size-3.5" />}
              {shotStateWord(state)}
            </span>
            {eta !== undefined && <span data-slot="job-progress-shot-eta" className="tabular-nums">{eta}</span>}
          </div>
          {state === "running" && shot.progress !== undefined && Number.isFinite(shot.progress) && (
            <div role="progressbar" aria-label={i18n._({ id: "ui.{label} progress", message: "{label} progress", values: { label: shot.label } })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={announced(clamp(shot.progress, 0, 1) * 100)} className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${clamp(shot.progress, 0, 1) * 100}%` }} />
            </div>
          )}
          {state === "held" && shot.heldReason && <p data-slot="job-progress-shot-held" className="text-muted-foreground text-xs leading-snug">{shot.heldReason}</p>}
          {failure && <p data-slot="job-progress-shot-failure" className="text-foreground text-xs leading-snug">{failure.message}</p>}
          {shot.note && <p data-slot="job-progress-shot-note" className="text-muted-foreground text-xs leading-snug">{shot.note}</p>}
        </div>
      </div>
      {failure?.actions && failure.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {failure.actions.map((action) => (
            <Button key={action.id} type="button" variant={action.primary ? "default" : "outline"} className="min-h-12 px-4" disabled={action.disabled} onClick={action.onSelect}>{action.label}</Button>
          ))}
        </div>
      )}
    </li>
  );
}

function ShotList({ shots, overallEtaSeconds }: { shots: readonly JobProgressShot[]; overallEtaSeconds?: number }) {
  const done = shots.filter((shot) => shot.state === "done").length;
  return (
    <div data-slot="job-progress-shots" className="flex flex-col gap-2">
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="tabular-nums">{i18n._({ id: "ui.{done} of {total, plural, one {# shot} other {# shots}} done", message: "{done} of {total, plural, one {# shot} other {# shots}} done", values: { done, total: shots.length } })}</span>
        {knownEta(overallEtaSeconds) && <span data-slot="job-progress-overall-eta" className="tabular-nums">{formatEta(overallEtaSeconds)}</span>}
      </div>
      <ul aria-label={i18n._({ id: "ui.Shots", message: "Shots" })} className="m-0 flex list-none flex-col gap-2 p-0">
        {shots.map((shot) => <ShotRow key={shot.id} shot={shot} />)}
      </ul>
    </div>
  );
}

export function JobProgress({
  title,
  stages,
  stageIndex,
  stageProgress,
  eta,
  onCancel,
  doneLabel = i18n._({ id: "ui.done", message: "done" }),
  cancelLabel = i18n._({ id: "ui.Cancel the job", message: "Cancel the job" }),
  outcome,
  elapsedMs,
  completedBytes,
  totalBytes,
  bytesPerSecond,
  etaSeconds,
  items,
  shots,
  overallEtaSeconds,
  downloadState,
  downloadStatus,
  onResume,
  onRetry,
  copy,
  notes,
  actions,
  variant = "full",
  cancelable = true,
  presentation = "inline",
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "title"
  | "stages"
  | "stageIndex"
  | "stageProgress"
  | "eta"
  | "onCancel"
  | "doneLabel"
  | "cancelLabel"
  | "outcome"
  | "elapsedMs"
  | "completedBytes"
  | "totalBytes"
  | "bytesPerSecond"
  | "etaSeconds"
  | "items"
  | "shots"
  | "overallEtaSeconds"
  | "downloadState"
  | "downloadStatus"
  | "onResume"
  | "onRetry"
  | "copy"
  | "notes"
  | "actions"
  | "variant"
  | "cancelable"
  | "presentation"
> & {
  title: string;
  stages: readonly JobStage[];
  stageIndex: number;
  stageProgress: number;
  /** Unset: no time estimate is drawn while the job runs. */
  eta?: string;
  onCancel?: () => void;
  doneLabel?: string;
  cancelLabel?: string;
  outcome?: { status: "success" | "partial" | "failed" | "cancelled"; summary?: string };
  elapsedMs?: number;
  completedBytes?: number;
  totalBytes?: number;
  /** A smoothed transfer rate, in bytes per second. */
  bytesPerSecond?: number;
  /** ETA is withheld until the supplied rate has remained stable over several updates. */
  etaSeconds?: number;
  items?: readonly JobProgressItem[];
  /** One row per shot of a film render: picture, state, time left, a bar for the running one, a held reason, a calm note and a failure with its next steps. */
  shots?: readonly JobProgressShot[];
  /** Seconds left for the whole job. Unset draws no time rather than a guess. */
  overallEtaSeconds?: number;
  downloadState?: "queued" | "running" | "paused" | "stalled" | "verifying" | "failed" | "done";
  downloadStatus?: string;
  onResume?: () => void;
  onRetry?: () => void;
  copy?: JobProgressCopy;
  notes?: readonly string[];
  actions?: readonly JobProgressAction[];
  variant?: "compact" | "full";
  /** Hide the cancel control when the producer has no cancellation action. */
  cancelable?: boolean;
  presentation?: "inline" | "card";
}) {
  const rates = useRef<number[]>([]);
  const [stableEta, setStableEta] = useState<number | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    if (bytesPerSecond === undefined || bytesPerSecond <= 0 || etaSeconds === undefined || etaSeconds < 0) {
      rates.current = [];
      setStableEta(undefined);
      return;
    }
    rates.current = [...rates.current.slice(-3), bytesPerSecond];
    if (rates.current.length < 4) return;
    const average = rates.current.reduce((sum, rate) => sum + rate, 0) / rates.current.length;
    const spread = (Math.max(...rates.current) - Math.min(...rates.current)) / average;
    if (spread <= 0.2) setStableEta(etaSeconds);
  }, [bytesPerSecond, etaSeconds]);
  const stage = progressOf(stageIndex, stages.length);
  const progress = clamp(stageProgress, 0, 1);
  const totalWeight = stages.reduce((sum, item) => sum + item.weight, 0) || 1;
  const completed = take(stages, stage).reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const current = stages[stage];
  const overall = pct(
    completed + (current ? current.weight * progress : 0),
    totalWeight,
  );
  const finished = stage >= stages.length || outcome !== undefined;
  const outcomeLabel = outcome?.status === "success" ? doneLabel : outcome?.status === "partial" ? i18n._({ id: "ui.partial", message: "partial" }) : outcome?.status === "failed" ? i18n._({ id: "ui.failed", message: "failed" }) : outcome?.status === "cancelled" ? i18n._({ id: "ui.cancelled", message: "cancelled" }) : outcome?.status;
  const elapsedLabel = elapsedMs === undefined ? undefined : `${Math.max(0, Math.round(elapsedMs / 1000))}s`;

  if (presentation === "card") {
    const state = downloadState ?? (outcome?.status === "success" ? "done" : outcome?.status === "failed" ? "failed" : "running");
    const selected = items?.[0];
    const fraction = selected ? (selected.totalBytes ? selected.completedBytes / selected.totalBytes : selected.state === "done" ? 1 : 0) : (totalBytes ? completedBytes! / totalBytes : overall / 100);
    const kind = state === "queued" || state === "paused" ? "waiting" : state === "stalled" ? "attention" : state === "failed" ? "problem" : state === "done" ? "done" : "progress";
    const line = downloadStatus ?? (completedBytes !== undefined && totalBytes !== undefined ? `${formatBytes(completedBytes)} of ${formatBytes(totalBytes)}${stableEta !== undefined ? ` · ${formatEta(stableEta)}` : ""}` : outcome?.summary ?? (elapsedLabel ? `${elapsedLabel} elapsed` : undefined));
    const onAction = state === "paused" || state === "stalled" ? onResume : state === "failed" ? onRetry : !finished && cancelable ? onCancel : undefined;
    const actionLabel = state === "paused" || state === "stalled" ? copy?.resume ?? i18n._({ id: "ui.Resume", message: "Resume" }) : state === "failed" ? copy?.retry ?? i18n._({ id: "ui.Retry", message: "Retry" }) : state === "running" || state === "verifying" ? i18n._({ id: "ui.Pause", message: "Pause" }) : i18n._({ id: "ui.Cancel", message: "Cancel" });
    const stateCopy = state === "stalled" ? copy?.stalled : state === "failed" ? copy?.checksumFailed : state === "paused" ? copy?.resume : state === "done" ? doneLabel : undefined;
    return <StatusCard kind={kind} stateWord={stateCopy ?? stateLabel(state)} title={title || selected?.label || downloadStatus || ""} line={line} progress={kind === "progress" ? fraction * 100 : undefined} bar={fraction * 100} action={onAction ? { label: actionLabel, onSelect: onAction, tone: kind === "problem" ? "quiet" : "primary" } : undefined} progressLabel={`${title || selected?.label || downloadStatus || ""} progress`} textStyle="status" className={className} />
  }

  return (
    <div
      data-slot="job-progress"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        variant === "compact" && "gap-2 p-3",
        shots && shots.length > 0 && "max-w-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5">
        {outcome?.status === "partial" ? (
          <CircleAlertIcon className="size-3.5 shrink-0 text-status-warning" />
        ) : outcome?.status === "failed" ? (
          <XIcon className="size-3.5 shrink-0 text-destructive" />
        ) : outcome?.status === "cancelled" ? (
          <CircleSlashIcon className="text-muted-foreground size-3.5 shrink-0" />
        ) : finished ? (
          <CheckIcon className="size-3.5 shrink-0 text-status-ok" />
        ) : (
          <Loader2Icon className="text-foreground/35 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
          {title}
        </span>
        {(finished || eta !== undefined) && (
          <span
            className={cn(mono, "text-muted-foreground shrink-0 tabular-nums")}
          >
            {finished ? outcomeLabel ?? doneLabel : eta}
          </span>
        )}
        {!finished && cancelable && (
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={onCancel}
            className={cn(ghostButton, "size-6 shrink-0")}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {finished && elapsedLabel && <time className={cn(mono, "text-muted-foreground")} dateTime={`PT${Math.max(0, Math.round(elapsedMs! / 1000))}S`}>{elapsedLabel}</time>}
      {outcome?.summary && <p className="text-muted-foreground text-xs">{outcome.summary}</p>}

      {notes && notes.length > 0 && (
        <div className="flex flex-col gap-1 text-muted-foreground text-xs">
          {(variant === "compact" ? notes.slice(0, 1) : notes).map((note, index) => (
            <p key={`${index}-${note}`}>{note}</p>
          ))}
        </div>
      )}

      {completedBytes !== undefined && totalBytes !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className={cn(mono, "text-muted-foreground tabular-nums")}>{i18n._({ id: "ui.{done} of {total}", message: "{done} of {total}", values: { done: formatBytes(completedBytes), total: formatBytes(totalBytes) } })}</span>
          {bytesPerSecond !== undefined && bytesPerSecond > 0 && <span className={cn(mono, "text-muted-foreground tabular-nums")}>{formatBytes(bytesPerSecond)}/s</span>}
          {stableEta !== undefined && !finished && <span className="text-muted-foreground">{formatEta(stableEta)}</span>}
        </div>
      )}

      {(downloadState === "paused" || downloadState === "stalled") && onResume && (
        <button type="button" className={ghostButton} onClick={onResume}>{copy?.resume ?? i18n._({ id: "ui.Resume", message: "Resume" })}</button>
      )}
      {downloadState === "failed" && onRetry && (
        <button type="button" className={ghostButton} onClick={onRetry}>{copy?.retry ?? i18n._({ id: "ui.Retry", message: "Retry" })}</button>
      )}
      {downloadState === "stalled" && <p className="text-muted-foreground text-xs">{copy?.stalled ?? i18n._({ id: "ui.Download paused after the connection stalled.", message: "Download paused after the connection stalled." })}</p>}
      {downloadState === "failed" && copy?.checksumFailed && downloadStatus?.toLowerCase().includes("checksum") && <p className="text-muted-foreground text-xs">{copy.checksumFailed}</p>}
      {downloadState === "failed" && copy?.outOfSpace && downloadStatus?.toLowerCase().includes("space") && <p className="text-muted-foreground text-xs">{copy.outOfSpace}</p>}

      <div className="flex items-center gap-2">
        <Progress mode="determinate" value={completedBytes !== undefined && totalBytes ? completedBytes / totalBytes * 100 : overall} label={i18n._({ id: "ui.{title} progress", message: "{title} progress", values: { title } })} />
        {completedBytes !== undefined && totalBytes !== undefined && <span className={cn(mono, "text-muted-foreground shrink-0 tabular-nums")}>{announced(completedBytes / Math.max(1, totalBytes) * 100)}%</span>}
      </div>

      {shots && shots.length > 0 && <ShotList shots={shots} overallEtaSeconds={overallEtaSeconds} />}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn(ghostButton, "px-3 py-1.5 text-xs", action.primary && "text-foreground")}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stages.map((item, i) => (
          <span
            key={item.name}
            className={cn(
              mono,
              i < stage
                ? "text-muted-foreground"
                : i === stage
                  ? "text-foreground/90"
                  : "text-muted-foreground",
            )}
          >
            {item.name}
          </span>
        ))}
      </div>
      {items && items.length > 0 && (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetTrigger asChild><button type="button" className={ghostButton}>{copy?.details ?? i18n._({ id: "ui.File details", message: "File details" })}</button></SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{copy?.details ?? i18n._({ id: "ui.Download file progress", message: "Download file progress" })}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4">
              {items.map((item) => <div key={item.id} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{item.label}</span><span className="text-muted-foreground shrink-0">{stateLabel(item.state)}</span></div>
                <Progress mode="determinate" value={item.totalBytes ? item.completedBytes / item.totalBytes * 100 : item.state === "done" ? 100 : 0} label={i18n._({ id: "ui.{label} progress", message: "{label} progress", values: { label: item.label } })} />
                <span className={cn(mono, "text-muted-foreground text-xs")}>{i18n._({ id: "ui.{done} of {total}", message: "{done} of {total}", values: { done: formatBytes(item.completedBytes), total: formatBytes(item.totalBytes) } })}</span>
              </div>)}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

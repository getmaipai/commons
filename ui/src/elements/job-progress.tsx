"use client";

import { i18n } from "@/kit/i18n"
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { CheckIcon, CircleAlertIcon, CircleSlashIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ghostButton, mono, paper } from "./surfaces";
import { announced, clamp, pct, progressOf, take } from "./range";
import { Progress } from "@/primitives/Progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/ui/sheet";
import { StatusCard } from "@/kit/elements/status-card";

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
  downloadState,
  downloadStatus,
  onResume,
  onRetry,
  copy,
  notes,
  actions,
  variant = "full",
  cancelable = true,
  presentation = "default",
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
  presentation?: "default" | "card";
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
    return <StatusCard kind={kind} stateWord={stateCopy ?? stateLabel(state)} title={title || selected?.label || downloadStatus || ""} line={line} progress={kind === "progress" ? fraction * 100 : undefined} bar={(completedBytes !== undefined && totalBytes !== undefined) || selected ? fraction * 100 : undefined} action={onAction ? { label: actionLabel, onSelect: onAction, tone: kind === "problem" ? "quiet" : "primary" } : undefined} className={className} />
  }

  return (
    <div
      data-slot="job-progress"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        variant === "compact" && "gap-2 p-3",
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

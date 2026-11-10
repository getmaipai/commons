import * as React from "react"
import { CheckIcon, CircleAlertIcon, InfoIcon, LoaderCircleIcon, PauseCircleIcon } from "lucide-react"
import { Button } from "@/kit/ui/button"
import { cn } from "@/kit/utils"
import { SafeImage } from "../primitives/SafeImage"

export type StatusCardKind = "progress" | "waiting" | "done" | "attention" | "problem" | "info"

export interface StatusCardProps {
  kind: StatusCardKind
  stateWord?: string
  title: React.ReactNode
  line?: React.ReactNode
  lead?: React.ReactNode
  icon?: React.ReactNode
  progress?: number
  thumb?: string
  bar?: number
  progressLabel?: string
  textStyle?: "default" | "status"
  action?: { label: string; onSelect: () => void; tone?: "primary" | "quiet" }
  secondary?: { label: string; onSelect: () => void }
  accent?: "app" | "create"
  className?: string
}

// STATUS-CARD-TINT-01: each kind has its own lead ink and soft wash, all theme tokens (tokens.css): progress lime, waiting muted, done teal,
// attention amber, problem red, info blue. A person's accent only recolors progress, and only when the consumer passes `accent`.
export const statusCardInk: Record<StatusCardKind, string> = {
  progress: "var(--status-progress-ink)", waiting: "var(--status-waiting-ink)", done: "var(--status-done-ink)",
  attention: "var(--status-attention-ink)", problem: "var(--tint-problem-border)", info: "var(--tint-info-border)",
}
export const statusCardWash: Record<StatusCardKind, string> = {
  progress: "color-mix(in srgb, var(--status-progress-ink) 12%, transparent)", waiting: "color-mix(in srgb, var(--status-waiting-ink) 8%, transparent)", done: "color-mix(in srgb, var(--status-done-ink) 12%, transparent)",
  attention: "var(--status-attention-wash)", problem: "var(--tint-problem)", info: "var(--tint-info)",
}
/** The card's own surface: a very light wash (about 8 percent) of the kind's ink over `--surface-2`, so the whole card carries its color while text keeps its AA contrast. */
export const statusCardSurface: Record<StatusCardKind, string> = {
  progress: "color-mix(in srgb, var(--status-progress-ink) 8%, var(--surface-2))", waiting: "color-mix(in srgb, var(--status-waiting-ink) 8%, var(--surface-2))", done: "color-mix(in srgb, var(--status-done-ink) 8%, var(--surface-2))",
  attention: "color-mix(in srgb, var(--status-attention-ink) 8%, var(--surface-2))", problem: "color-mix(in srgb, var(--tint-problem-border) 8%, var(--surface-2))", info: "color-mix(in srgb, var(--tint-info-border) 8%, var(--surface-2))",
}
const tint = statusCardInk
const bg = statusCardWash
const roles: Record<StatusCardKind, "status" | "alert"> = {
  progress: "status", waiting: "status", done: "status", attention: "alert", problem: "alert", info: "status",
}

export function StatusCard({ kind, stateWord, title, line, lead, icon, progress, thumb, bar, progressLabel, textStyle = "default", action, secondary, accent, className }: StatusCardProps) {
  const accentColor = accent === "create" ? "var(--accent-create)" : accent === "app" ? "var(--accent-app)" : tint.progress
  const ink = kind === "progress" ? accentColor : tint[kind]
  const barColor = kind === "progress" ? accentColor : tint[kind]
  const ringProgress = Math.max(0, Math.min(100, progress ?? 0))
  const stateIcon = kind === "progress" ? <LoaderCircleIcon aria-hidden className="size-5" /> : kind === "done" ? <CheckIcon aria-hidden className="size-5" /> : kind === "problem" || kind === "attention" ? <CircleAlertIcon aria-hidden className="size-5" /> : kind === "info" ? <InfoIcon aria-hidden className="size-5" /> : <PauseCircleIcon aria-hidden className="size-5" />
  const defaultLead = textStyle === "status" ? (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-full" style={{ background: bg[kind], color: ink }}>{icon ?? stateIcon}</div>
  ) : kind === "progress" && progress !== undefined ? (
    <div aria-label={`${ringProgress}%`} className="flex size-14 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${accentColor} ${ringProgress}%, var(--surface-1) 0)` }}>
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold tabular-nums">{ringProgress}%</span>
    </div>
  ) : thumb && kind === "done" ? <SafeImage src={thumb} alt="" kind="picture" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" /> : (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-full" style={{ background: bg[kind], color: ink }}>{icon}</div>
  )
  return <section role={roles[kind]} data-status-kind={kind} style={{ background: statusCardSurface[kind] }} className={cn("@container flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] p-4 ring-1 ring-inset ring-[var(--hairline)]", className)}>
    {lead ?? defaultLead}
    <div className="min-w-0 flex-1">
      {stateWord && <div className="text-[11px] font-medium uppercase tracking-[.1em]" style={{ color: ink }}>{stateWord}</div>}
      <div className={cn("truncate", textStyle === "status" ? "text-row font-semibold" : "text-base font-semibold")}>{title}</div>
      {line && <div className={cn("line-clamp-3 text-muted-foreground", textStyle === "status" ? "text-supporting" : "text-sm")}>{line}</div>}
      {bar !== undefined && <div role={progressLabel ? "progressbar" : undefined} aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, bar))} className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-1)]"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: barColor }} /></div>}
    </div>
    {(action || secondary) ? <div className="flex shrink-0 items-center gap-2 @max-[430px]:order-last @max-[430px]:basis-full @max-[430px]:ps-[72px]">
        {action && <Button type="button" size="xs" shape="pill" variant={action.tone === "quiet" ? "outline" : "inverse"} onClick={action.onSelect}>{action.label}</Button>}
        {secondary && <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={secondary.onSelect}>{secondary.label}</button>}
      </div> : null}
  </section>
}

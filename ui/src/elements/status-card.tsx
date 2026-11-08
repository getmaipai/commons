import * as React from "react"
import { Button } from "@/kit/ui/button"
import { cn } from "@/kit/utils"

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
  action?: { label: string; onSelect: () => void; tone?: "primary" | "quiet" }
  secondary?: { label: string; onSelect: () => void }
  accent?: "app" | "create"
  className?: string
}

const tint: Record<StatusCardKind, string> = {
  progress: "var(--accent)", waiting: "var(--muted-foreground)", done: "var(--accent-app)",
  attention: "var(--tint-attention-fg)", problem: "var(--destructive)", info: "var(--foreground)",
}
const bg: Record<StatusCardKind, string> = {
  progress: "color-mix(in srgb, var(--accent-app) 16%, transparent)", waiting: "color-mix(in srgb, var(--muted-foreground) 16%, transparent)", done: "color-mix(in srgb, var(--accent-app) 16%, transparent)",
  attention: "var(--tint-attention)", problem: "var(--tint-problem)", info: "var(--tint-info)",
}
const roles: Record<StatusCardKind, "status" | "alert"> = {
  progress: "status", waiting: "status", done: "status", attention: "alert", problem: "alert", info: "status",
}

export function StatusCard({ kind, stateWord, title, line, lead, icon, progress, thumb, bar, action, secondary, accent = "app", className }: StatusCardProps) {
  const accentColor = accent === "create" ? "var(--accent-create)" : "var(--accent-app)"
  const ink = kind === "progress" ? accentColor : tint[kind]
  const ringProgress = Math.max(0, Math.min(100, progress ?? 0))
  const defaultLead = kind === "progress" && progress !== undefined ? (
    <div aria-label={`${ringProgress}%`} className="flex size-14 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${accentColor} ${ringProgress}%, var(--surface-1) 0)` }}>
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold tabular-nums">{ringProgress}%</span>
    </div>
  ) : thumb && kind === "done" ? <img src={thumb} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-full" style={{ background: bg[kind], color: ink }}>{icon}</div>
  )
  return <section role={roles[kind]} data-status-kind={kind} className={cn("@container flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4 ring-1 ring-inset ring-[var(--hairline)]", className)}>
    {lead ?? defaultLead}
    <div className="min-w-0 flex-1">
      {stateWord && <div className="text-[11px] font-medium uppercase tracking-[.1em]" style={{ color: ink }}>{stateWord}</div>}
      <div className="truncate text-base font-semibold">{title}</div>
      {line && <div className="line-clamp-3 text-sm text-muted-foreground">{line}</div>}
      {bar !== undefined && <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-1)]"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: accentColor }} /></div>}
    </div>
    {(action || secondary) ? <div className="flex shrink-0 items-center gap-2 @max-[430px]:order-last @max-[430px]:basis-full @max-[430px]:ps-[72px]">
        {action && <Button type="button" size="xs" shape="pill" variant={action.tone === "quiet" ? "outline" : "inverse"} onClick={action.onSelect}>{action.label}</Button>}
        {secondary && <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={secondary.onSelect}>{secondary.label}</button>}
      </div> : null}
  </section>
}

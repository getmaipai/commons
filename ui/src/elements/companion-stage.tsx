import type { ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { cn } from "@/kit/utils";
import "./companion-stage.css";

export type StageMode = "idle" | "listening" | "thinking" | "speaking" | "working";

export interface CompanionStageAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface CompanionStageProps {
  name: string;
  /** A state word as text. Omit for idle. */
  stateWord?: string;
  mode: StageMode;
  character: ReactNode;
  bubble?: ReactNode;
  onDismissBubble?: () => void;
  dismissLabel?: string;
  workingLine?: string;
  actions?: CompanionStageAction[];
  talk: ReactNode;
  className?: string;
}

function AudioWave({ className }: { className?: string }) {
  return <div data-slot="companion-stage-wave" aria-hidden="true" className={cn("flex h-6 items-center justify-center gap-1", className)}>
    {[0, 1, 2, 3, 4, 5, 6].map((bar) => <span key={bar} className={cn("w-0.5 rounded-sm bg-current", bar % 2 === 0 ? "h-2" : "h-4", "motion-safe:animate-pulse")} />)}
  </div>;
}

export function CompanionStage({ name, stateWord, mode, character, bubble, onDismissBubble, dismissLabel = "Dismiss message", workingLine, actions = [], talk, className }: CompanionStageProps) {
  return <section data-slot="companion-stage" data-mode={mode} aria-label={`${name} companion`} className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
    <header className="flex min-w-0 items-center justify-between gap-3">
      <h2 className="min-w-0 truncate font-medium">{name}</h2>
      {stateWord ? <span role="status" aria-live="polite" className="shrink-0 text-sm text-muted-foreground">{stateWord}</span> : null}
    </header>

    <div data-slot="companion-stage-character-area" className="relative flex min-h-0 flex-1 items-center justify-center">
      <div data-slot="companion-stage-character" className="flex h-full min-h-0 w-full items-center justify-center">{character}</div>
      {mode === "listening" ? <div data-slot="companion-stage-listening-ring" aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-full border border-ring/50 motion-safe:animate-pulse" /> : null}
      {mode === "thinking" ? <div data-slot="companion-stage-thought-cloud" aria-hidden="true" className="absolute right-[18%] top-[15%] size-10 rounded-[50%] border-2 border-border after:absolute after:-bottom-1 after:left-1 after:size-2 after:rounded-full after:border after:border-border" /> : null}
      {bubble !== undefined ? <div data-slot="companion-stage-bubble" className="absolute bottom-3 left-2 z-10 flex max-w-[min(80%,22rem)] items-start gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
        <div className="min-w-0 flex-1">{bubble}</div>
        {onDismissBubble ? <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={dismissLabel} onClick={onDismissBubble}><span aria-hidden="true">×</span></Button> : null}
      </div> : null}
    </div>

    {mode === "working" && workingLine ? <div className="min-w-0 text-sm text-muted-foreground" data-slot="companion-stage-working-line">{workingLine}</div> : null}
    {mode === "working" ? <div data-slot="companion-stage-working-progress" role="progressbar" aria-label="Working" className="h-0.5 w-full overflow-hidden rounded-full bg-muted"><span className="block h-full w-1/3 rounded-sm bg-primary" /></div> : null}
    {actions.length ? <div data-slot="companion-stage-actions" className="flex w-full flex-col gap-2">
      {actions.map((action) => <Button key={action.id} type="button" variant="outline" className="w-full justify-start gap-2" disabled={action.disabled} onClick={action.onSelect}>{action.icon ? <span className="shrink-0">{action.icon}</span> : null}<span className="truncate">{action.label}</span></Button>)}
    </div> : null}
    {mode === "listening" || mode === "speaking" ? <AudioWave className={mode === "listening" ? "text-primary" : "text-foreground"} /> : null}
    <div data-slot="companion-stage-talk" className="w-full">{talk}</div>
  </section>;
}


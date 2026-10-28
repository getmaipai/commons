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

export interface CompanionStageHistoryItem {
  id: string;
  role: "user" | "companion";
  content: ReactNode;
  /** A short time label such as "2:14 PM". */
  time?: string;
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
  /** The conversation so far, oldest first, drawn as friendly bubbles in a scroll area under the character; it starts at the newest message. Omit for none. */
  history?: CompanionStageHistoryItem[];
  /** Accessible name of the history area. Default "Conversation". */
  historyLabel?: string;
  /** What the person just said, drawn small above the bubble so they can see it was heard. */
  heard?: ReactNode;
  /** False hides the name and state word visually (the host shows them in its own header); they stay for screen readers. Default true. */
  showHeader?: boolean;
  className?: string;
}

function AudioWave({ className }: { className?: string }) {
  return <div data-slot="companion-stage-wave" aria-hidden="true" className={cn("flex h-6 items-center justify-center gap-1", className)}>
    {[0, 1, 2, 3, 4, 5, 6].map((bar) => <span key={bar} className={cn("w-0.5 rounded-sm bg-current", bar % 2 === 0 ? "h-2" : "h-4", "motion-safe:animate-pulse")} />)}
  </div>;
}

export function CompanionStage({ name, stateWord, mode, character, bubble, onDismissBubble, dismissLabel = "Dismiss message", workingLine, actions = [], talk, heard, history, historyLabel = "Conversation", showHeader = true, className }: CompanionStageProps) {
  return <section data-slot="companion-stage" data-mode={mode} aria-label={`${name} companion`} className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
    <header className={cn("flex min-w-0 flex-col", !showHeader && "sr-only")}>
      <h2 className="min-w-0 truncate font-medium">{name}</h2>
      {stateWord ? <span role="status" aria-live="polite" className="truncate text-sm text-muted-foreground">{stateWord}</span> : null}
    </header>

    <div data-slot="companion-stage-character-area" className={cn("relative flex min-h-0 items-center justify-center", history ? "flex-[2]" : "flex-1")}>
      <div data-slot="companion-stage-character" className="flex h-full min-h-0 w-full items-center justify-center pt-6">{character}</div>
      {mode === "thinking" ? <div data-slot="companion-stage-thought-cloud" aria-hidden="true" className="absolute right-2 top-1 flex h-9 w-14 items-center justify-center gap-1 rounded-[50%] border-2 border-border bg-card text-muted-foreground after:absolute after:-bottom-1 after:left-1 after:size-2 after:rounded-full after:border after:border-border after:bg-card">
        {[0, 1, 2].map((dot) => <i key={dot} data-slot="companion-stage-thought-dot" className="size-1.5 rounded-full bg-current motion-safe:animate-bounce" style={{ animationDelay: `${dot * 150}ms` }} />)}
      </div> : null}
      {!history && (heard !== undefined || bubble !== undefined) ? <div className="absolute bottom-3 left-2 z-10 flex max-w-[min(80%,22rem)] flex-col items-start gap-1.5">
        {heard !== undefined ? <p data-slot="companion-stage-heard" className="line-clamp-2 px-1 text-xs text-muted-foreground">{heard}</p> : null}
        {bubble !== undefined ? <div data-slot="companion-stage-bubble" className="flex max-w-[min(80%,22rem)] items-start gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
        <div className="min-w-0 flex-1">{bubble}</div>
        {onDismissBubble ? <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={dismissLabel} onClick={onDismissBubble}><span aria-hidden="true">×</span></Button> : null}
      </div> : null}
      </div> : null}
    </div>

    {history ? <div data-slot="companion-stage-history" role="log" aria-label={historyLabel} className="relative z-10 -mt-10 flex min-h-0 flex-[3] flex-col-reverse overflow-y-auto overscroll-contain pt-10 [mask-image:linear-gradient(to_bottom,transparent,black_2.5rem)]">
      <ol className="flex flex-col gap-3 py-1">
        {history.map((item) => <li key={item.id} data-role={item.role} className={cn("flex max-w-[88%] flex-col gap-1", item.role === "user" ? "items-end self-end" : "items-start self-start")}>
          <div className={cn("min-w-0 rounded-2xl px-3.5 py-2 text-sm", item.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground")}>{item.content}</div>
          {item.time ? <span className="px-1 text-xs text-muted-foreground">{item.time}</span> : null}
        </li>)}
      </ol>
    </div> : null}

    {mode === "working" && workingLine ? <div className="min-w-0 text-sm text-muted-foreground" data-slot="companion-stage-working-line">{workingLine}</div> : null}
    {mode === "working" ? <div data-slot="companion-stage-working-progress" role="progressbar" aria-label="Working" className="h-0.5 w-full overflow-hidden rounded-full bg-muted"><span className="block h-full w-1/3 rounded-sm bg-primary" /></div> : null}
    {actions.length ? <div data-slot="companion-stage-actions" className="flex w-full flex-col gap-2">
      {actions.map((action) => <Button key={action.id} type="button" variant="outline" className="w-full justify-start gap-2" disabled={action.disabled} onClick={action.onSelect}>{action.icon ? <span className="shrink-0">{action.icon}</span> : null}<span className="truncate">{action.label}</span></Button>)}
    </div> : null}
    {mode === "listening" || mode === "speaking" ? <AudioWave className={mode === "listening" ? "text-primary" : "text-foreground"} /> : null}
    <div data-slot="companion-stage-talk" className="w-full">{talk}</div>
  </section>;
}


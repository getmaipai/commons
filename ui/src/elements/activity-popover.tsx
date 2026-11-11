"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { BellIcon, CircleStopIcon } from "lucide-react";
import { SafeImage } from "@/kit/primitives/SafeImage";
import { i18n } from "@/kit/i18n";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/kit/ui/popover";

export interface ActivityPopoverItem {
  id: string;
  state: "running" | "done" | "failed";
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  kind?: "picture" | "video" | "music" | "voice";
  progress?: number;
  step?: string;
  project?: string;
  at?: string;
  href?: string;
}

export interface ActivityPopoverProps {
  items: ActivityPopoverItem[];
  onOpen: (id: string) => void;
  onStop?: (id: string) => void;
  onRetry?: (id: string) => void;
  emptyLabel: ReactNode;
}

const kindOf = (kind: ActivityPopoverItem["kind"]): "picture" | "video" | "music" => kind === "voice" ? "music" : kind ?? "picture";

export function ActivityPopover({ items, onOpen, onStop, onRetry, emptyLabel }: ActivityPopoverProps) {
  const ordered = useMemo(() => [...items].sort((a, b) => {
    const rank = (state: ActivityPopoverItem["state"]) => state === "running" ? 0 : 1;
    return rank(a.state) - rank(b.state) || (Date.parse(b.at ?? "") || 0) - (Date.parse(a.at ?? "") || 0);
  }), [items]);
  const running = items.filter((item) => item.state === "running").length;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return <Popover onOpenChange={(open) => { if (!open) requestAnimationFrame(() => triggerRef.current?.focus()); }}>
    <PopoverTrigger asChild>
      <button ref={triggerRef} type="button" aria-label={i18n._({ id: "ui.Activity", message: "Activity" })} className="relative flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-11 items-center justify-center"><BellIcon aria-hidden="true" className="size-5" /></span>
        {running > 0 ? <span aria-hidden="true" className="absolute end-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">{running}</span> : null}
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" width="auto" className="w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-[var(--surface-glass)] p-0 text-foreground shadow-[var(--shadow-glass)] ring-1 ring-inset ring-[var(--hairline)] backdrop-blur-[var(--glass-blur)]">
      <PopoverHeader className="border-b border-border px-4 py-3"><PopoverTitle className="text-base">{i18n._({ id: "ui.Activity", message: "Activity" })}</PopoverTitle></PopoverHeader>
      <div data-slot="activity-popover-list" className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain">
        {ordered.length === 0 ? <div className="px-4 py-6 text-sm text-muted-foreground">{emptyLabel}</div> : <ul className="divide-y divide-border">
          {ordered.map((item) => <li key={item.id}>
            <button type="button" aria-label={[item.title, item.subtitle, item.project].filter(Boolean).join(", ")} onClick={() => onOpen(item.id)} className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <SafeImage src={item.thumbnailUrl} kind={kindOf(item.kind)} alt="" width={52} height={52} className="size-13 shrink-0 rounded-[var(--radius-thumb)] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.state === "running" ? <>
                  {item.step ? <span className="block truncate text-sm text-muted-foreground">{item.step}</span> : null}
                  <span role="progressbar" aria-label={i18n._({ id: "ui.{title} progress", message: "{title} progress", values: { title: item.title } })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, item.progress ?? 0))} className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, item.progress ?? 0))}%` }} /></span>
                </> : item.state === "done" ? item.subtitle ? <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span> : null : <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span>}
              </span>
              {item.project ? <span className="max-w-24 shrink-0 truncate text-sm text-muted-foreground">{item.project}</span> : null}
            </button>
            {item.state === "running" && onStop ? <button type="button" className="me-2 flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`${i18n._({ id: "ui.Stop", message: "Stop" })} ${item.title}`} onClick={() => onStop(item.id)}><CircleStopIcon aria-hidden="true" className="size-5" /></button> : null}
            {item.state === "failed" && onRetry ? <button type="button" className="mx-4 mb-2 min-h-12 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted" onClick={() => onRetry(item.id)}>{i18n._({ id: "ui.Retry", message: "Retry" })}</button> : null}
          </li>)}
        </ul>}
      </div>
    </PopoverContent>
  </Popover>;
}

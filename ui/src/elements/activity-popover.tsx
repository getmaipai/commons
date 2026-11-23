"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { BellIcon, ImageIcon, MusicIcon, VideoIcon } from "lucide-react";
import { i18n } from "@/kit/i18n";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/kit/ui/popover";
import { StatusCard, type StatusCardKind } from "./status-card";

export interface ActivityPopoverItem {
  id: string;
  state: "running" | "done" | "failed";
  title: string;
  subtitle?: string;
  /** Muted line under the title. Falls back to step, then subtitle. */
  line?: string;
  stateWord?: string;
  thumbnailUrl?: string;
  kind?: "picture" | "video" | "music" | "voice";
  /** Card kind override. Defaults by state: running is progress, done is done, failed is problem. */
  cardKind?: StatusCardKind;
  /** Custom lead icon. A done row without a thumbnail and with a kind uses the kind icon instead. */
  icon?: ReactNode;
  progress?: number;
  step?: string;
  project?: string;
  at?: string;
  href?: string;
  /** Label of the main action button. Defaults to "Open". */
  actionLabel?: string;
  onClear?: () => void;
  /** Label of the clear action. Defaults to "Clear this". */
  clearLabel?: string;
}

export interface ActivityPopoverProps {
  items: ActivityPopoverItem[];
  onOpen: (id: string) => void;
  onStop?: (id: string) => void;
  onRetry?: (id: string) => void;
  emptyLabel: ReactNode;
  /** How many rows the list shows before the See all row. Defaults to 5. */
  limit?: number;
  /** Label of the See all row. Defaults to "See all". */
  seeAllLabel?: string;
  onSeeAll?: () => void;
}

const cardKindFor = (state: ActivityPopoverItem["state"]): StatusCardKind => state === "running" ? "progress" : state === "done" ? "done" : "problem";

const kindIconFor = (kind: NonNullable<ActivityPopoverItem["kind"]>): ReactNode => {
  if (kind === "video") return <VideoIcon aria-hidden="true" className="size-5" />;
  if (kind === "music" || kind === "voice") return <MusicIcon aria-hidden="true" className="size-5" />;
  return <ImageIcon aria-hidden="true" className="size-5" />;
};

export function ActivityPopover({ items, onOpen, onStop, onRetry, emptyLabel, limit = 5, seeAllLabel, onSeeAll }: ActivityPopoverProps) {
  const ordered = useMemo(() => [...items].sort((a, b) => {
    const rank = (state: ActivityPopoverItem["state"]) => state === "running" ? 0 : 1;
    return rank(a.state) - rank(b.state) || (Date.parse(b.at ?? "") || 0) - (Date.parse(a.at ?? "") || 0);
  }), [items]);
  const visible = ordered.slice(0, limit);
  const running = items.filter((item) => item.state === "running").length;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const seeAllText = seeAllLabel ?? i18n._({ id: "ui.See all", message: "See all" });

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
        {ordered.length === 0 ? <div className="px-4 py-6 text-sm text-muted-foreground">{emptyLabel}</div> : <>
          <ul className="space-y-2 p-2">
            {visible.map((item) => {
              const isRunning = item.state === "running";
              const action = item.state === "failed" && onRetry
                ? { label: i18n._({ id: "ui.Retry", message: "Retry" }), onSelect: () => onRetry(item.id), tone: "primary" as const }
                : { label: item.actionLabel ?? i18n._({ id: "ui.Open", message: "Open" }), onSelect: () => onOpen(item.id), tone: isRunning ? "quiet" as const : "primary" as const };
              const secondary = isRunning && onStop
                ? { label: i18n._({ id: "ui.Stop", message: "Stop" }), onSelect: () => onStop(item.id) }
                : item.state === "done" && item.onClear
                  ? { label: item.clearLabel ?? i18n._({ id: "ui.Clear this", message: "Clear this" }), onSelect: item.onClear }
                  : undefined;
              return <li key={item.id}>
                <StatusCard kind={item.cardKind ?? cardKindFor(item.state)} stateWord={item.stateWord} title={item.title} line={item.line ?? item.step ?? item.subtitle} icon={item.state === "done" && !item.thumbnailUrl && item.kind ? kindIconFor(item.kind) : item.icon} thumb={item.thumbnailUrl} progress={isRunning ? item.progress : undefined} action={action} secondary={secondary} />
              </li>;
            })}
          </ul>
          {ordered.length > limit && onSeeAll ? <div className="border-t border-border p-2"><button type="button" className="w-full min-h-12 rounded-md px-3 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onSeeAll}>{seeAllText}</button></div> : null}
        </>}
      </div>
    </PopoverContent>
  </Popover>;
}

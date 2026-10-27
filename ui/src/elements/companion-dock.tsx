"use client";

import type { ReactNode } from "react";
import { MinusIcon, XIcon } from "lucide-react";
import { Button } from "@/kit/ui/button";
import { cn } from "@/kit/utils";

export interface CompanionDockProps {
  /** The companion's name, drawn as the title and used as the accessible name. */
  name: string;
  /** The character: the host passes the idle still, a greeting or a sleeping look. The dock draws no status, count or dot. */
  face: ReactNode;
  /** One short line, for example a greeting. */
  line: string;
  /** Shown as a single button only while something needs the person. Unset: no button. */
  reviewLabel?: string;
  onReview?: () => void;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  onClose: () => void;
  minimizeLabel: string;
  expandLabel: string;
  closeLabel: string;
  /** Pins the dock to the bottom corner of the viewport. */
  docked?: boolean;
  className?: string;
}

/** A small corner card for a companion outside Chat: face, name, one line, at most one action. It opens no panel. */
export function CompanionDock({ name, face, line, reviewLabel, onReview, minimized, onMinimizedChange, onClose, minimizeLabel, expandLabel, closeLabel, docked, className }: CompanionDockProps) {
  const position = docked && "pointer-events-none fixed end-4 bottom-4 z-50 max-w-[min(20rem,calc(100vw-2rem))] *:pointer-events-auto";
  if (minimized) {
    return <div data-slot="companion-dock" className={cn(position, className)}>
      <Button type="button" variant="outline" size="icon" aria-label={expandLabel} onClick={() => onMinimizedChange(false)} className="size-12 rounded-full">
        <span aria-hidden="true" className="size-8">{face}</span>
      </Button>
    </div>;
  }
  return <aside data-slot="companion-dock" aria-label={name} className={cn(position, className)}>
    <div className="bg-background text-foreground border-border/60 dark:bg-popover flex w-full items-center gap-3 rounded-[20px] border p-3 shadow-sm">
      <div aria-hidden="true" className="size-12 shrink-0">{face}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-xs">{line}</span>
        {reviewLabel && onReview ? <Button type="button" size="sm" className="mt-1 self-start" onClick={onReview}>{reviewLabel}</Button> : null}
      </div>
      <div className="flex flex-col self-start">
        <Button type="button" variant="ghost" size="icon" aria-label={minimizeLabel} onClick={() => onMinimizedChange(true)}><MinusIcon aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}><XIcon aria-hidden="true" /></Button>
      </div>
    </div>
  </aside>;
}

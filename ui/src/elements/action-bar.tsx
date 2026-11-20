"use client";

import { useId } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { i18n } from "@/kit/i18n";

export interface ActionBarAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** The action is running: the button shows `busyLabel` (or its label) with a spinner and cannot be pressed again. */
  busy?: boolean;
  busyLabel?: string;
}

export interface ActionBarProps {
  /** The one thing this screen is for ("Render film"). */
  primary: ActionBarAction;
  /** A quieter second choice ("Save as draft"). */
  secondary?: ActionBarAction;
  /** A plain line the server supplies beside the actions ("About 45 minutes to render"). */
  estimate?: string;
  /** Why the primary action is not available right now, in plain words with the next step. Replaces the estimate while shown. */
  reason?: string;
  /** A plain helper line under the estimate or reason ("Keeps the opening shots"). It explains; it never disables an action. */
  note?: string;
  /** Stick to the foot of the window (default). On a phone it sits above the bottom bar. */
  sticky?: boolean;
  /** Names the bar for assistive tech. */
  label?: string;
  className?: string;
}

/** K6: a sticky bar with a primary action, an optional secondary action and a plain estimate line. A reason line explains an unavailable action. */
export function ActionBar({ primary, secondary, estimate, reason, note, sticky = true, label = i18n._({ id: "ui.Actions", message: "Actions" }), className }: ActionBarProps) {
  const lineId = useId();
  const noteId = useId();
  const blocked = Boolean(reason);
  const line = reason ?? estimate;
  return (
    <div
      role="region"
      aria-label={label}
      data-slot="action-bar"
      data-sticky={sticky ? "" : undefined}
      data-blocked={blocked ? "" : undefined}
      data-compact={secondary ? "" : undefined}
      className={cn(
        "flex w-full flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6",
        sticky && "sticky bottom-0 z-20",
        secondary && "max-sm:[&_[data-slot=action-bar-line]]:sr-only max-sm:[&_[data-slot=action-bar-note]]:sr-only max-sm:py-2",
        className,
      )}
    >
      {line || note ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          {line ? (
            <p data-slot="action-bar-line" id={lineId} role={blocked ? "status" : undefined} className={cn("min-w-0 text-[14px] leading-snug", blocked ? "text-foreground" : "text-muted-foreground")}>
              {line}
            </p>
          ) : null}
          {note ? <p data-slot="action-bar-note" id={noteId} className="text-muted-foreground min-w-0 text-[13px] leading-snug">{note}</p> : null}
        </div>
      ) : <span />}
      <div className="flex shrink-0 items-center gap-2 max-sm:[&>*]:flex-1">
        {secondary ? (
          <Button type="button" variant="outline" className="min-h-12" disabled={secondary.disabled || secondary.busy} onClick={secondary.onSelect}>
            {secondary.busy ? <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
            {secondary.busy ? secondary.busyLabel ?? secondary.label : secondary.label}
          </Button>
        ) : null}
        <Button
          type="button"
          className="min-h-12 px-6"
          disabled={primary.disabled || blocked || primary.busy}
          aria-busy={primary.busy || undefined}
          aria-describedby={[line ? lineId : null, note ? noteId : null].filter(Boolean).join(" ") || undefined}
          onClick={primary.onSelect}
        >
          {primary.busy ? <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
          {primary.busy ? primary.busyLabel ?? primary.label : primary.label}
        </Button>
      </div>
    </div>
  );
}

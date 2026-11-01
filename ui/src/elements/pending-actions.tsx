"use client";

import { Button } from "@/kit/ui/button";

/** One answer the host offers while a job is held (queued). The host owns what it does. */
export type PendingAction = {
  label: string;
  onSelect: () => void;
  /** The kit Button variant. Default "outline"; use "default" for the one main answer. */
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
};

/** The row of answers under a held job's status line. Draws nothing for an empty list. */
export function PendingActions({ actions, className }: { actions?: PendingAction[]; className?: string }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div data-slot="pending-actions" role="group" aria-label="Choose what happens" className={`flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}>
      {actions.map(action => (
        <Button key={action.label} type="button" size="sm" variant={action.variant ?? "outline"} disabled={action.disabled} className="min-h-10" onClick={action.onSelect}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}

import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING_INSET, hitArea } from "@/kit/utils";

export type HubCardStatus = "ok" | "warning" | "error";

const STATUS_DOT_CLASS: Record<HubCardStatus, string> = {
  ok: "bg-[var(--hue-teal)]",
  warning: "bg-[var(--hue-orange)]",
  error: "bg-[var(--hue-red)]",
};

export interface HubCardProps {
  /** The rail's rendered mode, matching the sidebar's own `data-
   * collapsible` state - the collapsed rail shows only the status dot
   * (spec "The shell, exactly": "Collapsed rail: ... the hub card
   * becomes its status dot"). */
  collapsed?: boolean;
  name: string;
  subtitle: string;
  status: HubCardStatus;
  statusLabel: string;
  onClick: () => void;
}

// The rail's bottom hub card (spec "The shell, exactly"): the hub's
// name, its OS and version, a status dot with "All systems healthy" or
// the open-repairs count, tapping opens Repairs.
export function HubCard({ collapsed = false, name, subtitle, status, statusLabel, onClick }: HubCardProps) {
  const MonitorIcon = getIcon("monitor");
  if (collapsed) {
    // hitArea(1) on this 40px (size-10) box: docs/UI.md's 48px touch-
    // target floor, the same step button.tsx's own `icon-lg` uses.
    return (
      <button type="button" onClick={onClick} aria-label={`${name}: ${statusLabel}`} className={cn("mx-auto flex size-10 items-center justify-center rounded-xl border bg-[var(--surface-card)] hover:bg-[var(--surface-pane)]", FOCUS_RING_INSET, hitArea(1))}>
        <span aria-hidden className={cn("size-2.5 rounded-full", STATUS_DOT_CLASS[status])} />
      </button>
    );
  }
  const ChevronIcon = getIcon("chevron-right");
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full flex-col gap-2 rounded-xl border bg-[var(--surface-card)] p-2.5 text-left hover:bg-[var(--surface-pane)]", FOCUS_RING_INSET)}>
      <div className="flex items-center gap-2.5">
        <MonitorIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {/* Deliberate type-floor exception (docs/UI.md, lane 7 item 3):
              a compact status card inside the 252px rail, the same
              category as a badge or token - matches the reference's own
              small machine-card text. */}
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {/* Deliberate type-floor exception (docs/UI.md, lane 7 item 3):
          same compact rail-card category as the subtitle above. */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT_CLASS[status])} />
        <span className="truncate">{statusLabel}</span>
        <ChevronIcon className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
      </div>
    </button>
  );
}

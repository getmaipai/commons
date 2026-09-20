import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING_INSET, hitArea } from "@/kit/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/kit/ui/tooltip";

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
    // Owner finding, "The collapsed rail," 2026-09-20: this used to
    // shrink to a lone status dot with no hub icon at all - "the hub
    // card becomes its status dot" (the original spec line) read too
    // literally. The rule now: "a 40px tile with the hub icon and the
    // status dot at its corner" - the same `--tile-radius` token every
    // other tile in the rail draws through, the dot at the corner with
    // the same `right-0 bottom-0`/`ring-2` geometry `ui/avatar.tsx`'s
    // own `AvatarBadge` uses (not that component directly - its sizing
    // is scoped to a `group/avatar` ancestor this tile doesn't have,
    // a real generalization for another day, not just a drop-in swap),
    // its ring in the rail's own surface color rather than
    // `AvatarBadge`'s generic page-background one, since that's what
    // actually sits behind this tile. hitArea(1) on this 40px box:
    // docs/UI.md's 48px touch-target floor, the same step button.tsx's
    // own `icon-lg` uses.
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              aria-label={`${name}: ${statusLabel}`}
              className={cn("relative mx-auto flex size-10 items-center justify-center border bg-[var(--surface-card)] hover:bg-[var(--surface-pane)]", FOCUS_RING_INSET, hitArea(1))}
              style={{ borderRadius: "var(--tile-radius)" }}
            >
              <MonitorIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <span aria-hidden className={cn("absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-[var(--surface-sidebar)]", STATUS_DOT_CLASS[status])} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{statusLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
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

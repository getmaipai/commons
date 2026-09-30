/**
 * Source: https://github.com/tremorlabs/tremor/blob/ca4d588f47820ff3d514d37fa4ee08a4222dec11/src/components/Tracker/Tracker.tsx
 * Upstream commit: ca4d588f47820ff3d514d37fa4ee08a4222dec11
 * License: Apache-2.0, see ui/THIRD_PARTY/tremor-LICENSE-Apache-2.0.txt
 * Copyright: Copyright © 2025 Tremor. All rights reserved.
 * modified:
 * - Replace HoverCard and cx with the kit Tooltip components and cn helper.
 * - Replace color props with kit hue and semantic tokens.
 * - Adapt the data shape to status, day label, and optional ReactNode detail.
 * - Add button focus support, per-cell accessible names, and a named group.
 * - Set the tooltip label and detail as separate readable content.
 * - Retain the upstream Apache license in ui/THIRD_PARTY/tremor-LICENSE-Apache-2.0.txt.
 */
import type { ReactNode } from "react";
import { cn } from "@/kit/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/kit/ui/tooltip";

export type UptimeStatus = "up" | "degraded" | "down" | "maintenance" | "none";

export type UptimeDatum = {
  status: UptimeStatus;
  label: string;
  detail?: ReactNode;
};

export type UptimeStripProps = {
  data: UptimeDatum[];
  className?: string;
  "aria-label"?: string;
};

const statusColors: Record<UptimeStatus, string> = {
  up: "bg-[var(--hue-green)]",
  degraded: "bg-[var(--hue-yellow)]",
  down: "bg-destructive",
  maintenance: "bg-primary",
  none: "bg-muted",
};

function statusText(status: UptimeStatus) {
  return status === "up" ? "up" : status;
}

function UptimeStrip({
  data,
  className,
  "aria-label": ariaLabel = "Uptime history",
}: UptimeStripProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex w-full items-center gap-1", className)}
    >
      {data.map(({ status, label, detail }, index) => (
        <Tooltip key={`${label}-${index}`}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${label}, ${statusText(status)}`}
              className={cn(
                "h-8 min-w-0 flex-1 rounded-sm transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                statusColors[status],
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="flex flex-col gap-1">
            <span className="font-medium">{label}</span>
            {detail != null && <span>{detail}</span>}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export { UptimeStrip };

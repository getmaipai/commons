/**
 * Source: https://github.com/tremorlabs/tremor/blob/ca4d588f47820ff3d514d37fa4ee08a4222dec11/src/components/Tracker/Tracker.tsx
 * Upstream commit: ca4d588f47820ff3d514d37fa4ee08a4222dec11
 * License: Apache-2.0, see ui/THIRD_PARTY/tremor-LICENSE-Apache-2.0.txt
 * Copyright: Copyright © 2025 Tremor. All rights reserved.
 * modified:
 * - Replace HoverCard and cx with the kit Tooltip components and cn helper.
 * - Replace color props with kit hue and semantic tokens.
 * - Adapt the data shape to status, day label, and optional ReactNode detail.
 * - Make cells non-interactive and expose the strip as one labelled image with a summary.
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
  summary?: string;
};

const statusColors: Record<UptimeStatus, string> = {
  up: "bg-[var(--hue-green)]",
  degraded: "bg-[var(--hue-yellow)]",
  down: "bg-destructive",
  maintenance: "bg-primary",
  none: "bg-muted",
};

function UptimeStrip({
  data,
  className,
  "aria-label": ariaLabel,
  summary,
}: UptimeStripProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? summary ?? `Uptime history, ${data.length} days`}
      className={cn("flex w-full items-center gap-1", className)}
    >
      {data.map(({ status, label, detail }, index) => (
        <Tooltip key={`${label}-${index}`}>
          <TooltipTrigger asChild>
            <div
              aria-hidden="true"
              className={cn(
                "h-8 min-w-0 flex-1 rounded-sm transition-opacity hover:opacity-75",
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

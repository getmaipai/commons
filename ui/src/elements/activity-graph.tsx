"use client";

import type { ComponentProps } from "react";
import type { HeatGraphDataPoint } from "./heat-graph";
import { cn } from "cn";
import {
  HeatGraphDayLabels,
  HeatGraphGrid,
  HeatGraphLegend,
  HeatGraphRoot,
} from "./heat-graph";
import { mono, paper } from "./surfaces";

export function ActivityGraph({
  data,
  start,
  end,
  title,
  total,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "data" | "start" | "end" | "title" | "total"
> & {
  data: readonly HeatGraphDataPoint[];
  start: string | Date;
  end: string | Date;
  title: string;
  total: string;
}) {
  return (
    <div
      data-slot="activity-graph"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {total}
        </span>
      </div>

      <HeatGraphRoot data={[...data]} start={start} end={end}>
        <div className="flex gap-2 overflow-x-auto">
          <HeatGraphDayLabels />
          <HeatGraphGrid />
        </div>

        <HeatGraphLegend />
      </HeatGraphRoot>
    </div>
  );
}

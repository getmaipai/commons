"use client";

import type { ComponentProps, ReactNode } from "react";
import * as HeatGraphPrimitive from "heat-graph";
import { cn } from "cn";
import { floating, mono } from "./surfaces";

/**
 * Vendored from assistant-ui's `heat-graph` Element, restyled by kit tokens
 * (no hex colors) and split into parts so `ActivityGraph` composes the same
 * definition instead of carrying a second one. Nothing here fetches or links
 * anywhere; every word is a prop.
 */

/** Cell tint per level, empty first. The one definition of the scale. */
export const HEAT_LEVEL_TINT = [
  "bg-foreground/[0.06]",
  "bg-blue-500/25 dark:bg-blue-400/25",
  "bg-blue-500/45 dark:bg-blue-400/45",
  "bg-blue-500/70 dark:bg-blue-400/70",
  "bg-blue-500 dark:bg-blue-400",
] as const;

export type HeatGraphDataPoint = HeatGraphPrimitive.DataPoint;

/** `sm` is the 9px chat-card grid; `md` is the 13px full-width grid. */
export type HeatGraphSize = "sm" | "md";

const CELL = { sm: "size-[9px] rounded-[2px]", md: "aspect-square w-full rounded-sm" } as const;
const ROW = { sm: "h-[9px]", md: "h-[13px]" } as const;

export function HeatGraphRoot({
  weekStart = "monday",
  className,
  ...props
}: ComponentProps<typeof HeatGraphPrimitive.Root>) {
  return (
    <HeatGraphPrimitive.Root
      weekStart={weekStart}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

export function HeatGraphDayLabels({
  size = "sm",
  dayLabel = (dayOfWeek) => HeatGraphPrimitive.DAY_SHORT[dayOfWeek] ?? "",
  className,
}: {
  size?: HeatGraphSize;
  /** The word for a weekday, 0 (Sunday) to 6. */
  dayLabel?: (dayOfWeek: number) => string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-[3px]",
        size === "md" && "w-8",
        className,
      )}
    >
      <HeatGraphPrimitive.DayLabels>
        {({ label }) => (
          <span
            className={cn(
              mono,
              "text-muted-foreground flex",
              ROW[size],
              "items-center leading-none",
            )}
          >
            {label.row % 2 === 1 ? dayLabel(label.dayOfWeek) : ""}
          </span>
        )}
      </HeatGraphPrimitive.DayLabels>
    </div>
  );
}

export function HeatGraphMonthLabels({
  monthLabel = (month) => HeatGraphPrimitive.MONTH_SHORT[month] ?? "",
  className,
}: {
  monthLabel?: (month: number) => string;
  className?: string;
}) {
  return (
    <div className={cn("relative ms-10 h-5", className)}>
      <HeatGraphPrimitive.MonthLabels>
        {({ label, totalWeeks }) => (
          <span
            className={cn(mono, "text-muted-foreground absolute")}
            style={{ left: `${(label.column / totalWeeks) * 100}%` }}
          >
            {monthLabel(label.month)}
          </span>
        )}
      </HeatGraphPrimitive.MonthLabels>
    </div>
  );
}

export function HeatGraphGrid({
  size = "sm",
  levelClassNames = HEAT_LEVEL_TINT,
  className,
}: {
  size?: HeatGraphSize;
  levelClassNames?: readonly string[];
  className?: string;
}) {
  return (
    <HeatGraphPrimitive.Grid className={cn("gap-[3px]", size === "md" && "flex-1", className)}>
      {({ cell }) => (
        <HeatGraphPrimitive.Cell
          className={cn(
            CELL[size],
            levelClassNames[cell.level] ?? levelClassNames[0],
          )}
        />
      )}
    </HeatGraphPrimitive.Grid>
  );
}

export function HeatGraphLegend({
  lessLabel = "less",
  moreLabel = "more",
  levelClassNames = HEAT_LEVEL_TINT,
  className,
}: {
  lessLabel?: string;
  moreLabel?: string;
  levelClassNames?: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 self-end", className)}>
      <span className={cn(mono, "text-muted-foreground")}>{lessLabel}</span>
      {levelClassNames.map((tint, level) => (
        <span
          key={level}
          aria-hidden
          className={cn("size-[9px] rounded-[2px]", tint)}
        />
      ))}
      <span className={cn(mono, "text-muted-foreground")}>{moreLabel}</span>
    </div>
  );
}

export function HeatGraphTooltip({
  label = ({ count, date }) =>
    `${count} on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
  className,
}: {
  label?: (cell: { count: number; date: Date }) => ReactNode;
  className?: string;
}) {
  return (
    <HeatGraphPrimitive.Tooltip
      className={cn(
        floating,
        mono,
        "pointer-events-none rounded-md px-3 py-1.5 whitespace-nowrap",
        className,
      )}
    >
      {({ cell }) => label({ count: cell.count, date: cell.date })}
    </HeatGraphPrimitive.Tooltip>
  );
}

export function HeatGraph({
  size = "md",
  levelClassNames,
  lessLabel,
  moreLabel,
  dayLabel,
  monthLabel,
  tooltipLabel,
  ...props
}: Omit<ComponentProps<typeof HeatGraphPrimitive.Root>, "children"> & {
  size?: HeatGraphSize;
  levelClassNames?: readonly string[];
  lessLabel?: string;
  moreLabel?: string;
  dayLabel?: (dayOfWeek: number) => string;
  monthLabel?: (month: number) => string;
  tooltipLabel?: (cell: { count: number; date: Date }) => ReactNode;
}) {
  return (
    <HeatGraphRoot data-slot="heat-graph" {...props}>
      <HeatGraphMonthLabels {...(monthLabel ? { monthLabel } : {})} />
      <div className="flex gap-2 overflow-x-auto">
        <HeatGraphDayLabels size={size} {...(dayLabel ? { dayLabel } : {})} />
        <HeatGraphGrid size={size} {...(levelClassNames ? { levelClassNames } : {})} />
      </div>
      <HeatGraphLegend
        {...(lessLabel ? { lessLabel } : {})}
        {...(moreLabel ? { moreLabel } : {})}
        {...(levelClassNames ? { levelClassNames } : {})}
      />
      <HeatGraphTooltip {...(tooltipLabel ? { label: tooltipLabel } : {})} />
    </HeatGraphRoot>
  );
}

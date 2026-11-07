"use client";

import type { ComponentProps } from "react";
import { cn } from "cn";
import { inkButton, mono, paper } from "./surfaces";
import { announced, pct } from "./range";
import { i18n } from "@/kit/i18n";

export function QuotaBanner({
  used,
  limit,
  unit,
  resetsIn,
  upgradeLabel,
  onUpgrade,
  formatAmount,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "used"
  | "limit"
  | "unit"
  | "resetsIn"
  | "upgradeLabel"
  | "onUpgrade"
  | "formatAmount"
> & {
  used: number;
  limit: number;
  unit: string;
  /** Formats a numeric amount with its display unit. Unset: raw value and unit. */
  formatAmount?: (value: number) => string;
  /** Unset: the reset line is not drawn. */
  resetsIn?: string;
  /** The button is drawn only when this and `onUpgrade` are both given. */
  upgradeLabel?: string;
  onUpgrade?: () => void;
}) {
  const left = Math.max(0, limit - used);
  const ratio = limit === 0 ? 0 : used / limit;
  const tight = ratio >= 0.9;
  const amountWithUnit = (value: number) => formatAmount?.(value) ?? `${value} ${unit}`;

  return (
    <div
      data-slot="quota-banner"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-2.5 rounded-2xl p-3.5",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-[13.5px] font-medium",
            tight && "text-status-warning-ink",
          )}
        >
          {i18n._({ id: "ui.{amount} left", message: "{amount} left", values: { amount: amountWithUnit(left) } })}
        </span>
        {resetsIn !== undefined && (
          <span className={cn(mono, "text-muted-foreground ms-auto tabular-nums")}>
            {i18n._({ id: "ui.resets in {resetsIn}", message: "resets in {resetsIn}", values: { resetsIn } })}
          </span>
        )}
      </div>

      <span
        role="meter"
        aria-label={i18n._({ id: "ui.{unit} used", message: "{unit} used", values: { unit } })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced(pct(used, limit))}
        aria-valuetext={formatAmount
          ? i18n._({ id: "ui.{used} of {limit} used", message: "{used} of {limit} used", values: { used: formatAmount(used), limit: formatAmount(limit) } })
          : i18n._({ id: "ui.{used} of {limit} {unit} used", message: "{used} of {limit} {unit} used", values: { used, limit, unit } })}
        className="bg-foreground/[0.06] h-1 w-full overflow-hidden rounded-full"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            tight ? "bg-status-warning" : "bg-foreground/40",
          )}
          style={{ width: `${pct(used, limit)}%` }}
        />
      </span>

      <div className="flex items-center gap-2">
        <span className={cn(mono, "text-muted-foreground tabular-nums")}>
          {formatAmount
            ? i18n._({ id: "ui.{used} of {limit} used", message: "{used} of {limit} used", values: { used: formatAmount(used), limit: formatAmount(limit) } })
            : i18n._({ id: "ui.{used} of {limit} used", message: "{used} of {limit} used", values: { used, limit } })}
        </span>
        {onUpgrade && upgradeLabel !== undefined && (
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              inkButton,
              "ms-auto flex h-7 items-center rounded-full px-3 text-xs font-medium",
            )}
          >
            {upgradeLabel}
          </button>
        )}
      </div>
    </div>
  );
}

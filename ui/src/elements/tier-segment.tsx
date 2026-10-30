"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "../ui/button";

export type TierId = "standard" | "boost" | "max";

export interface TierOptionDef {
  id: TierId;
  label: string;
  /** One line under the control for this tier (for example "Fast", "More detail"). */
  hint?: string;
  /** Set when the tier cannot be picked right now; the reason is shown instead of the hint. */
  disabledReason?: string;
  /** Set when choosing this tier needs a yes first: the one confirm line (what it costs and what waits). */
  confirm?: string;
}

export const DEFAULT_TIERS: readonly TierOptionDef[] = [
  { id: "standard", label: "Standard" },
  { id: "boost", label: "Boost" },
  { id: "max", label: "Max" },
];

export interface TierSegmentProps {
  value: TierId;
  onValueChange: (tier: TierId) => void;
  /** Only the tiers the person may pick: a tier left out is not drawn (Max for someone without the grant). */
  tiers?: readonly TierOptionDef[];
  /** Words on the confirm buttons. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Names the group for assistive tech, for example "Quality". */
  label?: string;
  className?: string;
}

/** The Standard, Boost, Max choice on a picture, video or song card, beside Make another. A tier with a `confirm` line asks once before it applies. */
export function TierSegment({ value, onValueChange, tiers = DEFAULT_TIERS, confirmLabel = "Continue", cancelLabel = "Cancel", label = "Quality", className }: TierSegmentProps) {
  const [pending, setPending] = useState<TierOptionDef | null>(null);
  const shown = tiers.find((t) => t.id === value);
  const note = pending?.confirm ?? undefined;
  return (
    <div data-slot="tier-segment" className={cn("flex flex-col gap-1.5", className)}>
      <div role="radiogroup" aria-label={label} className="inline-flex w-fit rounded-full border border-border p-0.5">
        {tiers.map((tier) => {
          const selected = tier.id === value;
          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={tier.disabledReason ? true : undefined}
              data-tier={tier.id}
              title={tier.disabledReason}
              className={cn(
                "min-h-[48px] rounded-full px-4 text-[13.5px] transition-colors",
                selected ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.035]",
                tier.disabledReason && "cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                if (tier.disabledReason || selected) return;
                if (tier.confirm) setPending(tier);
                else { setPending(null); onValueChange(tier.id); }
              }}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
      {pending && note ? (
        <div data-slot="tier-segment-confirm" role="group" aria-label={`Confirm ${pending.label}`} className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">{note}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => { onValueChange(pending.id); setPending(null); }}>{confirmLabel}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>{cancelLabel}</Button>
          </div>
        </div>
      ) : (
        <p data-slot="tier-segment-hint" className="text-[12.5px] text-muted-foreground">
          {shown?.disabledReason ?? shown?.hint ?? " "}
        </p>
      )}
    </div>
  );
}

export interface TierChipProps {
  tier: TierId;
  label?: string;
  /** Set while a Max lease is held: the chip becomes a button that releases it. */
  onRelease?: () => void;
  releaseLabel?: string;
  className?: string;
}

/** The composer model chip's tier marker. Standard draws nothing; Boost and Max name the level, and a held Max can be tapped to release. */
export function TierChip({ tier, label, onRelease, releaseLabel = "Release Max", className }: TierChipProps) {
  if (tier === "standard") return null;
  const words = label ?? (tier === "max" ? "Max" : "Boost");
  const classes = cn("inline-flex min-h-[24px] items-center rounded-full border border-border px-2 text-[12px] text-muted-foreground", className);
  if (tier === "max" && onRelease) {
    return <button type="button" data-slot="tier-chip" data-tier={tier} aria-label={`${releaseLabel}: ${words}`} className={cn(classes, "min-h-[48px]")} onClick={onRelease}>{words}</button>;
  }
  return <span data-slot="tier-chip" data-tier={tier} className={classes}>{words}</span>;
}

"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "../ui/button";
import { i18n } from "@/kit/i18n"

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

export const defaultTiers = (): readonly TierOptionDef[] => [
  { id: "standard", label: i18n._({ id: "ui.Standard", message: "Standard" }) },
  { id: "boost", label: i18n._({ id: "ui.Boost", message: "Boost" }) },
  { id: "max", label: i18n._({ id: "ui.Max", message: "Max" }) },
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
  /** VIDEO-UI-12: `segment` (default, unchanged) or `cards`: one card per level with its label, its hint as the promise, and its time
   * words from `details`; a level with a `disabledReason` shows that reason as visible text in place of its promise. */
  presentation?: "segment" | "cards";
  /** VIDEO-UI-12: cards only: the time words by level id ("About a minute"). */
  details?: Readonly<Record<string, string>>;
}

/** The Standard, Boost, Max choice on a picture, video or song card, beside Make another. A tier with a `confirm` line asks once before it applies. */
export function TierSegment({ value, onValueChange, tiers = defaultTiers(), confirmLabel = i18n._({ id: "ui.Continue", message: "Continue" }), cancelLabel = i18n._({ id: "ui.Cancel", message: "Cancel" }), label = i18n._({ id: "ui.Quality", message: "Quality" }), className, presentation = "segment", details }: TierSegmentProps) {
  const [pending, setPending] = useState<TierOptionDef | null>(null);
  const shown = tiers.find((t) => t.id === value);
  const note = pending?.confirm ?? undefined;
  const choose = (tier: TierOptionDef) => {
    if (tier.disabledReason || tier.id === value) return;
    if (tier.confirm) setPending(tier);
    else { setPending(null); onValueChange(tier.id); }
  };
  const confirmBlock = pending && note ? (
    <div data-slot="tier-segment-confirm" role="group" aria-label={i18n._({ id: "ui.Confirm {label}", message: "Confirm {label}", values: { label: pending.label } })} className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">{note}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => { onValueChange(pending.id); setPending(null); }}>{confirmLabel}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>{cancelLabel}</Button>
      </div>
    </div>
  ) : null;
  if (presentation === "cards") {
    return (
      <div data-slot="tier-segment" data-presentation="cards" className={cn("flex flex-col gap-2", className)}>
        <div role="radiogroup" aria-label={label} className="grid min-w-0 grid-cols-3 gap-2">
          {tiers.map((tier) => {
            const selected = tier.id === value;
            const blocked = Boolean(tier.disabledReason);
            const time = !blocked ? details?.[tier.id] : undefined;
            return (
              <button
                key={tier.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={blocked ? true : undefined}
                data-tier={tier.id}
                className={cn(
                  "flex min-h-[7.5rem] min-w-0 flex-col items-start gap-1 rounded-xl border-2 p-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  selected ? "border-foreground bg-foreground/[0.04]" : "border-border hover:bg-foreground/[0.035]",
                  blocked && "cursor-not-allowed border-dashed bg-transparent hover:bg-transparent",
                )}
                onClick={() => choose(tier)}
              >
                <span className={cn("text-[15px] font-semibold", blocked ? "text-muted-foreground" : "text-foreground")}>{tier.label}</span>
                <span data-slot="tier-card-promise" className="text-[13px] leading-snug text-muted-foreground">{tier.disabledReason ?? tier.hint ?? ""}</span>
                {time ? <span data-slot="tier-card-time" className="mt-auto text-[13px] text-foreground">{time}</span> : null}
              </button>
            );
          })}
        </div>
        {confirmBlock}
      </div>
    );
  }
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
              onClick={() => choose(tier)}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
      {confirmBlock ?? (
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
export function TierChip({ tier, label, onRelease, releaseLabel = i18n._({ id: "ui.Release Max", message: "Release Max" }), className }: TierChipProps) {
  if (tier === "standard") return null;
  const words = label ?? (tier === "max" ? i18n._({ id: "ui.Max", message: "Max" }) : i18n._({ id: "ui.Boost", message: "Boost" }));
  const classes = cn("inline-flex min-h-[24px] items-center rounded-full border border-border px-2 text-[12px] text-muted-foreground", className);
  if (tier === "max" && onRelease) {
    return <button type="button" data-slot="tier-chip" data-tier={tier} aria-label={i18n._({ id: "ui.{releaseLabel}: {words}", message: "{releaseLabel}: {words}", values: { releaseLabel, words } })} className={cn(classes, "min-h-[48px]")} onClick={onRelease}>{words}</button>;
  }
  return <span data-slot="tier-chip" data-tier={tier} className={classes}>{words}</span>;
}

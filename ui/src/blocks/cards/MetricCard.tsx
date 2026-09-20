import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IconName } from "@/kit/icons";
import { IconTile } from "@/kit/primitives/IconTile";
import { cn, FOCUS_RING, hitArea } from "@/kit/utils";

// The state link's hue/--foreground blend ratio - exported so
// contrast.test.ts checks the exact number this component actually
// uses, not a second hardcoded copy that could drift from it.
export const STATE_LINK_HUE_MIX = 0.5;

export interface MetricCardProps {
  icon: IconName;
  hue: string;
  count: number | string;
  label: string;
  state?: ReactNode;
  stateHref?: string;
  className?: string;
}

// Top metric cards (spec section 3): the icon tile, bold count in
// tabular figures, descriptive label, a state line or link.
export function MetricCard({ icon, hue, count, label, state, stateHref, className }: MetricCardProps) {
  // A raw `var(hue)` reads as low as ~2.35:1 on the light theme's white
  // card (found live by the screenshot gate's own color-contrast check,
  // "View repairs" in orange on white) - mixed toward the theme's own
  // `--foreground` instead, which darkens it enough on a light surface
  // and only brightens it further on a dark one. 50/50, not 60/40: a
  // review measured 60/40 still under 4.5:1 for teal specifically
  // (3.93:1) - contrast.test.ts's own "MetricCard state-link contrast"
  // block checks all six hue tokens, both themes, at this exact ratio,
  // so a future change to either number is caught here, not live.
  // py-0.5 + hitArea(3): the same touch-target floor gap the gate's own
  // run caught on this exact link (79x17, under 48px).
  const stateLine = state && (stateHref ? (
    <Link to={stateHref} className={cn("inline-block py-0.5 text-sm hover:underline", FOCUS_RING, hitArea(3))} style={{ color: `color-mix(in srgb, var(${hue}) ${STATE_LINK_HUE_MIX * 100}%, var(--foreground) ${100 - STATE_LINK_HUE_MIX * 100}%)` }}>{state}</Link>
  ) : (
    <span className="text-sm text-muted-foreground">{state}</span>
  ));
  return (
    <div className={cn("rounded-2xl border bg-[var(--surface-card)] p-4", className)}>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} hue={hue} />
        <div className="min-w-0">
          <p className="text-[var(--font-size-metric)] font-semibold tabular-nums leading-none">{count}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
      {stateLine && <div className="mt-2">{stateLine}</div>}
    </div>
  );
}

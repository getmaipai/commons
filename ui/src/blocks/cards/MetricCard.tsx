import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IconName } from "@/kit/icons";
import { IconTile } from "@/kit/primitives/IconTile";
import { cn, FOCUS_RING, hitArea, hueTextColor } from "@/kit/utils";

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
  // hueTextColor (kit/utils.ts) is the fix for a raw `var(hue)` reading
  // as low as ~2.35:1 on the light theme's white card (found live by
  // the screenshot gate's own color-contrast check, "View repairs" in
  // orange on white). py-0.5 + hitArea(3): the same touch-target floor
  // gap the gate's own run caught on this exact link (79x17, under 48px).
  const stateLine = state && (stateHref ? (
    <Link to={stateHref} className={cn("inline-block py-0.5 text-sm hover:underline", FOCUS_RING, hitArea(3))} style={{ color: hueTextColor(hue) }}>{state}</Link>
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

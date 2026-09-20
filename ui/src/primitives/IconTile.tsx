import { getIcon, type IconName } from "@/kit/icons";
import { cn } from "@/kit/utils";

export interface IconTileProps {
  icon: IconName;
  /** A `--hue-*`/`--cat-*` CSS var name, e.g. `"--hue-blue"`. */
  hue: string;
  /** `md` (40px): a card, a panel header, a nav group heading. `sm`
   * (32px): a dense row (a table, a list). */
  size?: "md" | "sm";
  /** The soft outer glow (spec section 1: "The style, exactly"). On by
   * default; a caller with many tiles close together (a dense table)
   * can turn it off rather than stack overlapping glows. */
  glow?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<IconTileProps["size"]>, string> = { md: "size-10", sm: "size-8" };
const ICON_SIZE_CLASS: Record<NonNullable<IconTileProps["size"]>, string> = { md: "size-5", sm: "size-4" };

// The one icon tile every card, row, nav group heading and panel header
// draws through (spec section 1: "Never a bare lucide icon on the
// canvas."): the element's accent at 18% over the panel, a 1px border
// of the same accent at 35%, the icon in the accent at full strength, a
// soft outer glow. One definition so the four numbers never drift
// between call sites (implementation reuse standards).
export function IconTile({ icon, hue, size = "md", glow = true, className }: IconTileProps) {
  const Icon = getIcon(icon);
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-xl border", SIZE_CLASS[size], className)}
      style={{
        backgroundColor: `color-mix(in srgb, var(${hue}) 18%, transparent)`,
        borderColor: `color-mix(in srgb, var(${hue}) 35%, transparent)`,
        color: `var(${hue})`,
        boxShadow: glow ? `0 0 16px color-mix(in srgb, var(${hue}) 25%, transparent)` : undefined,
      }}
    >
      <Icon className={ICON_SIZE_CLASS[size]} aria-hidden="true" />
    </div>
  );
}

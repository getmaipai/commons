import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IconName } from "@/kit/icons";
import { getIcon } from "@/kit/icons";
import { IconTile } from "@/kit/primitives/IconTile";
import { cn, FOCUS_RING, hitArea } from "@/kit/utils";

export interface PanelHeaderProps {
  icon: IconName;
  hue: string;
  title: string;
  linkLabel?: string;
  /** The link/button's accessible name, when the visible `linkLabel`
   * (spec's own generic "View all"/"Browse all") would collide with
   * another panel's identical link on the same page - "View all
   * memories" while the visible text stays "View all". Defaults to
   * `linkLabel`. */
  linkAriaLabel?: string;
  linkHref?: string;
  onLinkClick?: () => void;
  className?: string;
}

// A panel's header row (spec "Cards and panels": the icon tile, the
// title, a right-aligned link in electric blue with an arrow, a
// hairline underneath) - "System Resources" and "Active Components" in
// the reference, every dashboard and page panel here.
export function PanelHeader({ icon, hue, title, linkLabel, linkAriaLabel, linkHref, onLinkClick, className }: PanelHeaderProps): ReactNode {
  const ArrowIcon = getIcon("arrow-right");
  const link = linkLabel && (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--hue-blue)] hover:underline">
      {linkLabel}
      <ArrowIcon className="size-3.5" aria-hidden="true" />
    </span>
  );
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={icon} hue={hue} size="sm" />
        <h3 className="truncate text-base font-semibold sm:text-lg">{title}</h3>
      </div>
      {/* py-0.5 (real box growth, the text-sm content's 20px line-height
          to 24px) plus hitArea(3)'s +24px overhang reaches the 48px
          floor exactly. No border on this link/button, so FOCUS_RING
          (offset), not FOCUS_RING_INSET. */}
      {link && (linkHref ? (
        <Link to={linkHref} aria-label={linkAriaLabel ?? linkLabel} className={cn("shrink-0 py-0.5", FOCUS_RING, hitArea(3))}>{link}</Link>
      ) : (
        <button type="button" onClick={onLinkClick} aria-label={linkAriaLabel ?? linkLabel} className={cn("shrink-0 py-0.5", FOCUS_RING, hitArea(3))}>{link}</button>
      ))}
    </div>
  );
}

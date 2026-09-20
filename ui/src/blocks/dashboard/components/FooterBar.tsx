import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn, FOCUS_RING, hitArea } from "@/kit/utils";

export type FooterBarStatus = "ok" | "warning" | "error";

const STATUS_DOT_CLASS: Record<FooterBarStatus, string> = {
  ok: "bg-[var(--hue-teal)]",
  warning: "bg-[var(--hue-orange)]",
  error: "bg-[var(--hue-red)]",
};

export interface FooterBarCount {
  label: string;
  href: string;
}

export interface FooterBarProps {
  /** e.g. "MaiPai Home v0.1.0". */
  version: string;
  /** Compact, low-emphasis operational counts, quiet-divider-separated;
   * omit an item rather than show a fabricated zero (spec footer
   * reference: "quiet, global operational summary", never invented
   * numbers). */
  counts: FooterBarCount[];
  status: FooterBarStatus;
  statusLabel: string;
}

// The fixed 40px footer (spec "Fixed footer"/"Footer summary
// reference"): version at left, linked operational counts centered,
// a status dot and plain-language health at right. Rendered by the
// product into Shell's `footer` slot, which pins it below the
// scrollable content the same way the rail and header are pinned.
export function FooterBar({ version, counts, status, statusLabel }: FooterBarProps): ReactNode {
  // Deliberate type-floor exception (docs/UI.md, lane 7 item 3): the
  // fixed 40px status bar is a compact token row by design (spec "Fixed
  // footer": "low-emphasis... never... detailed diagnostics"), the same
  // category as a badge.
  return (
    <div className="flex h-full w-full items-center justify-between gap-4 px-4 text-xs text-muted-foreground">
      <span className="shrink-0">{version}</span>
      <div className="flex min-w-0 items-center justify-center gap-3 overflow-hidden">
        {counts.map((count, index) => (
          // Keyed by position, not count.label: the footer's segments are
          // fixed-position (updates, then engines, then repairs) and two
          // could legitimately render identical text (a code review
          // caught label-as-key breaking on that collision).
          <span key={index} className="flex shrink-0 items-center gap-3">
            {index > 0 && <span aria-hidden className="h-3 w-px bg-[var(--border)]" />}
            {/* py-1 (real box growth, text-xs's 16px line-height to 24px)
                plus hitArea(3)'s +24px overhang reaches the 48px floor on
                the interior-facing sides; a review found the outermost
                two edges (the first item's left, the last item's right)
                still clipped by this row's own `overflow-hidden` (the
                overhang is outside the row's intrinsic width, which that
                property clips) - a real, narrow gap, not fixed here since
                closing it would mean widening or unclipping the row,
                which risks the responsive truncation `overflow-hidden`
                exists for (spec "Footer summary reference": "never wrap
                the footer onto two rows"). No border on this link, so
                FOCUS_RING (offset), not FOCUS_RING_INSET. */}
            <Link to={count.href} className={cn("whitespace-nowrap py-1 hover:underline", FOCUS_RING, hitArea(3))}>{count.label}</Link>
          </span>
        ))}
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        <span aria-hidden className={`size-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
        <span className="whitespace-nowrap">{statusLabel}</span>
      </span>
    </div>
  );
}

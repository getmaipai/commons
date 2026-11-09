import { useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/kit/ui/sheet";
import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";
import { isActiveNavPath, type NavEntry } from "@/kit/nav";
import { i18n } from "@/kit/i18n"

const BOTTOM_BAR_MAX = 5;

// docs/UI.md's per-surface phone rule: "the sidebar collapses to a
// five-entry bottom bar... with the rest under More." `max` lets a
// product pin a smaller, deliberate primary set instead (Home's own
// "Home, Chat, Apps, More" - owner ruling, "Navigation, corrected,"
// 2026-09-20: three real destinations, not four, before More) without
// changing the default every other consumer's own tests and behavior
// already rely on. `variant="floating"` or `variant="docked"`, `label` and `trailing` are for
// an app's own sections bar (phone-minimal-2026-10-25 P2): the same part,
// inset and filled, with a trailing Search item that is never folded under More.
// `more` entries (an app's settings, say) always live under the last item, the
// three-dot More button, after any trailing Search.
export function PhoneNav({
  entries,
  max = BOTTOM_BAR_MAX,
  variant = "bar",
  label = i18n._({ id: "ui.Primary", message: "Primary" }),
  trailing,
  leading,
  more = [],
  surface = "card",
  inset = "default",
  activePill = "muted",
  labels = "all",
}: {
  entries: readonly NavEntry[];
  max?: number;
  variant?: "bar" | "floating" | "docked";
  label?: string;
  trailing?: NavEntry;
  leading?: { label: string; icon?: string; onClick: () => void; disabled?: boolean };
  more?: readonly NavEntry[];
  surface?: "card" | "glass";
  inset?: "default" | "pro";
  activePill?: "muted" | "wide";
  labels?: "all" | "primary";
}) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  // A code review (2026-09-20) caught `max <= 0`: `entries.slice(0, max
  // - 1)` would then pass a negative end index, which
  // Array.prototype.slice counts from the array's END, not "zero
  // items" - the tab bar would show almost every entry directly
  // instead of folding them all under More, the opposite of what a
  // caller passing max=0 means. Clamped to 1 (More alone, nothing
  // shown directly) as the lowest sane value.
  const safeMax = Math.max(1, max);
  const slots = safeMax - (trailing ? 1 : 0) - (leading ? 1 : 0);
  const overflowing = entries.length + (more.length > 0 ? 1 : 0) > slots;
  const entryLimit = Math.max(0, slots - 1);
  const shown = overflowing ? entries.slice(0, entryLimit) : entries;
  const sheetEntries = [...(overflowing ? entries.slice(entryLimit) : []), ...more];
  const hasMore = sheetEntries.length > 0;
  const MoreIcon = getIcon("more-horizontal");
  const LeadingIcon = getIcon(leading?.icon ?? "arrow-left");
  const floating = variant === "floating";
  // The docked bar is exactly 49px (48px entries + 1px border): the prompt bar and track transport dock at that height.
  const compact = variant !== "bar";
  const showLabels = labels === "all" || entries.length + (trailing ? 1 : 0) + (leading ? 1 : 0) <= BOTTOM_BAR_MAX;

  const renderEntry = (entry: NavEntry) => {
    const Icon = getIcon(entry.icon);
    const active = isActiveNavPath(location.pathname, entry.to, entry.exact);
    return (
      <Link
        key={entry.to}
        to={entry.to}
        aria-current={active ? "page" : undefined}
        aria-label={showLabels ? undefined : entry.label}
        className={compact
          ? cn(
              "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              floating ? "py-2" : "py-1",
              active ? activePill === "wide"
                ? "rounded-full bg-[var(--surface-2)] text-foreground ring-1 ring-inset ring-[var(--hairline)]"
                : "rounded-full bg-muted text-foreground"
                : "text-muted-foreground",
            )
          : cn(
              "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base",
              active ? "text-primary" : "text-muted-foreground",
            )}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {showLabels ? <span>{entry.label}</span> : null}
      </Link>
    );
  };

  return (
    <>
      <nav
        data-slot="phone-nav"
        data-floating={floating ? "" : undefined}
        aria-label={label}
        style={floating ? { "--phone-nav-height": inset === "pro" ? "68px" : "5rem" } as CSSProperties : undefined}
        className={floating
          ? cn("fixed z-30 flex rounded-full sm:hidden", inset === "pro" ? "inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] h-[68px] p-1" : "inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-h-16 p-1", surface === "glass" ? "bg-[var(--surface-glass)] backdrop-blur-[var(--glass-blur)] shadow-[var(--shadow-glass)] ring-1 ring-inset ring-[var(--hairline)]" : "bg-card shadow-lg")
          : cn("fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden", variant === "docked" && "px-2")}
      >
        {leading ? (
          <button
            type="button"
            aria-label={leading.label}
            disabled={leading.disabled}
            onClick={leading.onClick}
            className={compact
              ? cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground disabled:opacity-40", floating ? "py-2" : "py-1")
              : "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base text-muted-foreground disabled:opacity-40"}
          >
            <LeadingIcon className="h-5 w-5" aria-hidden />
            {showLabels ? <span>{leading.label}</span> : null}
          </button>
        ) : null}
        {shown.map(renderEntry)}
        {trailing ? renderEntry(trailing) : null}
        {hasMore ? (
          <button
            type="button"
            aria-label={showLabels ? undefined : i18n._({ id: "ui.More", message: "More" })}
            onClick={() => setMoreOpen(true)}
            className={compact
              ? cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground", floating ? "py-2" : "py-1")
              : "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base text-muted-foreground"}
          >
            <MoreIcon className="h-5 w-5" aria-hidden />
            {showLabels ? <span>{i18n._({ id: "ui.More", message: "More" })}</span> : null}
          </button>
        ) : null}
      </nav>
      {hasMore ? (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{i18n._({ id: "ui.More", message: "More" })}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-2">
              {sheetEntries.map((entry) => {
                const Icon = getIcon(entry.icon);
                return (
                  <Link
                    key={entry.to}
                    to={entry.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-muted"
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="text-base">{entry.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/kit/ui/sheet";
import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";
import { isActiveNavPath, type NavEntry } from "@/kit/nav";

const BOTTOM_BAR_MAX = 5;

// docs/UI.md's per-surface phone rule: "the sidebar collapses to a
// five-entry bottom bar... with the rest under More." `max` lets a
// product pin a smaller, deliberate primary set instead (Home's own
// "Home, Chat, Apps, More" - owner ruling, "Navigation, corrected,"
// 2026-09-20: three real destinations, not four, before More) without
// changing the default every other consumer's own tests and behavior
// already rely on.
export function PhoneNav({ entries, max = BOTTOM_BAR_MAX }: { entries: readonly NavEntry[]; max?: number }) {
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
  const overflowing = entries.length > safeMax;
  const shown = overflowing ? entries.slice(0, safeMax - 1) : entries;
  const overflowEntries = overflowing ? entries.slice(safeMax - 1) : [];
  const MoreIcon = getIcon("more-horizontal");

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {shown.map((entry) => {
          const Icon = getIcon(entry.icon);
          const active = isActiveNavPath(location.pathname, entry.to);
          return (
            <Link
              key={entry.to}
              to={entry.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{entry.label}</span>
            </Link>
          );
        })}
        {overflowing ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-base text-muted-foreground"
          >
            <MoreIcon className="h-5 w-5" aria-hidden />
            <span>More</span>
          </button>
        ) : null}
      </nav>
      {overflowing ? (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-2">
              {overflowEntries.map((entry) => {
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

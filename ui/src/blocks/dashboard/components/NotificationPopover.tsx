import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getIcon } from "@/kit/icons";
import { Badge } from "@/kit/ui/badge";
import { Button } from "@/kit/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/kit/ui/popover";
import { RelativeTime } from "@/kit/ui/relative-time";
import { pauseTvNavForOverlay } from "@/kit/tvNav";

const BellIcon = getIcon("bell");
const CloseIcon = getIcon("x");

export interface NotificationPopoverItem {
  id: string;
  title: string;
  at: string;
  read: boolean;
}

export interface NotificationPopoverProps {
  items: NotificationPopoverItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the unread ids that just became visible (the popover
   * opened with them showing) - a caller's own "mark as read on view"
   * behavior, if it has one. */
  onVisible?: (unreadIds: string[]) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  historyHref?: string;
  emptyMessage?: string;
  maxVisible?: number;
}

/** The header bell and its popover: an unread-count badge, a list with
 * per-item dismiss, mark-all-read and clear-all, and a link to a fuller
 * history page. Generic over what a "notification" is - a caller
 * supplies its own items and wires its own data/mutations behind the
 * callbacks. */
export function NotificationPopover({
  items,
  open,
  onOpenChange,
  onVisible,
  onDismiss,
  onMarkAllRead,
  onClearAll,
  historyHref,
  emptyMessage = "Nothing to show.",
  maxVisible = 10,
}: NotificationPopoverProps) {
  const unreadCount = items.filter((item) => !item.read).length;
  const visible = open ? items.slice(0, maxVisible) : [];
  const visibleUnreadIds = visible.filter((item) => !item.read).map((item) => item.id);

  useEffect(() => {
    if (!open || visibleUnreadIds.length === 0) return;
    onVisible?.(visibleUnreadIds);
    // Only re-fires when the actual set of visible unread ids changes,
    // not on every render - joined so the effect's own dependency array
    // stays a stable primitive rather than a new array each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visibleUnreadIds.join(",")]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        pauseTvNavForOverlay(next);
      }}
    >
      <PopoverTrigger asChild data-notifications-trigger aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}>
        <Button variant="ghost" size="icon-sm" className="overflow-visible">
          {/* Owner finding, 2026-09-20 17:40 ("The rail geometry,
           * exactly"): the badge used to anchor to `icon-sm`'s own 32px
           * button box (`absolute right-0 top-0` on the Button itself),
           * 8px off the 16px icon it actually sits over (icon-sm centers
           * a size-4 icon inside a size-8 button) - far enough to read
           * as "floating above the bell" and reach into a neighboring
           * header control. This wrapper is sized to the icon, not the
           * button, so the badge's own corner is the icon's own corner
           * regardless of the button's padding. */}
          <span className="relative inline-flex size-4">
            <BellIcon className="size-4" />
            {unreadCount > 0 ? (
              <Badge className="absolute -top-1.5 -right-1.5 size-4 min-w-4 justify-center rounded-full p-0 text-[10px] font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            ) : null}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="divide-y">
          {visible.map((item) => (
            <div className="flex items-start gap-2 p-4" key={item.id}>
              <div className="min-w-0 flex-1">
                <p className={item.read ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{item.title}</p>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <RelativeTime at={item.at} />
                </div>
              </div>
              <Button aria-label={`Dismiss ${item.title}`} size="icon-xs" variant="ghost" onClick={() => onDismiss(item.id)}>
                <CloseIcon className="size-3.5" />
              </Button>
            </div>
          ))}
          {visible.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{emptyMessage}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-4 border-t p-3">
          <Button size="sm" variant="ghost" disabled={unreadCount === 0 || !onMarkAllRead} onClick={onMarkAllRead}>
            Mark all read
          </Button>
          {/* gap-4, not gap-2: each size="sm" Button carries a 48px
              touch-target extension via before:-inset-2 (8px); gap-4
              (16px) clears both extensions without them overlapping into
              each other, the same reasoning Tabs' own gap uses. */}
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" disabled={items.length === 0 || !onClearAll} onClick={onClearAll}>
              Clear all
            </Button>
            {historyHref ? (
              <Button size="sm" variant="link" asChild>
                <Link to={historyHref}>See all</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

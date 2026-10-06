import type { ReactNode } from "react";
import { Bell, CircleHelp, LogOut, Settings, VenetianMask, Activity } from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { cn } from "../../../../lib/utils";

export type RailStatusLevel = "online" | "maintenance" | "degraded" | "offline";

export interface RailProfileMenuProps {
  /** The signed-in person's real name; never a demo identity. */
  displayName: string;
  /** A second identity line (the person's role, for Home). */
  subtitle?: string;
  /** Pending notifications. A count shows on the menu row and on the
   * avatar's badge. Undefined hides the row. */
  notifications?: { count: number; urgent?: boolean; onOpen: () => void };
  /** System status for the menu row. `problem` puts the attention dot on
   * the avatar. Undefined hides the row. */
  status?: { label: string; level: RailStatusLevel; href: string };
  /** Incognito's existing session state and its toggle. Undefined hides
   * the row. */
  incognito?: { on: boolean; onChange: (on: boolean) => void };
  /** Extra attention reasons a host tracks (pending approvals, for one).
   * Each adds to the avatar's count. */
  extraAttention?: number;
  settingsHref?: string;
  helpHref?: string;
  onLogout?: () => void;
  /** Rendered next to the avatar button, inside the rail's profile slot
   * (an anchor for a host's own popover, say). */
  children?: ReactNode;
}

export function initials(displayName: string): string {
  return displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

const STATUS_DOT: Record<RailStatusLevel, string> = {
  online: "bg-emerald-500",
  maintenance: "bg-sky-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
};

const rowClass = "h-10 gap-3 rounded-md px-2.5 text-sm [&_svg:not([class*='size-'])]:size-[18px]";

/** RAIL-01 (owner's layout, 2026-10-06): the one profile entry point, at
 * the bottom of the app rail. The avatar opens the global utility menu
 * (identity, Notifications, System status, Incognito, Settings, Help, Log
 * out), the shipped DropdownMenu restyled by classes only. A small badge
 * on the avatar says something needs attention; the matching row shows
 * why. */
export default function RailProfileMenu({
  displayName,
  subtitle,
  notifications,
  status,
  incognito,
  extraAttention = 0,
  settingsHref = "/settings",
  helpHref,
  onLogout,
  children,
}: RailProfileMenuProps) {
  const statusProblem = status !== undefined && (status.level === "degraded" || status.level === "offline");
  const count = (notifications?.count ?? 0) + extraAttention;
  const attention = count > 0 || statusProblem;
  // A count is red only when something urgent waits (CHAT-CALM-ERRORS-01d);
  // anything else gets a neutral count.
  const countTone = notifications?.urgent ? "bg-destructive text-white" : "bg-foreground text-background";
  const reasons = [
    notifications && notifications.count > 0 ? `${notifications.count} notification${notifications.count === 1 ? "" : "s"}` : null,
    statusProblem ? `system ${status!.label.toLocaleLowerCase()}` : null,
    extraAttention > 0 ? `${extraAttention} waiting for you` : null,
    incognito?.on ? "Incognito on" : null,
  ].filter(Boolean);
  const label = `Open profile menu for ${displayName || "you"}${reasons.length ? ` (${reasons.join(", ")})` : ""}`;

  return (
    <div data-slot="rail-profile" className="relative">
      {children}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label={label}
                data-slot="rail-profile-trigger"
                className="relative flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-foreground/10"
              />
            }
          >
            <Avatar className={cn("size-8", incognito?.on && "ring-2 ring-violet-500")}>
              <AvatarFallback className="text-xs font-medium">{initials(displayName)}</AvatarFallback>
            </Avatar>
            {count > 0 ? (
              <span
                data-slot="rail-profile-badge"
                aria-hidden
                className={cn("absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none font-medium ring-2 ring-sidebar", countTone)}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : attention ? (
              <span data-slot="rail-profile-dot" aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2 ring-sidebar" />
            ) : null}
          </TooltipTrigger>
          <TooltipContent side="right">{displayName || "Profile"}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="end"
          sideOffset={8}
          className="w-[300px] rounded-2xl p-2 shadow-lg ring-1 ring-border"
        >
          <div data-slot="rail-profile-identity" className="flex items-center gap-3 px-2.5 py-2">
            <Avatar className="size-9">
              <AvatarFallback className="text-sm font-medium">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] leading-5 font-medium text-foreground">{displayName}</span>
              {subtitle ? <span className="truncate text-[13px] leading-5 text-muted-foreground">{subtitle}</span> : null}
            </div>
          </div>
          <DropdownMenuSeparator className="my-1.5" />
          {notifications ? (
            <DropdownMenuItem className={rowClass} onClick={notifications.onOpen}>
              <Bell aria-hidden />
              <span className="flex-1">Notifications</span>
              {notifications.count > 0 ? (
                <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium", countTone)}>{notifications.count}</span>
              ) : (
                <span className="text-[13px] text-muted-foreground">None</span>
              )}
            </DropdownMenuItem>
          ) : null}
          {status ? (
            <DropdownMenuItem className={rowClass} render={<Link to={status.href} />}>
              <Activity aria-hidden />
              <span className="flex-1">System status</span>
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status.level])} />
                {status.label}
              </span>
            </DropdownMenuItem>
          ) : null}
          {incognito ? (
            <DropdownMenuItem
              className={rowClass}
              aria-pressed={incognito.on}
              closeOnClick={false}
              onClick={() => incognito.onChange(!incognito.on)}
            >
              <VenetianMask aria-hidden className={cn(incognito.on && "text-violet-500")} />
              <span className="flex-1">Incognito</span>
              <span className={cn("text-[13px]", incognito.on ? "font-medium text-violet-500" : "text-muted-foreground")}>{incognito.on ? "On" : "Off"}</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={rowClass} render={<Link to={settingsHref} />}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
          {helpHref ? (
            <DropdownMenuItem className={rowClass} render={<Link to={helpHref} />}>
              <CircleHelp aria-hidden />
              Help
            </DropdownMenuItem>
          ) : null}
          {onLogout ? (
            <>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem className={rowClass} onClick={onLogout}>
                <LogOut aria-hidden />
                Log out
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

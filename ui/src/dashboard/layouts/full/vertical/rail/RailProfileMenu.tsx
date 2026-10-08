import type { ReactNode } from "react";
import { Bell, CircleHelp, House, LogOut, Settings, VenetianMask, Activity } from "lucide-react";
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
import { hitArea } from "../../../../../utils";
import { STATUS_TONE_BG } from "../../../../../ui/status-colors";

export type RailStatusLevel = "online" | "maintenance" | "degraded" | "offline";

export interface RailProfileMenuProps {
  /** The signed-in person's real name; never a demo identity. */
  displayName: string;
  /** A second identity line (the person's role, for Home). */
  subtitle?: string;
  /** Pending notifications. A count shows on the menu row and on the
   * avatar's badge. Undefined hides the row. */
  notifications?: { count: number; urgent?: boolean; onOpen: () => void };
  /** System status for the menu row, the avatar's tooltip and its
   * accessible name. Degraded puts an amber dot on the avatar's lower
   * right, offline a red one; online and maintenance show none. Undefined
   * hides the row and the dot. */
  status?: { label: string; level: RailStatusLevel; href: string };
  /** Incognito's existing session state and its toggle. Undefined hides
   * the row. */
  incognito?: { on: boolean; onChange: (on: boolean) => void };
  /** Extra attention reasons a host tracks (pending approvals, for one).
   * Each adds to the avatar's count. */
  extraAttention?: number;
  settingsHref?: string;
  /** The admin-only Home settings row, drawn right after Settings. The
   * host passes it for the household's owner and admins; the label is the
   * host's copy. Undefined (the default) draws no row. */
  homeSettings?: { href: string; label: string };
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
  online: STATUS_TONE_BG.ok,
  maintenance: STATUS_TONE_BG.maintenance,
  degraded: STATUS_TONE_BG.warning,
  offline: STATUS_TONE_BG.error,
};

/** What the avatar's status dot says, for its tooltip and accessible name. */
export const STATUS_WORDS: Record<RailStatusLevel, string> = {
  online: "all good",
  maintenance: "maintenance",
  degraded: "degraded",
  offline: "down",
};

const rowClass = "h-10 gap-3 rounded-md px-2.5 text-sm [&_svg:not([class*='size-'])]:size-[18px]";

/** RAIL-01 (owner's layout, 2026-10-06): the one profile entry point, at
 * the bottom of the app rail. The avatar opens the global utility menu
 * (identity, Notifications, System status, Incognito, Settings, Help, Log
 * out), the shipped DropdownMenu restyled by classes only. A count badge
 * on the avatar's upper right counts notifications; a dot on its lower
 * right says the system needs attention; the matching row shows why. */
export default function RailProfileMenu({
  displayName,
  subtitle,
  notifications,
  status,
  incognito,
  extraAttention = 0,
  settingsHref = "/settings",
  homeSettings,
  helpHref,
  onLogout,
  children,
}: RailProfileMenuProps) {
  const statusProblem = status !== undefined && (status.level === "degraded" || status.level === "offline");
  const count = (notifications?.count ?? 0) + extraAttention;
  const systemLine = status ? `System: ${STATUS_WORDS[status.level]}` : null;
  // A count is red only when something urgent waits (CHAT-CALM-ERRORS-01d);
  // anything else gets a neutral count.
  const countTone = notifications?.urgent ? "bg-destructive text-white" : "bg-foreground text-background";
  const reasons = [
    notifications && notifications.count > 0 ? `${notifications.count} notification${notifications.count === 1 ? "" : "s"}` : null,
    systemLine,
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
                className={cn("relative flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-foreground/10", hitArea(1))}
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
                className={cn("absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none font-medium ring-2 ring-[color:var(--app-rail-bg,var(--sidebar))]", countTone)}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
            {/* System status as a presence dot, cut out of the avatar's
                lower right corner the way Slack and Discord place theirs.
                Calm by default: no dot while all is well (or under planned
                maintenance), amber while something is degraded or paused,
                red only when something is down. The count above is for
                notifications only. */}
            {statusProblem ? (
              <span
                data-slot="rail-profile-dot"
                data-level={status!.level}
                aria-hidden
                className={cn("absolute right-1 bottom-1 size-2.5 rounded-full ring-2 ring-[color:var(--app-rail-bg,var(--sidebar))]", STATUS_DOT[status!.level])}
              />
            ) : null}
          </TooltipTrigger>
          <TooltipContent side="right">
            <span className="flex flex-col">
              <span>{displayName || "Profile"}</span>
              {systemLine ? <span data-slot="rail-profile-system" className="text-[11px] opacity-75">{systemLine}</span> : null}
            </span>
          </TooltipContent>
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
          {homeSettings ? (
            <DropdownMenuItem className={rowClass} render={<Link to={homeSettings.href} />}>
              <House aria-hidden />
              {homeSettings.label}
            </DropdownMenuItem>
          ) : null}
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

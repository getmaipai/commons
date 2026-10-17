import { useState, type ReactNode } from "react";
import { Pin, PinOff } from "lucide-react";
import { Link, useLocation } from "react-router";
import LogoIcon from "../../../../assets/images/logos/logoicon.svg";
import LogoIconDark from "../../../../assets/images/logos/logoicon-dark.svg";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Button } from "../../../../components/ui/button";
import { getIcon } from "../../../../../icons";
import { cn } from "../../../../lib/utils";
import { hitArea } from "../../../../../utils";
import SidebarContent, { type ChildItem } from "../sidebar/sidebaritems";
import { STATUS_LEVEL_TONE, STATUS_TONE_BG } from "../../../../../ui/status-colors";
import type { RailStatusLevel } from "./RailProfileMenu";
import HeaderSearch, { type HeaderSearchProps } from "../header/HeaderSearch";

export type RailItemStatus = (item: { name: string; url?: string }) => { title: string; ariaLabel: string; level?: RailStatusLevel } | undefined;

/** One installed app the host lists for the rail (LEFTNAV-APPS-01). `icon` is a kit icon name (`getIcon`). */
export interface RailApp {
  name: string;
  url: string;
  icon: string;
  description?: string;
  pinned: boolean;
}

/** At most this many pinned apps draw in the rail; the rest stay in the launcher. */
export const RAIL_APPS_MAX = 6;

export interface AppRailProps {
  tourId?: string;
  itemTourId?: (item: { name: string; url?: string }) => string | undefined;
  /** The host's own search over its records, threaded to the shipped
   * HeaderSearch dialog the rail's Search button opens. */
  searchRemote?: HeaderSearchProps["remote"];
  /** Optional status markers per app entry (the same contract the folded
   * sidebar's NavCollapse takes). */
  itemStatus?: RailItemStatus;
  /** The host's profile control, pinned to the bottom of the rail. */
  profile?: ReactNode;
  /** Installed apps in the order the host wants them: the pinned ones draw in the rail below the built-in
   * destinations (at most RAIL_APPS_MAX); every one is listed in the launcher at the foot of the rail, which pins
   * and unpins through `onTogglePin`. Without `apps` the rail is exactly the built-in destinations. */
  apps?: RailApp[];
  onTogglePin?: (url: string, pinned: boolean) => void;
  /** WEATHER-FIX-01: the route of the host's own All apps page. When set, the grid button at the rail's foot opens
   * that page (search, favorites, every app) instead of the small popover list, which scales to dozens of apps. */
  allAppsHref?: string;
  /** App destination to keep selected when the current route is outside that app (for example Settings). */
  activeAppHref?: string;
}

function flatten(items: ChildItem[] | undefined): ChildItem[] {
  if (!items) return [];
  return items.flatMap((item) => (item.items?.length ? flatten(item.items) : item.url ? [item] : []));
}

/** The app menu's urls are written under the preview-era /next prefix;
 * the rail links to the bare path the app mounts its pages at. Linking to
 * /next made every rail click pass through the host's /next redirect,
 * which unmounted and remounted the whole shell (owner's report
 * 2026-10-06: "clicking anything in the left rail flashes the entire
 * app"). */
export function railHref(url: string): string {
  return url.replace(/^\/next(?=\/|$)/, "") || "/";
}

/** A nested path (a conversation, a person) keeps its app selected; the
 * prefixed path counts too. */
export function isRailItemActive(pathname: string, url: string): boolean {
  const bare = railHref(url);
  if (pathname === url || pathname === bare) return true;
  if (bare === "/") return false;
  return pathname.startsWith(`${bare}/`) || pathname.startsWith(`${url}/`);
}

const railButton =
  "relative flex size-[var(--rail-button,40px)] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** RAIL-01 (owner's layout, 2026-10-06): the permanent 56px app rail.
 * Never expands, carries no labels (each icon names itself through its
 * accessible name and a tooltip), and holds only the brand (which is the
 * Home destination), global Search, the other app destinations and the
 * profile control at the bottom. Its surface is the `--app-rail-bg`
 * token, falling back to `--sidebar`.
 * Composed from the kit's shipped Tooltip and HeaderSearch; app entries
 * come from the same sidebaritems data the folded sidebar renders. */
function itemLabel(item: ChildItem, status: ReturnType<RailItemStatus>): string {
  if (!status?.ariaLabel) return item.name;
  return status.ariaLabel.toLocaleLowerCase().startsWith(`${item.name.toLocaleLowerCase()}:`) ? status.ariaLabel : `${item.name}: ${status.ariaLabel}`;
}

function StatusMark({ status }: { status: ReturnType<RailItemStatus> }) {
  return status ? <span aria-hidden data-slot="rail-status-mark" data-status-level={status.level ?? "degraded"} className={cn("absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-[color:var(--app-rail-bg,var(--sidebar))]", STATUS_TONE_BG[STATUS_LEVEL_TONE[status.level ?? "degraded"]])} /> : null;
}

function ItemTooltip({ name, status }: { name: string; status: ReturnType<RailItemStatus> }) {
  return (
    <TooltipContent side="right">
      <span className="flex flex-col">
        <span>{name}</span>
        {status?.title ? <span className="text-[11px] opacity-75">{status.title}</span> : null}
      </span>
    </TooltipContent>
  );
}

function AppLauncher({ apps, onTogglePin, isActive }: { apps: RailApp[]; onTogglePin?: AppRailProps["onTogglePin"]; isActive: (url: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const GridIcon = getIcon("layout-grid");
  const pinnedCount = apps.filter((app) => app.pinned).length;
  const full = pinnedCount >= RAIL_APPS_MAX;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger data-slot="app-rail-launcher" aria-label="All apps" className={cn(railButton, hitArea(1), open && "bg-foreground/10 text-foreground")} />}>
          <GridIcon className="size-5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="right">All apps</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="end" width="auto" className="w-72 max-w-[calc(100vw-5rem)]" aria-label="All apps">
        <p className="px-1 text-sm font-medium">All apps</p>
        <ul className="flex flex-col gap-0.5">
          {apps.map((app) => {
            const Icon = getIcon(app.icon);
            const active = isActive(app.url);
            const blocked = !app.pinned && full;
            return (
              <li key={app.url} className="flex items-center gap-1">
                <Link
                  to={railHref(app.url)}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "bg-foreground/10")}
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 truncate text-sm">{app.name}</span>
                </Link>
                {onTogglePin ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={app.pinned ? `Unpin ${app.name} from the rail` : blocked ? `Pin ${app.name} to the rail (the rail is full, unpin one first)` : `Pin ${app.name} to the rail`}
                    aria-pressed={app.pinned}
                    disabled={blocked}
                    onClick={() => onTogglePin(app.url, !app.pinned)}
                  >
                    {app.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {full ? <p className="px-1 text-xs text-muted-foreground">The rail holds {RAIL_APPS_MAX} apps. Unpin one to pin another.</p> : null}
      </PopoverContent>
    </Popover>
  );
}

function AllAppsLink({ href, active }: { href: string; active: boolean }) {
  const GridIcon = getIcon("layout-grid");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={railHref(href)}
            aria-label="All apps"
            aria-current={active ? "page" : undefined}
            data-active={active ? "" : undefined}
            data-slot="app-rail-launcher"
            className={cn(railButton, hitArea(1), active && "bg-foreground/10 text-foreground")}
          />
        }
      >
        <GridIcon className="size-5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="right">All apps</TooltipContent>
    </Tooltip>
  );
}

export default function AppRail({ searchRemote, itemStatus, profile, activeAppHref, tourId, itemTourId, apps, onTogglePin, allAppsHref }: AppRailProps) {
  const { pathname } = useLocation();
  const all = SidebarContent.flatMap((section) => flatten(section.items));
  // The brand mark is the Home destination (owner, 2026-10-06: "replace
  // the upper left logo with the home button"): the entry whose path is
  // the root takes the top slot and is not repeated in the list.
  const home = all.find((item) => item.url !== undefined && railHref(item.url) === "/");
  const items = home ? all.filter((item) => item !== home) : all;
  const isActive = (url: string) => (activeAppHref ? railHref(activeAppHref) === railHref(url) : isRailItemActive(pathname, url));
  const pinnedApps = (apps ?? []).filter((app) => app.pinned).slice(0, RAIL_APPS_MAX);
  const homeActive = home?.url ? (activeAppHref ? railHref(activeAppHref) === railHref(home.url) : isRailItemActive(pathname, home.url)) : false;
  const homeStatus = home ? itemStatus?.(home) : undefined;
  const logo = (
    <>
      <img src={LogoIcon} alt="" className="size-7 dark:hidden" />
      <img src={LogoIconDark} alt="" className="hidden size-7 dark:block" />
    </>
  );

  return (
    <nav
      aria-label="Primary navigation"
      data-slot="app-rail"
      data-tour={tourId}
      className="sticky top-0 flex h-svh w-[var(--rail-width,56px)] min-w-[var(--rail-width,56px)] max-w-[var(--rail-width,56px)] shrink-0 flex-col items-center gap-1 bg-[color:var(--app-rail-bg,var(--sidebar))] p-2"
    >
      {home ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                to={railHref(home.url ?? "/")}
                aria-label={itemLabel(home, homeStatus)}
                aria-current={homeActive ? "page" : undefined}
                data-active={homeActive ? "" : undefined}
                      data-slot="app-rail-home"
                      data-tour={itemTourId?.(home)}
                className={cn(railButton, "mb-1", hitArea(1), homeActive && "bg-foreground/10")}
              />
            }
          >
            {logo}
            <StatusMark status={homeStatus} />
          </TooltipTrigger>
          <ItemTooltip name={home.name} status={homeStatus} />
        </Tooltip>
      ) : (
        <Link to="/" aria-label="MaiPai Home" data-slot="app-rail-home" data-tour={itemTourId?.({ name: "Home", url: "/" })} className={cn("mb-1 flex size-[var(--rail-button,40px)] items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", hitArea(1))}>
          {logo}
        </Link>
      )}

      <Tooltip>
        <TooltipTrigger render={<div data-slot="app-rail-search" className="flex size-[var(--rail-button,40px)] items-center justify-center" />}>
          <HeaderSearch remote={searchRemote} triggerClassName="rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground [&_svg]:size-5" />
        </TooltipTrigger>
        <TooltipContent side="right">Search</TooltipContent>
      </Tooltip>

      <ul className="mt-2 flex flex-col items-center gap-1">
        {items.map((item) => {
          const active = item.url ? (activeAppHref ? railHref(activeAppHref) === railHref(item.url) : isRailItemActive(pathname, item.url)) : false;
          const status = itemStatus?.(item);
          const Icon = item.icon;
          return (
            <li key={String(item.id ?? item.url)}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      to={item.url ? railHref(item.url) : "#"}
                      aria-label={itemLabel(item, status)}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "" : undefined}
                      data-slot="app-rail-item"
                      data-tour={itemTourId?.(item)}
                      className={cn(railButton, hitArea(1), active && "bg-foreground/10 text-foreground")}
                    />
                  }
                >
                  {Icon ? <Icon className="size-5" aria-hidden /> : null}
                  <StatusMark status={status} />
                </TooltipTrigger>
                <ItemTooltip name={item.name} status={status} />
              </Tooltip>
            </li>
          );
        })}
      </ul>

      {pinnedApps.length ? (
        <ul data-slot="app-rail-apps" aria-label="Pinned apps" className="mt-1 flex flex-col items-center gap-1 border-t border-border pt-2">
          {pinnedApps.map((app) => {
            const active = isActive(app.url);
            const Icon = getIcon(app.icon);
            return (
              <li key={app.url}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        to={railHref(app.url)}
                        aria-label={app.name}
                        aria-current={active ? "page" : undefined}
                        data-active={active ? "" : undefined}
                        data-slot="app-rail-app"
                        data-tour={itemTourId?.({ name: app.name, url: app.url })}
                        className={cn(railButton, hitArea(1), active && "bg-foreground/10 text-foreground")}
                      />
                    }
                  >
                    <Icon className="size-5" aria-hidden />
                  </TooltipTrigger>
                  <ItemTooltip name={app.name} status={undefined} />
                </Tooltip>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-col items-center gap-1">
        {apps?.length ? allAppsHref ? <AllAppsLink href={allAppsHref} active={isRailItemActive(pathname, allAppsHref)} /> : <AppLauncher apps={apps} onTogglePin={onTogglePin} isActive={isActive} /> : null}
        {profile}
      </div>
    </nav>
  );
}

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import LogoIcon from "../../../../assets/images/logos/logoicon.svg";
import LogoIconDark from "../../../../assets/images/logos/logoicon-dark.svg";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { cn } from "../../../../lib/utils";
import { hitArea } from "../../../../../utils";
import SidebarContent, { type ChildItem } from "../sidebar/sidebaritems";
import { STATUS_LEVEL_TONE, STATUS_TONE_BG } from "../../../../../ui/status-colors";
import type { RailStatusLevel } from "./RailProfileMenu";
import HeaderSearch, { type HeaderSearchProps } from "../header/HeaderSearch";

export type RailItemStatus = (item: { name: string; url?: string }) => { title: string; ariaLabel: string; level?: RailStatusLevel } | undefined;

export interface AppRailProps {
  /** The host's own search over its records, threaded to the shipped
   * HeaderSearch dialog the rail's Search button opens. */
  searchRemote?: HeaderSearchProps["remote"];
  /** Optional status markers per app entry (the same contract the folded
   * sidebar's NavCollapse takes). */
  itemStatus?: RailItemStatus;
  /** The host's profile control, pinned to the bottom of the rail. */
  profile?: ReactNode;
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
  "relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

export default function AppRail({ searchRemote, itemStatus, profile, activeAppHref }: AppRailProps) {
  const { pathname } = useLocation();
  const all = SidebarContent.flatMap((section) => flatten(section.items));
  // The brand mark is the Home destination (owner, 2026-10-06: "replace
  // the upper left logo with the home button"): the entry whose path is
  // the root takes the top slot and is not repeated in the list.
  const home = all.find((item) => item.url !== undefined && railHref(item.url) === "/");
  const items = home ? all.filter((item) => item !== home) : all;
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
      className="sticky top-0 flex h-svh w-14 min-w-14 max-w-14 shrink-0 flex-col items-center gap-1 bg-[color:var(--app-rail-bg,var(--sidebar))] p-2"
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
        <Link to="/" aria-label="MaiPai Home" data-slot="app-rail-home" className={cn("mb-1 flex size-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", hitArea(1))}>
          {logo}
        </Link>
      )}

      <Tooltip>
        <TooltipTrigger render={<div data-slot="app-rail-search" className="flex size-10 items-center justify-center" />}>
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

      <div className="mt-auto flex flex-col items-center">{profile}</div>
    </nav>
  );
}

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import LogoIcon from "../../../../assets/images/logos/logoicon.svg";
import LogoIconDark from "../../../../assets/images/logos/logoicon-dark.svg";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { cn } from "../../../../lib/utils";
import SidebarContent, { type ChildItem } from "../sidebar/sidebaritems";
import HeaderSearch, { type HeaderSearchProps } from "../header/HeaderSearch";

export type RailItemStatus = (item: { name: string; url?: string }) => { title: string; ariaLabel: string } | undefined;

export interface AppRailProps {
  /** The host's own search over its records, threaded to the shipped
   * HeaderSearch dialog the rail's Search button opens. */
  searchRemote?: HeaderSearchProps["remote"];
  /** Optional status markers per app entry (the same contract the folded
   * sidebar's NavCollapse takes). */
  itemStatus?: RailItemStatus;
  /** The host's profile control, pinned to the bottom of the rail. */
  profile?: ReactNode;
}

function flatten(items: ChildItem[] | undefined): ChildItem[] {
  if (!items) return [];
  return items.flatMap((item) => (item.items?.length ? flatten(item.items) : item.url ? [item] : []));
}

/** The app menu's urls are written under /next; an app can mount the same
 * pages at the root (Home does), so the unprefixed path counts too. A
 * nested path (a conversation, a person) keeps its app selected. */
export function isRailItemActive(pathname: string, url: string): boolean {
  const bare = url.replace(/^\/next(?=\/|$)/, "") || "/";
  if (pathname === url || pathname === bare) return true;
  if (bare === "/") return false;
  return pathname.startsWith(`${bare}/`) || pathname.startsWith(`${url}/`);
}

const railButton =
  "relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** RAIL-01 (owner's layout, 2026-10-06): the permanent 56px app rail.
 * Never expands, carries no labels (each icon names itself through its
 * accessible name and a tooltip), and holds only the brand, global
 * Search, the app destinations and the profile control at the bottom.
 * Composed from the kit's shipped Tooltip and HeaderSearch; app entries
 * come from the same sidebaritems data the folded sidebar renders. */
export default function AppRail({ searchRemote, itemStatus, profile }: AppRailProps) {
  const { pathname } = useLocation();
  const items = SidebarContent.flatMap((section) => flatten(section.items));

  return (
    <nav
      aria-label="Primary navigation"
      data-slot="app-rail"
      className="flex h-svh w-14 min-w-14 max-w-14 shrink-0 flex-col items-center gap-1 bg-sidebar p-2"
    >
      <Link to="/" aria-label="MaiPai Home" className="mb-1 flex size-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={LogoIcon} alt="" className="size-7 dark:hidden" />
        <img src={LogoIconDark} alt="" className="hidden size-7 dark:block" />
      </Link>

      <Tooltip>
        <TooltipTrigger render={<div data-slot="app-rail-search" className="flex size-10 items-center justify-center" />}>
          <HeaderSearch remote={searchRemote} triggerClassName="rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground [&_svg]:size-5" />
        </TooltipTrigger>
        <TooltipContent side="right">Search</TooltipContent>
      </Tooltip>

      <ul className="mt-2 flex flex-col items-center gap-1">
        {items.map((item) => {
          const active = item.url ? isRailItemActive(pathname, item.url) : false;
          const status = itemStatus?.(item);
          const label = status?.ariaLabel
            ? status.ariaLabel.toLocaleLowerCase().startsWith(`${item.name.toLocaleLowerCase()}:`)
              ? status.ariaLabel
              : `${item.name}: ${status.ariaLabel}`
            : item.name;
          const Icon = item.icon;
          return (
            <li key={String(item.id ?? item.url)}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      to={item.url ?? "#"}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "" : undefined}
                      data-slot="app-rail-item"
                      className={cn(railButton, active && "bg-foreground/10 text-foreground")}
                    />
                  }
                >
                  {Icon ? <Icon className="size-5" aria-hidden /> : null}
                  {status ? <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-500 ring-2 ring-sidebar" /> : null}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span className="flex flex-col">
                    <span>{item.name}</span>
                    {status?.title ? <span className="text-[11px] opacity-75">{status.title}</span> : null}
                  </span>
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col items-center">{profile}</div>
    </nav>
  );
}

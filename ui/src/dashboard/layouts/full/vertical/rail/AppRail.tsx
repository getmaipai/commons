import { useState, type ReactNode } from "react";
import { i18n } from "@/kit/i18n"
import { Pin, PinOff, PanelLeftClose, PanelLeftOpen, ArrowLeft } from "lucide-react";
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

/** A host-owned destination that is always present in the core rail, never pinnable. */
export interface RailCoreDestination {
  name: string;
  url: string;
  /** A kit icon name (`getIcon`). */
  icon: string;
}

export interface AppRailItem {
  id: string;
  label: string;
  icon: string | React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  href: string;
  group?: string;
}
export interface AppRailGroup { id: string; label?: string }
export interface AppRailContext { title?: string; items: AppRailItem[]; onBack: () => void }

/** @deprecated Pinned apps now scroll in the rail; there is no cap. */
export const RAIL_APPS_MAX = 6;

export interface AppRailProps {
  items?: AppRailItem[];
  groups?: AppRailGroup[];
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  autoCollapse?: boolean;
  context?: AppRailContext;
  /** Optional labelled destinations; defaults to the compact icon-only rail. */
  variant?: "icons" | "labelled";
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
   * destinations; every one is listed in the launcher at the foot of the rail, which pins
   * and unpins through `onTogglePin`. Without `apps` the rail is exactly the built-in destinations. */
  apps?: RailApp[];
  /** Fixed host destinations, rendered after the built-in Chat entry and before the remaining core entries. */
  coreDestinations?: RailCoreDestination[];
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
const groupedRowClass = "relative flex h-[var(--rail-row-height,32px)] min-h-0 w-full min-w-0 items-center gap-2 overflow-visible rounded-lg px-[var(--rail-padding,12px)] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const groupedRowIcon = "size-[var(--rail-icon-size,16px)] shrink-0";

/** RAIL-01 (owner's layout, 2026-10-06): the permanent 56px app rail.
 * Never expands, carries no labels (each icon names itself through its
 * accessible name and a tooltip), and holds only the brand (which is the
 * Home destination), global Search, the other app destinations and the
 * profile control at the bottom. Its surface is the `--app-rail-bg`
 * token, falling back to `--sidebar`.
 * Composed from the kit's shipped Tooltip and HeaderSearch; app entries
 * come from the same sidebaritems data the folded sidebar renders. */
function itemLabel(item: { name: string }, status: ReturnType<RailItemStatus>): string {
  if (!status?.ariaLabel) return item.name;
  return status.ariaLabel.toLocaleLowerCase().startsWith(`${item.name.toLocaleLowerCase()}:`) ? status.ariaLabel : i18n._({ id: "ui.{name}: {label}", message: "{name}: {label}", values: { name: item.name, label: status.ariaLabel } });
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

function AppLauncher({ apps, onTogglePin, isActive, grouped = false, expanded = false }: { apps: RailApp[]; onTogglePin?: AppRailProps["onTogglePin"]; isActive: (url: string) => boolean; grouped?: boolean; expanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const GridIcon = getIcon("layout-grid");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
      <TooltipTrigger render={<PopoverTrigger data-slot="app-rail-launcher" aria-label={i18n._({ id: "ui.All apps", message: "All apps" })} className={cn(grouped ? groupedRowClass : railButton, grouped && expanded && "justify-start", grouped && !expanded && "justify-center", hitArea(grouped ? 2 : 1), open && "bg-foreground/10 text-foreground")} />}>
          <GridIcon className={grouped ? groupedRowIcon : "size-5"} aria-hidden />
          {grouped && expanded ? <span className="text-[length:var(--rail-label-size,13px)]">{i18n._({ id: "ui.All apps", message: "All apps" })}</span> : null}
        </TooltipTrigger>
        <TooltipContent side="right">{i18n._({ id: "ui.All apps", message: "All apps" })}</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="end" width="auto" className="w-72 max-w-[calc(100vw-5rem)]" aria-label={i18n._({ id: "ui.All apps", message: "All apps" })}>
        <p className="px-1 text-sm font-medium">{i18n._({ id: "ui.All apps", message: "All apps" })}</p>
        <ul className="flex flex-col gap-0.5">
          {apps.map((app) => {
            const Icon = getIcon(app.icon);
            const active = isActive(app.url);
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
                    aria-label={app.pinned ? i18n._({ id: "ui.Unpin {name} from the rail", message: "Unpin {name} from the rail", values: { name: app.name } }) : i18n._({ id: "ui.Pin {name} to the rail", message: "Pin {name} to the rail", values: { name: app.name } })}
                    aria-pressed={app.pinned}
                    onClick={() => onTogglePin(app.url, !app.pinned)}
                  >
                    {app.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function AllAppsLink({ href, active, grouped = false, expanded = false }: { href: string; active: boolean; grouped?: boolean; expanded?: boolean }) {
  const GridIcon = getIcon("layout-grid");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={railHref(href)}
            aria-label={i18n._({ id: "ui.All apps", message: "All apps" })}
            aria-current={active ? "page" : undefined}
            data-active={active ? "" : undefined}
            data-slot="app-rail-launcher"
            className={cn(grouped ? groupedRowClass : railButton, grouped && expanded && "justify-start", grouped && !expanded && "justify-center", hitArea(grouped ? 2 : 1), active && "bg-foreground/10 text-foreground")}
          />
        }
      >
        <GridIcon className={grouped ? groupedRowIcon : "size-5"} aria-hidden />{grouped && expanded ? <span className="text-[length:var(--rail-label-size,13px)]">{i18n._({ id: "ui.All apps", message: "All apps" })}</span> : null}
      </TooltipTrigger>
      <TooltipContent side="right">{i18n._({ id: "ui.All apps", message: "All apps" })}</TooltipContent>
    </Tooltip>
  );
}

export function RailEntries({ searchRemote, itemStatus, profile, activeAppHref, itemTourId, apps, coreDestinations, onTogglePin, allAppsHref, onExpandedChange, variant = "icons", mobile = false, children, grouped = false, expanded = false, brandSlot }: AppRailProps & { mobile?: boolean; children?: ReactNode; grouped?: boolean; expanded?: boolean; brandSlot?: ReactNode }) {
  const { pathname } = useLocation();
  const all = SidebarContent.flatMap((section) => flatten(section.items));
  // The brand mark is the Home destination (owner, 2026-10-06: "replace
  // the upper left logo with the home button"): the entry whose path is
  // the root takes the top slot and is not repeated in the list.
  const home = all.find((item) => item.url !== undefined && railHref(item.url) === "/");
  const items = home ? all.filter((item) => item !== home) : all;
  const chatIndex = items.findIndex((item) => item.name === "Chat");
  const beforeExtra = chatIndex < 0 ? items : items.slice(0, chatIndex + 1);
  const afterExtra = chatIndex < 0 ? [] : items.slice(chatIndex + 1);
  const destinations: Array<{ name: string; url?: string; icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; fixed?: false } | (RailCoreDestination & { fixed: true })> = [
    ...beforeExtra,
    ...(coreDestinations ?? []).map((item) => ({ ...item, fixed: true as const })),
    ...afterExtra,
  ];
  const isActive = (url: string) => (activeAppHref ? railHref(activeAppHref) === railHref(url) : isRailItemActive(pathname, url));
  const pinnedApps = mobile ? (apps ?? []) : (apps ?? []).filter((app) => app.pinned);
  const labelled = !mobile && variant === "labelled";
  const entryClass = mobile ? "relative flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-foreground hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring" : labelled ? "relative flex h-[60px] w-[68px] flex-col items-center justify-center gap-1 rounded-2xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : railButton;
  const homeActive = home?.url ? (activeAppHref ? railHref(activeAppHref) === railHref(home.url) : isRailItemActive(pathname, home.url)) : false;
  const homeStatus = home ? itemStatus?.(home) : undefined;
  const logo = (
    <>
      <img src={LogoIcon} alt="" className="size-7 dark:hidden" />
      <img src={LogoIconDark} alt="" className="hidden size-7 dark:block" />
    </>
  );
  const ExpandIcon = getIcon("panel-left-open");
  const expandableBrand = !mobile && !labelled && Boolean(onExpandedChange);
  const brandVisual = expandableBrand ? (
    <span className="relative grid size-7 place-items-center">
      <span className="col-start-1 row-start-1 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none">{logo}</span>
      <span aria-hidden className="col-start-1 row-start-1 grid size-7 place-items-center rounded-lg bg-foreground/5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"><ExpandIcon className="size-5" aria-hidden /></span>
    </span>
  ) : logo;

  if (grouped) {
    return <>
      {brandSlot ?? (home ? <Tooltip><TooltipTrigger render={<Link to={railHref(home.url ?? "/")} aria-label={itemLabel(home, homeStatus)} aria-current={homeActive ? "page" : undefined} data-slot="app-rail-home" className={cn(groupedRowClass, "group", !expanded && "justify-center", homeActive && "bg-foreground/10")} />}>{brandVisual}{expanded ? <span className="min-w-0 truncate whitespace-nowrap text-[length:var(--rail-label-size,14px)]">{home.name}</span> : null}<StatusMark status={homeStatus} /></TooltipTrigger><ItemTooltip name={home.name} status={homeStatus} /></Tooltip> : null)}
      <Tooltip><TooltipTrigger render={<div data-slot="app-rail-search" className="w-full" />}><HeaderSearch remote={searchRemote} triggerDataSlot="app-rail-search-trigger" triggerIconClassName={groupedRowIcon} triggerLabel={expanded ? i18n._({ id: "ui.Search", message: "Search" }) : undefined} triggerClassName={cn(groupedRowClass, expanded && "justify-start", !expanded && "justify-center", hitArea(2))} /></TooltipTrigger>{!expanded ? <TooltipContent side="right">{i18n._({ id: "ui.Search", message: "Search" })}</TooltipContent> : null}</Tooltip>
      <div className="min-h-0 w-full flex-1 overflow-y-auto">{children}</div>
      <div className={cn("mt-auto flex w-full shrink-0 flex-col gap-1", expanded ? "items-stretch" : "items-center")}>
        {apps?.length ? allAppsHref ? <AllAppsLink href={allAppsHref} active={isRailItemActive(pathname, allAppsHref)} grouped expanded={expanded} /> : <AppLauncher apps={apps} onTogglePin={onTogglePin} isActive={isActive} grouped expanded={expanded} /> : null}
        {profile}
      </div>
    </>;
  }

  return (
    <>
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
                className={cn(entryClass, "group mb-1", !mobile && !labelled && hitArea(1), homeActive && (labelled ? "bg-[var(--surface-2)] ring-1 ring-border" : "bg-foreground/10"))}
              />
            }
          >
            {brandVisual}
            {mobile || labelled ? <span className={labelled ? "text-[11px] font-semibold leading-none" : undefined}>{home.name}</span> : null}
            <StatusMark status={homeStatus} />
          </TooltipTrigger>
          <ItemTooltip name={home.name} status={homeStatus} />
        </Tooltip>
      ) : (
        <Link to="/" aria-label="MaiPai Home" data-slot="app-rail-home" data-tour={itemTourId?.({ name: "Home", url: "/" })} className={cn("mb-1 flex size-[var(--rail-button,40px)] items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", hitArea(1))}>
          {logo}
        </Link>
      )}

      <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger render={<div data-slot="app-rail-search" className="flex size-[var(--rail-button,40px)] items-center justify-center" />}>
          <HeaderSearch remote={searchRemote} triggerClassName="rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground [&_svg]:size-5" />
        </TooltipTrigger>
        <TooltipContent side="right">{i18n._({ id: "ui.Search", message: "Search" })}</TooltipContent>
      </Tooltip>
      {mobile ? <span aria-hidden>{i18n._({ id: "ui.Search", message: "Search" })}</span> : null}
      </div>

      <ul className={cn("mt-2 flex flex-col gap-1", !mobile && "items-center")}>
        {destinations.map((item) => {
          const active = item.url ? (activeAppHref ? railHref(activeAppHref) === railHref(item.url) : isRailItemActive(pathname, item.url)) : false;
          const status = itemStatus?.(item);
          const Icon = item.fixed ? getIcon(item.icon) : item.icon;
          return (
            <li key={item.url}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      to={item.url ? railHref(item.url) : "#"}
                      aria-label={itemLabel(item, status)}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "" : undefined}
                      data-slot={item.fixed ? "app-rail-core-destination" : "app-rail-item"}
                      data-tour={itemTourId?.(item)}
                      className={cn(entryClass, !mobile && !labelled && hitArea(1), active && (labelled ? "bg-[var(--surface-2)] ring-1 ring-border text-foreground" : "bg-foreground/10 text-foreground"))}
                    />
                  }
                >
                  {Icon ? <Icon className={labelled ? "size-[var(--rail-icon-size,20px)] shrink-0" : "size-5 shrink-0"} aria-hidden /> : null}
                  {mobile || labelled ? <span className={labelled ? "text-[11px] font-semibold leading-none" : undefined}>{item.name}</span> : null}
                  <StatusMark status={status} />
                </TooltipTrigger>
                <ItemTooltip name={item.name} status={status} />
              </Tooltip>
            </li>
          );
        })}
      </ul>

      {pinnedApps.length ? (
        <div data-slot="app-rail-pinned" className={cn(!mobile && "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]")}>
        <ul data-slot="app-rail-apps" aria-label={mobile ? i18n._({ id: "ui.Installed apps", message: "Installed apps" }) : i18n._({ id: "ui.Pinned apps", message: "Pinned apps" })} className={cn("mt-1 flex flex-col gap-1 border-t border-border pt-2", !mobile && "items-center")}>
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
                        aria-label={itemLabel(app, itemStatus?.(app))}
                        aria-current={active ? "page" : undefined}
                        data-active={active ? "" : undefined}
                        data-slot="app-rail-app"
                        data-tour={itemTourId?.({ name: app.name, url: app.url })}
                        className={cn(entryClass, !mobile && !labelled && hitArea(1), active && (labelled ? "bg-[var(--surface-2)] ring-1 ring-border text-foreground" : "bg-foreground/10 text-foreground"))}
                      />
                    }
                  >
                    <Icon className={labelled ? "size-[var(--rail-icon-size,20px)] shrink-0" : "size-5 shrink-0"} aria-hidden />
                    {mobile || labelled ? <span className={labelled ? "text-[11px] font-semibold leading-none" : undefined}>{app.name}</span> : null}
                    <StatusMark status={itemStatus?.(app)} />
                  </TooltipTrigger>
                  <ItemTooltip name={app.name} status={itemStatus?.(app)} />
                </Tooltip>
              </li>
            );
          })}
        </ul>
        </div>
      ) : null}

      {children}
      {!mobile ? <div className="mt-auto flex flex-col items-center gap-1">
        {apps?.length ? allAppsHref ? <AllAppsLink href={allAppsHref} active={isRailItemActive(pathname, allAppsHref)} /> : <AppLauncher apps={apps} onTogglePin={onTogglePin} isActive={isActive} /> : null}
        {profile}
      </div> : null}
    </>
  );
}

export default function AppRail(props: AppRailProps) {
  const { pathname } = useLocation();
  const labelled = props.variant === "labelled";
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = props.autoCollapse ? false : (props.expanded ?? internalExpanded);
  const grouped = props.items !== undefined;
  const toggleExpanded = () => {
    const next = !expanded;
    if (props.expanded === undefined) setInternalExpanded(next);
    props.onExpandedChange?.(next);
  };
  const Icon = (item: AppRailItem) => typeof item.icon === "string" ? getIcon(item.icon) : item.icon;
  const reducedMotion = "motion-reduce:transition-none";
  const groupedItems = props.context?.items ?? props.items ?? [];
  const groups = props.groups ?? [];
  const groupIds = [...new Set([...groups.map((group) => group.id), ...groupedItems.map((item) => item.group ?? "default")])];
  const groupLabel = (id: string) => groups.find((group) => group.id === id)?.label;
  const expandedHeader = expanded && grouped ? (
    <div className="flex w-full shrink-0 items-center justify-between gap-1">
      <Link to="/" aria-label="MaiPai Home" className="flex size-12 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring">{<img src={LogoIcon} alt="" className="size-7 dark:hidden" />}<img src={LogoIconDark} alt="" className="hidden size-7 dark:block" /></Link>
      {props.context ? <div className="flex min-w-0 flex-1 items-center gap-1"><button type="button" aria-label={i18n._({ id: "ui.Back", message: "Back" })} onClick={props.context.onBack} className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden className="size-5" /></button>{props.context.title ? <span className="truncate text-sm font-medium">{props.context.title}</span> : null}</div> : null}
      <button type="button" aria-label={i18n._({ id: "ui.Hide sidebar", message: "Hide sidebar" })} onClick={toggleExpanded} className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"><PanelLeftClose aria-hidden className="size-5" /></button>
    </div>
  ) : grouped ? <div className="group relative flex w-full shrink-0 justify-center">
    {props.onExpandedChange ? <button type="button" aria-label={i18n._({ id: "ui.Expand navigation", message: "Expand navigation" })} onClick={() => { if (props.expanded === undefined) setInternalExpanded(true); props.onExpandedChange?.(true); }} className="group relative flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span aria-hidden className="absolute transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none"><img src={LogoIcon} alt="" className="size-7 dark:hidden" /><img src={LogoIconDark} alt="" className="hidden size-7 dark:block" /></span>
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-foreground/5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"><PanelLeftOpen className="size-5" /></span>
    </button> : <button type="button" aria-label={i18n._({ id: "ui.Show sidebar", message: "Show sidebar" })} onClick={toggleExpanded} className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"><PanelLeftOpen aria-hidden className="size-5" /></button>}
  </div> : null;
  const groupedNavigation = grouped ? <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {groupIds.map((id, index) => {
      const groupItems = groupedItems.filter((item) => (item.group ?? "default") === id);
      if (!groupItems.length) return null;
      return <section key={id} data-rail-group={id} className={cn(index > 0 && (expanded ? "mt-3" : "mt-2 border-t border-border pt-2"))}>
        {index > 0 && expanded && groupLabel(id) ? <h2 className="px-[var(--rail-padding,12px)] pb-1 text-[length:var(--rail-group-heading-size,12px)] font-normal normal-case text-muted-foreground" data-slot="app-rail-group-label">{groupLabel(id)}</h2> : null}
        <ul className="flex w-full flex-col gap-0">{groupItems.map((item) => {
          const ItemIcon = Icon(item);
          const active = isRailItemActive(pathname, item.href);
          const status = props.itemStatus?.({ name: item.label, url: item.href });
          return <li key={item.id}><Link to={railHref(item.href)} aria-label={itemLabel({ name: item.label }, status)} aria-current={active ? "page" : undefined} data-slot="app-rail-item" className={cn(groupedRowClass, expanded && "justify-start", !expanded && "justify-center gap-0", active && "bg-[var(--nav-active-bg,var(--surface-2))] text-foreground", hitArea(2))}>
            {ItemIcon ? <ItemIcon className={groupedRowIcon} aria-hidden /> : null}<span className={cn("min-w-0 truncate whitespace-nowrap text-[length:var(--rail-label-size,13px)] transition-opacity duration-(--motion-fade-in) ease-(--motion-ease-out)", reducedMotion, expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0")} aria-hidden={!expanded}>{item.label}</span>
            <StatusMark status={status} />
          </Link></li>;
        })}</ul>
      </section>;
    })}
  </div> : null;
  return <nav aria-label={i18n._({ id: "ui.Primary navigation", message: "Primary navigation" })} data-slot="app-rail" data-tour={props.tourId}
    data-expanded={expanded ? "true" : "false"} data-auto-collapse={props.autoCollapse ? "true" : undefined}
    style={{ "--rail-width-labelled": "80px", ...(grouped ? { width: expanded ? "var(--rail-width-expanded,240px)" : "var(--rail-width,56px)", minWidth: expanded ? "var(--rail-width-expanded,240px)" : "var(--rail-width,56px)", maxWidth: expanded ? "var(--rail-width-expanded,240px)" : "var(--rail-width,56px)" } : labelled ? { width: "var(--rail-width-labelled)", minWidth: "var(--rail-width-labelled)", maxWidth: "var(--rail-width-labelled)" } : {}) } as React.CSSProperties}
    className={cn("sticky top-0 flex h-svh min-h-0 shrink-0 flex-col gap-1 overflow-hidden bg-[color:var(--app-rail-bg,var(--sidebar))] p-2", grouped ? "items-stretch transition-[width,min-width,max-width] duration-(--motion-slide-in) ease-(--motion-ease-slide) motion-reduce:transition-none [[html[data-ease-motion=calm]_&]]:duration-0" : "items-center", labelled ? "w-[var(--rail-width-labelled)] min-w-[var(--rail-width-labelled)] max-w-[var(--rail-width-labelled)]" : !grouped ? "w-[var(--rail-width,56px)] min-w-[var(--rail-width,56px)] max-w-[var(--rail-width,56px)]" : "")}>
    {grouped ? <RailEntries {...props} grouped expanded={expanded} brandSlot={expandedHeader ?? (!props.onExpandedChange ? <div className="group relative flex w-full shrink-0 justify-center"><button type="button" aria-label={i18n._({ id: "ui.Show sidebar", message: "Show sidebar" })} onClick={toggleExpanded} className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"><PanelLeftOpen aria-hidden className="size-5" /></button></div> : null)}>{groupedNavigation}</RailEntries> : <RailEntries {...props} />}
  </nav>;
}

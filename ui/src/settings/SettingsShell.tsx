import { useId, type MouseEvent, type PointerEventHandler, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { SettingsHeadingLevelContext } from "./headingLevel";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import { getIcon } from "@/kit/icons";
import { SidebarMenuButton, SidebarProvider } from "../dashboard/components/ui/sidebar";
import { SectionSidebar } from "../primitives/SectionSidebar";
import { cn } from "../dashboard/lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { resolveHref, visibleGroups, type Section, type SettingsAreaDef, type SettingsViewer } from "./settingsAudience";

const ArrowUpRight = getIcon("arrow-up-right");
const ChevronLeft = getIcon("chevron-left");
const PanelLeftOpen = getIcon("panel-left-open");
const PanelLeftClose = getIcon("panel-left-close");

export interface SettingsShellCollapsible {
  collapsed: boolean;
  peek?: boolean;
  onToggle: () => void;
  columnToggleRef?: RefObject<HTMLButtonElement | null>;
  headerToggleRef?: RefObject<HTMLButtonElement | null>;
  onPeekEnter?: PointerEventHandler<HTMLDivElement>;
  onPeekLeave?: PointerEventHandler<HTMLDivElement>;
  onPeekColumnEnter?: PointerEventHandler<HTMLDivElement>;
  onPeekColumnLeave?: PointerEventHandler<HTMLDivElement>;
}

/** What a click on the column asks the host to do. `section` opens one of
 * this area's own sections (a keys or view section); `link` leaves for
 * another page (an arrow row), with its href already resolved. */
export type SettingsNavigation =
  | { kind: "section"; sectionId: string; href: string }
  | { kind: "link"; sectionId: string; href: string };

export interface SettingsShellLabels {
  /** The persistent title at the top of the column, including during search. */
  columnTitle?: string;
  /** The search field's accessible name and placeholder. */
  search?: string;
  /** The page title while a search query is showing. */
  results?: string;
  /** The accessible description every arrow row carries. */
  opensAnotherPage?: string;
}

export interface SettingsShellProps {
  area: SettingsAreaDef;
  viewer: SettingsViewer;
  /** The registry, when the host has it: lets the shell hide a keys section
   * whose cards have no key to draw. Optional; audience rules apply either way. */
  registry?: readonly SettingsKey[];
  honouredBy?: string;
  /** The open section's id. Absent: on a phone the column is shown on its own. */
  activeSection?: string;
  onNavigate: (to: SettingsNavigation) => void;
  /** The real href for a section row, so a click is a link a person can
   * open in a new tab. Defaults to "#". */
  sectionHref?: (sectionId: string) => string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** The phone back row ("<area title>") at the top of an open section. */
  onBack?: () => void;
  /** A host-provided destination row at the top of the column. */
  backLink?: ReactNode;
  /** Place this shell flush beside a permanent 56 px app rail. */
  layout?: "default" | "docked";
  /** Controlled desktop column visibility; phone drill-in ignores it. */
  collapsible?: SettingsShellCollapsible;
  labels?: SettingsShellLabels;
  /** The element the content pane renders as. "main" (default) is the
   * page's main landmark; a host that already has one (Home's rail
   * workspace) passes "section", which is a named region instead. */
  contentAs?: "main" | "section";
  /** The open section's content, or the search results. */
  children?: ReactNode;
}

function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** The one settings shell (RULES S4): a 288 px column (title, pill search,
 * grouped section rows, arrow rows that leave) beside a centred 728 px
 * content pane with its page title. Built from the dashboard Sidebar and
 * Item parts and the `--settings-*` tokens; the host passes the area (data),
 * the viewer, the open section and the content, and writes no layout.
 *
 * Below the kit's `lg` breakpoint it drills in, as a phone app does: with
 * no open section (and no search) the column fills the screen; an open
 * section shows its content alone under a back row. From `lg` up both sit
 * side by side. The column's own SidebarProvider takes no Cmd+B, so the app
 * rail's shortcut stays the rail's. */
export function SettingsShell({
  area,
  viewer,
  registry,
  honouredBy,
  activeSection,
  onNavigate,
  sectionHref,
  searchQuery,
  onSearchChange,
  onBack,
  backLink,
  layout = "default",
  collapsible,
  labels,
  contentAs = "main",
  children,
}: SettingsShellProps) {
  const Content = contentAs;
  const describedId = useId();
  const searching = searchQuery.trim().length > 0;
  const groups = visibleGroups(area, viewer, registry, honouredBy);
  const active = groups.flatMap((g) => g.sections).find((s) => s.id === activeSection);
  const searchLabel = labels?.search ?? "Search";
  const title = searching ? (labels?.results ?? "Results") : (active?.label ?? area.title);
  const showColumn = !active || searching;
  const showContent = Boolean(active) || searching;
  const collapsed = Boolean(collapsible?.collapsed);
  const peeking = collapsed && Boolean(collapsible?.peek);
  const mobileColumnClass = showColumn ? "flex" : "hidden";
  const desktopColumnClass = !collapsed || peeking ? "lg:flex" : "lg:hidden";
  const columnClass = cn(mobileColumnClass, desktopColumnClass);
  const hasColumn = showColumn || (!collapsed || peeking);

  function rowHref(section: Section): string {
    return section.kind === "link" ? resolveHref(section.href ?? "#", viewer) : (sectionHref?.(section.id) ?? "#");
  }

  function go(section: Section, e: MouseEvent) {
    if (!plainClick(e)) return;
    e.preventDefault();
    onNavigate({ kind: section.kind === "link" ? "link" : "section", sectionId: section.id, href: rowHref(section) });
  }

  const shell = (
    <SidebarProvider
      keyboardShortcut={false}
      data-slot="settings-shell"
      data-layout={layout}
      role={layout === "docked" ? "region" : undefined}
      aria-label={layout === "docked" ? area.title : undefined}
      className={cn(
        "h-full min-h-[var(--settings-shell-min-height)] min-w-0 flex-col bg-settings-page lg:flex-row",
        layout === "docked" && "fixed inset-y-0 left-14 right-0 z-10 h-svh w-auto",
      )}
    >
      <span id={describedId} className="sr-only">
        {labels?.opensAnotherPage ?? "Opens another page"}
      </span>
      {collapsed && !peeking ? (
        <div
          aria-hidden
          data-slot="settings-sidebar-hover-zone"
          className={cn("absolute inset-y-0 start-0 z-20 hidden w-1.5 lg:block", layout !== "docked" && "relative")}
          onPointerEnter={collapsible?.onPeekEnter}
          onPointerLeave={collapsible?.onPeekLeave}
        />
      ) : null}
      <SectionSidebar
        sidebarProps={{
          id: "settings-column",
          "data-slot": "settings-column",
          "data-state": collapsed ? (peeking ? "peek" : "closed") : "open",
          inert: collapsed && !peeking,
          onPointerEnter: peeking ? collapsible?.onPeekColumnEnter : undefined,
          onPointerLeave: peeking ? collapsible?.onPeekColumnLeave : undefined,
          className: cn(
            "h-auto min-w-0 w-full self-stretch border-settings-column-divider bg-settings-column lg:h-full lg:w-(--settings-column-width) lg:border-r",
            columnClass,
            peeking && "lg:absolute lg:inset-y-0 lg:start-0 lg:z-30 lg:shadow-lg",
          ),
        }}
        headerTop={
          <>
            {collapsible && hasColumn ? <SettingsColumnToggle buttonRef={collapsible.columnToggleRef} collapsed={collapsed} peek={peeking} onToggle={collapsible.onToggle} /> : null}
            {backLink ? <div data-slot="settings-back-link">{backLink}</div> : null}
          </>
        }
        title={!(layout === "docked" && backLink) ? (labels?.columnTitle ?? area.title) : undefined}
        search={{ value: searchQuery, onChange: onSearchChange, label: searchLabel }}
        contentClassName={cn(searching && "hidden lg:flex")}
        groups={groups.map((group) => ({
          id: group.label,
          label: group.label,
          items: group.sections.map((section) => ({
            id: section.id,
            label: section.label,
            icon: section.icon,
            href: rowHref(section),
            active: section.id === active?.id,
            kind: section.kind,
            describedBy: section.kind === "link" ? describedId : undefined,
            trailing: section.kind === "link" ? <ArrowUpRight aria-hidden className="size-3.5 text-settings-arrow" /> : undefined,
            onClick: (e: MouseEvent) => go(section, e),
          })),
        }))}
      />

      <Content
        data-slot="settings-content"
        aria-label={title}
        className={cn("relative min-w-0 flex-1 self-stretch overflow-y-auto bg-settings-page", showContent ? "block" : "hidden lg:block")}
      >
        <div className="mx-auto flex w-full max-w-(--settings-content-max) flex-col px-6 pb-16 pt-4 lg:pt-(--settings-content-top)">
          {onBack ? (
            <SidebarMenuButton
              size="settings"
              onClick={onBack}
              className="mb-4 w-fit lg:hidden"
              data-slot="settings-back"
            >
              <ChevronLeft aria-hidden className="size-4" />
              <span>{area.title}</span>
            </SidebarMenuButton>
          ) : null}
          <div className="relative mb-10 flex items-start gap-2">
            {collapsible?.collapsed && !peeking ? <SettingsColumnToggle buttonRef={collapsible.headerToggleRef} collapsed onToggle={collapsible.onToggle} /> : null}
            <h1 className="text-[length:var(--settings-page-title-size)] leading-9 font-semibold">{title}</h1>
          </div>
          <SettingsHeadingLevelContext.Provider value={2}>{children}</SettingsHeadingLevelContext.Provider>
        </div>
      </Content>
    </SidebarProvider>
  );
  return layout === "docked" && typeof document !== "undefined" ? createPortal(shell, document.body) : shell;
}

function SettingsColumnToggle({ collapsed, peek = false, onToggle, buttonRef }: { collapsed: boolean; peek?: boolean; onToggle: () => void; buttonRef?: RefObject<HTMLButtonElement | null> }) {
  const label = peek ? "Keep settings sidebar open" : collapsed ? "Show settings sidebar" : "Hide settings sidebar";
  const Icon = collapsed && !peek ? PanelLeftOpen : PanelLeftClose;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            ref={buttonRef}
            variant="ghost"
            size="icon-sm"
            data-slot="settings-sidebar-toggle"
            aria-label={label}
            aria-expanded={peek ? undefined : !collapsed}
            aria-controls="settings-column"
            aria-keyshortcuts="Meta+B Control+B"
            onClick={onToggle}
          >
            <Icon aria-hidden className="size-4.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label} <span className="ms-1 opacity-60">⌘/Ctrl+B</span></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

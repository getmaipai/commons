import { useId, type MouseEvent, type ReactNode } from "react";
import { SettingsHeadingLevelContext } from "./headingLevel";
import { HitField } from "./HitField";
import type { SettingsKey } from "@maipai/spec/gen/ts/settings-key.js";
import { getIcon } from "@/kit/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../dashboard/components/ui/sidebar";
import { cn } from "../dashboard/lib/utils";
import { resolveHref, visibleGroups, type Section, type SettingsAreaDef, type SettingsViewer } from "./settingsAudience";

const SearchIcon = getIcon("search");
const ArrowUpRight = getIcon("arrow-up-right");
const ChevronLeft = getIcon("chevron-left");

/** What a click on the column asks the host to do. `section` opens one of
 * this area's own sections (a keys or view section); `link` leaves for
 * another page (an arrow row), with its href already resolved. */
export type SettingsNavigation =
  | { kind: "section"; sectionId: string; href: string }
  | { kind: "link"; sectionId: string; href: string };

export interface SettingsShellLabels {
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

  function rowHref(section: Section): string {
    return section.kind === "link" ? resolveHref(section.href ?? "#", viewer) : (sectionHref?.(section.id) ?? "#");
  }

  function go(section: Section, e: MouseEvent) {
    if (!plainClick(e)) return;
    e.preventDefault();
    onNavigate({ kind: section.kind === "link" ? "link" : "section", sectionId: section.id, href: rowHref(section) });
  }

  return (
    <SidebarProvider
      keyboardShortcut={false}
      data-slot="settings-shell"
      className="h-full min-h-[var(--settings-shell-min-height)] min-w-0 flex-col bg-settings-page lg:flex-row"
    >
      <span id={describedId} className="sr-only">
        {labels?.opensAnotherPage ?? "Opens another page"}
      </span>
      <Sidebar
        collapsible="none"
        data-slot="settings-column"
        className={cn(
          "h-auto min-w-0 w-full self-stretch border-settings-column-divider bg-settings-column lg:w-(--settings-column-width) lg:border-r",
          showColumn ? "flex" : "hidden lg:flex",
        )}
      >
        <SidebarHeader className="gap-3 px-2 pt-4 pb-2">
          <h2 className="px-2 text-[length:var(--settings-column-title-size)] leading-7 font-semibold">{area.title}</h2>
          <HitField pad={6} className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-settings-helper" />
            <SidebarInput
              variant="pill"
              type="search"
              className="pl-9"
              aria-label={searchLabel}
              placeholder={searchLabel}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchQuery) {
                  e.preventDefault();
                  onSearchChange("");
                }
              }}
            />
          </HitField>
        </SidebarHeader>
        <SidebarContent className={cn("gap-0 px-2 pb-4", searching && "hidden lg:flex")}>
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="p-0 pt-5">
              <SidebarGroupLabel className="h-8 px-2 text-[length:var(--settings-group-label-size)] font-normal text-settings-helper">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu className="gap-[var(--settings-column-row-gap)]">
                {group.sections.map((section) => {
                  const Icon = getIcon(section.icon);
                  const isLink = section.kind === "link";
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        size="settings"
                        isActive={section.id === active?.id}
                        render={(props) => (
                          <a {...props} href={rowHref(section)} onClick={(e) => go(section, e)}>
                            {props.children}
                          </a>
                        )}
                        data-kind={section.kind}
                        aria-current={section.id === active?.id ? "page" : undefined}
                        aria-describedby={isLink ? describedId : undefined}
                      >
                        <Icon aria-hidden className="size-[18px] text-settings-helper" />
                        <span className="flex-1 truncate">{section.label}</span>
                        {isLink ? <ArrowUpRight aria-hidden className="size-3.5 text-settings-arrow" /> : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      <Content
        data-slot="settings-content"
        aria-label={title}
        className={cn("min-w-0 flex-1 self-stretch overflow-y-auto bg-settings-page", showContent ? "block" : "hidden lg:block")}
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
          <h1 className="mb-10 text-[length:var(--settings-page-title-size)] leading-9 font-semibold">{title}</h1>
          <SettingsHeadingLevelContext.Provider value={2}>{children}</SettingsHeadingLevelContext.Provider>
        </div>
      </Content>
    </SidebarProvider>
  );
}

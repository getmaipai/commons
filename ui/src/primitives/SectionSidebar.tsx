import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { getIcon } from "@/kit/icons";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../dashboard/components/ui/sidebar";
import { cn } from "../dashboard/lib/utils";
import { HitField } from "../settings/HitField";
import { Chip } from "./Chip";

const SearchIcon = getIcon("search");

/** One row of the column: a link a person can open in a new tab, with its icon (or a picture the host serves) and label. */
export interface SectionSidebarItem {
  id: string;
  label: string;
  /** A kit icon name. */
  icon?: string;
  /** A picture the host serves for this row (never another site's address); drawn in place of the icon. */
  media?: string;
  href?: string;
  active?: boolean;
  /** Written to the row as `data-kind`. */
  kind?: string;
  /** The id of an element that describes the row (the settings arrow rows use it). */
  describedBy?: string;
  /** Drawn after the label (an arrow, a count). */
  trailing?: ReactNode;
  onClick?: (event: MouseEvent) => void;
}

export interface SectionSidebarGroup {
  id: string;
  /** The small label above the rows; a group with none draws its rows alone. */
  label?: string;
  items: readonly SectionSidebarItem[];
}

export interface SectionSidebarSearch {
  value: string;
  onChange: (value: string) => void;
  /** The field's accessible name and placeholder. */
  label: string;
  /** Pressing Enter in the field. */
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Recent searches, drawn as chips under the field; the host passes them only while it wants them shown (focused, field empty). */
  recents?: readonly { key: string; label: string }[];
  /** A recent search chosen. */
  onRecent?: (label: string) => void;
}

export interface SectionSidebarProps {
  groups: readonly SectionSidebarGroup[];
  /** Placed first in the header: a collapse button, a back link. */
  headerTop?: ReactNode;
  /** The column's title; omit it when the host draws its own. */
  title?: string;
  search?: SectionSidebarSearch;
  /** Placed under the search field (recent searches). */
  afterSearch?: ReactNode;
  /** The classes of the scrolling body; the default is `gap-0 px-2 pb-4`. */
  contentClassName?: string;
  /** Draw the column on its own beside the page content (News, Library): it carries its own sidebar provider, is hidden below the
   * kit's `lg` breakpoint (a phone lists the same entries in the shell's drawer), and takes the settings column's width, border and
   * surface. The settings shell leaves this off because it supplies its own provider and layout. */
  standalone?: boolean;
  /** Forwarded to the kit sidebar that holds the column: its id, `data-*`, `inert`, pointer handlers and layout classes. */
  sidebarProps?: Omit<ComponentProps<typeof Sidebar>, "collapsible" | "children"> & { [attribute: `data-${string}`]: string | undefined };
}

/**
 * The one sidebar column of an app area (NEWS-SIDEBAR-01, RULES S1 and S2): a title, a pill search, and groups of icon rows
 * beside the content, built from the dashboard Sidebar parts and the `--settings-*` tokens. The settings shell draws its
 * column with it and so does News; the host passes data (groups, search) and writes no layout. It holds no collapse or peek
 * logic of its own: a host that collapses its column wraps it and passes the state through `sidebarProps`.
 */
export function SectionSidebar({ groups, headerTop, title, search, afterSearch, contentClassName, standalone, sidebarProps }: SectionSidebarProps) {
  const column = (
    <Sidebar
      collapsible="none"
      {...sidebarProps}
      className={cn(standalone && "h-full w-(--settings-column-width) min-w-0 self-stretch border-r border-settings-column-divider bg-settings-column", sidebarProps?.className)}
    >
      <SidebarHeader className="gap-3 px-2 pt-4 pb-2">
        {headerTop}
        {title ? <h2 className="px-2 text-[length:var(--settings-column-title-size)] leading-7 font-semibold">{title}</h2> : null}
        {search ? (
          <HitField pad={6} className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-settings-helper" />
            <SidebarInput
              variant="pill"
              type="search"
              className="pl-9"
              aria-label={search.label}
              placeholder={search.label}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onFocus={search.onFocus}
              onBlur={search.onBlur}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search.value) {
                  e.preventDefault();
                  search.onChange("");
                } else if (e.key === "Enter" && search.onSubmit) {
                  e.preventDefault();
                  search.onSubmit();
                }
              }}
            />
          </HitField>
        ) : null}
        {search?.recents && search.recents.length > 0 ? (
          <ul aria-label="Recent searches" className="flex list-none flex-wrap gap-1 px-2">
            {search.recents.map((recent) => (
              <li key={recent.key}>
                <Chip onClick={() => search.onRecent?.(recent.label)}>{recent.label}</Chip>
              </li>
            ))}
          </ul>
        ) : null}
        {afterSearch}
      </SidebarHeader>
      <SidebarContent className={cn("gap-0 px-2 pb-4", contentClassName)}>
        {groups.map((group) => (
          <SidebarGroup key={group.id} className="p-0 pt-5">
            {group.label ? (
              <SidebarGroupLabel className="h-8 px-2 text-[length:var(--settings-group-label-size)] font-normal text-settings-helper">{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarMenu className="gap-[var(--settings-column-row-gap)]">
              {group.items.map((item) => {
                const Icon = getIcon(item.icon ?? "chevron-right");
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      size="settings"
                      isActive={item.active === true}
                      render={(props) => (
                        <a {...props} href={item.href ?? "#"} onClick={item.onClick}>
                          {props.children}
                        </a>
                      )}
                      data-kind={item.kind}
                      aria-current={item.active ? "page" : undefined}
                      aria-describedby={item.describedBy}
                    >
                      {item.media ? <img src={item.media} alt="" aria-hidden className="size-[18px] rounded-sm object-cover" /> : <Icon aria-hidden className="size-[18px] text-settings-helper" />}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.trailing}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
  return standalone ? (
    <SidebarProvider keyboardShortcut={false} data-slot="section-sidebar" className="hidden min-h-0 w-auto shrink-0 lg:flex">
      {column}
    </SidebarProvider>
  ) : (
    column
  );
}

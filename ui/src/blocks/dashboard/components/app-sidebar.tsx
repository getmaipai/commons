import type { ComponentProps, ReactNode } from "react";
import type { IconName } from "@/kit/icons";
import { useLocation } from "react-router-dom";
import { NavMain, type NavGroup } from "@/kit/blocks/dashboard/components/nav-main";
import { RailToggle } from "@/kit/blocks/dashboard/components/rail-toggle";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/kit/ui/sidebar";
import { isActiveNavPath, type NavEntry } from "@/kit/nav";

/** Groups a flat NavEntry list under one label, the shape a caller with
 * no natural grouping of its own (Home's flat NAV_ENTRIES) can pass
 * straight through; a caller with real sections (the Stack's taxonomy
 * groups) builds its own NavGroup[] and skips this. */
export function ungroupedNav(entries: readonly NavEntry[], label = "Navigation"): NavGroup[] {
  return [
    {
      label,
      items: entries.map((entry) => ({ title: entry.label, url: entry.to, icon: entry.icon as IconName })),
    },
  ];
}

export interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  groups: NavGroup[];
  /** The brand mark and wordmark shown above the nav - a product's own
   * logo, never the kit's. */
  brand: ReactNode;
  /** Rendered below the nav list (Home's PinToggle, the Stack's
   * SystemPulse, or nothing). */
  footer?: ReactNode;
}

/** The desktop/tablet rail: brand mark, the rail toggle, a grouped nav
 * list, and an optional footer slot - collapsible to icons, never by
 * default (the person's own choice). Active-path highlighting is
 * computed here from the current NavGroup entries' own `url`, not left
 * to the caller, so it's consistent everywhere the rail renders. */
export function AppSidebar({ groups, brand, footer, ...props }: AppSidebarProps) {
  const location = useLocation();
  const withActive: NavGroup[] = groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, isActive: item.isActive ?? isActiveNavPath(location.pathname, item.url) })),
  }));
  return (
    // role/aria-label here, not on Sidebar itself: shadcn's own generated
    // primitive renders a plain div with no landmark role by design (the
    // fix belongs at the one real call site, not a hand-patch of the
    // generated file) - every nav link inside otherwise sits outside any
    // landmark, an axe `region` failure found by the far/TV a11y sweep.
    <Sidebar collapsible="icon" role="navigation" aria-label="Main navigation" className="bg-[var(--surface-sidebar)] p-1.5 pb-2" {...props}>
      <SidebarHeader className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between gap-2 px-1.5 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1! flex-1 gap-1 group-data-[collapsible=icon]:flex-none">
                {brand}
              </SidebarMenuButton>
              <RailToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <NavMain groups={withActive} />
      </SidebarContent>
      {footer ? <SidebarFooter className="p-0">{footer}</SidebarFooter> : null}
    </Sidebar>
  );
}

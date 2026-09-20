import type { ComponentProps, ReactNode } from "react";
import type { IconName } from "@/kit/icons";
import { useLocation } from "react-router-dom";
import { NavMain, type NavGroup } from "@/kit/blocks/dashboard/components/nav-main";
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
    // No horizontal padding on the rail itself: every item carries its
    // own inset directly (nav-main.tsx's pill margin and group-label
    // padding, the brand button's own left padding below), so a
    // container-level px- here would double-count against those. The
    // rail's own top/bottom padding has no per-item carrier the same
    // way, so it lives here: Studio's exact 17px top / 14px bottom
    // (owner findings, "The Studio look, the numbers," 2026-09-20
    // 18:15) over Calm's own plainer pb-3.
    <Sidebar collapsible="icon" role="navigation" aria-label="Main navigation" className="bg-[var(--surface-sidebar)] pb-3 studio:pt-[17px] studio:pb-[14px]" {...props}>
      {/* One toggle for the rail, the header's own SidebarTrigger
          (Shell.tsx) - owner finding, "The collapsed rail," 2026-09-20:
          a second one lived here (RailToggle, now deleted) forcing the
          brand row into a two-line stack to fit both; gone, the brand
          row is just the brand, centered on the same axis as every nav
          item below it once collapsed. */}
      {/* pt-5 (20px, "20px above it") pb-6 (24px, "then 24px of space
          before the first group label" - nav-main.tsx's own first
          group label carries none of its own on top of this, so the
          two don't stack into something bigger than the reference).
          Studio's own exact brand row is 62px tall with 14px below it
          (owner findings, "The Studio look, the numbers," 2026-09-20
          18:15) - h-[62px] replaces the plain pt-/pb- pair, and the
          rail's own studio:pt-[17px] above already supplies the row's
          own top inset, so this only needs the 14px below. */}
      <SidebarHeader className="pt-5 pb-6 studio:h-[62px] studio:pt-0 studio:pb-[14px]">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* pl-3 (12px): "the tile's left edge sits at the same x
                as the item pills' left edge" (owner's own clarifying
                parenthetical, trusted over the isolated "16px" figure
                earlier in the same sentence, since alignment with the
                pills below it is the unambiguous constraint and pl-3
                matches their own mx-3 exactly). Studio's own exact
                13px (owner findings, "The Studio look, the numbers,"
                2026-09-20 18:15) keeps the same alignment, matching
                the pills' own studio:mx-[13px]. */}
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1! gap-1 pl-3! studio:pl-[13px]! studio:h-full studio:items-center">
              {brand}
            </SidebarMenuButton>
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

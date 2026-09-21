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
    // Still no horizontal padding on the rail itself: every item and the
    // brand row carry their own left inset directly (owner ruling,
    // ui-v0.4.3, "rail padding 12px sides so items are inset pills" -
    // read as the outcome the item's own mx-3/w-auto already produces,
    // not a literal container-level px- to add on top of it, which
    // would double the inset). pb-3 is the rail's own plain bottom gap,
    // both looks - the earlier studio:pt-[17px]/studio:pb-[14px] split
    // is gone now that the brand row's own pt-5/pb-6 (below) is the one
    // unconditional source of the header's top/bottom space.
    <Sidebar collapsible="icon" role="navigation" aria-label="Main navigation" className="bg-[var(--surface-sidebar)] pb-3" {...props}>
      {/* One toggle for the rail, the header's own SidebarTrigger
          (Shell.tsx) - owner finding, "The collapsed rail," 2026-09-20:
          a second one lived here (RailToggle, now deleted) forcing the
          brand row into a two-line stack to fit both; gone, the brand
          row is just the brand, centered on the same axis as every nav
          item below it once collapsed. */}
      {/* pt-5 (20px, "20px above it") / pb-6 (24px, "then 24px of space
          before the first group label"), both looks, unconditional -
          owner ruling, ui-v0.4.3: a single pair of numbers replaces the
          earlier studio:h-[62px]/studio:pt-0/studio:pb-[14px] split,
          which never actually produced the reference's own spacing in
          the committed capture (COORDINATOR's own pixel measurement,
          2026-09-20: the brand tile clipped at x 0, no top inset at
          all). nav-main.tsx's own first group label carries no top
          margin of its own on top of this pb-6, so the two don't stack
          into more than the stated 24px. px-0: the primitive's own base
          class carries its own p-2 (8px each side, kit/ui/sidebar.tsx's
          SidebarHeader) - left alone it stacked with the brand button's
          own left padding below for a wrong total, so it's zeroed here
          and the brand button's own pl-4! (below) is the only source of
          horizontal inset for this row. */}
      <SidebarHeader className="px-0 pt-5 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* pl-4 (16px), both looks, unconditional - owner ruling,
                ui-v0.4.3, restating the brand row's own left inset as
                16px, not the pills' own 12px (mx-3 below): the earlier
                choice to reconcile the two to the same value read the
                wrong clause as controlling, and the committed capture
                that reconciliation shipped in still showed the tile
                clipped at x 0, so this takes the owner's literal number
                instead of re-deriving it again. */}
            {/* studio:h-full dropped (a code review, ui-v0.4.3): it only
                did anything while SidebarHeader had its own explicit
                studio:h-[62px] - that fixed height is gone in favor of
                the plain pt-5/pb-6 pair above, so the ancestor chain
                this button's height would resolve a percentage against
                is auto all the way up, making h-full inert. */}
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1! gap-1 pl-4!">
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

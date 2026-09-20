import { NavLink } from "react-router-dom";
import { getIcon, type IconName } from "@/kit/icons";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/kit/ui/sidebar";

// `icon` is a name, resolved here at render time, not a pre-resolved
// component: a caller building a NavGroup from a flat NavEntry[] (whose
// own `icon` is already a name, spec/ui/schema.json's shape) shouldn't
// have to resolve it itself just to hand it to this component - one
// resolution site, not one per caller.
export type NavItem = { title: string; url: string; icon?: IconName; isActive?: boolean; badge?: number; dot?: "critical" | "error" | "warning" | null; tooltip?: string };
export type NavGroup = { label: string; items: NavItem[] };

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const DOT: Record<"critical" | "error" | "warning", string> = { critical: "bg-red-500", error: "bg-red-500", warning: "bg-amber-500" };
  // The rail's own overflow-auto scroller (kit/ui/sidebar.tsx's
  // SidebarContent) sits one level up; this list just needs to be able to
  // shrink below its content size (min-h-0) so that scroller, not the
  // whole rail, is what scrolls. Group padding is kept tight and rows stay
  // at their 40px spec height; the 16px/8px space around each group label
  // (owner's retest, 2026-09-20) means a very short viewport (~900px) can
  // still need a small scroll to reach the last destination, but nothing
  // is unreachable or hidden the way it was before this scroller existed.
  return (
    <div data-nav-mode="pinned" className="flex min-h-0 flex-1 flex-col">
      {groups.map((group) => (
        <SidebarGroup key={group.label} className="group/nav p-0">
          {/* text-base, not text-xs, and h-auto, not the h-4 that fit only
              the old size: the type floor (docs/UI.md) applies to this
              real section heading - a call-site className override on
              SidebarGroupLabel had silently defeated the primitive's own
              fixed default (the same class of bug a code review caught in
              PropertyPanel/KeyValueList's own size overrides). /75, not
              /60: the same override also silently reduced the
              primitive's own contrast-safe opacity (Home step 5a,
              2026-09-20 - the approved light theme's own --sidebar
              measured this call site's rendered color at 4.48:1, under
              WCAG AA's 4.5:1 floor; /75 matches sidebar.tsx's own bumped
              default and clears it with real margin). */}
          <SidebarGroupLabel className="mt-4 mb-2 h-auto px-2 font-semibold tracking-wide text-sidebar-foreground/75 uppercase group-data-[collapsible=icon]:hidden">{group.label}</SidebarGroupLabel>
          <SidebarMenu className="gap-0">
            {group.items.map((item) => {
              const Icon = item.icon ? getIcon(item.icon) : null;
              return (
              <SidebarMenuItem key={item.title}>
                {/* No h/text/svg-size override here: that silently
                    defeated SidebarMenuButton's own 48px/16px floor
                    default the same way the SidebarGroupLabel override
                    above did (found live building step 5's far/TV a11y
                    sweep - the first thing to actually measure this nav
                    row's real rendered size). */}
                <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.tooltip ?? item.title} className="px-3 data-[active=true]:bg-[var(--hue-violet)] data-[active=true]:text-white data-[active=true]:hover:bg-[var(--hue-violet)] data-[active=true]:hover:text-white">
                  <NavLink to={item.url}>
                    {Icon && <Icon />}
                    <span>{item.title}</span>
                    {item.dot ? <span aria-hidden className={`size-2.5 rounded-full ${DOT[item.dot]}`} /> : null}
                    {item.badge != null && item.badge > 0 && <span className="ml-auto text-xs text-muted-foreground">{item.badge}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}

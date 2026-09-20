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
          <SidebarGroupLabel className="mt-4 mb-2 h-4 px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase group-data-[collapsible=icon]:hidden">{group.label}</SidebarGroupLabel>
          <SidebarMenu className="gap-0">
            {group.items.map((item) => {
              const Icon = item.icon ? getIcon(item.icon) : null;
              return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.tooltip ?? item.title} className="h-10 px-3 text-[15px] [&>svg]:size-[18px]! data-[active=true]:bg-[var(--hue-violet)] data-[active=true]:text-white data-[active=true]:hover:bg-[var(--hue-violet)] data-[active=true]:hover:text-white">
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

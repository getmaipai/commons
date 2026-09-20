import { NavLink } from "react-router-dom";
import { getIcon, type IconName } from "@/kit/icons";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/kit/ui/sidebar";

// `icon` is a name, resolved here at render time, not a pre-resolved
// component: a caller building a NavGroup from a flat NavEntry[] (whose
// own `icon` is already a name, spec/ui/schema.json's shape) shouldn't
// have to resolve it itself just to hand it to this component - one
// resolution site, not one per caller.
export type NavItem = { title: string; url: string; icon?: IconName; isActive?: boolean; badge?: number; dot?: "critical" | "error" | "warning" | null; tooltip?: string };
export type NavGroup = { label: string; items: NavItem[] };

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const DOT: Record<"critical" | "error" | "warning", string> = { critical: "bg-red-500", error: "bg-red-500", warning: "bg-amber-500" };
  // Owner finding, 2026-09-20 ("The collapsed rail," both looks): the
  // expanded divider is a full-width hairline above the label; once the
  // label disappears in the collapsed rail it's replaced by a short,
  // centered 24px hairline instead - two different elements, chosen by
  // real JS state rather than guessing whether a stack of Tailwind
  // variants (`group-data-[collapsible=icon]:studio:hidden`) resolves
  // in the right order. `state` alone is the desktop rail's own open/
  // cookie state and stays "collapsed" even inside the mobile Sheet
  // drawer (sidebar.tsx's mobile branch never touches it or sets
  // `data-collapsible`) - `!isMobile` is the real gate for "is the
  // icon-only layout actually on screen," found by a review before
  // this ever shipped a stray short divider into the full-label
  // mobile drawer.
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
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
      {groups.map((group, index) => (
        <SidebarGroup key={group.label} className="group/nav p-0">
          {/* The expanded Studio divider (owner ruling, "Two looks, one
              setting": "a hairline divider above each group") is plain
              CSS in tokens.css (`[data-look="studio"] [data-slot=
              "sidebar"]:not([data-collapsible="icon"]) [data-slot=
              "sidebar-group"]:not(:first-of-type)`), not a class here -
              `studio:mt-2 studio:border-t ...` silently compiled to
              nothing (tokens.css's own comment on that rule has why).
              Collapsed (owner finding, "The collapsed rail," both
              looks): a short, centered 24px hairline instead, rendered
              directly since it has no expanded-mode equivalent to share
              a selector with. */}
          {index > 0 && collapsed && (
            <div aria-hidden className="mx-auto my-1 h-px w-6 bg-sidebar-border" />
          )}
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
              default and clears it with real margin).
              Studio's own 11px small-cap override (owner ruling,
              2026-09-20 - a knowing exception past this floor, Calm's
              own default size is the escape hatch for anyone who needs
              it) is tokens.css's `[data-look="studio"] [data-slot=
              "sidebar-group-label"]` rule, not a class here, for the
              same reason as the divider above. */}
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
                {/* bg-gradient-to-br from violet to its deeper stop
                    (spec "The style, exactly": "the gradient from
                    section 1's violet to its deeper stop"), not a flat
                    fill - the same treatment the reference's own active
                    item uses, expanded, both looks. Studio's own 10px
                    radius (owner ruling) and the collapsed flat-vs-
                    gradient split (owner finding, "The collapsed rail")
                    are tokens.css's plain CSS rules against this
                    button's own `data-slot`/`data-active` attributes,
                    not classes here (tokens.css's own comment on that
                    block has why). `studio:mx-1` (the reference's own
                    inset from the rail edge) is the one look-specific
                    class that stays here. */}
                <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.tooltip ?? item.title} className="px-3 studio:mx-1 data-[active=true]:bg-gradient-to-br data-[active=true]:from-[var(--hue-violet)] data-[active=true]:to-[var(--hue-violet-deep)] data-[active=true]:text-white data-[active=true]:hover:text-white">
                  {/* aria-label, not just the visible span below: a
                      collapsed rail (tablet defaults to collapsed,
                      defaultRailOpen()'s own <1280px threshold) hides
                      that span entirely, and the icon alone (no
                      aria-hidden, no text) carries no accessible name -
                      SidebarMenuButton's own `tooltip` prop is a
                      hover/focus-only visual, never wired to aria-label,
                      so it does not cover this. A real a11y regression
                      the fix below introduced and the tablet sweep
                      caught before this line was corrected. */}
                  <NavLink to={item.url} aria-label={item.title}>
                    {Icon && <Icon aria-hidden />}
                    {/* group-data-[collapsible=icon]:hidden, matching
                        SidebarGroupLabel's own class two lines up - found
                        live (a real household report, 2026-09-20): without
                        it this span stays in the accessibility tree and
                        SidebarMenuButton's own `[&>span:last-child]:truncate`
                        (sidebar.tsx) clips it to whatever sliver fits the
                        collapsed 48px button instead of hiding it, so the
                        icon-only rail showed one stray letter per row. */}
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
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

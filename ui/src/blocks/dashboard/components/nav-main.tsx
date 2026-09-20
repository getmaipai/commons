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
            <div aria-hidden className="mx-auto my-3 h-px w-6 bg-sidebar-border" />
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
          {/* Owner findings: 20px above a group label at the pills' own
              left edge (px-3, matching SidebarMenuButton's own mx-3
              below) - except the first group, which sits right under
              the logo block's own bottom padding (app-sidebar.tsx's
              SidebarHeader) and needs none of its own on top of that;
              Studio's own exact numbers ("The Studio look, the
              numbers," 2026-09-20 18:15, superseding any earlier
              estimate) - 11px above (7px for the first group, the
              logo block's own padding already at 14px) and 7px below
              - replace Calm's own defaults only inside `studio:`.
              Inset 13px, not that section's own literal "7px": kept
              aligned with the pills' own studio:mx-[13px] below
              rather than sitting 6px out of line with them (tokens.css's
              own divider rule has the fuller reasoning, the same
              choice applied there). */}
          <SidebarGroupLabel className={`${index === 0 ? "mt-0 studio:mt-[7px]" : "mt-5 studio:mt-[11px]"} mb-2 studio:mb-[7px] h-auto px-3 studio:px-[13px] font-semibold tracking-wide text-sidebar-foreground/75 uppercase group-data-[collapsible=icon]:hidden`}>{group.label}</SidebarGroupLabel>
          <SidebarMenu className="gap-0 studio:gap-[2px]">
            {group.items.map((item) => {
              const Icon = item.icon ? getIcon(item.icon) : null;
              return (
              <SidebarMenuItem key={item.title}>
                {/* h-10 (40px) here IS an override of SidebarMenuButton's
                    own 48px default - a past comment on this exact line
                    warned against exactly that, from a real regression
                    (a far/TV a11y sweep once found a size override here
                    that silently defeated the touch-target floor). Safe
                    this time only because sidebar.tsx's own `hitArea(1)`
                    is baked into the button's base classes
                    unconditionally, and a 4px overhang on each side of a
                    40px box IS the 48px floor (its own comment: "already
                    at the floor" was about the default 48px row; h-10
                    is the row hitArea(1) was sized for, not an escape
                    from it). mx-3/h-10/gap-3/rounded-[10px] are the base
                    (both looks): "inset pills, never edge to edge" is a
                    real bug, not a Studio-only look. `studio:` narrows
                    every number to the reference-exact figure ("The
                    Studio look, the numbers," 2026-09-20 18:15, which
                    wins over the rougher 17:40 estimates this file
                    used to cite) - 8px radius, 2px between items
                    (SidebarMenu's own className above), 14px icon-label
                    gap, 10px vertical padding (h-auto lets it set the
                    row's real height instead of competing with h-10).
                    Calm keeps the plainer numbers; it was never given
                    reference-exact ones of its own. `w-auto` (a code
                    review, 2026-09-20): SidebarMenuButton's own base
                    class sets `w-full`, and `width: 100%` plus a
                    non-auto `margin-left` AND `margin-right` (mx-3 sets
                    both) is CSS's classic over-constrained block box -
                    the spec drops `margin-right` to make it fit, not
                    the width, so the pill's right edge overflowed the
                    rail's own right edge by exactly its own right
                    margin. `w-auto` overrides the base `w-full`, letting
                    the browser compute the real width as "100% minus
                    both margins," the only value that keeps the box
                    correctly constrained. */}
                {/* bg-gradient-to-br from violet to its deeper stop
                    (spec "The style, exactly": "the gradient from
                    section 1's violet to its deeper stop"), not a flat
                    fill - the same treatment the reference's own active
                    item uses, expanded, both looks; Studio's own exact
                    gradient stops, inset ring and glow are tokens.css's
                    plain CSS (this file's own established reason a
                    stacked `studio:`+`data-[active=true]:` Tailwind
                    variant can't be trusted to merge - the same
                    tailwind-merge gap HOME-UI-02c found). The collapsed
                    flat-vs-gradient split (owner finding, "The
                    collapsed rail") is there too. */}
                <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.tooltip ?? item.title} className="mx-3 studio:mx-[13px] w-auto h-10 studio:h-auto studio:py-[10px] gap-3 studio:gap-[14px] rounded-[10px] studio:rounded-[8px] px-3 [&>svg]:size-5 studio:[&>svg]:size-[19px] data-[active=true]:bg-gradient-to-br data-[active=true]:from-[var(--hue-violet)] data-[active=true]:to-[var(--hue-violet-deep)] data-[active=true]:text-white data-[active=true]:hover:text-white">
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
                    {/* text-sm (14px): docs/UI.md's 16px type floor is
                        for body copy; a rail nav label, like the group
                        heading above it, is a compact wayfinding label,
                        vertically centered in the pill next to its icon,
                        not a paragraph a person reads at length. Weight
                        520 in Studio's own numbers is the kit's "medium"
                        (font-medium, 500) - the nearest step Tailwind's
                        default weight scale has. */}
                    <span className="text-sm studio:font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
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

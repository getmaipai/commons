import { useEffect, useState, type ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/kit/ui/sidebar";
import { AppSidebar, ungroupedNav } from "@/kit/blocks/dashboard/components/app-sidebar";
import type { NavGroup } from "@/kit/blocks/dashboard/components/nav-main";
import { PhoneNav } from "@/kit/PhoneNav";
import { CommandPalette } from "@/kit/search/CommandPalette";
import type { SearchGroup, SearchResultItem } from "@/kit/search/types";
import type { NavEntry } from "@/kit/nav";
import { HeaderSearchField } from "@/kit/blocks/dashboard/components/HeaderSearchField";
import { PhoneModeContext } from "@/kit/blocks/phone/PhoneMode";
import { useBreakpoint } from "@/kit/hooks/useBreakpoint";
import { cn } from "@/kit/utils";

function readRailPreference(storageKey: string): boolean | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "expanded" ? true : value === "collapsed" ? false : null;
  } catch {
    return null;
  }
}

function writeRailPreference(storageKey: string, open: boolean): void {
  try {
    localStorage.setItem(storageKey, open ? "expanded" : "collapsed");
  } catch {
    // a private window may refuse storage
  }
}

function defaultRailOpen(): boolean {
  return typeof window === "undefined" || window.innerWidth >= 1280;
}

export interface ShellSearchConfig {
  /** Already computed for the current `query` by the caller's own
   * search providers - the kit does no matching of its own. */
  groups: SearchGroup[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (item: SearchResultItem) => void;
  /** Omitted for a product with no chat/assistant feature. */
  onAsk?: (query: string) => void;
  askLabel?: string;
  placeholder?: string;
}

export interface ShellProps {
  /** Flat nav entries (Home's own list) or pre-grouped sections (the
   * Stack's taxonomy groups) - pass whichever shape the product already
   * has. */
  nav: readonly NavEntry[] | NavGroup[];
  /** The product's own logo + wordmark, rendered above the nav. */
  brand: ReactNode;
  /** Rendered below the nav list in the desktop rail (a pin toggle, a
   * system pulse widget, or nothing). */
  sidebarFooter?: ReactNode;
  /** The header's left content next to the mobile menu trigger - a
   * page title, a destination header, or nothing. */
  headerTitle?: ReactNode;
  /** The header's right content - appearance control, a notification
   * popover, a profile/header picker. The kit renders none of these on
   * its own; a product assembles them from the kit's own primitives. */
  headerActions?: ReactNode;
  /** Phone-only replacement for `headerTitle` (owner reference, "The
   * phone composition," 2026-09-20: "the product wordmark at the
   * left... a small version pill beside it"). Omitted: phone keeps
   * rendering `headerTitle`, same as before this prop existed - a
   * product that hasn't adopted the phone fold (Stack, Catalog) sees
   * no change. Given: the phone header shows this instead of
   * `headerTitle`, `search`, and `headerActions` are hidden on phone
   * too (see `phoneHeaderActions`), matching the reference's own
   * "avatar at the right; nothing else." */
  phoneHeaderTitle?: ReactNode;
  /** Phone-only replacement for `headerActions` and the visible
   * `search` field, both hidden on phone once this is given (folded
   * into whatever this renders - the reference's own avatar menu).
   * A render prop, not a bare node: the palette's open state lives in
   * this component, so the product's own menu (a "Search" row, say)
   * needs a way to open it without the kit lifting that state to a
   * controlled prop only this one caller would ever use. Ignored
   * unless `phoneHeaderTitle` is also given.
   *
   * `openSearch` only does something when `search` is also given - it
   * opens the same `<CommandPalette>` `search` configures, which isn't
   * mounted at all without it (a code review, 2026-09-20: a caller
   * that wires a "Search" row here but never passes `search` gets a
   * button that's visibly there and does nothing, no error either -
   * dev-only console warning below, since nothing in the types can
   * require the two together). */
  phoneHeaderActions?: (openSearch: () => void) => ReactNode;
  search?: ShellSearchConfig;
  /** localStorage key for the desktop rail's collapsed/expanded choice.
   * Namespaced by the caller so two products on one browser profile
   * never share a rail preference. */
  railStorageKey?: string;
  /** Total tab-bar slots, entries plus More, before folding the rest
   * under More (`PhoneNav.tsx`'s own `max`, default 5 - shows 4 plus
   * More). Home passes 4 for its own "Home, Chat, Apps, More" - three
   * real destinations, not four, before More (owner ruling,
   * "Navigation, corrected," 2026-09-20). */
  phoneNavMax?: number;
  /** The fixed 40px status bar between the content region and the
   * phone tab bar (spec "Fixed footer"/"Footer summary reference") -
   * a product's own `FooterBar`, or nothing for a product with no
   * operational summary to show. Hidden on the phone: the tab bar
   * takes that edge. */
  footer?: ReactNode;
  children: ReactNode;
}

function toNavGroups(nav: readonly NavEntry[] | NavGroup[]): NavGroup[] {
  if (nav.length === 0) return [];
  return "to" in nav[0]! ? ungroupedNav(nav as readonly NavEntry[]) : (nav as NavGroup[]);
}

function flatEntries(nav: readonly NavEntry[] | NavGroup[]): NavEntry[] {
  if (nav.length === 0) return [];
  if ("to" in nav[0]!) return nav as NavEntry[];
  return (nav as NavGroup[]).flatMap((group) =>
    group.items.map((item) => ({ to: item.url, icon: item.icon ?? "box", label: item.title })),
  );
}

/** The layout and navigation contract: a desktop/tablet rail, a phone
 * bottom bar, a header, and (when `search` is given) the Cmd/Ctrl+K
 * command palette plus a real header button that opens it - docs/UI.md's
 * shell contract, generalized from the Stack's reconciled dashboard
 * shell and Home's own command palette and phone nav. Imports no product
 * page: routed content is `children`, nav is data the caller passes in.
 *
 * The button matters on its own, not just as a Cmd/K nicety: a phone has
 * no keyboard shortcut, so without a visible trigger search would exist
 * on desktop and vanish on phone - exactly what "one product, every
 * screen" forbids (owner ruling, 2026-09-20, on Home's own adoption).
 * The palette's open state stays internal (not lifted to a controlled
 * prop) because this button is the one thing that ever needs to open
 * it now; a second, product-supplied trigger would still work today
 * since `search.onQueryChange`/the rest of the config are already
 * caller-owned, but nothing needs that yet.
 *
 * TV-focusable navigation (the norigin spatial-navigation rail) is not
 * yet part of this shell - tracked as a follow-up, not silently
 * dropped. */
export function Shell({ nav, brand, sidebarFooter, headerTitle, headerActions, phoneHeaderTitle, phoneHeaderActions, search, railStorageKey = "maipai:shell-rail", phoneNavMax, footer, children }: ShellProps) {
  const [railOpen, setRailOpen] = useState<boolean>(() => readRailPreference(railStorageKey) ?? defaultRailOpen());
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The same tier `SidebarProvider` (ui/sidebar.tsx) already derives its
  // own `isMobile` from - a second, disagreeing breakpoint constant here
  // (there was one: a plain 640px check) would put the rail and
  // `PhoneModeContext` at odds in the gap between the two numbers.
  // `PhoneModeContext` existed with no product ever providing it (found
  // wiring the Apps page's things-table: it silently never rendered its
  // phone layout, home had no provider), so a page asking
  // `usePhoneMode()` got `false` unconditionally, forever, on every
  // screen size.
  const phone = useBreakpoint().tier === "phone";

  useEffect(() => {
    if (readRailPreference(railStorageKey) !== null) return;
    const update = () => setRailOpen(defaultRailOpen());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [railStorageKey]);

  useEffect(() => {
    if (!search) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setPaletteOpen((open) => !open);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [search]);

  // A fix-hunk re-review caught two problems with the first version of
  // this check: it warned even when `phoneHeaderActions` was given
  // alone (`phoneHeaderTitle` omitted) - documented as inert, since
  // `phoneHeaderActions` is then never invoked and `openSearch` is
  // never reachable at all, so "openSearch will have nothing to open"
  // described a problem that can't occur for that caller; and it
  // depended on `phoneHeaderActions`/`search` by reference, so a
  // caller passing either as an inline literal (every test in this
  // file does, and any real consumer's `search` config is almost
  // always a fresh object each render) re-ran the effect, and could
  // re-warn, on every render rather than once per real presence
  // change. Booleans of "is this given" as the dependencies fix both:
  // stable across an inline closure's or object's own changing
  // identity, and true only in the one combination where
  // `phoneHeaderActions` actually runs.
  const hasPhoneHeaderActions = phoneHeaderActions !== undefined;
  const hasPhoneHeaderTitle = phoneHeaderTitle !== undefined;
  const hasSearch = search !== undefined;
  useEffect(() => {
    // `phoneHeaderActions`'s own `openSearch` opens the very
    // `<CommandPalette>` below that only mounts when `search` is given
    // - a caller that wires a menu row to it without also configuring
    // `search` gets a button that silently does nothing. Not gated
    // behind a dev-only check (there's no reliable one across every
    // bundler a consumer might use, and an unguarded check is the one
    // this kit's own test suite can actually verify) - one
    // `console.warn` per real presence change is cheap enough to leave
    // in production too.
    if (hasPhoneHeaderActions && hasPhoneHeaderTitle && !hasSearch) {
      console.warn("Shell: phoneHeaderActions is given without search - openSearch will have nothing to open.");
    }
  }, [hasPhoneHeaderActions, hasPhoneHeaderTitle, hasSearch]);

  function handleRailOpenChange(next: boolean): void {
    setRailOpen(next);
    writeRailPreference(railStorageKey, next);
  }

  const groups = toNavGroups(nav);
  const entries = flatEntries(nav);
  const openSearch = () => setPaletteOpen(true);
  // Both given: the phone fold (docs/UI.md's shell contract, extended
  // 2026-09-20 for the reference's own phone header). Either omitted:
  // today's header on every screen size, so a product that hasn't
  // adopted the fold sees no change.
  const showPhoneHeader = phone && phoneHeaderTitle !== undefined && phoneHeaderActions !== undefined;

  return (
    <SidebarProvider open={railOpen} onOpenChange={handleRailOpenChange}>
      <AppSidebar groups={groups} brand={brand} footer={sidebarFooter} className="hidden sm:flex" />
      <SidebarInset className={cn("h-svh overflow-hidden bg-[var(--surface-page)]")}>
        {/* py-4 (16px), not h-16: owner ruling, ui-v0.4.3 - "the title
            block gets 16px top padding and 16px below the subtitle
            before the header's bottom border." A fixed h-16 centered
            the title/subtitle block instead of giving it its own
            top/bottom inset, so the subtitle touched the border
            directly regardless of look (COORDINATOR's own pixel
            measurement, 2026-09-20). items-center still centers the
            search field and header actions on the row's own height,
            which now grows to fit the title block instead of the
            other way around. */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-4">
          {showPhoneHeader ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* A code review, 2026-09-20: this branch's own gate is
                    the JS `phone` tier (width < 720, useBreakpoint.ts),
                    but this button's visibility is the CSS `sm:` break
                    (640px) - a pre-existing gap between the two (this
                    file's own comment above `phone`), previously just
                    logically inconsistent since both branches used to
                    be the same JSX. Rendering the trigger in both
                    branches, gated only by its own CSS class either
                    way, keeps a 640-719px viewport able to toggle the
                    rail regardless of which header branch renders. */}
                <SidebarTrigger className="hidden sm:inline-flex" />
                {phoneHeaderTitle}
              </div>
              <div className="flex shrink-0 items-center gap-2">{phoneHeaderActions!(openSearch)}</div>
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <SidebarTrigger className="hidden sm:inline-flex" />
                {headerTitle}
              </div>
              {search ? (
                <div className="flex shrink-0 items-center justify-center">
                  <HeaderSearchField placeholder={search.placeholder ?? "Search..."} onOpen={openSearch} />
                </div>
              ) : null}
              <div className="flex flex-1 items-center justify-end gap-2">{headerActions}</div>
            </>
          )}
        </header>
        {/* pt-6 (24px): owner ruling, ui-v0.4.3 - "the content column
            starts 24px under that border." */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-6 pb-16 sm:pb-0"><PhoneModeContext.Provider value={phone}>{children}</PhoneModeContext.Provider></div>
        {footer ? <div className="hidden h-10 shrink-0 items-center border-t border-border/60 sm:flex">{footer}</div> : null}
        <PhoneNav entries={entries} max={phoneNavMax} />
      </SidebarInset>
      {search ? (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          query={search.query}
          onQueryChange={search.onQueryChange}
          groups={search.groups}
          onSelect={search.onSelect}
          onAsk={search.onAsk}
          askLabel={search.askLabel}
          placeholder={search.placeholder}
        />
      ) : null}
    </SidebarProvider>
  );
}

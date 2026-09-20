import { useEffect, useState, type ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/kit/ui/sidebar";
import { AppSidebar, ungroupedNav } from "@/kit/blocks/dashboard/components/app-sidebar";
import type { NavGroup } from "@/kit/blocks/dashboard/components/nav-main";
import { PhoneNav } from "@/kit/PhoneNav";
import { CommandPalette } from "@/kit/search/CommandPalette";
import type { SearchGroup, SearchResultItem } from "@/kit/search/types";
import type { NavEntry } from "@/kit/nav";
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
  search?: ShellSearchConfig;
  /** localStorage key for the desktop rail's collapsed/expanded choice.
   * Namespaced by the caller so two products on one browser profile
   * never share a rail preference. */
  railStorageKey?: string;
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
 * command palette - docs/UI.md's shell contract, generalized from the
 * Stack's reconciled dashboard shell and Home's own command palette and
 * phone nav. Imports no product page: routed content is `children`,
 * nav is data the caller passes in. TV-focusable navigation (the norigin
 * spatial-navigation rail) is not yet part of this shell - tracked as a
 * follow-up, not silently dropped. */
export function Shell({ nav, brand, sidebarFooter, headerTitle, headerActions, search, railStorageKey = "maipai:shell-rail", children }: ShellProps) {
  const [railOpen, setRailOpen] = useState<boolean>(() => readRailPreference(railStorageKey) ?? defaultRailOpen());
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  function handleRailOpenChange(next: boolean): void {
    setRailOpen(next);
    writeRailPreference(railStorageKey, next);
  }

  const groups = toNavGroups(nav);
  const entries = flatEntries(nav);

  return (
    <SidebarProvider open={railOpen} onOpenChange={handleRailOpenChange}>
      <AppSidebar groups={groups} brand={brand} footer={sidebarFooter} className="hidden sm:flex" />
      <SidebarInset className={cn("h-svh overflow-hidden bg-[var(--surface-page)]")}>
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="hidden sm:inline-flex" />
            {headerTitle}
          </div>
          <div className="flex items-center gap-1">{headerActions}</div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-16 sm:pb-0">{children}</div>
        <PhoneNav entries={entries} />
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

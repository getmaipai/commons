import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search as SearchIcon } from "lucide-react";
import { defaultFilter } from "cmdk";
import { Button } from "../../../../components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../components/ui/command";
import SidebarContent, { type ChildItem } from "../../vertical/sidebar/sidebaritems";

interface FlatItem {
  key: string;
  name: string;
  url: string;
  icon?: ChildItem["icon"];
}

/** SHELL-SEARCH-02 (home, 2026-09-23): the generic shape of a caller's
 * own search results, kept deliberately app-agnostic (never home's own
 * conversation/person/app/setting record shapes) - the kit knows only
 * that a result is a labeled pointer to somewhere the caller's own app
 * can navigate, never what a result IS. `kind` is a plain label, not a
 * discriminant that changes the other fields - every result carries the
 * same shape whatever it points to. */
export interface SearchResult {
  kind: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchGroup {
  kind: string;
  heading: string;
  results: SearchResult[];
}

/** The same recursive descent `Search.tsx`'s own `searchItems()` already
 * makes over `SidebarContent` (a `ChildItem` may itself carry nested
 * `items`, per that type's own shape) - reused here as a flat list, not
 * a second traversal invented for this file, since the actual query
 * matching below is `cmdk`'s own (the template's own logic, not a
 * hand-rolled `.includes()`): `CommandInput`/`CommandList` filter their
 * `CommandItem` children by each one's own `value` automatically. */
function flatten(items: ChildItem[] | undefined): FlatItem[] {
  if (!items) return [];
  return items.flatMap((item) => [
    ...(item.url ? [{ key: String(item.id ?? item.url), name: item.name, url: item.url, icon: item.icon }] : []),
    ...flatten(item.items),
  ]);
}

export interface HeaderSearchProps {
  /** SHELL-SEARCH-02 (home, 2026-09-23): a caller's own search over
   * whatever else it wants findable (conversations, people, apps,
   * settings for home) - the kit fetches this after the query reaches
   * two characters (200ms debounced, the previous groups kept on
   * screen while a new fetch is in flight so the list never blinks
   * empty) and renders the groups it returns below the sidebar
   * sections, the shipped `CommandGroup`/`CommandItem` parts, nothing
   * hand-built. Undefined (the default): no remote group ever renders,
   * unchanged from SHELL-SEARCH-01's own behavior. A rejected promise
   * is swallowed - the previous groups just stay on screen, never a
   * crash over a caller's own network hiccup. */
  remote?: (query: string) => Promise<SearchGroup[]>;
}

/** SHELL-SEARCH-01 (home, 2026-09-23): the header's one global search -
 * an icon button in the right group, left of the theme toggle, opening
 * `command.tsx`'s own `CommandDialog` over the sidebar's own item list,
 * the same data `Search.tsx` (the left-area field this replaces
 * everywhere) already reads. Named gap: `Header.tsx`'s right group
 * ships no extension slot at all (checked - `LightDark`/`Notifications`/
 * `Profile` are all hardcoded there), so this is a documented additive
 * patch to that file, the same shape CHAT-HEADER-01/03's own patches
 * already are (`dashboard-upstream.md`'s own table). Global, not a
 * per-page override like `HeaderExtraLeft`: every page shows the exact
 * same icon and dialog, so a component TYPE slot (that pattern's own
 * reason for existing) isn't needed here - `Header.tsx` just renders
 * this unconditionally, the same as its other two right-group icons. */
const HeaderSearch = ({ remote }: HeaderSearchProps = {}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteGroups, setRemoteGroups] = useState<SearchGroup[]>([]);
  const navigate = useNavigate();
  // Guards a stale, slower-to-resolve fetch from a shorter earlier query
  // overwriting the result of a longer, more specific one typed after
  // it - `remote`'s own caller has no ordering guarantee across two
  // in-flight promises, so only the response matching the CURRENT ref
  // value is ever applied.
  const requestIdRef = useRef(0);
  // A review caught this: keying the debounce effect below on `remote`
  // itself breaks the moment a caller passes the natural inline arrow
  // (`headerSearchRemote={(q) => api.search(q)}`) rather than a stable
  // module-level reference - a new function identity every parent
  // render restarts the 200ms timer on every render, not just every
  // keystroke, and a fast-enough render cadence starves it entirely.
  // The ref always holds the latest implementation (assigned every
  // render, no effect needed for that alone) so the debounce effect
  // below can depend on `query` only and still always call the
  // freshest `remote`.
  const remoteRef = useRef(remote);
  remoteRef.current = remote;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // SHELL-SEARCH-02: runs after two characters, 200ms debounced. Below
  // two characters there is nothing to send `remote` at all (design's
  // own rule) - the remote groups clear immediately rather than showing
  // a stale set from a longer query the person has since deleted back
  // down from.
  useEffect(() => {
    if (!remoteRef.current) return;
    if (query.trim().length < 2) {
      requestIdRef.current += 1;
      setRemoteGroups([]);
      return;
    }
    const id = ++requestIdRef.current;
    const timer = setTimeout(() => {
      // Promise.resolve().then(...) turns a caller's own SYNCHRONOUS
      // throw (a `remote` that isn't itself declared `async`) into a
      // rejection the .catch() below actually sees - a review caught
      // a bare `remote(query).then(...).catch(...)` letting exactly
      // that escape uncaught, contradicting this prop's own "never a
      // crash over a caller's own network hiccup" doc comment above.
      Promise.resolve()
        .then(() => remoteRef.current!(query))
        .then((groups) => {
          if (requestIdRef.current === id) setRemoteGroups(groups);
        })
        .catch(() => {
          // The previous groups stay on screen - a caller's own network
          // hiccup is never this dialog's crash to have.
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const groups = useMemo(
    () => SidebarContent.map((section) => ({ heading: section.heading ?? "", items: flatten(section.items) })).filter((section) => section.items.length > 0),
    [],
  );

  // A review caught this: `Command`'s own default `filter` re-scores
  // every `CommandItem` by a fuzzy match between its `value` and the
  // typed query - fine for the sidebar's own items (that's the exact
  // behavior SHELL-SEARCH-01 built on), wrong for `remoteGroups`, whose
  // results are already the caller's own server-side relevance ranking
  // (SearchProvider's own kind-specific match, never cmdk's fuzzy
  // score) - a real result `remote` returned could fail cmdk's fuzzy
  // re-check and silently never render. Remote titles always score 1
  // (never re-filtered); every other value keeps cmdk's own shipped
  // `defaultFilter` (imported, not reimplemented) unchanged.
  const remoteTitles = useMemo(() => new Set(remoteGroups.flatMap((group) => group.results.map((result) => result.title.toLowerCase()))), [remoteGroups]);
  function filterItem(value: string, search: string): number {
    if (remoteTitles.has(value.toLowerCase())) return 1;
    return defaultFilter(value, search);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setRemoteGroups([]);
    }
  }

  // Found live testing SHELL-SEARCH-02: `CommandDialog`'s `onOpenChange`
  // only fires from the dialog's OWN close triggers (Escape, outside
  // click) - it is never called just because a parent re-renders with a
  // different `open` value, so a bare `setOpen(false)` here skipped
  // `onOpenChange`'s own query/remoteGroups reset entirely. The next
  // open (any page, since this component is mounted once in FullLayout
  // and outlives every navigation) showed the PREVIOUS query still
  // sitting in the input, with new typing appended onto it - reused
  // `onOpenChange` here instead of a second, divergent close path.
  function go(url: string) {
    onOpenChange(false);
    navigate(url);
  }

  return (
    <>
      <Button
        variant="ghost"
        aria-label="Search"
        className="h-10 w-10 hover:bg-primary/5 rounded-full cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search Home">
        {/* command.tsx's own CommandDialog wraps {children} directly in
         * DialogContent, never in cmdk's own <Command> root the way
         * shadcn/ui's stock CommandDialog does - checked live, a
         * CommandItem/CommandInput without one throws
         * (useSyncExternalStore reading an undefined store context).
         * Every caller supplies its own <Command>; this is that one. */}
        <Command filter={filterItem}>
          <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {groups.map((section, index) => (
              // A review caught keying by `section.heading` alone: it's
              // optional (defaulted to "") and SidebarContent's own type
              // gives no uniqueness guarantee across sections - two
              // future sections sharing a heading (or both unheaded)
              // would collide. `groups` is a stable, order-preserving
              // array (useMemo, never reordered), so the index is a
              // real, always-unique key.
              <CommandGroup key={index} heading={section.heading}>
                {section.items.map((item) => (
                  <CommandItem key={item.key} value={item.name} onSelect={() => go(item.url)}>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {/* SHELL-SEARCH-02: below the sidebar sections above, in the
             * order `remote` returned them - a caller's own ranking,
             * never re-sorted here. `group.kind` is unique per response
             * (one group per result kind), a real, stable key. */}
            {remoteGroups.map((group) => (
              <CommandGroup key={group.kind} heading={group.heading}>
                {group.results.map((result) => (
                  <CommandItem key={result.id} value={result.title} onSelect={() => go(result.href)}>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{result.title}</span>
                      {result.subtitle ? <span className="truncate text-xs text-muted-foreground">{result.subtitle}</span> : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};

export default HeaderSearch;

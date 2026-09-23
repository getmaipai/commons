import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search as SearchIcon } from "lucide-react";
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
const HeaderSearch = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  const groups = useMemo(
    () => SidebarContent.map((section) => ({ heading: section.heading ?? "", items: flatten(section.items) })).filter((section) => section.items.length > 0),
    [],
  );

  function go(url: string) {
    setOpen(false);
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
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search Home">
        {/* command.tsx's own CommandDialog wraps {children} directly in
         * DialogContent, never in cmdk's own <Command> root the way
         * shadcn/ui's stock CommandDialog does - checked live, a
         * CommandItem/CommandInput without one throws
         * (useSyncExternalStore reading an undefined store context).
         * Every caller supplies its own <Command>; this is that one. */}
        <Command>
          <CommandInput placeholder="Search..." />
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
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};

export default HeaderSearch;

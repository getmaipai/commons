import { Command, CommandDialog, CommandInput, CommandList } from "@/kit/ui/command";
import { SearchResultGroups } from "@/kit/search/SearchResultGroups";
import type { SearchGroup, SearchResultItem } from "@/kit/search/types";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  groups: SearchGroup[];
  onSelect: (item: SearchResultItem) => void;
  /** Omitted entirely for a product with no chat/assistant feature to
   * ask - the "Ask" row then never renders. */
  onAsk?: (query: string) => void;
  askLabel?: string;
  placeholder?: string;
  title?: string;
  description?: string;
}

/** Cmd/Ctrl+K everywhere: a caller owns the keybinding and the open
 * state (opening this needs to also decide, e.g., whether the `far`/TV
 * surface goes to a full search page instead); this component is just
 * the dialog, the input, and the grouped result list.
 * `shouldFilter={false}`: the caller's own groups are already filtered
 * (its search providers do their own matching), so cmdk's built-in
 * fuzzy scorer would only re-rank an already-right result set. */
export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  onSelect,
  onAsk,
  askLabel = "Ask",
  placeholder = "Search...",
  title = "Search",
  description = "Search, or launch something.",
}: CommandPaletteProps) {
  function select(item: SearchResultItem) {
    onSelect(item);
    onOpenChange(false);
  }

  function ask() {
    onAsk?.(query);
    onOpenChange(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <Command shouldFilter={false}>
        <CommandInput placeholder={placeholder} value={query} onValueChange={onQueryChange} />
        <CommandList>
          <SearchResultGroups groups={groups} trimmedQuery={query.trim()} onSelect={select} onAsk={onAsk ? ask : undefined} askLabel={askLabel} />
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

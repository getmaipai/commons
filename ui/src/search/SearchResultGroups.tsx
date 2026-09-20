import { CommandEmpty, CommandGroup, CommandItem } from "@/kit/ui/command";
import { getIcon } from "@/kit/icons";
import type { SearchGroup, SearchResultItem } from "@/kit/search/types";

const AskIcon = getIcon("sparkles");

/** The shared result list a command palette renders inside its own
 * `<Command>`/`<CommandList>`.
 *
 * The "Ask" row (only rendered when `onAsk` is given - not every product
 * has a chat feature to ask) renders FIRST, not last: cmdk auto-
 * highlights whatever renders first, and the acceptance is "Enter with
 * nothing deliberately selected sends the typed text to chat" - a real
 * match rendered first would make a bare Enter open that match instead,
 * a behavior change nothing asked for. Arrowing down to a real result
 * still opens it; Enter with no arrowing asks either way. */
export function SearchResultGroups({
  groups,
  trimmedQuery,
  onSelect,
  onAsk,
  askLabel = "Ask",
}: {
  groups: SearchGroup[];
  trimmedQuery: string;
  onSelect: (item: SearchResultItem) => void;
  onAsk?: () => void;
  askLabel?: string;
}) {
  const hasResults = groups.length > 0;
  return (
    <>
      {!hasResults && trimmedQuery === "" ? (
        <CommandEmpty>{onAsk ? `Type to search, or press Enter to ${askLabel.toLowerCase()}.` : "Type to search."}</CommandEmpty>
      ) : null}
      {/* A real query that matches nothing still needs feedback - without
          onAsk there's no "Ask" row to serve as the "nothing else
          matched" fallback, so this is the only thing that would render. */}
      {!hasResults && trimmedQuery !== "" && !onAsk ? <CommandEmpty>No results.</CommandEmpty> : null}
      {onAsk && trimmedQuery !== "" ? (
        <CommandGroup heading="Ask">
          <CommandItem value="ask" onSelect={onAsk}>
            <AskIcon aria-hidden />
            <span>
              {askLabel}: {trimmedQuery}
            </span>
          </CommandItem>
        </CommandGroup>
      ) : null}
      {groups.map((group) => (
        <CommandGroup key={group.heading} heading={group.heading}>
          {group.items.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <CommandItem key={item.id} value={item.id} onSelect={() => onSelect(item)}>
                <Icon aria-hidden />
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  {item.sublabel ? <span className="text-base text-muted-foreground">{item.sublabel}</span> : null}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      ))}
    </>
  );
}

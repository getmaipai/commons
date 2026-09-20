import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING_INSET, hitArea } from "@/kit/utils";

export interface HeaderSearchFieldProps {
  placeholder: string;
  onOpen: () => void;
}

// The header's search field (spec "Header and search"/"Fixed top
// header"): a raised-panel input with the search icon at the left and
// the ⌘K pill at the right; the palette opens on click, focus or ⌘K
// (the keydown listener is Shell's, this is just the visible trigger).
// Icon-only under the `sm` breakpoint, matching "on the phone the field
// collapses to the header's search icon" - one element, not a second
// icon-button copy for narrow widths. `hitArea(1)` on the phone's 40px
// box (docs/UI.md's 48px touch-target floor - the same step button.tsx's
// own `icon-lg` uses); harmless once `sm:` grows the box well past 48px.
export function HeaderSearchField({ placeholder, onOpen }: HeaderSearchFieldProps) {
  const SearchIcon = getIcon("search");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={placeholder}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-pane)] px-0 text-sm text-muted-foreground hover:bg-[var(--surface-pane)]/80 sm:w-[360px] sm:justify-start sm:px-3",
        FOCUS_RING_INSET,
        hitArea(1),
      )}
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden flex-1 truncate text-left sm:inline">{placeholder}</span>
      {/* Deliberate type-floor exception (docs/UI.md, lane 7 item 3): a
          compact keyboard-shortcut pill, the same category as a badge. */}
      <span className="hidden shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">⌘K</span>
    </button>
  );
}

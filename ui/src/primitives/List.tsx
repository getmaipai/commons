import type { ReactNode } from "react";
import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { cn, FOCUS_RING } from "@/kit/utils";
import { useSurface } from "@/kit/useSurface";

interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  /** The row's contents only. The list owns the row surface, the
   * dividers, the touch target and the focus ring. */
  renderItem: (item: T) => ReactNode;
  /** Given, every row becomes a button. */
  onSelect?: (item: T) => void;
  /** Accessible name for a row, needed when the row's own content has no
   * readable text (an avatar and a status dot, say). */
  getLabel?: (item: T) => string;
  isSelected?: (item: T) => boolean;
  /** A trailing control per row (an overflow menu, a switch). Rendered
   * outside the row button, because a control inside a button is not
   * reachable and not valid HTML. */
  renderAction?: (item: T) => ReactNode;
  /** Optional leading thumbnail for media rows. */
  renderThumb?: (item: T) => ReactNode;
  rowSize?: "default" | "media";
  hover?: "default" | "surface";
  /** Accessible name for the list as a whole. */
  label?: string;
  emptyState?: { icon: string; text: string };
  /** Hairlines between rows. On by default: a list of text rows with no
   * separator reads as one block of prose. */
  dividers?: boolean;
}

/** The far surface's row button (step 7, "every node renders its far
 * profile") - same reasoning as Card.tsx's `TvCardButton`: a plain `<li>`
 * button is invisible to Norigin's spatial map, so a list of rows is
 * otherwise unreachable by the TV remote at all. One instance per row
 * (each row is its own `useFocusable` registration), split out from the
 * plain button the same way Shell.tsx's `NavItem`/`TvNavItem` are -
 * `focused` drives the ring, not `:focus-visible` (`shouldFocusDOMNode`
 * is false, tvNav.ts). */
function TvListRowButton({
  content,
  ariaLabel,
  selected,
  onActivate,
  rowSize,
  hover,
}: {
  content: ReactNode;
  ariaLabel?: string;
  selected: boolean;
  onActivate: () => void;
  rowSize?: "default" | "media";
  hover?: "default" | "surface";
}) {
  const { ref, focused } = useFocusable<HTMLButtonElement>({ onEnterPress: onActivate });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onActivate}
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex min-h-12 min-w-0 flex-1 items-center rounded-[var(--radius)] text-left",
        rowSize === "media" && "h-[76px] min-h-0 rounded-xl",
        hover === "surface" && "rounded-xl",
        hover === "surface" ? "hover:bg-[var(--surface-1)]" : "hover:bg-[var(--muted)]",
        focused && "ring-2 ring-ring",
        selected && (hover === "surface" ? "bg-[var(--surface-2)]" : "bg-[var(--muted)]"),
      )}
    >
      {content}
    </button>
  );
}

// docs/UI.md names List as one of the kit's generic primitives. The
// vertical counterpart to CardGrid, with the same content-agnostic
// shape: items plus a renderer, no knowledge of what is in them. One
// column at every surface by design - a list that reflows into columns
// is a CardGrid, and having exactly one answer per pattern is the point
// of the kit ("patterns: one way to do each thing").
export function List<T>({
  items,
  getKey,
  renderItem,
  onSelect,
  getLabel,
  isSelected,
  renderAction,
  label,
  emptyState,
  dividers = true,
  renderThumb,
  rowSize = "default",
  hover = "default",
}: ListProps<T>) {
  const { far } = useSurface();
  const media = rowSize === "media";

  if (items.length === 0 && emptyState) {
    return <EmptyState icon={emptyState.icon} text={emptyState.text} />;
  }

  return (
    <ul
      aria-label={label}
      className={cn(
        "flex list-none flex-col p-0",
        dividers && !media && "divide-y divide-[var(--border)]",
      )}
    >
      {items.map((item) => {
        const selected = isSelected?.(item) ?? false;
        const content = (
          <div className={cn("flex min-w-0 flex-1 items-center gap-3 px-3 py-2", media && "h-full gap-3 px-0 py-0")}>
            {media && renderThumb ? <div className="size-16 shrink-0 overflow-hidden rounded-[var(--radius-thumb)]">{renderThumb(item)}</div> : null}
            {renderItem(item)}
          </div>
        );
        return (
          <li key={getKey(item)} className={cn("flex min-w-0 items-center gap-1", media && "h-[76px] gap-3")}>
            {onSelect ? (
              far ? (
                <TvListRowButton
                  content={content}
                  ariaLabel={getLabel?.(item)}
                  selected={selected}
                  rowSize={rowSize}
                  hover={hover}
                  onActivate={() => onSelect(item)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-label={getLabel?.(item)}
                  aria-current={selected ? "true" : undefined}
                  // 48px minimum target, visible focus ring: docs/UI.md's
                  // floor, WCAG 2.2 AA 2.5.5 and 2.4.13.
                  className={cn(
                    "flex min-h-12 min-w-0 flex-1 items-center rounded-[var(--radius)] text-left",
                    media && "h-[76px] min-h-0 rounded-xl",
                    hover === "surface" && "rounded-xl",
                    hover === "surface" ? "hover:bg-[var(--surface-1)]" : "hover:bg-[var(--muted)]",
                    FOCUS_RING,
                    selected && (hover === "surface" ? "bg-[var(--surface-2)]" : "bg-[var(--muted)]"),
                  )}
                >
                  {content}
                </button>
              )
            ) : (
              <div className={cn("flex min-h-12 min-w-0 flex-1 items-center", media && "h-[76px] min-h-0 rounded-xl", hover === "surface" && "rounded-xl hover:bg-[var(--surface-1)]", selected && hover === "surface" && "bg-[var(--surface-2)]")}>{content}</div>
            )}
            {renderAction ? <div className={cn("shrink-0 pr-2", media && "flex size-11 items-center justify-center p-0")}>{renderAction(item)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { cardSizeGridTemplateColumns } from "@/kit/primitives/CardSizeSlider";
import { FileTile, type FileTileData, type FileTileLabels } from "@/kit/primitives/FileTile";
import { GRID_COLUMNS, type Density } from "@/kit/responsive";
import { cn } from "@/kit/utils";

export interface FileGridProps {
  items: readonly FileTileData[];
  /** Accessible name for the list of files. */
  label: string;
  /** The ids that are selected. Controlled. Absent, the grid has no selection. */
  selectedIds?: readonly string[];
  /** Called with the next selection, in the order of `items`. Given, tiles get select boxes. */
  onSelectionChange?: (ids: string[]) => void;
  /** Selection mode: select boxes are always shown and pressing a tile toggles it. Also on while anything is selected. */
  selectionMode?: boolean;
  /** Escape was pressed in selection mode. The selection itself is cleared through `onSelectionChange([])`. */
  onExitSelectionMode?: () => void;
  /** A tile was pressed outside selection mode (Enter or a click). */
  onOpen?: (id: string) => void;
  /** Given, tiles get an actions button. The kit owns no menu: open yours here. */
  onActionsClick?: (id: string, event: MouseEvent<HTMLButtonElement>) => void;
  /** Wrap a tile's actions button, e.g. as a menu trigger with `asChild`. */
  wrapActions?: (id: string, button: ReactElement) => ReactElement;
  /** `default` and `compact` are the kit's column budgets. `slider` follows `CardSizeSlider` (set `cardSizeStyle` on a parent). Default `compact`. */
  density?: Density | "slider";
  /** Drawn instead of the list when there are no items. */
  empty?: ReactNode;
  labels?: Partial<FileTileLabels>;
  formatDuration?: (seconds: number) => string;
  maxAvatars?: number;
  className?: string;
}

/** Moves to the nearest tile one row up or down, by where the tiles are drawn. */
function neighbourRow(els: readonly (HTMLElement | undefined)[], from: number, direction: 1 | -1): number {
  const current = els[from];
  if (!current) return from;
  let rowTop: number | null = null;
  let best = from;
  let bestGap = Infinity;
  for (let i = from + direction; i >= 0 && i < els.length; i += direction) {
    const el = els[i];
    if (!el || el.offsetTop === current.offsetTop) continue;
    if (rowTop === null) rowTop = el.offsetTop;
    if (el.offsetTop !== rowTop) break;
    const gap = Math.abs(el.offsetLeft - current.offsetLeft);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  }
  return best;
}

/** A grid of `FileTile`s: one tab stop with arrow-key movement (Home and End too), selection
 * (Shift-click for a range, Ctrl or Command click to toggle, Space, Ctrl or Command A, Escape),
 * and the same lazy-image tiles everywhere. It reads as a list of files to a screen reader. */
export function FileGrid({
  items,
  label,
  selectedIds = [],
  onSelectionChange,
  selectionMode = false,
  onExitSelectionMode,
  onOpen,
  onActionsClick,
  wrapActions,
  density = "compact",
  empty,
  labels,
  formatDuration,
  maxAvatars,
  className,
}: FileGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const anchor = useRef<string | null>(null);
  const cells = useRef(new Map<string, HTMLLIElement>());
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  if (items.length === 0) return <>{empty ?? null}</>;

  const tabId = items.some((item) => item.id === activeId) ? activeId : items[0]!.id;
  const selected = new Set(selectedIds);
  const selectable = Boolean(onSelectionChange);
  const inSelectionMode = selectionMode || selected.size > 0;

  function commit(next: Set<string>) {
    onSelectionChange?.(items.filter((item) => next.has(item.id)).map((item) => item.id));
  }

  function toggle(id: string, range: boolean) {
    if (!onSelectionChange) return;
    const ids = items.map((item) => item.id);
    const next = new Set(selected);
    if (range && anchor.current !== null && ids.includes(anchor.current)) {
      const a = ids.indexOf(anchor.current);
      const b = ids.indexOf(id);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(ids[i]!);
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id;
    }
    commit(next);
  }

  function moveTo(index: number) {
    const target = items[index];
    if (!target) return;
    setActiveId(target.id);
    buttons.current.get(target.id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    if (event.key === "Escape" && (selected.size > 0 || selectionMode)) {
      event.preventDefault();
      anchor.current = null;
      if (selected.size > 0) onSelectionChange?.([]);
      if (selectionMode) onExitSelectionMode?.();
      return;
    }
    if (target.dataset.slot !== "file-tile-main") return;
    const id = target.closest<HTMLElement>("[data-file-id]")?.dataset.fileId;
    const index = items.findIndex((item) => item.id === id);
    if (index < 0 || event.altKey) return;

    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "a" && selectable) {
      event.preventDefault();
      commit(new Set(items.map((item) => item.id)));
      return;
    }
    if (mod) return;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveTo(Math.min(items.length - 1, index + 1));
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveTo(Math.max(0, index - 1));
        break;
      case "ArrowDown":
        event.preventDefault();
        moveTo(neighbourRow(items.map((item) => cells.current.get(item.id)), index, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(neighbourRow(items.map((item) => cells.current.get(item.id)), index, -1));
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(items.length - 1);
        break;
      case " ":
        if (selectable) {
          event.preventDefault();
          toggle(items[index]!.id, event.shiftKey);
        }
        break;
      case "ContextMenu":
        event.preventDefault();
        cells.current.get(items[index]!.id)?.querySelector<HTMLButtonElement>('[data-slot="file-tile-actions"]')?.click();
        break;
      case "F10":
        if (event.shiftKey) {
          event.preventDefault();
          cells.current.get(items[index]!.id)?.querySelector<HTMLButtonElement>('[data-slot="file-tile-actions"]')?.click();
        }
        break;
    }
  }

  return (
    // The listeners on the list only read keys bubbling up from the tile buttons inside it, and
    // Safari drops a list's meaning when `list-none` is set, so the role stays explicit.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-noninteractive-element-interactions
    <ul
      role="list"
      aria-label={label}
      onKeyDown={onKeyDown}
      // A held Space would otherwise press the focused tile button when the key is released.
      onKeyUp={(event) => {
        if (event.key === " " && selectable && (event.target as HTMLElement).dataset.slot === "file-tile-main") event.preventDefault();
      }}
      data-slot="file-grid"
      className={cn("grid list-none gap-3 p-0", density !== "slider" && GRID_COLUMNS[density], className)}
      style={density === "slider" ? { gridTemplateColumns: cardSizeGridTemplateColumns() } : undefined}
    >
      {items.map((item) => (
        <li
          key={item.id}
          data-file-id={item.id}
          ref={(el) => {
            if (el) cells.current.set(item.id, el);
            else cells.current.delete(item.id);
          }}
          // Off-screen tiles skip layout and paint; `auto` remembers the size once drawn.
          className="min-w-0 [contain-intrinsic-size:auto_15rem] [content-visibility:auto]"
        >
          <FileTile
            {...item}
            selected={selected.has(item.id)}
            selectionMode={inSelectionMode}
            onOpen={onOpen ? () => onOpen(item.id) : undefined}
            onToggleSelect={selectable ? (range) => toggle(item.id, range) : undefined}
            onActionsClick={onActionsClick ? (event) => onActionsClick(item.id, event) : undefined}
            wrapActions={wrapActions ? (button) => wrapActions(item.id, button) : undefined}
            labels={labels}
            formatDuration={formatDuration}
            maxAvatars={maxAvatars}
            tabbable={item.id === tabId}
            controlsTabbable={false}
            onTileFocus={() => setActiveId(item.id)}
            buttonRef={(el) => {
              if (el) buttons.current.set(item.id, el);
              else buttons.current.delete(item.id);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

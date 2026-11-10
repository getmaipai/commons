import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Button } from "@/kit/ui/button";
import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING } from "@/kit/utils";
import { StatusCard } from "@/kit/elements/status-card";
import { i18n } from "@/kit/i18n";

/** MEDIA-PARITY-02: reordering for rows and tiles, one definition shared by `MediaShelf` and `TrackRows`.
 * `onReorder` gets the complete new order of keys and a `revert` to call if saving it failed; the list shows the new order
 * at once (optimistic) and keeps it until the caller's rows change (the saved order coming back) or `revert` runs. */
export interface ReorderConfig {
  onReorder: (keys: string[], revert: () => void) => void;
}

/** A copy of `keys` with the key at `from` moved to index `to`. Out-of-range indexes return the same order. */
export function moveKey(keys: readonly string[], from: number, to: number): string[] {
  const next = [...keys];
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [key] = next.splice(from, 1);
  next.splice(to, 0, key!);
  return next;
}

type Axis = "x" | "y";

const GripGlyph = getIcon("grip-vertical");
const UpGlyph = getIcon("chevron-up");
const DownGlyph = getIcon("chevron-down");

/** Where the drop line draws: a bar at the item's start edge when dragging up/back, at its end edge when dragging down/forward. */
const DROP_LINE_Y = "relative data-[dragging=true]:opacity-60 data-[drop=before]:after:absolute data-[drop=before]:after:inset-x-0 data-[drop=before]:after:-top-1.5 data-[drop=before]:after:h-0.5 data-[drop=before]:after:rounded-full data-[drop=before]:after:bg-primary data-[drop=before]:after:content-[''] data-[drop=after]:after:absolute data-[drop=after]:after:inset-x-0 data-[drop=after]:after:-bottom-1.5 data-[drop=after]:after:h-0.5 data-[drop=after]:after:rounded-full data-[drop=after]:after:bg-primary data-[drop=after]:after:content-['']";
const DROP_LINE_X = "relative data-[dragging=true]:opacity-60 data-[drop=before]:after:absolute data-[drop=before]:after:inset-y-0 data-[drop=before]:after:-start-1.5 data-[drop=before]:after:w-0.5 data-[drop=before]:after:rounded-full data-[drop=before]:after:bg-primary data-[drop=before]:after:content-[''] data-[drop=after]:after:absolute data-[drop=after]:after:inset-y-0 data-[drop=after]:after:-end-1.5 data-[drop=after]:after:w-0.5 data-[drop=after]:after:rounded-full data-[drop=after]:after:bg-primary data-[drop=after]:after:content-['']";

export interface ReorderState<T> {
  /** True when a `ReorderConfig` was given. */
  enabled: boolean;
  /** The rows in the order to draw: the caller's order, or the optimistic one after a move. */
  items: readonly T[];
  editing: boolean;
  /** Attach to the element that holds the items (drag finds the item under the pointer inside it). */
  containerRef: RefObject<HTMLElement | null>;
  /** Spread onto each item's element, with `className` merged in. */
  itemProps: (index: number) => Record<string, string | undefined> & { className: string };
  /** The grip: a pointer drag, plus the arrow keys. */
  handle: (index: number, name: string) => ReactNode;
  /** Move up and Move down icon buttons, shown only in edit mode. */
  moveButtons: (index: number, name: string) => ReactNode;
  /** The quiet Reorder / Done button that turns edit mode on and off. */
  toggle: ReactNode;
}

/** Reorder state for one list. Pass `config` undefined and nothing is enabled (every part draws null). */
export function useReorder<T>(items: readonly T[], getKey: (item: T) => string, config: ReorderConfig | undefined, axis: Axis = "y"): ReorderState<T> {
  const [editing, setEditing] = useState(false);
  const [override, setOverride] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const signature = items.map(getKey).join("\u0000");
  // The caller's rows changed (the saved order came back, or a refresh): the optimistic order has done its job.
  useEffect(() => { setOverride(null); }, [signature]);
  const ordered = useMemo(() => {
    if (!override) return items;
    const byKey = new Map(items.map((item) => [getKey(item), item]));
    if (override.length !== items.length || override.some((key) => !byKey.has(key))) return items;
    return override.map((key) => byKey.get(key)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getKey is a fresh closure each render; the signature is the change signal
  }, [override, items, signature]);

  const enabled = config !== undefined;
  const count = ordered.length;

  function move(from: number, to: number) {
    if (!config || from === to || from < 0 || to < 0 || from >= count || to >= count) return;
    const next = moveKey(ordered.map(getKey), from, to);
    setOverride(next);
    config.onReorder(next, () => setOverride(null));
  }

  function indexAt(x: number, y: number, fallback: number): number {
    const nodes = containerRef.current?.querySelectorAll<HTMLElement>("[data-reorder-item]");
    if (!nodes || nodes.length === 0) return fallback;
    let best = fallback;
    let bestDistance = Infinity;
    for (let i = 0; i < nodes.length; i += 1) {
      const rect = nodes[i]!.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    }
    return best;
  }

  if (!enabled) {
    return { enabled, items, editing: false, containerRef, itemProps: () => ({ className: "" }), handle: () => null, moveButtons: () => null, toggle: null };
  }

  return {
    enabled,
    items: ordered,
    editing,
    containerRef,
    itemProps: (index) => ({
      "data-reorder-item": "",
      "data-dragging": drag?.from === index ? "true" : undefined,
      "data-drop": drag && drag.over === index && drag.over !== drag.from ? (drag.over < drag.from ? "before" : "after") : undefined,
      className: axis === "x" ? DROP_LINE_X : DROP_LINE_Y,
    }),
    handle: (index, name) => (
      <button
        type="button"
        data-slot="reorder-handle"
        aria-label={i18n._({ id: "ui.Drag {name} to reorder", message: "Drag {name} to reorder", values: { name } })}
        className={cn("flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing", FOCUS_RING)}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not every environment can capture */ }
          setDrag({ from: index, over: index });
        }}
        onPointerMove={(e: PointerEvent<HTMLButtonElement>) => {
          if (!drag || drag.from !== index) return;
          const over = indexAt(e.clientX, e.clientY, drag.over);
          if (over !== drag.over) setDrag({ from: index, over });
        }}
        onPointerUp={() => {
          const d = drag;
          setDrag(null);
          if (d && d.from === index && d.over !== d.from) move(d.from, d.over);
        }}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
          const forward = axis === "x" ? "ArrowRight" : "ArrowDown";
          if (e.key === back || e.key === "ArrowUp") { e.preventDefault(); move(index, index - 1); }
          else if (e.key === forward || e.key === "ArrowDown") { e.preventDefault(); move(index, index + 1); }
        }}
      >
        <GripGlyph aria-hidden className="size-4" />
      </button>
    ),
    moveButtons: (index, name) => (editing ? (
      <span data-slot="reorder-move" className="flex shrink-0 items-center">
        <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} aria-label={i18n._({ id: "ui.Move {name} up", message: "Move {name} up", values: { name } })} onClick={() => move(index, index - 1)}>
          <UpGlyph aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={index === count - 1} aria-label={i18n._({ id: "ui.Move {name} down", message: "Move {name} down", values: { name } })} onClick={() => move(index, index + 1)}>
          <DownGlyph aria-hidden />
        </Button>
      </span>
    ) : null),
    toggle: (
      <div data-slot="reorder-toggle" className="flex min-w-0 justify-end">
        <Button type="button" variant="ghost" size="sm" aria-pressed={editing} className="text-muted-foreground" onClick={() => setEditing((v) => !v)}>
          {editing ? i18n._({ id: "ui.Done", message: "Done" }) : i18n._({ id: "ui.Reorder", message: "Reorder" })}
        </Button>
      </div>
    ),
  };
}

/** The status card a failed reorder shows in place (the old order is already back). */
export function ReorderFailure({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <StatusCard
      kind="problem"
      title={i18n._({ id: "ui.Could not save the new order.", message: "Could not save the new order." })}
      line={message}
      action={{ label: i18n._({ id: "ui.Dismiss", message: "Dismiss" }), onSelect: onDismiss, tone: "quiet" }}
    />
  );
}

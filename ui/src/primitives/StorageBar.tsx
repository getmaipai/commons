import { formatBytes as defaultFormatBytes } from "@/kit/format";
import { cn } from "@/kit/utils";

export interface StorageBarSegment {
  id: string;
  /** The kind's name in the caller's words: "Pictures", "Videos". */
  label: string;
  /** Size in bytes. A negative or non-finite number counts as 0. */
  bytes: number;
  /** A `--hue-*` CSS var name, e.g. `"--hue-teal"`. Absent, the kit palette below picks one by position. */
  hue?: string;
}

export interface StorageBarSummaryParts {
  kinds: readonly { label: string; size: string }[];
  used: string;
  /** Null when the bar has no capacity. */
  capacity: string | null;
}

export interface StorageBarLabels {
  /** The one sentence a screen reader hears for the whole bar. */
  summary: (parts: StorageBarSummaryParts) => string;
  /** The legend entry for the room left, shown when `capacityBytes` is given. */
  free: string;
}

export const DEFAULT_STORAGE_BAR_LABELS: StorageBarLabels = {
  summary: ({ kinds, used, capacity }) => {
    if (kinds.length === 0) return capacity ? `Nothing is stored yet. ${capacity} is available.` : "Nothing is stored yet.";
    const list = kinds.map((kind) => `${kind.label} ${kind.size}`).join(", ");
    return `Storage used: ${list}. ${used} in total${capacity ? ` of ${capacity}` : ""}.`;
  },
  free: "Free",
};

export interface StorageBarProps {
  segments: readonly StorageBarSegment[];
  /** Given, the bar is drawn against this size and the unused part stays empty. Absent, the segments fill the bar. */
  capacityBytes?: number | null;
  /** Defaults to the kit's `formatBytes`. */
  formatBytes?: (bytes: number) => string;
  labels?: Partial<StorageBarLabels>;
  className?: string;
}

// The kit's chart tokens (`--chart-1..5`) are five greys and a near-black in
// both themes, which cannot tell five kinds apart (and the last one vanishes
// on the dark surface), so the bar draws with the themed hue tokens IconTile
// already uses. Brand blue is left out: it is 2.6:1 on the light card. Each
// hue here clears 3:1 against the card surface in both themes (contrast.test.ts).
export const STORAGE_BAR_HUES = ["--hue-violet", "--hue-orange", "--hue-teal", "--hue-pink", "--hue-yellow"] as const;

// A segment with bytes keeps at least this much width, so a tiny kind is still
// a visible sliver. The legend lists every segment either way.
const MIN_SEGMENT_WIDTH = "0.375rem";

function safeBytes(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** A proportional bar of what is stored, one segment per kind, with a legend.
 * Not interactive: a screen reader hears one sentence naming each kind, its
 * size and the total. It takes numbers and words and knows nothing about files. */
export function StorageBar({ segments, capacityBytes, formatBytes = defaultFormatBytes, labels, className }: StorageBarProps) {
  const copy: StorageBarLabels = { ...DEFAULT_STORAGE_BAR_LABELS, ...labels };
  const rows = segments.map((segment, index) => ({
    ...segment,
    bytes: safeBytes(segment.bytes),
    hue: segment.hue ?? STORAGE_BAR_HUES[index % STORAGE_BAR_HUES.length]!,
  }));
  const used = rows.reduce((sum, row) => sum + row.bytes, 0);
  const capacity = capacityBytes !== undefined && capacityBytes !== null && Number.isFinite(capacityBytes) && capacityBytes > 0 ? capacityBytes : null;
  const scale = capacity === null ? used : Math.max(capacity, used);
  const free = capacity === null ? 0 : Math.max(0, capacity - used);

  const summary = copy.summary({
    kinds: used === 0 ? [] : rows.map((row) => ({ label: row.label, size: formatBytes(row.bytes) })),
    used: formatBytes(used),
    capacity: capacity === null ? null : formatBytes(capacity),
  });

  return (
    <div role="img" aria-label={summary} data-slot="storage-bar" className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {scale > 0
          ? rows
              .filter((row) => row.bytes > 0)
              .map((row) => (
                <span
                  key={row.id}
                  data-slot="storage-bar-segment"
                  className="h-full shrink rounded-full"
                  style={{ flexBasis: `${(row.bytes / scale) * 100}%`, minWidth: MIN_SEGMENT_WIDTH, backgroundColor: `var(${row.hue})` }}
                />
              ))
          : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-base">
        {rows.map((row) => (
          <li key={row.id} data-slot="storage-bar-legend-item" className="flex items-center gap-2">
            <span data-slot="storage-bar-swatch" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: `var(${row.hue})` }} />
            <span>{row.label}</span>
            <span className="text-muted-foreground">{formatBytes(row.bytes)}</span>
          </li>
        ))}
        {capacity !== null ? (
          <li data-slot="storage-bar-legend-item" className="flex items-center gap-2">
            <span data-slot="storage-bar-free-swatch" className="size-3 shrink-0 rounded-sm border border-border bg-muted" />
            <span>{copy.free}</span>
            <span className="text-muted-foreground">{formatBytes(free)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

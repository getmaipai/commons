import type { CSSProperties, ReactNode } from "react";
import { Card } from "@/kit/primitives/Card";
import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING } from "@/kit/utils";
import { useSurface } from "@/kit/useSurface";

// MUSIC-KIT-01: the page blocks of the modern music look (Listen now, Search, Album). Each one is built from the kit's
// own Card, tokens and icons; none repeats a MediaShelf job (a rail or grid of art tiles is MediaShelf). A caller passes
// data and render slots, never classes. Motion is gated with motion-safe:, so reduced motion gets none.

const PlayGlyph = getIcon("play");
const PRESS = "motion-safe:transition-[transform,opacity] motion-safe:active:scale-[var(--media-press-scale)]";

/** The round Play button used over art. A sibling of the tile's button, never inside it. */
function RoundPlay({ label, onPlay, className }: { label: string; onPlay: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-slot="music-play"
      onClick={onPlay}
      className={cn(
        "flex size-[var(--media-play-size)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md",
        FOCUS_RING,
        className,
      )}
    >
      <PlayGlyph aria-hidden className="size-5" />
    </button>
  );
}

// ---- Quick tiles ----------------------------------------------------------------------------------------------

export interface QuickTilesProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  getTitle: (item: T) => string;
  /** The small square art at the tile's start. The block gives it a fixed box; the caller fills it. */
  renderArt: (item: T) => ReactNode;
  onSelect?: (item: T) => void;
  /** Draws a round Play button at the tile's end on hover or focus (never on touch screens). */
  onPlay?: (item: T) => void;
  getPlayLabel?: (item: T) => string;
  /** Accessible name of the group ("Pick up where you left off"). */
  label: string;
  /** At most this many tiles are drawn. Default 6. */
  max?: number;
}

/** Listen now's "Pick up where you left off": a two-column (three from 768 px) grid of compact tiles, art beside a title. */
export function QuickTiles<T>({ items, getKey, getTitle, renderArt, onSelect, onPlay, getPlayLabel, label, max = 6 }: QuickTilesProps<T>) {
  const { far } = useSurface();
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} data-slot="quick-tiles" className="grid min-w-0 list-none grid-cols-2 gap-2 p-0 md:grid-cols-3">
      {items.slice(0, max).map((item) => (
        <li key={getKey(item)} className="group/tile relative min-w-0">
          <Card onSelect={onSelect ? () => onSelect(item) : undefined} label={getTitle(item)} far={far} className={cn("flex items-center gap-3 rounded-[var(--media-card-radius)] bg-muted/60", PRESS)}>
            <span className="size-12 shrink-0 overflow-hidden bg-muted [&>*]:size-full" data-slot="quick-tile-art">{renderArt(item)}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{getTitle(item)}</span>
          </Card>
          {onPlay ? (
            <RoundPlay
              label={getPlayLabel?.(item) ?? `Play ${getTitle(item)}`}
              onPlay={() => onPlay(item)}
              className="absolute end-2 top-1/2 size-9 -translate-y-1/2 opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100 motion-safe:transition-opacity [@media(hover:none)]:hidden"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// ---- Top result card ------------------------------------------------------------------------------------------

export interface TopResultCardProps {
  title: string;
  /** The small line above the title ("Artist", "Album"). */
  eyebrow?: string;
  /** One quiet line under the title. */
  subtitle?: string;
  /** The art, filled into a 6 rem box (round when `circle`). */
  art?: ReactNode;
  circle?: boolean;
  onSelect?: () => void;
  /** A round Play button at the card's end, always visible (a Top result is the thing to play). */
  onPlay?: () => void;
  playLabel?: string;
}

/** Search's Top result: a large card with the art, the name and a Play button. */
export function TopResultCard({ title, eyebrow, subtitle, art, circle = false, onSelect, onPlay, playLabel }: TopResultCardProps) {
  const { far } = useSurface();
  return (
    <div className="relative min-w-0" data-slot="top-result">
      <Card onSelect={onSelect} label={onSelect ? title : undefined} far={far} className={cn("flex items-center gap-4 rounded-[var(--radius-card)] p-4 pe-20", PRESS)}>
        {art ? <span className={cn("size-24 shrink-0 overflow-hidden bg-muted [&>*]:size-full", circle ? "rounded-full" : "rounded-[var(--media-card-radius)]")} data-slot="top-result-art">{art}</span> : null}
        <span className="min-w-0 flex-1">
          {eyebrow ? <span className="text-muted-foreground block text-xs font-semibold uppercase tracking-wide">{eyebrow}</span> : null}
          <span className="block truncate text-2xl font-bold tracking-tight">{title}</span>
          {subtitle ? <span className="text-muted-foreground block truncate text-sm">{subtitle}</span> : null}
        </span>
      </Card>
      {onPlay ? <RoundPlay label={playLabel ?? `Play ${title}`} onPlay={onPlay} className="absolute end-4 top-1/2 -translate-y-1/2" /> : null}
    </div>
  );
}

// ---- Category tiles -------------------------------------------------------------------------------------------

export interface CategoryTileItem {
  id: string;
  title: string;
  /** Any CSS color. The tile mixes it into the card color so the title keeps its contrast in light and dark. */
  color?: string;
  /** Optional art tucked into the tile's bottom-end corner. */
  art?: ReactNode;
}

export interface CategoryTilesProps {
  items: readonly CategoryTileItem[];
  onSelect?: (item: CategoryTileItem) => void;
  label: string;
}

/** Search's empty state: colour tiles for genre, mood, decade and "Made here". */
export function CategoryTiles({ items, onSelect, label }: CategoryTilesProps) {
  const { far } = useSurface();
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} data-slot="category-tiles" className="grid min-w-0 list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="min-w-0" style={item.color ? ({ "--tile-color": item.color } as CSSProperties) : undefined}>
          <Card
            onSelect={onSelect ? () => onSelect(item) : undefined}
            label={item.title}
            far={far}
            className={cn("relative aspect-[16/9] rounded-[var(--media-card-radius)] border-0 bg-[color-mix(in_srgb,var(--tile-color,var(--muted))_58%,var(--card))]", PRESS)}
          >
            <span className="contents">
              <span className="absolute start-3 top-3 text-base font-bold text-[var(--art-foreground)]">{item.title}</span>
              {item.art ? <span className="absolute -end-2 -bottom-2 size-14 rotate-12 overflow-hidden rounded-md shadow-md [&>*]:size-full" data-slot="category-tile-art">{item.art}</span> : null}
            </span>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ---- Track rows -----------------------------------------------------------------------------------------------

export interface TrackRowsProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string | undefined;
  /** The number at the row's start. Defaults to the 1-based position. */
  getNumber?: (item: T, index: number) => ReactNode;
  /** The end label (a running time, or a play count the caller leaves out for a child profile). */
  getMeta?: (item: T) => ReactNode;
  /** A heading drawn before the first row of each run of equal values (a disc: "Disc 2"). */
  getGroup?: (item: T) => string | undefined;
  /** The row that is playing: its number becomes a small bars mark and its title takes the accent color. */
  isPlaying?: (item: T) => boolean;
  /** Pressing the number, or the row, plays it. On hover or focus the number turns into a play icon. */
  onPlay: (item: T) => void;
  getPlayLabel?: (item: T) => string;
  /** MUSIC-POLISH-01: quiet icon buttons at the row's end (a Remove x), drawn faint until the row is hovered or focused. */
  renderActions?: (item: T) => ReactNode;
  /** Accessible name of the list. */
  label: string;
}

/** Album and Playlist tracklists: number, title and artist, end label; hover turns the number into a play icon. */
export function TrackRows<T>({ items, getKey, getTitle, getSubtitle, getNumber, getMeta, getGroup, isPlaying, onPlay, getPlayLabel, renderActions, label }: TrackRowsProps<T>) {
  if (items.length === 0) return null;
  return (
    <ol aria-label={label} data-slot="track-rows" className="m-0 flex min-w-0 list-none flex-col p-0">
      {items.map((item, i) => {
        const group = getGroup?.(item);
        const showGroup = group !== undefined && (i === 0 || group !== getGroup?.(items[i - 1] as T));
        const playing = isPlaying?.(item) ?? false;
        const name = getPlayLabel?.(item) ?? `Play ${getTitle(item)}`;
        const subtitle = getSubtitle?.(item);
        return (
          <li key={getKey(item)} aria-current={playing ? "true" : undefined} className="min-w-0">
            {showGroup ? <p role="heading" aria-level={3} className="text-muted-foreground px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide">{group}</p> : null}
            <div data-slot="track-row" className="group/row hover:bg-muted/60 flex min-h-12 min-w-0 items-center gap-3 rounded-[var(--media-card-radius)] px-3 py-1">
              <button
                type="button"
                aria-label={name}
                onClick={() => onPlay(item)}
                className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-md text-sm tabular-nums text-muted-foreground", FOCUS_RING)}
              >
                <span aria-hidden data-slot="track-number" className={cn("group-hover/row:opacity-0 group-focus-within/row:opacity-0", playing && "text-[var(--progress-accent)]")}>{playing ? <PlayGlyph className="size-4" /> : (getNumber?.(item, i) ?? i + 1)}</span>
                <PlayGlyph aria-hidden data-slot="track-play" className="absolute size-4 text-foreground opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100" />
              </button>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-semibold", playing && "text-[var(--progress-accent)]")}>{getTitle(item)}</span>
                {subtitle ? <span className="text-muted-foreground block truncate text-xs">{subtitle}</span> : null}
              </span>
              {getMeta ? <span data-slot="track-meta" className="text-muted-foreground shrink-0 text-sm tabular-nums">{getMeta(item)}</span> : null}
              {renderActions ? <span data-slot="track-actions" className="flex shrink-0 items-center opacity-60 group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-within:opacity-100">{renderActions(item)}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

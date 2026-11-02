import type { ReactNode } from "react";
import { Card } from "@/kit/primitives/Card";
import { Button } from "@/kit/ui/button";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { Section } from "@/kit/primitives/Section";
import { GRID_COLUMNS, SHELF_ITEM_WIDTH, type Density } from "@/kit/responsive";
import { getIcon } from "@/kit/icons";
import { DayDivider } from "@/kit/elements/day-separator";
import { CardSizeSlider, cardSizeStyle } from "@/kit/primitives/CardSizeSlider";
import { cn, FOCUS_RING } from "@/kit/utils";
import { useSurface } from "@/kit/useSurface";
import { LockTile, collapseLocked } from "@/kit/elements/adult-lock";

/** The aspect ratios the kit will draw a media tile at. A closed set,
 * not a free string: docs/UI.md requires images and video to be fluid
 * "with declared aspect ratios", and a declared ratio is only useful if
 * every shelf in the product draws from the same short list. */
export type MediaAspect = "wide" | "square" | "poster";

const ASPECT_CLASSES: Record<MediaAspect, string> = {
  wide: "aspect-video",
  square: "aspect-square",
  poster: "aspect-[2/3]",
};

interface MediaShelfProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  /** The media itself (an image, a poster, a video still). The shelf
   * gives it a fluid box at the declared aspect ratio; the caller fills
   * that box and never sets a width or a height. */
  renderItem: (item: T) => ReactNode;
  /** Optional text under the tile, outside the aspect box, so a title
   * that wraps to two lines cannot crop the artwork. */
  renderCaption?: (item: T) => ReactNode;
  aspect?: MediaAspect;
  onSelect?: (item: T) => void;
  getLabel?: (item: T) => string;
  isSelected?: (item: T) => boolean;
  /** Compact uses the smaller rail-card budget, or 72 px artwork and two
   * caption lines in vertical rows, with renderMeta trailing the row. */
  density?: Density;
  heading?: string;
  /** Accessible name for the rail. Falls back to `heading`. */
  label?: string;
  emptyState?: { icon: string; text: string };
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** MEDIA-PLAYER-01: how much of the item was played, 0 to 1. A bar along
   * the tile's bottom edge; nothing is drawn for undefined, 0 or less. */
  getProgress?: (item: T) => number | undefined;
  /** MEDIA-PLAYER-01: a badge pinned to the tile's top-start corner (where a
   * copy lives: "Saved", "On this phone", "Not saved"). The caller passes a
   * kit `Badge`. */
  renderBadge?: (item: T) => ReactNode;
  /** MEDIA-PLAYER-01: a small label pinned to the tile's bottom-end corner
   * (a running time such as "18:42"). */
  renderMeta?: (item: T) => ReactNode;
  /** MEDIA-POLISH-01: `card` (the default) draws the shelf inside a bordered
   * section card; `plain` is a frameless row: the heading with an optional
   * See all link, then the tiles (the media apps' and News' rows). */
  variant?: "card" | "plain";
  /** MEDIA-POLISH-01: `horizontal` (the default) is the sideways rail;
   * `vertical` stacks the tiles as rows with the caption beside the picture
   * (Up next beside a player). */
  orientation?: "horizontal" | "vertical";
  /** Grid wraps the existing card-size budget, with two columns on phones.
   * Vertical orientation takes precedence over layout. */
  layout?: "rail" | "grid";
  /** Circle art is always square before clipping, including its current ring. */
  artShape?: "default" | "circle";
  /** Current/next-up state, independent of selection. */
  isHighlighted?: (item: T) => boolean;
  /** Optional leading track number for vertical rows. */
  renderIndex?: (item: T) => ReactNode;
  /** Row controls outside the artwork button. Schema shelves offer up to two. */
  renderActions?: (item: T) => ReactNode;
  /** MEDIA-POLISH-01: with no items, draw nothing at all (no heading, no
   * empty state): a row with nothing in it is simply absent. */
  hideWhenEmpty?: boolean;
  /** MEDIA-POLISH-01: a link beside the heading ("See all"). */
  seeAll?: { label: string; onSelect: () => void };
  /** MUSIC-KIT-01: `tight` draws the art with the 8 px `--media-card-radius` instead of the card radius. Default `default`. */
  cardRadius?: "default" | "tight";
  /** MUSIC-KIT-01: a pressed tile shrinks to `--media-press-scale` (0.98). Not applied under reduced motion. Default off. */
  pressScale?: boolean;
  /** MUSIC-KIT-01: draws a round Play button. On a rail or grid tile it slides up over the art's bottom-end corner on
   * hover or keyboard focus (never on touch screens, where the tile itself opens). In vertical rows that have
   * `renderIndex`, the number turns into a play icon on hover or focus. The button is a sibling of the tile's button,
   * never inside it. Absent, nothing is drawn. */
  onPlay?: (item: T) => void;
  /** MUSIC-KIT-01: the accessible name of the Play button, per item (for example "Play Lanterns"). Falls back to `getLabel`, then "Play". */
  getPlayLabel?: (item: T) => string;
  /** VIDEO-UI-05: day groups. Grid layout only (ignored elsewhere). Consecutive items with the same `getKey` form a group, in the
   * order given; each group opens with the kit `DayDivider` (a centred label between hairlines) and is its own list, named
   * "<shelf name>, <label>". `label(key, count)` is the heading ("Today, 5 clips"). Absent: one ungrouped grid. */
  groupBy?: { getKey: (item: T) => string; label: (key: string, count: number) => string };
  /** VIDEO-UI-05: draws the kit `CardSizeSlider` above a grid layout and sets the tile size through the shared
   * `--maipai-card-size`. The caller holds the size (`useCardSize`). A phone keeps two columns and hides the slider. */
  sizeControl?: { size: number; onChange: (next: number) => void; label?: string };
  /** VIDEO-UI-05: a heart toggle pinned to each tile's top-end corner, a sibling of the tile's button. `isOn` draws it filled
   * and sets `aria-pressed`; `label` is the accessible name, per item ("Favorite Sunset over the bay"). */
  favorite?: { isOn: (item: T) => boolean; onToggle: (item: T) => void; label: (item: T) => string };
  /** ADULT-LOCK-01: marks an item as locked. Every locked item is dropped before anything else is read from it (no key, label,
   * caption or picture) and the whole shelf shows ONE identical lock tile after the open items, whatever their number. Pressing
   * the tile opens the page's passcode dialog (`AdultLockProvider`) or calls `onUnlock`. Absent: nothing is locked. */
  isLocked?: (item: T) => boolean;
  /** ADULT-LOCK-01: true for a locked item that is still being made; the one tile then shows a spinner. */
  isMaking?: (item: T) => boolean;
  onUnlock?: () => void;
}

function clampProgress(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, value);
}

// docs/UI.md names MediaShelf as a kit primitive, and docs/BACKLOG.md
// names the failure it exists to prevent: legacy shipped separate
// VideosRail, MusicRail, PodcastRail and NewsLayout components for what
// should be one shared component. This is that one component - a
// horizontally scrolling rail of media tiles, content-agnostic, sized by
// the kit's density budget (@/kit/responsive) rather than by its caller.
//
// The far surface's remote-arrow-key reachability (step 7, "every node
// renders its far profile") lives entirely in Card.tsx now, not here:
// every tile below is a Card, so it inherits Card's own `useFocusable`
// registration and focus ring for free the moment Card added them - a
// tile drawn any other way would be invisible to Norigin's spatial map
// (a plain, unregistered DOM button is not, however focusable it looks
// to a keyboard).
export function MediaShelf<T>({
  items: allItems,
  getKey,
  renderItem,
  renderCaption,
  aspect = "wide",
  onSelect,
  getLabel,
  isSelected,
  density = "default",
  heading,
  label,
  emptyState,
  emptyActionLabel,
  onEmptyAction,
  getProgress,
  renderBadge,
  renderMeta,
  variant = "card",
  orientation = "horizontal",
  layout = "rail",
  artShape = "default",
  isHighlighted,
  renderIndex,
  renderActions,
  hideWhenEmpty = false,
  seeAll,
  cardRadius = "default",
  pressScale = false,
  onPlay,
  getPlayLabel,
  groupBy,
  sizeControl,
  favorite,
  isLocked,
  isMaking,
  onUnlock,
}: MediaShelfProps<T>) {
  const { open: items, hasLocked, making } = isLocked ? collapseLocked(allItems, isLocked, isMaking) : { open: allItems, hasLocked: false, making: false };
  const name = label ?? heading;
  // One identical tile for any number of locked items, in the shelf's own media box (a row in vertical lists).
  const lockTile = (shape: "fill" | "row") => <LockTile shape={shape} making={making} onUnlock={onUnlock} />;
  const { far } = useSurface();
  // A plain shelf is a section of the page with its own heading row; a card shelf is the kit Section card.
  const Frame = variant === "plain" ? PlainShelfFrame : CardShelfFrame;
  const circle = artShape === "circle";
  const tight = cardRadius === "tight";
  const artClasses = cn(
    "relative w-full overflow-hidden bg-[var(--muted)]",
    circle ? ["aspect-square rounded-full", orientation === "vertical" ? "" : "mx-auto w-[var(--media-artist-size)] max-w-full"] : [tight ? "rounded-[var(--media-card-radius)]" : "rounded-[var(--radius)]", ASPECT_CLASSES[aspect]],
  );
  // The Card surface has its own radius; a tight tile clips to the same 8 px so the art and its frame agree.
  const tileClasses = cn(tight && !circle && "rounded-[var(--media-card-radius)]", pressScale && PRESS_CLASSES);
  const playName = (item: T) => getPlayLabel?.(item) ?? getLabel?.(item) ?? "Play";
  const currentClasses = "ring-2 ring-[var(--media-current-ring)] ring-offset-2 ring-offset-background";
  // Use the existing card budgets, overriding only the phone count. The
  // plain budget fits three/four whole cards instead of peeking the next.
  const gridColumns = circle
    ? "grid-cols-[repeat(auto-fill,minmax(var(--media-artist-size),1fr))]"
    : sizeControl && layout === "grid" ? SIZED_COLUMNS
    : variant === "plain" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : cn(GRID_COLUMNS[density], "grid-cols-2");

  if (items.length === 0 && !hasLocked && hideWhenEmpty) return null;

  if (items.length === 0 && !hasLocked && emptyState) {
    return (
      <Frame heading={heading} seeAll={seeAll}>
        <EmptyState icon={emptyState.icon} text={emptyState.text} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
      </Frame>
    );
  }

  if (orientation === "vertical") {
    return (
      <Frame heading={heading} seeAll={seeAll}>
        <ul aria-label={name} className="flex min-w-0 list-none flex-col gap-3 p-0" data-slot="media-shelf" data-orientation="vertical" data-density={density}>
          {items.map((item) => (
            <li
              key={getKey(item)}
              aria-current={isHighlighted?.(item) ? "true" : undefined}
              className={cn("group/row flex min-w-0 items-start gap-3", density === "compact" && "items-center")}
            >
              {renderIndex ? (
                <span data-slot="media-shelf-index" className="group/index relative w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {onPlay ? (
                    <>
                      <span aria-hidden className="transition-opacity group-hover/row:opacity-0 group-focus-within/index:opacity-0">{renderIndex(item)}</span>
                      <button
                        type="button"
                        aria-label={playName(item)}
                        data-slot="media-shelf-index-play"
                        onClick={() => onPlay(item)}
                        className={cn("absolute inset-0 flex items-center justify-end text-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100", FOCUS_RING)}
                      >
                        <PlayGlyph className="size-4" />
                      </button>
                    </>
                  ) : renderIndex(item)}
                </span>
              ) : null}
              <Card
                onSelect={onSelect ? () => onSelect(item) : undefined}
                label={getLabel?.(item)}
                selected={isSelected?.(item)}
                far={far}
                className={cn(
                  "w-2/5 max-w-40 shrink-0 border-0 bg-transparent",
                  density === "compact" && "w-[72px]",
                  tileClasses,
                  circle && "rounded-full",
                  isSelected?.(item) && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  isHighlighted?.(item) && currentClasses,
                )}
              >
                <div className={cn(artClasses, density === "compact" && !circle && "rounded-[var(--media-compact-radius)]")}>
                  {renderItem(item)}
                  <MediaTileOverlay
                    progress={clampProgress(getProgress?.(item))}
                    badge={renderBadge?.(item)}
                    meta={density === "compact" ? undefined : renderMeta?.(item)}
                  />
                </div>
              </Card>
              {renderCaption || renderActions ? (
                <div className="min-w-0 flex-1 text-sm text-[var(--foreground)]">
                  {renderCaption ? <div className={density === "compact" ? "line-clamp-2" : undefined}>{renderCaption(item)}</div> : null}
                  {renderActions ? <div data-slot="media-shelf-row-actions" className="mt-2 flex flex-wrap items-center gap-2">{renderActions(item)}</div> : null}
                </div>
              ) : null}
              {density === "compact" && renderMeta ? (
                <span data-slot="media-shelf-duration" className="shrink-0 text-sm tabular-nums text-muted-foreground">{renderMeta(item)}</span>
              ) : null}
            </li>
          ))}
          {hasLocked ? <li key="locked" data-slot="media-shelf-locked" className="flex min-w-0">{lockTile("row")}</li> : null}
        </ul>
      </Frame>
    );
  }

  const lockLi = (
    <li
      key="locked"
      data-slot="media-shelf-locked"
      className={cn("flex flex-col gap-2", layout === "grid" ? "min-w-0" : ["shrink-0 snap-start", circle ? "w-[var(--media-artist-size)]" : variant === "plain" ? (density === "compact" ? PLAIN_ITEM_WIDTH_COMPACT : PLAIN_ITEM_WIDTH) : SHELF_ITEM_WIDTH[density]])}
    >
      <div className={cn(artClasses, "bg-transparent")}>{lockTile("fill")}</div>
    </li>
  );

  // One tile list: the whole shelf, or one day's group.
  const renderList = (listItems: readonly T[], listName: string | undefined, withLock = false) => (
    <ul
      data-slot="media-shelf"
      data-variant={variant}
      data-layout={layout}
      aria-label={listName}
      // A scrollable region has to be reachable by keyboard (WCAG 2.2
      // AA, 2.1.1). When the tiles are buttons, tabbing through them
      // scrolls the rail already; when they are not, the rail itself
      // is the only thing left to focus, so it takes the tab stop.
      tabIndex={onSelect || layout === "grid" ? undefined : 0}
      // The padding is not decoration: `overflow-x-auto` computes
      // `overflow-y` to `auto` too, so the rail clips on both axes, and
      // a tile's focus ring (2px ring, 2px offset) would be shaved off
      // at the top edge and on the leading tile without room to draw
      // in. Found in a code review, 2026-09-05. The same underlying
      // quirk collapsed this `<ul>`'s OWN height to zero for a
      // different flex item elsewhere (HomePage.tsx's `WhoIsHere`,
      // fixed 2026-09-13 with `min-h-16 shrink-0`) - unverified here
      // whether this rail needs the same treatment where it's mounted
      // inside a `flex-col` ancestor (a schema page's `media_shelf`
      // node, via NodeRenderer.tsx); `scripts/screenshot.ts`'s
      // `clippedStrips` check (added the same commit as that fix)
      // covers every `.overflow-x-auto` element on every captured
      // route, this one included, so a real instance would be caught
      // there rather than fixed blind here.
      className={cn(
        layout === "grid"
          ? ["grid min-w-0 list-none gap-3 p-1.5", gridColumns]
          : ["flex min-w-0 list-none snap-x snap-mandatory gap-3 overflow-x-auto p-1.5", variant === "plain" && "[scrollbar-width:none]"],
        FOCUS_RING,
      )}
    >
      {listItems.map((item) => (
        <li
          key={getKey(item)}
          aria-current={isHighlighted?.(item) ? "true" : undefined}
          className={cn("flex flex-col gap-2", circle && "items-center text-center", layout === "grid" ? "min-w-0" : ["shrink-0 snap-start", circle ? "w-[var(--media-artist-size)]" : variant === "plain" ? (density === "compact" ? PLAIN_ITEM_WIDTH_COMPACT : PLAIN_ITEM_WIDTH) : SHELF_ITEM_WIDTH[density]])}
        >
          <TileFrame
            onPlay={onPlay ? () => onPlay(item) : undefined}
            playLabel={playName(item)}
            favorite={favorite ? { on: favorite.isOn(item), label: favorite.label(item), onToggle: () => favorite.onToggle(item) } : undefined}
          >
          <Card
            onSelect={onSelect ? () => onSelect(item) : undefined}
            label={getLabel?.(item)}
            selected={isSelected?.(item)}
            far={far}
            className={cn(
              "border-0 bg-transparent",
              tileClasses,
              circle && "rounded-full",
              // The tile's own selected state. Card draws selection as
              // a border color, which a borderless artwork tile zeroes
              // out, so a selected tile was pixel-identical to every
              // other one (code review, 2026-09-05). Two things this
              // had to learn from actually looking at it in a browser:
              // the ring goes on the Card, not on the artwork box
              // inside it, or Card's own `overflow-hidden` clips it
              // away entirely; and it needs the offset, because a cyan
              // ring drawn flush against cyan artwork is invisible.
              isSelected?.(item) && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              isHighlighted?.(item) && currentClasses,
            )}
          >
            <div className={artClasses}>
              {renderItem(item)}
              <MediaTileOverlay
                progress={clampProgress(getProgress?.(item))}
                badge={renderBadge?.(item)}
                meta={renderMeta?.(item)}
              />
            </div>
          </Card>
          </TileFrame>
          {renderCaption ? (
            // Outside the Card, not inside it: a caption is flow
            // content, which is invalid inside a button, and a caption
            // that holds its own control (a channel link, an overflow
            // menu) would be keyboard-unreachable nested in one. Same
            // rule List.renderAction follows.
            <div className={cn("px-1 text-sm text-[var(--foreground)]", circle && "w-full")}>{renderCaption(item)}</div>
          ) : null}
        </li>
      ))}
      {withLock ? lockLi : null}
    </ul>
  );

  // Day groups keep the lock out of every day (its day is not known): its own list after the groups.
  const renderLockOnly = (listName: string | undefined) => renderList([], listName, true);

  // Day groups and the size slider are for the grid layout; a rail ignores both.
  const grouped = layout === "grid" && groupBy !== undefined;
  const sized = layout === "grid" && sizeControl !== undefined;
  let content: ReactNode;
  if (grouped) {
    const runs: { key: string; items: T[] }[] = [];
    for (const item of items) {
      const key = groupBy.getKey(item);
      const last = runs[runs.length - 1];
      if (last && last.key === key) last.items.push(item);
      else runs.push({ key, items: [item] });
    }
    content = (
      <div className="flex min-w-0 flex-col gap-4" data-slot="media-shelf-groups">
        {runs.map((run) => {
          const text = groupBy.label(run.key, run.items.length);
          return (
            <section key={run.key} aria-label={text} className="flex min-w-0 flex-col gap-2" data-slot="media-shelf-group">
              <DayDivider label={text} />
              {renderList(run.items, name ? `${name}, ${text}` : text)}
            </section>
          );
        })}
        {hasLocked ? renderLockOnly(name) : null}
      </div>
    );
  } else {
    content = renderList(items, name, hasLocked);
  }

  return (
    <Frame heading={heading} seeAll={seeAll}>
      {sized ? (
        <div className="flex min-w-0 flex-col gap-3" style={cardSizeStyle(sizeControl.size)} data-slot="media-shelf-sized">
          <div className="hidden justify-end px-1.5 sm:flex" data-slot="media-shelf-size-control">
            <CardSizeSlider size={sizeControl.size} onChange={sizeControl.onChange} label={sizeControl.label} />
          </div>
          {content}
        </div>
      ) : content}
    </Frame>
  );
}

const PRESS_CLASSES = "motion-safe:transition-[transform,opacity] motion-safe:active:scale-[var(--media-press-scale)]";

const PlayGlyph = getIcon("play");
const HeartGlyph = getIcon("heart");

/** A grid sized by the slider: two columns on a phone, then as many as fit at the chosen tile size. */
const SIZED_COLUMNS = "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(var(--maipai-card-size,220px),1fr))]";

/** The tile and, when the shelf has `onPlay` or `favorite`, its Play button and heart as siblings (a button inside a button is invalid). */
function TileFrame({ onPlay, playLabel, favorite, children }: { onPlay?: () => void; playLabel: string; favorite?: { on: boolean; label: string; onToggle: () => void }; children: ReactNode }) {
  if (!onPlay && !favorite) return <>{children}</>;
  return (
    <div className="group/tile relative" data-slot="media-tile">
      {children}
      {favorite ? (
        <button
          type="button"
          aria-label={favorite.label}
          aria-pressed={favorite.on}
          data-slot="media-tile-favorite"
          onClick={favorite.onToggle}
          className={cn(
            "absolute end-2 top-2 flex size-9 items-center justify-center rounded-full bg-[var(--art-overlay)] text-[var(--art-foreground)]",
            "before:absolute before:-inset-1 before:content-['']",
            "motion-safe:transition-transform motion-safe:active:scale-90",
            FOCUS_RING,
          )}
        >
          <HeartGlyph aria-hidden className={cn("size-5", favorite.on && "fill-current")} />
        </button>
      ) : null}
      {onPlay ? (
        <button
          type="button"
          aria-label={playLabel}
          data-slot="media-tile-play"
          onClick={onPlay}
          className={cn(
            "absolute end-2 bottom-2 flex size-[var(--media-play-size)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md",
            "translate-y-2 opacity-0 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100",
            "motion-safe:transition-[transform,opacity] motion-safe:duration-200 [@media(hover:none)]:hidden",
            FOCUS_RING,
          )}
        >
          <PlayGlyph aria-hidden className="size-5" />
        </button>
      ) : null}
    </div>
  );
}

// The frameless row's tile widths, the approved media mockup's (docs/design/assets/media-apps-2026-10-17 in Home): most of
// a tile on a phone so the next one peeks, about three and a quarter from 640, about four and a third from 1280.
const PLAIN_ITEM_WIDTH = "w-[72%] sm:w-[calc((100%-36px)/3.2)] xl:w-[calc((100%-48px)/4.3)]";
// `density: "compact"` on a frameless row (MUSIC-TILES-01): the same peek, with smaller tiles, for a home screen whose rows are
// many and short: a bit over two on a phone, about four and a fifth from 640, about six and a third from 1280.
const PLAIN_ITEM_WIDTH_COMPACT = "w-[44%] sm:w-[calc((100%-48px)/4.2)] xl:w-[calc((100%-72px)/6.3)]";

interface ShelfFrameProps {
  heading?: string;
  seeAll?: { label: string; onSelect: () => void };
  children: ReactNode;
}

/** The default frame: the kit Section card. A card shelf has no See all link. */
function CardShelfFrame({ heading, children }: ShelfFrameProps) {
  return <Section heading={heading}>{children}</Section>;
}

/** A plain shelf's frame: no card, the heading on the start side and the See all link on the end side. */
function PlainShelfFrame({ heading, seeAll, children }: ShelfFrameProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2" data-slot="media-shelf-plain">
      {heading || seeAll ? (
        <div className="flex items-center justify-between gap-3">
          {heading ? <h2 className="text-lg font-bold tracking-tight text-foreground">{heading}</h2> : <span />}
          {seeAll ? (
            <Button variant="ghost" size="sm" onClick={seeAll.onSelect} className="text-muted-foreground font-semibold">
              {seeAll.label}
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The tile's corners and bottom edge: badge, running time and progress. Shared with any media tile the kit draws. */
export function MediaTileOverlay({ progress = 0, badge, meta }: { progress?: number; badge?: ReactNode; meta?: ReactNode }) {
  return (
    <>
      {badge ? <span className="absolute start-2 top-2 flex" data-slot="media-tile-badge">{badge}</span> : null}
      {meta ? (
        <span
          className="absolute end-2 bottom-2 rounded-md bg-[var(--art-overlay)] px-1.5 py-0.5 text-xs font-semibold text-[var(--art-foreground)] tabular-nums"
          data-slot="media-tile-meta"
        >
          {meta}
        </span>
      ) : null}
      {progress > 0 ? (
        <span
          role="progressbar"
          aria-label="Played"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="absolute inset-x-0 bottom-0 h-1 bg-[var(--art-track)]"
          data-slot="media-tile-progress"
        >
          <span className="block h-full bg-[var(--progress-accent)]" style={{ width: `${progress * 100}%` }} />
        </span>
      ) : null}
    </>
  );
}

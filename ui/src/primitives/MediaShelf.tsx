import type { ReactNode } from "react";
import { Card } from "@/kit/primitives/Card";
import { Button } from "@/kit/ui/button";
import { EmptyState } from "@/kit/primitives/EmptyState";
import { Section } from "@/kit/primitives/Section";
import { SHELF_ITEM_WIDTH, type Density } from "@/kit/responsive";
import { cn, FOCUS_RING } from "@/kit/utils";
import { useSurface } from "@/kit/useSurface";

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
  density?: Density;
  heading?: string;
  /** Accessible name for the rail. Falls back to `heading`. */
  label?: string;
  emptyState?: { icon: string; text: string };
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
  /** MEDIA-POLISH-01: with no items, draw nothing at all (no heading, no
   * empty state): a row with nothing in it is simply absent. */
  hideWhenEmpty?: boolean;
  /** MEDIA-POLISH-01: a link beside the heading ("See all"). */
  seeAll?: { label: string; onSelect: () => void };
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
  items,
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
  getProgress,
  renderBadge,
  renderMeta,
  variant = "card",
  orientation = "horizontal",
  hideWhenEmpty = false,
  seeAll,
}: MediaShelfProps<T>) {
  const name = label ?? heading;
  const { far } = useSurface();
  // A plain shelf is a section of the page with its own heading row; a card shelf is the kit Section card.
  const Frame = variant === "plain" ? PlainShelfFrame : CardShelfFrame;

  if (items.length === 0 && hideWhenEmpty) return null;

  if (items.length === 0 && emptyState) {
    return (
      <Frame heading={heading} seeAll={seeAll}>
        <EmptyState icon={emptyState.icon} text={emptyState.text} />
      </Frame>
    );
  }

  if (orientation === "vertical") {
    return (
      <Frame heading={heading} seeAll={seeAll}>
        <ul aria-label={name} className="flex min-w-0 list-none flex-col gap-3 p-0" data-slot="media-shelf" data-orientation="vertical">
          {items.map((item) => (
            <li key={getKey(item)} className="flex min-w-0 items-start gap-3">
              <Card
                onSelect={onSelect ? () => onSelect(item) : undefined}
                label={getLabel?.(item)}
                selected={isSelected?.(item)}
                far={far}
                className={cn("w-2/5 max-w-40 shrink-0 border-0 bg-transparent", isSelected?.(item) && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
              >
                <div className={cn("relative w-full overflow-hidden rounded-[var(--radius)] bg-[var(--muted)]", ASPECT_CLASSES[aspect])}>
                  {renderItem(item)}
                  <MediaTileOverlay progress={clampProgress(getProgress?.(item))} badge={renderBadge?.(item)} meta={renderMeta?.(item)} />
                </div>
              </Card>
              {renderCaption ? <div className="min-w-0 flex-1 text-sm text-[var(--foreground)]">{renderCaption(item)}</div> : null}
            </li>
          ))}
        </ul>
      </Frame>
    );
  }

  // The heading is Section's, not a second one written here: a shelf is
  // a section of a page that happens to scroll sideways.
  return (
    <Frame heading={heading} seeAll={seeAll}>
      <ul
        data-slot="media-shelf"
        data-variant={variant}
        aria-label={name}
        // A scrollable region has to be reachable by keyboard (WCAG 2.2
        // AA, 2.1.1). When the tiles are buttons, tabbing through them
        // scrolls the rail already; when they are not, the rail itself
        // is the only thing left to focus, so it takes the tab stop.
        tabIndex={onSelect ? undefined : 0}
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
        className={cn("flex min-w-0 list-none snap-x snap-mandatory gap-3 overflow-x-auto p-1.5", variant === "plain" && "[scrollbar-width:none]", FOCUS_RING)}
      >
        {items.map((item) => (
          <li key={getKey(item)} className={cn("flex shrink-0 snap-start flex-col gap-2", variant === "plain" ? PLAIN_ITEM_WIDTH : SHELF_ITEM_WIDTH[density])}>
            <Card
              onSelect={onSelect ? () => onSelect(item) : undefined}
              label={getLabel?.(item)}
              selected={isSelected?.(item)}
              far={far}
              className={cn(
                "border-0 bg-transparent",
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
              )}
            >
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-[var(--radius)] bg-[var(--muted)]",
                  ASPECT_CLASSES[aspect],
                )}
              >
                {renderItem(item)}
                <MediaTileOverlay
                  progress={clampProgress(getProgress?.(item))}
                  badge={renderBadge?.(item)}
                  meta={renderMeta?.(item)}
                />
              </div>
            </Card>
            {renderCaption ? (
              // Outside the Card, not inside it: a caption is flow
              // content, which is invalid inside a button, and a caption
              // that holds its own control (a channel link, an overflow
              // menu) would be keyboard-unreachable nested in one. Same
              // rule List.renderAction follows.
              <div className="px-1 text-sm text-[var(--foreground)]">{renderCaption(item)}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// The frameless row's tile widths, the approved media mockup's (docs/design/assets/media-apps-2026-10-17 in Home): most of
// a tile on a phone so the next one peeks, about three and a quarter from 640, about four and a third from 1280.
const PLAIN_ITEM_WIDTH = "w-[72%] sm:w-[calc((100%-36px)/3.2)] xl:w-[calc((100%-48px)/4.3)]";

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

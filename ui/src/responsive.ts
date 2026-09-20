// docs/UI.md: "Four surfaces, one set of breakpoints owned by the kit...
// Packages never write a breakpoint." This file is where the kit owns
// them, so CardGrid, MediaShelf and SplitView share one definition of
// what a surface is instead of each spelling out its own Tailwind
// variants (org standard 1: one definition, one implementation).
//
// The mapping to Tailwind's variants, pinned by tokens.css's own
// `--breakpoint-*` overrides (the 2026-09-19 UI reconciliation;
// responsive.test.ts checks these two stay in sync): unprefixed is
// phone, `sm:` is tablet (>= 640), `lg:` is desktop (>= 960). `md:`
// (720, `useBreakpoint`'s own "tablet" tier boundary) and `xl:` (1280,
// its "wide" tier) are deliberately unused here - they are not this
// file's surfaces, only `useBreakpoint`'s finer JS-side tiers.
//
// TV is missing on purpose. It is defined by input mode, not width
// (useSurface.ts's own `far`), not a media query here.

export const SURFACE_MIN_WIDTH_PX = {
  phone: 0,
  tablet: 640,
  desktop: 960,
} as const;

export type Surface = keyof typeof SURFACE_MIN_WIDTH_PX;

/** The kit's density budgets. `default` is docs/UI.md's stated budget
 * verbatim (one column on phone, two on tablet, three on desktop);
 * `compact` is the same budget for tile-sized content (posters, covers,
 * album art), where three-across on a phone-width column is unreadable
 * and one-across wastes the screen. Two named budgets, not a free
 * column count, so a package still never picks a breakpoint. */
export type Density = "default" | "compact";

export const GRID_COLUMNS: Record<Density, string> = {
  default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  compact: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

/** A shelf tile's share of the rail's width, per surface. Percentages,
 * never pixels: docs/UI.md forbids fixed widths on content, and the
 * fraction under 100% is what makes the next tile peek into view so the
 * rail reads as scrollable. */
export const SHELF_ITEM_WIDTH: Record<Density, string> = {
  default: "w-[72%] sm:w-[40%] lg:w-[27%]",
  compact: "w-[44%] sm:w-[25%] lg:w-[17%]",
};

import { init, pause, resume } from "@noriginmedia/norigin-spatial-navigation";

let initialized = false;

/** Called once, the first time a product's own shell ever renders on
 * the TV surface (`useSurface().far`) - required before any
 * `useFocusable()` call (primitives/Card.tsx's and List.tsx's own far
 * variants both call it unconditionally once `far` is true): the
 * library throws if `useFocusable()` runs before this. Real DOM focus
 * is left off (`shouldFocusDOMNode` defaults to false) - a far-surface
 * component drives its highlight from `useFocusable().focused` instead
 * of `:focus-visible`, so arrow-key navigation works the same whether
 * or not the browser's own focus ring happens to be visible. */
export function ensureTvNavInit(): void {
  if (initialized) return;
  initialized = true;
  init({ debug: false, visualDebug: false });
}

// A count, not a plain pause/resume toggle: two overlays (a
// notification popover and a header picker, say) can each call this
// independently, and a naive boolean breaks the moment two are open at
// once - closing the second-opened one would call resume() while the
// first is still open, letting the remote drive the nav rail underneath
// it again.
let openOverlayCount = 0;

/** Radix overlays (Popover, Sheet, Dialog, DropdownMenu) trap focus and
 * handle their own arrow keys; a household member navigating a menu
 * with the remote should never also drive the nav rail underneath it at
 * the same time. A no-op when the TV surface was never initialized
 * (`ensureTvNavInit()` not yet called), so callers on every other
 * surface can call this unconditionally. */
export function pauseTvNavForOverlay(open: boolean): void {
  if (!initialized) return;
  if (open) {
    openOverlayCount += 1;
    if (openOverlayCount === 1) pause();
  } else {
    openOverlayCount = Math.max(0, openOverlayCount - 1);
    if (openOverlayCount === 0) resume();
  }
}

/** Test-only: both the init flag and the overlay counter are this
 * module's own state with no other reset hook. */
export function __resetTvNavForTests(): void {
  initialized = false;
  openOverlayCount = 0;
}

/**
 * One modern look for navigation rows, shared by the app rail (narrow left
 * column) and the app's own menu (second column). Every colour is a theme
 * token (primary, foreground, ring); nothing is a fixed colour.
 *
 * Selected = a tinted tile in the primary colour plus a slim primary
 * indicator pill (`aria-current` stays on the element). Hover = a calm
 * fill and the text moving from muted to full foreground.
 */

/** Colour change only, 150 ms, off under prefers-reduced-motion. */
export const navTransition = "transition-colors duration-150 motion-reduce:transition-none";

/** Rail hover and pressed states (rounded tile, calm fill, deeper on press). */
export const railHover = "hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Rail selected: clearly visible primary tint, primary icon and label. */
export const railSelected = "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary active:bg-primary/25";

/** Rail indicator: 3 px primary pill on the tile's left edge, vertically centred. */
export const railIndicator = "pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary";

/** App menu (second column) hover: quieter than the rail. */
export const menuHover = "text-sidebar-foreground/80 hover:bg-foreground/5 hover:text-foreground";

/** App menu selected (written as data-active: so it beats the button's own active fill): soft primary tint, primary text and icon, medium weight. No box behind the icon. */
export const menuSelected = "data-active:bg-primary/10 data-active:text-primary data-active:font-medium data-active:hover:bg-primary/[0.12] data-active:hover:text-primary";

/** App menu indicator: 2 px primary pill inside the row's left edge. */
export const menuIndicator = "pointer-events-none absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-primary";

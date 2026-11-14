/**
 * One modern look for navigation rows, shared by the app rail (narrow left
 * column) and the app's own menu (second column). Every colour is a theme
 * token (primary, foreground, ring); nothing is a fixed colour.
 *
 * Selected = a tinted tile in the primary colour with a soft token glow
 * (`aria-current` stays on the element). Hover = a calm
 * fill and the text moving from muted to full foreground.
 */

/** Colour change only, 150 ms, off under prefers-reduced-motion. */
export const navTransition = "transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none";

/** Rail hover and pressed states (rounded tile, calm fill, deeper on press). */
export const railHover = "hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Rail selected: clearly visible primary tint, primary icon and label. */
export const railSelected = "bg-primary/15 text-primary shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--primary)_55%,transparent)] hover:bg-primary/20 hover:text-primary active:bg-primary/25";

/** App menu (second column) hover: quieter than the rail. */
export const menuHover = "text-sidebar-foreground/80 hover:bg-foreground/5 hover:text-foreground";

/** App menu selected (written as data-active: so it beats the button's own active fill): soft primary tint, primary text and icon, medium weight. No box behind the icon. */
export const menuSelected = "data-active:bg-primary/10 data-active:text-primary data-active:font-medium data-active:shadow-[0_0_10px_-2px_color-mix(in_oklab,var(--primary)_35%,transparent)] data-active:hover:bg-primary/[0.12] data-active:hover:text-primary";

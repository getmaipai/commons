// Copied from home's kit until KIT-01 extracts `@maipai/ui`; do not edit here.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The kit's one focus ring, in one place. docs/UI.md makes "a visible
// focus ring" a floor the kit refuses to go below (WCAG 2.2 AA 2.4.13),
// and it was copy-pasted into five components before this existed.
//
// The explicit `ring-offset-[var(--background)]` is the whole
// reason this is a constant rather than a convention: Tailwind v4
// declares `--tw-ring-offset-color` with `@property { inherits: false;
// initial-value: #fff }`, so an offset ring paints a white halo on the
// dark palette unless every single component names the color itself.
// A `:root` override cannot fix it - `inherits: false` means it never
// reaches the element. Found in a code review, 2026-09-05.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

/** The same ring with no offset, for controls whose own border already
 * separates them from the background (inputs, selects). */
export const FOCUS_RING_INSET =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

// docs/UI.md's 48 px touch-target floor: a control whose visible box is
// smaller than 48 px extends its hit area with a transparent pseudo-element
// that overhangs the box. The overhang in steps of the kit's inset scale is
// what this returns; a control picks the step that brings its visible box to
// 48 px (a 24 px box needs 3, 32 px needs 2, 40 px needs 1).
//
// Written as three full literal strings (not a template with a variable
// inside the class name) so Tailwind's scanner sees them.
export function hitArea(insetStep: 1 | 2 | 3): string {
  const steps: Record<1 | 2 | 3, string> = {
    1: "relative before:absolute before:-inset-1 before:content-['']",
    2: "relative before:absolute before:-inset-2 before:content-['']",
    3: "relative before:absolute before:-inset-3 before:content-['']",
  };
  return steps[insetStep];
}

// A raw `var(--hue-*)` text color fails WCAG AA on every hue against
// both a plain panel and a 15%-tinted pill of the same hue, in both
// themes (found live on MetricCard's state link, 2.35:1 orange on
// white; found again by contrast math, before shipping, on StatusPill
// and TypeBadge's pill background - every hue failed 4.5:1 in light
// theme, several in dark). Mixed 50/50 with the theme's own
// `--foreground` clears 4.5:1 for all six hues, both themes, against
// every background this kit blends a hue text color onto (contrast.test.ts's
// "hue text mix" block is the proof); 60/40 hue-leaning was tried first
// and still left teal under 4.5:1 (3.93:1). One ratio, so a future
// change is caught in the one test that checks it, not live.
export const HUE_TEXT_MIX = 0.5;

/** `color-mix(in srgb, ...)` for text in a hue color, legible on any
 * surface this kit tints with the same hue (see `HUE_TEXT_MIX`). */
export function hueTextColor(hue: string): string {
  return `color-mix(in srgb, var(${hue}) ${HUE_TEXT_MIX * 100}%, var(--foreground) ${100 - HUE_TEXT_MIX * 100}%)`;
}

// Spec section 1 ("Pills and badges"): a status pill or type badge's
// background is the hue at 15% over the panel. One number, shared by
// StatusPill and TypeBadge, after a review found the literal `15`
// living separately in both (plus a third copy in contrast.test.ts) -
// exactly the kind of drift HUE_TEXT_MIX's own history (60/40 to 50/50)
// already showed this file's ratios are prone to.
export const HUE_PILL_TINT = 0.15;

/** `color-mix(in srgb, ...)` for a pill/badge's own tinted background
 * (see `HUE_PILL_TINT`). */
export function hueTintBackground(hue: string): string {
  return `color-mix(in srgb, var(${hue}) ${HUE_PILL_TINT * 100}%, transparent)`;
}

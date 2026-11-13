// MOTION-01: helpers for the few motions that run from script (a route fade, a skeleton-to-content fade) because no element
// of their own carries a CSS class. They read the same tokens as the CSS and stop under the OS reduced-motion setting and the calm
// setting, as the CSS does.
export function motionStopped(): boolean {
  if (typeof window === "undefined") return true
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true
  return document.documentElement.getAttribute("data-ease-motion") === "calm"
}

/** The value of a `--motion-*-in` duration token in milliseconds (the token's own default when it is not readable). */
export function motionMs(token: string, fallback: number): number {
  if (typeof window === "undefined") return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return fallback
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : fallback
}

/** Fades the given elements in (opacity only, no transform, so nothing moves). Does nothing when motion is stopped. */
export function fadeIn(elements: Iterable<Element>, from = 0): void {
  if (motionStopped()) return
  const duration = motionMs("--motion-fade-in", 160)
  for (const el of elements) {
    if (typeof (el as HTMLElement).animate !== "function") continue
    ;(el as HTMLElement).animate([{ opacity: from }, { opacity: 1 }], { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)" })
  }
}

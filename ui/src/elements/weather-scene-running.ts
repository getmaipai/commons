import { useEffect, useState, type RefObject } from "react";

/**
 * One shared IntersectionObserver (rootMargin 100px) and one visibilitychange
 * listener serve every weather sky on the page, so a forecast page with many
 * places costs one observer, not one per card. A sky counts as running only
 * while it is near the viewport and the tab is visible.
 */
type Listener = (onScreen: boolean) => void;
const listeners = new Map<Element, Set<Listener>>();
const tabListeners = new Set<(visible: boolean) => void>();
let observer: IntersectionObserver | undefined;

const tabVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
const onVisibility = () => { const visible = tabVisible(); for (const fn of tabListeners) fn(visible); };

function observe(el: Element, fn: Listener) {
  if (typeof IntersectionObserver === "undefined") return;
  observer ??= new IntersectionObserver(entries => {
    // Entries arrive in time order: the last one per element is its current state.
    for (const entry of entries) for (const l of listeners.get(entry.target) ?? []) l(entry.isIntersecting);
  }, { rootMargin: "100px" });
  let set = listeners.get(el);
  if (!set) { set = new Set(); listeners.set(el, set); observer.observe(el); }
  set.add(fn);
}
function unobserve(el: Element, fn: Listener) {
  const set = listeners.get(el); if (!set) return;
  set.delete(fn);
  if (set.size === 0) { listeners.delete(el); observer?.unobserve(el); }
  if (listeners.size === 0 && observer) { observer.disconnect(); observer = undefined; }
}
function watchTab(fn: (visible: boolean) => void) {
  if (tabListeners.size === 0 && typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  tabListeners.add(fn);
}
function unwatchTab(fn: (visible: boolean) => void) {
  tabListeners.delete(fn);
  if (tabListeners.size === 0 && typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
}

/** False when the element is off screen (beyond 100px) or the tab is hidden; true otherwise, and when no observer exists. */
export function useSceneRunning(ref: RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(tabVisible);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    observe(el, setOnScreen); watchTab(setVisible); setVisible(tabVisible());
    return () => { unobserve(el, setOnScreen); unwatchTab(setVisible); };
  }, [ref]);
  return onScreen && visible;
}

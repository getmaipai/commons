import { useSyncExternalStore } from "react";

export const PHONE_LAYOUT_QUERIES = ["(max-width: 639.98px)", "(pointer: coarse) and (max-height: 499.98px)"] as const;

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const queries = PHONE_LAYOUT_QUERIES.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

/** The app shell's phone breakpoint, shared with host applications. */
export function useIsPhoneLayout(): boolean {
  return useSyncExternalStore(subscribe, () => typeof window !== "undefined" && typeof window.matchMedia === "function" && PHONE_LAYOUT_QUERIES.some((query) => window.matchMedia(query).matches), () => false);
}

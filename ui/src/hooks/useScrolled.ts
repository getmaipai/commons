import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function useScrolled(threshold = 8): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined" && window.scrollY > threshold,
    () => false,
  );
}

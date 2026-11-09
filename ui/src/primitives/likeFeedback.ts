import { useEffect, useRef, useState } from "react";

/** A short buzz on like where the device has one. Never throws (no `vibrate`, or a browser that refuses it). */
export function likeHaptic(): void {
  try {
    navigator.vibrate?.(10);
  } catch {
    // no haptic: the pop still shows
  }
}

/** The class that plays the heart pop (none under reduced motion, via `motion-safe:`). */
export const LIKE_POP_CLASS = "motion-safe:animate-[like-pop_300ms_ease-out]";

/** Counts the times `on` turned true. Use it as the icon's `key` and play `LIKE_POP_CLASS` while it is above 0 and `on`. */
export function useLikePop(on: boolean): number {
  const [count, setCount] = useState(0);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) setCount((n) => n + 1);
    was.current = on;
  }, [on]);
  return count;
}

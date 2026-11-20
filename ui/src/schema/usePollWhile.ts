import { useEffect } from "react";
import { FEED_POLL_INTERVAL_MS } from "@/kit/schema/feedPolling";

/** VIDEO-KIT-01: refetch a bound list on the feed interval while `active` (a render is still running), never while the page is hidden, and
 * once at once when the page becomes visible again. Stops by itself when `active` turns false. */
export function usePollWhile(active: boolean, refetch: () => Promise<unknown>): void {
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let busy = false;
    const run = async () => {
      if (!alive || busy || document.visibilityState === "hidden") return;
      busy = true;
      try { if (alive) await refetch(); } finally { busy = false; }
    };
    const timer = window.setInterval(() => void run(), FEED_POLL_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") void run(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [active, refetch]);
}

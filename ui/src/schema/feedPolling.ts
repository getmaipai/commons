import { useEffect, useMemo, useRef, useState } from "react";

/**
 * VIDEO-UI-04 (K9): the one definition of how a `result_feed` follows a running job.
 *
 * A package data binding never refetches on its own, so a feed entry stayed on a stale "Waiting for its turn"
 * line for a 3-minute render (measured 2026-11-02). `poll_while` fixes that at the source: while any row's status
 * is one of the page's running statuses, only those rows' own records are re-read every
 * `FEED_POLL_INTERVAL_MS`; every other status is settled, and polling stops when no row is running.
 */
export const FEED_POLL_INTERVAL_MS = 3000;

/** The statuses a `poll_while` may name as running; every other feed status is settled. */
export const FEED_RUNNING_STATUSES = ["queued", "generating"] as const;
export const FEED_SETTLED_STATUSES = ["draft", "ready", "failed", "cancelled"] as const;

type Row = Record<string, unknown>;

export interface FeedPollingOptions {
  /** The rows as the bound data call last returned them. */
  rows: Row[];
  keyOf(row: Row): string;
  statusOf(row: Row): string;
  /** The page's `poll_while.statuses`. */
  runningStatuses: readonly string[];
  /** Reads one running row's own record. Rejecting, or resolving null, keeps what the feed has until the next tick. */
  readRecord(row: Row): Promise<Row | null>;
  /** Called once when a row that was running is found settled, so the host can refresh the whole list. */
  onSettled?(row: Row): void;
}

/** Returns the rows with each running row replaced by its freshest record. */
export function useFeedPolling({ rows, keyOf, statusOf, runningStatuses, readRecord, onSettled }: FeedPollingOptions): Row[] {
  const [fresh, setFresh] = useState<Map<string, Row>>(() => new Map());
  // New data from the bound call is newer than any record read before it.
  useEffect(() => setFresh(new Map()), [rows]);
  const merged = useMemo(() => rows.map((row) => fresh.get(keyOf(row)) ?? row), [rows, fresh, keyOf]);
  const isRunning = (row: Row) => runningStatuses.includes(statusOf(row));
  const runningKeys = merged.filter(isRunning).map(keyOf).join("\u0000");

  const latest = useRef({ merged, keyOf, statusOf, runningStatuses, readRecord, onSettled });
  latest.current = { merged, keyOf, statusOf, runningStatuses, readRecord, onSettled };

  useEffect(() => {
    if (runningKeys === "") return;
    let alive = true;
    let busy = false;
    const tick = async () => {
      if (busy || !alive) return;
      busy = true;
      try {
        const { merged: current, keyOf: key, statusOf: status, runningStatuses: running, readRecord: read, onSettled: settled } = latest.current;
        const targets = current.filter((row) => running.includes(status(row)));
        const reads = await Promise.all(targets.map((row) => read(row).then((next) => ({ row, next }), () => ({ row, next: null }))));
        if (!alive) return;
        const got = reads.filter((r): r is { row: Row; next: Row } => r.next !== null);
        if (got.length > 0) setFresh((prev) => {
          const next = new Map(prev);
          for (const r of got) next.set(key(r.row), r.next);
          return next;
        });
        for (const r of got) if (!running.includes(status(r.next))) settled?.(r.next);
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => {
      // A hidden tab's timers are throttled or paused, so it waits and catches up the moment it is shown again.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void tick();
    }, FEED_POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runningKeys]);

  return merged;
}

// Hybrid logical clock, `wall_ms:counter:node`. Per-field last-writer-
// wins is one settled sync primitive every product's household/client
// records use: generating a real HLC on every write, even with only one
// writer today, means a future remote write compares correctly against
// it with no shape change later.

export interface HlcClock {
  next(): string;
  /** Recovers monotonicity after a restart: called once at boot with
   * the highest hlc already on disk, so a wall clock that's ever behind
   * where it was before a restart (no RTC, NTP not synced yet, a
   * manual/DST change) can never produce a fresh hlc SMALLER than one
   * already stored - a per-field last-writer-wins check comparing
   * against that stored hlc must never regress. */
  seed(knownHlc: string): void;
  /** Test-only: the clock's counter is this instance's own state with
   * no other reset hook. */
  __resetForTests(): void;
}

/** Splits only on the first two colons, so a nodeId that itself contains
 * a colon (a MAC-derived id like "aa:bb:cc:dd:ee:ff") survives whole in
 * `node` instead of being truncated to its first segment. */
export function parseHlc(hlc: string): { wallMs: number; counter: number; node: string } {
  const firstColon = hlc.indexOf(":");
  if (firstColon === -1) return { wallMs: Number(hlc), counter: 0, node: "" };
  const secondColon = hlc.indexOf(":", firstColon + 1);
  if (secondColon === -1) return { wallMs: Number(hlc.slice(0, firstColon)), counter: Number(hlc.slice(firstColon + 1)), node: "" };
  return {
    wallMs: Number(hlc.slice(0, firstColon)),
    counter: Number(hlc.slice(firstColon + 1, secondColon)),
    node: hlc.slice(secondColon + 1),
  };
}

/** >0 if a is newer, <0 if b is newer, 0 if equal. Node is the final,
 * rarely-needed tiebreak for two nodes writing at the identical wall_ms
 * and counter (astronomically unlikely for one node; matters once a
 * second node exists via sync). A plain ordinal (UTF-16 code unit)
 * comparison, not localeCompare: two replicas must agree on this
 * ordering deterministically, and localeCompare's result can vary by
 * ICU build/locale. */
export function compareHlc(a: string, b: string): number {
  const pa = parseHlc(a);
  const pb = parseHlc(b);
  if (pa.wallMs !== pb.wallMs) return pa.wallMs - pb.wallMs;
  if (pa.counter !== pb.counter) return pa.counter - pb.counter;
  if (pa.node === pb.node) return 0;
  return pa.node < pb.node ? -1 : 1;
}

/** `nodeId` identifies this process/device in the hlc's final field - a
 * caller's own device or hub instance id, passed in rather than read
 * from a product's own identity module. */
export function createHlcClock(nodeId: string): HlcClock {
  let lastWallMs = 0;
  let counter = 0;

  return {
    next(): string {
      const wallMs = Date.now();
      if (wallMs > lastWallMs) {
        lastWallMs = wallMs;
        counter = 0;
      } else {
        counter++;
      }
      return `${lastWallMs}:${counter}:${nodeId}`;
    },
    seed(knownHlc: string): void {
      const { wallMs, counter: c } = parseHlc(knownHlc);
      if (wallMs > lastWallMs || (wallMs === lastWallMs && c > counter)) {
        lastWallMs = wallMs;
        counter = c;
      }
    },
    __resetForTests(): void {
      lastWallMs = 0;
      counter = 0;
    },
  };
}

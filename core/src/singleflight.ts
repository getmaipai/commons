// Shares one in-flight promise among every concurrent caller instead of
// starting a redundant second attempt: "run this once, share the result
// with concurrent callers, clear on completion either way so the next
// call starts fresh." Not for a caller that needs to inspect or clear
// the in-flight promise from outside (a status endpoint reporting
// "starting", a manual cancel) - that needs its own hand-rolled version,
// this generic helper doesn't serve it.
export interface Singleflight<T> {
  (): Promise<T>;
  /** Test-only: clears any in-flight promise, so the next call starts a
   * genuinely fresh attempt instead of awaiting a stale one left over
   * from an earlier test. */
  __resetForTests(): void;
}

export function singleflight<T>(fn: () => Promise<T>): Singleflight<T> {
  let inFlight: Promise<T> | null = null;
  const wrapped = (() => {
    if (!inFlight) {
      inFlight = fn().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }) as Singleflight<T>;
  wrapped.__resetForTests = () => {
    inFlight = null;
  };
  return wrapped;
}

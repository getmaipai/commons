// A per-key token bucket (CLAUDE.md's "Third-party services: we are the
// user" - "Budget every service to what one engaged human does: a page
// every few seconds, not dozens a second. Every integration gets a rate
// limiter (token bucket) at its single choke point, and all traffic to
// that service goes through it - never a raw fetch on the side").
import { evictStaleIfFull } from "./boundedMap";

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

/** capacity: the burst size (how many requests can fire back to back
 * before waiting). refillPerSecond: the sustained steady-state rate once
 * the burst is spent - together these are "a page every few seconds,"
 * not a fixed interval that can't absorb a normal short burst. */
export interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimiter {
  /** True and consumes one token if the bucket for `key` has one
   * available; false (consuming nothing) otherwise. Never blocks or
   * queues - a caller over budget gets told no immediately, the "back
   * off on the first signal" posture, rather than a request silently
   * piling up.
   *
   * `nowMs` defaults to Date.now() (or the test clock, see
   * __setClockForTests) - it exists so a test can inject an exact
   * elapsed time instead of a real wait plus an exact post-wait
   * assertion, which under load can flake the moment a token refills a
   * little earlier than the wall clock suggested. */
  tryConsume(key: string, options: TokenBucketOptions, nowMs?: number): boolean;
  /** Test-only: forgets every bucket's state so tests don't leak
   * rate-limit exhaustion into each other. Also puts the clock back on
   * Date.now. */
  __resetForTests(): void;
  /** Test-only: reads `now` from `fn` instead of Date.now, so a budget
   * spent through real callers stays spent for as long as the test
   * needs. Reset by __resetForTests(). */
  __setClockForTests(fn: () => number): void;
}

export interface RateLimiterOptions {
  maxBuckets?: number;
  staleMs?: number;
}

const DEFAULT_MAX_BUCKETS = 5_000;
const DEFAULT_STALE_MS = 10 * 60_000;

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const maxBuckets = options.maxBuckets ?? DEFAULT_MAX_BUCKETS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const buckets = new Map<string, Bucket>();
  let clock: () => number = Date.now;

  function refill(bucket: Bucket, opts: TokenBucketOptions, nowMs: number): void {
    const elapsedSeconds = Math.max(0, (nowMs - bucket.lastRefillMs) / 1000);
    bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedSeconds * opts.refillPerSecond);
    bucket.lastRefillMs = nowMs;
  }

  return {
    tryConsume(key: string, opts: TokenBucketOptions, nowMs: number = clock()): boolean {
      let bucket = buckets.get(key);
      if (!bucket) {
        // Unbounded growth for the life of the process as callers
        // accumulate distinct keys is a real leak; cap the map size,
        // and when it's full, sweep out entries nothing has touched in
        // a while (staleMs) before adding a new one.
        evictStaleIfFull(buckets, maxBuckets, (v) => nowMs - v.lastRefillMs > staleMs);
        bucket = { tokens: opts.capacity, lastRefillMs: nowMs };
        buckets.set(key, bucket);
      }
      refill(bucket, opts, nowMs);
      if (bucket.tokens < 1) return false;
      bucket.tokens -= 1;
      return true;
    },
    __resetForTests(): void {
      buckets.clear();
      clock = Date.now;
    },
    __setClockForTests(fn: () => number): void {
      clock = fn;
    },
  };
}

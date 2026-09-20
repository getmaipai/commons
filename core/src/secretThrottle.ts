// A generic sign-in (or any secret-guess) brute-force throttle keyed by
// an arbitrary string (a client IP, a device id). Complements a
// per-account lockout: without it, one host could hammer every account
// in parallel (per-account counters don't see each other), and a PIN or
// short code is easy to guess given enough tries. Adapted from the
// legacy hub's lib/pinThrottle.ts.
import { getConnInfo } from "hono/bun";
import type { Context } from "hono";
import { evictStaleIfFull } from "./boundedMap";

const DEFAULT_WINDOW_MS = 15 * 60_000;
const DEFAULT_MAX_FAILS = 20;
const DEFAULT_MAX_BUCKETS = 5_000;

interface Bucket {
  fails: number;
  first: number;
  lockedUntil: number;
}

export interface ThrottleOptions {
  windowMs?: number;
  maxFails?: number;
  maxBuckets?: number;
}

export interface Throttle {
  check(key: string): { blocked: boolean; retryAfter: number };
  fail(key: string): void;
  reset(key: string): void;
  /** Test-only: buckets are this throttle's own in-memory state with no
   * other reset hook. */
  __resetForTests(): void;
}

/** A caller guarding one real-world budget (e.g. "every sign-in route in
 * this process") must create exactly ONE throttle and share it across
 * every route that checks it - `createThrottle()` per route file, each
 * with its own private bucket map, would let an attacker multiply the
 * allowed attempts by the number of routes simply by round-robining
 * across them. Two throttles are only correct when they guard genuinely
 * different budgets (a sign-in throttle and an unrelated API-key
 * throttle, say), never as a per-file convenience for the same one. */
export function createThrottle(options: ThrottleOptions = {}): Throttle {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxFails = options.maxFails ?? DEFAULT_MAX_FAILS;
  const maxBuckets = options.maxBuckets ?? DEFAULT_MAX_BUCKETS;
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string) {
      const now = Date.now();
      const b = buckets.get(key);
      if (!b) return { blocked: false, retryAfter: 0 };
      if (b.lockedUntil > now) return { blocked: true, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
      if (now - b.first > windowMs) buckets.delete(key);
      return { blocked: false, retryAfter: 0 };
    },
    fail(key: string) {
      const now = Date.now();
      let b = buckets.get(key);
      if (!b || now - b.first > windowMs) {
        b = { fails: 0, first: now, lockedUntil: 0 };
        evictStaleIfFull(buckets, maxBuckets, (v) => v.lockedUntil <= now && now - v.first > windowMs);
        buckets.set(key, b);
      }
      b.fails += 1;
      if (b.fails >= maxFails) b.lockedUntil = now + windowMs;
    },
    reset(key: string) {
      buckets.delete(key);
    },
    __resetForTests() {
      buckets.clear();
    },
  };
}

export interface GetClientIpOptions {
  /** Whether to trust the x-forwarded-for header - a caller behind its
   * own reverse proxy sets this from its own config; core has no
   * product config of its own to read it from. */
  trustProxy?: boolean;
}

export function getClientIp(c: Context, options: GetClientIpOptions = {}): string {
  if (options.trustProxy) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

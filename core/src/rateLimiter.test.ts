import { describe, expect, test } from "bun:test";
import { createRateLimiter } from "./rateLimiter";

describe("createRateLimiter().tryConsume", () => {
  test("allows up to capacity calls in a burst, then refuses", () => {
    const limiter = createRateLimiter();
    const opts = { capacity: 3, refillPerSecond: 0.001 }; // negligible refill within the test's own runtime
    expect(limiter.tryConsume("host-a", opts)).toBe(true);
    expect(limiter.tryConsume("host-a", opts)).toBe(true);
    expect(limiter.tryConsume("host-a", opts)).toBe(true);
    expect(limiter.tryConsume("host-a", opts)).toBe(false);
  });

  test("a different key has its own independent bucket", () => {
    const limiter = createRateLimiter();
    const opts = { capacity: 1, refillPerSecond: 0.001 };
    expect(limiter.tryConsume("host-a", opts)).toBe(true);
    expect(limiter.tryConsume("host-a", opts)).toBe(false); // host-a's bucket is empty
    expect(limiter.tryConsume("host-b", opts)).toBe(true); // host-b's own bucket is untouched
  });

  test("refills over time, up to the capacity ceiling", () => {
    const limiter = createRateLimiter();
    const opts = { capacity: 1, refillPerSecond: 20 }; // one token every 50ms
    const t0 = 1_000_000;
    expect(limiter.tryConsume("host-c", opts, t0)).toBe(true);
    expect(limiter.tryConsume("host-c", opts, t0)).toBe(false);
    expect(limiter.tryConsume("host-c", opts, t0 + 80)).toBe(true); // 80ms elapsed, well past one refill
  });

  test("never refills past capacity even after a long idle gap", () => {
    const limiter = createRateLimiter();
    const opts = { capacity: 2, refillPerSecond: 20 }; // would refill ~10 tokens in 500ms if unclamped
    const t0 = 1_000_000;
    expect(limiter.tryConsume("host-d", opts, t0)).toBe(true);
    expect(limiter.tryConsume("host-d", opts, t0)).toBe(true);
    expect(limiter.tryConsume("host-d", opts, t0 + 500)).toBe(true); // capped at capacity=2, not the unclamped ~10
    expect(limiter.tryConsume("host-d", opts, t0 + 500)).toBe(true); // the 2nd of exactly 2 available tokens
    expect(limiter.tryConsume("host-d", opts, t0 + 500)).toBe(false); // and no 3rd - proves the cap, not just "some refill happened"
  });

  test("two independent limiters never share bucket state", () => {
    const a = createRateLimiter();
    const b = createRateLimiter();
    const opts = { capacity: 1, refillPerSecond: 0.001 };
    expect(a.tryConsume("host-e", opts)).toBe(true);
    expect(a.tryConsume("host-e", opts)).toBe(false);
    expect(b.tryConsume("host-e", opts)).toBe(true);
  });

  test("__setClockForTests substitutes the default clock, and __resetForTests restores it", () => {
    const limiter = createRateLimiter();
    let t = 1_000_000;
    limiter.__setClockForTests(() => t);
    const opts = { capacity: 1, refillPerSecond: 20 };
    expect(limiter.tryConsume("host-f", opts)).toBe(true);
    expect(limiter.tryConsume("host-f", opts)).toBe(false);
    t += 80;
    expect(limiter.tryConsume("host-f", opts)).toBe(true);
    limiter.__resetForTests();
    expect(limiter.tryConsume("host-f", opts)).toBe(true); // a fresh bucket after reset
  });
});

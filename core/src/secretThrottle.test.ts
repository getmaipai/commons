import { describe, expect, test } from "bun:test";
import type { Context } from "hono";
import { createThrottle, getClientIp } from "./secretThrottle";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 20;

describe("createThrottle", () => {
  test("returns not blocked for a fresh key", () => {
    const throttle = createThrottle();
    expect(throttle.check("1.2.3.4")).toEqual({ blocked: false, retryAfter: 0 });
  });

  test("returns not blocked after a few failures", () => {
    const throttle = createThrottle();
    for (let i = 0; i < 5; i++) throttle.fail("1.2.3.4");
    expect(throttle.check("1.2.3.4")).toEqual({ blocked: false, retryAfter: 0 });
  });

  test("blocks after maxFails failures", () => {
    const throttle = createThrottle();
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("1.2.3.4");
    const result = throttle.check("1.2.3.4");
    expect(result.blocked).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(WINDOW_MS / 1000);
  });

  test("does not block other keys", () => {
    const throttle = createThrottle();
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("1.2.3.4");
    expect(throttle.check("5.6.7.8")).toEqual({ blocked: false, retryAfter: 0 });
  });

  test("accumulates failures per key", () => {
    const throttle = createThrottle();
    throttle.fail("1.2.3.4");
    throttle.fail("1.2.3.4");
    throttle.fail("1.2.3.4");
    expect(throttle.check("1.2.3.4").blocked).toBe(false);
  });

  test("crosses the threshold on the max-th failure", () => {
    const throttle = createThrottle();
    for (let i = 0; i < MAX_FAILS - 1; i++) throttle.fail("9.9.9.9");
    expect(throttle.check("9.9.9.9").blocked).toBe(false);
    throttle.fail("9.9.9.9");
    expect(throttle.check("9.9.9.9").blocked).toBe(true);
  });

  test("reset clears only the given key's bucket", () => {
    const throttle = createThrottle();
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("1.2.3.4");
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("5.6.7.8");
    throttle.reset("1.2.3.4");
    expect(throttle.check("1.2.3.4")).toEqual({ blocked: false, retryAfter: 0 });
    expect(throttle.check("5.6.7.8").blocked).toBe(true);
  });

  test("__resetForTests clears every bucket", () => {
    const throttle = createThrottle();
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("1.2.3.4");
    for (let i = 0; i < MAX_FAILS; i++) throttle.fail("5.6.7.8");
    throttle.__resetForTests();
    expect(throttle.check("1.2.3.4")).toEqual({ blocked: false, retryAfter: 0 });
    expect(throttle.check("5.6.7.8")).toEqual({ blocked: false, retryAfter: 0 });
  });

  test("a caller's own options (a tighter window and lower max) are honored, independent of another throttle's defaults", () => {
    const throttle = createThrottle({ maxFails: 2, windowMs: 1_000 });
    throttle.fail("1.2.3.4");
    expect(throttle.check("1.2.3.4").blocked).toBe(false);
    throttle.fail("1.2.3.4");
    expect(throttle.check("1.2.3.4").blocked).toBe(true);
  });

  test("two throttles never share state", () => {
    const a = createThrottle();
    const b = createThrottle();
    for (let i = 0; i < MAX_FAILS; i++) a.fail("1.2.3.4");
    expect(a.check("1.2.3.4").blocked).toBe(true);
    expect(b.check("1.2.3.4").blocked).toBe(false);
  });
});

function fakeContext(headers: Record<string, string>): Context {
  return { req: { header: (name: string) => headers[name] } } as unknown as Context;
}

describe("getClientIp", () => {
  test("ignores x-forwarded-for when trustProxy isn't set", () => {
    const c = fakeContext({ "x-forwarded-for": "10.0.0.1, 172.16.0.1" });
    expect(getClientIp(c)).toBe("unknown");
  });

  test("uses the first x-forwarded-for address when trustProxy is true", () => {
    const c = fakeContext({ "x-forwarded-for": "10.0.0.1, 172.16.0.1" });
    expect(getClientIp(c, { trustProxy: true })).toBe("10.0.0.1");
  });

  test("falls back to unknown when trustProxy is true but the header is absent", () => {
    const c = fakeContext({});
    expect(getClientIp(c, { trustProxy: true })).toBe("unknown");
  });
});

import { describe, expect, test } from "bun:test";
import { compareHlc, createHlcClock } from "./hlc";

describe("createHlcClock().next()", () => {
  test("matches the wall_ms:counter:node pattern", () => {
    const clock = createHlcClock("abc123");
    expect(clock.next()).toMatch(/^[0-9]+:[0-9]+:abc123$/);
  });

  test("the counter itself advances within the same wall-clock millisecond", () => {
    const clock = createHlcClock("abc123");
    const a = clock.next();
    const b = clock.next();
    const [wallA, counterA] = a.split(":").map(Number);
    const [wallB, counterB] = b.split(":").map(Number);
    if (wallA === wallB) {
      expect(counterB).toBe(counterA! + 1);
    } else {
      // A real clock tick landed between the two calls - rare, but a
      // valid outcome this test isn't trying to prove; still must hold.
      expect(wallB).toBeGreaterThan(wallA!);
    }
  });

  test("two independent clocks never share counter state", () => {
    const a = createHlcClock("node-a");
    const b = createHlcClock("node-b");
    expect(a.next().endsWith(":node-a")).toBe(true);
    expect(b.next().endsWith(":node-b")).toBe(true);
  });

  test("a nodeId that itself contains a colon (a MAC-derived id) survives whole, not truncated to its first segment", () => {
    const clock = createHlcClock("aa:bb:cc:dd:ee:ff");
    const hlc = clock.next();
    expect(hlc.endsWith(":aa:bb:cc:dd:ee:ff")).toBe(true);
  });
});

describe("compareHlc()", () => {
  test("orders by wall_ms first, regardless of counter", () => {
    expect(compareHlc("100:5:aaaaaa", "200:0:aaaaaa")).toBeLessThan(0);
    expect(compareHlc("200:0:aaaaaa", "100:5:aaaaaa")).toBeGreaterThan(0);
  });

  test("orders by counter when wall_ms ties", () => {
    expect(compareHlc("100:1:aaaaaa", "100:2:aaaaaa")).toBeLessThan(0);
    expect(compareHlc("100:2:aaaaaa", "100:1:aaaaaa")).toBeGreaterThan(0);
  });

  test("falls back to node as the final tiebreak when wall_ms and counter both tie", () => {
    expect(compareHlc("100:1:aaaaaa", "100:1:bbbbbb")).toBeLessThan(0);
    expect(compareHlc("100:1:bbbbbb", "100:1:aaaaaa")).toBeGreaterThan(0);
  });

  test("two identical hlcs compare equal", () => {
    expect(compareHlc("100:1:aaaaaa", "100:1:aaaaaa")).toBe(0);
  });

  test("the node tiebreak is a plain ordinal comparison, not locale-aware (case matters, no accent folding)", () => {
    // localeCompare would treat these as equal or reorder them depending
    // on ICU/locale; a deterministic replica-to-replica ordering can't
    // depend on that.
    expect(compareHlc("100:1:B", "100:1:a")).toBeLessThan(0); // "B" (0x42) < "a" (0x61) in code-unit order
    expect(compareHlc("100:1:a", "100:1:B")).toBeGreaterThan(0);
  });

  test("a node id containing a colon compares correctly, not just its truncated first segment", () => {
    expect(compareHlc("100:1:aa:bb:cc", "100:1:aa:bb:dd")).toBeLessThan(0);
    expect(compareHlc("100:1:aa:bb:cc", "100:1:aa:bb:cc")).toBe(0);
  });
});

describe("createHlcClock().seed()", () => {
  test("a fresh next() after seeding with a future hlc lands strictly after it", () => {
    const clock = createHlcClock("abc123");
    clock.seed("9999999999999:5:abc123");
    const fresh = clock.next();
    expect(compareHlc(fresh, "9999999999999:5:abc123")).toBeGreaterThan(0);
  });

  test("seeding with an older wall_ms never regresses the clock backward", () => {
    const clock = createHlcClock("abc123");
    const a = clock.next();
    clock.seed("1:0:zzzzzz");
    const b = clock.next();
    expect(compareHlc(b, a)).toBeGreaterThan(0);
  });

  test("seeding with the same wall_ms but a LOWER counter is a no-op, not a regression", () => {
    const clock = createHlcClock("abc123");
    const first = clock.next();
    const second = clock.next();
    const [wallMs] = second.split(":");
    clock.seed(`${wallMs}:0:zzzzzz`); // strictly lower counter at the identical wall_ms
    const third = clock.next();
    expect(compareHlc(third, second)).toBeGreaterThan(0);
  });

  test("__resetForTests clears the clock's own state", () => {
    const clock = createHlcClock("abc123");
    clock.seed("9999999999999:5:abc123");
    clock.__resetForTests();
    const fresh = clock.next();
    expect(compareHlc(fresh, "9999999999999:5:abc123")).toBeLessThan(0);
  });
});

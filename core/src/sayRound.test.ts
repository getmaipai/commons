import { describe, expect, test } from "bun:test";
import { sayCount, sayDistance, sayFor, sayMinutes, sayMoney, sayTemperature } from "./sayRound";

describe("sayTemperature", () => {
  test.each([
    [72.4, "low seventies"], [75, "mid seventies"], [78, "high seventies"], [70, "about seventy"],
    [73, "low seventies"], [76, "mid seventies"], [77, "high seventies"], [99, "high nineties"],
    [20, "about twenty"], [21, "low twenties"], [0, "around zero"], [-1.4, "around zero"],
    [-5, "about minus five"], [-12, "about minus twelve"], [3, "about three"], [19, "about nineteen"],
    [104, "about one hundred four"],
  ])("%p -> %p", (v, out) => expect(sayTemperature(v as number)).toBe(out as string));
  test("Celsius uses the same bands", () => expect(sayTemperature(24, "C")).toBe("mid twenties"));
});

describe("sayMoney", () => {
  test.each([
    [29.97, "about thirty bucks"], [30, "thirty bucks"], [1, "a buck"], [1.2, "about a buck"],
    [7, "seven bucks"], [0.5, "under a dollar"], [0, "nothing"], [1234, "about twelve hundred bucks"],
    [1200, "twelve hundred bucks"], [12345, "about twelve thousand bucks"], [99.6, "about one hundred bucks"],
    [2_437_000, "about 2.4 million bucks"], [-30, "minus thirty bucks"],
  ])("%p -> %p", (v, out) => expect(sayMoney(v as number)).toBe(out as string));
  test("other currencies", () => {
    expect(sayMoney(29.97, "eur")).toBe("about thirty EUR");
    expect(sayMoney(1234, "GBP")).toBe("about twelve hundred GBP");
  });
});

describe("sayDistance", () => {
  test.each([
    [0.1, "a little ways"], [0.25, "half a mile"], [0.5, "half a mile"], [1, "about a mile"],
    [1.2, "about a mile"], [1.5, "a mile and a half"], [1.8, "a couple miles"], [2.5, "a couple miles"],
    [3.2, "about three miles"], [12, "about twelve miles"], [147, "about one hundred fifty miles"],
  ])("%p -> %p", (v, out) => expect(sayDistance(v as number)).toBe(out as string));
});

describe("sayMinutes", () => {
  test.each([
    [0.4, "under a minute"], [1, "a minute"], [2, "a couple minutes"], [3, "three, four minutes"],
    [7, "five, ten minutes"], [10, "about ten minutes"], [15, "about fifteen minutes"],
    [20, "about twenty minutes"], [30, "half an hour"], [45, "forty-five minutes or so"],
    [60, "about an hour"], [75, "about an hour and a quarter"], [90, "an hour and a half"],
    [110, "almost two hours"], [120, "a couple hours"], [150, "a couple hours"], [240, "about four hours"],
    [3000, "about two days"],
  ])("%p -> %p", (v, out) => expect(sayMinutes(v as number)).toBe(out as string));
});

describe("sayCount", () => {
  test("exact gives number words", () => {
    expect(sayCount(17, true)).toBe("seventeen");
    expect(sayCount(121, true)).toBe("one hundred twenty-one");
    expect(sayCount(0, true)).toBe("zero");
  });
  test.each([
    [0, "none"], [1, "one"], [3, "three"], [4, "a few"], [6, "a few"], [7, "several"], [9, "several"],
    [10, "a bunch"], [17, "a bunch"], [30, "a bunch"], [31, "a lot"], [500, "a lot"],
  ])("approximate %p -> %p", (v, out) => expect(sayCount(v as number, false)).toBe(out as string));
});

describe("sayFor", () => {
  test("dispatches by kind", () => {
    expect(sayFor("temperature", 72.4)).toBe("low seventies");
    expect(sayFor("temperature", 24, { unit: "c" })).toBe("mid twenties");
    expect(sayFor("money", 29.97)).toBe("about thirty bucks");
    expect(sayFor("money", 29.97, { currency: "EUR" })).toBe("about thirty EUR");
    expect(sayFor("distance", 1.8)).toBe("a couple miles");
    expect(sayFor("minutes", 7)).toBe("five, ten minutes");
    expect(sayFor("count", 17)).toBe("a bunch");
  });
  test("exact suppresses say", () => {
    expect(sayFor("temperature", 72.4, { exact: true })).toBeNull();
    expect(sayFor("count", 17, { exact: true })).toBeNull();
  });
  test("non-finite values and unknown kinds give null", () => {
    expect(sayFor("money", Number.NaN)).toBeNull();
    expect(sayFor("minutes", Infinity)).toBeNull();
    expect(sayFor("money", "5" as unknown as number)).toBeNull();
    expect(sayFor("weight" as never, 5)).toBeNull();
  });
  test("is deterministic", () => {
    expect(sayFor("distance", 0.6)).toBe(sayFor("distance", 0.6));
  });
});

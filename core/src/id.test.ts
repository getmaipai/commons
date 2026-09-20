import { describe, expect, test } from "bun:test";
import { newPrefixedId, randomSuffix } from "./id";

describe("randomSuffix", () => {
  test("produces a string of exactly the requested length", () => {
    expect(randomSuffix(10)).toHaveLength(10);
    expect(randomSuffix(16)).toHaveLength(16);
  });

  test("only uses lowercase letters and digits", () => {
    expect(randomSuffix(200)).toMatch(/^[a-z0-9]+$/);
  });

  test("is not deterministic across calls (no repeated seed)", () => {
    const values = new Set(Array.from({ length: 500 }, () => randomSuffix(10)));
    expect(values.size).toBe(500);
  });
});

describe("newPrefixedId", () => {
  test("matches <prefix>-<suffix> with the default length", () => {
    expect(newPrefixedId("person")).toMatch(/^person-[a-z0-9]{10}$/);
  });

  test("honors a custom suffix length", () => {
    expect(newPrefixedId("voice", 16)).toMatch(/^voice-[a-z0-9]{16}$/);
  });

  test("two calls with the same prefix are still unique", () => {
    expect(newPrefixedId("job")).not.toBe(newPrefixedId("job"));
  });
});

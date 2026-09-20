import { describe, expect, test } from "bun:test";
import { withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  test("resolves with the promise's own value when it settles first", async () => {
    const result = await withTimeout(Promise.resolve("done"), 1_000, () => new Error("should not fire"));
    expect(result).toBe("done");
  });

  test("rejects with onTimeout()'s own error when the deadline passes first", async () => {
    const neverResolves = new Promise<string>(() => {});
    await expect(withTimeout(neverResolves, 20, () => new Error("custom timeout message"))).rejects.toThrow("custom timeout message");
  });

  test("a distinct error class from onTimeout() survives the race - callers can tell a timeout apart from any other failure", async () => {
    class MyTimeoutError extends Error {}
    const neverResolves = new Promise<string>(() => {});
    await expect(withTimeout(neverResolves, 20, () => new MyTimeoutError("x"))).rejects.toBeInstanceOf(MyTimeoutError);
  });

  test("propagates the promise's own rejection unchanged when it rejects before the deadline", async () => {
    await expect(withTimeout(Promise.reject(new Error("real failure")), 1_000, () => new Error("should not fire"))).rejects.toThrow(
      "real failure",
    );
  });

  test("does not leave a live timer running after a fast resolution (no unhandled rejection from a stale timeout callback)", async () => {
    await withTimeout(Promise.resolve("done"), 20, () => new Error("should never fire"));
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
});

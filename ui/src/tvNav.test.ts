import { describe, expect, test, afterEach } from "bun:test";
import { ensureTvNavInit, pauseTvNavForOverlay, __resetTvNavForTests } from "./tvNav";

afterEach(() => __resetTvNavForTests());

describe("pauseTvNavForOverlay", () => {
  test("is a no-op before ensureTvNavInit() has ever run, on every surface that never initializes", () => {
    expect(() => pauseTvNavForOverlay(true)).not.toThrow();
    expect(() => pauseTvNavForOverlay(false)).not.toThrow();
  });

  test("nested open/close from two independent overlays never throws, whichever order they close in", () => {
    ensureTvNavInit();
    expect(() => {
      pauseTvNavForOverlay(true); // overlay A opens
      pauseTvNavForOverlay(true); // overlay B opens
      pauseTvNavForOverlay(false); // overlay B closes - A is still open
      pauseTvNavForOverlay(false); // overlay A closes
    }).not.toThrow();
  });

  test("closing more times than opened never goes negative or throws", () => {
    ensureTvNavInit();
    expect(() => {
      pauseTvNavForOverlay(false);
      pauseTvNavForOverlay(false);
    }).not.toThrow();
  });
});

describe("ensureTvNavInit", () => {
  test("is idempotent - calling it twice never throws", () => {
    expect(() => {
      ensureTvNavInit();
      ensureTvNavInit();
    }).not.toThrow();
  });
});

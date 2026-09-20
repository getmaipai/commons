import { describe, expect, test } from "bun:test";
import { CORE_WORKSPACE_PLACEHOLDER } from "./index";

describe("core workspace skeleton", () => {
  test("placeholder export exists until core-v0.1.0", () => {
    expect(CORE_WORKSPACE_PLACEHOLDER).toBe(true);
  });
});

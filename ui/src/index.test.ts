import { describe, expect, test } from "bun:test";
import { UI_WORKSPACE_PLACEHOLDER } from "./index";

describe("ui workspace skeleton", () => {
  test("placeholder export exists until ui-v0.1.0", () => {
    expect(UI_WORKSPACE_PLACEHOLDER).toBe(true);
  });
});

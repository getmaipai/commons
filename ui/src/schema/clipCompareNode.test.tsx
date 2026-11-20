import { afterEach, describe, expect, test } from "bun:test";
import { cleanup } from "@testing-library/react";
import { ClipCompareNodeSchema } from "@/kit/schema/types";
import { fixtureNode, mountBlock } from "../../tests/blockHarness";

afterEach(cleanup);
describe("clip_compare node", () => {
  test("parses the example and rejects remote media", () => {
    const node = fixtureNode("clip-compare.json");
    expect(ClipCompareNodeSchema.parse(node as never).mode).toBe("side_by_side");
    expect(ClipCompareNodeSchema.safeParse({ ...(node as object), before: { src: "https://example.test/a.mp4", kind: "video" } }).success).toBe(false);
  });
  test("renders same-origin before and after media with mode control", () => {
    const view = mountBlock(fixtureNode("clip-compare.json"));
    expect(view.getByText("Before")).toBeTruthy();
    expect(view.getByText("After")).toBeTruthy();
  });
});

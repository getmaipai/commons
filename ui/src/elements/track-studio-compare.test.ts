import { describe, expect, test } from "bun:test";
import { resolveCompare } from "./track-studio-compare";

describe("resolveCompare", () => {
  test("two sources pass through; the same source twice, or an empty one, is nothing to compare", () => {
    expect(resolveCompare({ before_url: "/a.m4a", after_url: "/b.m4a", label: "Before the EQ" })).toEqual({ before_url: "/a.m4a", after_url: "/b.m4a", label: "Before the EQ" });
    expect(resolveCompare({ before_url: "/a.m4a", after_url: "/a.m4a" })).toBeNull();
    expect(resolveCompare({ before_url: "", after_url: "/a.m4a" })).toBeNull();
    expect(resolveCompare(undefined)).toBeNull();
  });
  test("versions: the newest one earlier than the current; the first version has none", () => {
    const versions = [{ id: "v1", url: "/1" }, { id: "v2", url: "/2" }, { id: "v3", url: "/3" }];
    expect(resolveCompare({ versions, current_id: "v3" })).toEqual({ before_url: "/2", after_url: "/3", label: undefined });
    expect(resolveCompare({ versions, current_id: "v2" })?.before_url).toBe("/1");
    expect(resolveCompare({ versions, current_id: "v1" })).toBeNull();
    expect(resolveCompare({ versions, current_id: "nope" })).toBeNull();
  });
});

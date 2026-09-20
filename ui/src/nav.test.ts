import { describe, expect, test } from "bun:test";
import { isActiveNavPath } from "./nav";

describe("isActiveNavPath", () => {
  test("the root entry matches only the exact root path", () => {
    expect(isActiveNavPath("/", "/")).toBe(true);
    expect(isActiveNavPath("/apps", "/")).toBe(false);
  });

  test("an exact match is active", () => {
    expect(isActiveNavPath("/apps", "/apps")).toBe(true);
  });

  test("a real sub-path is active", () => {
    expect(isActiveNavPath("/apps/weather", "/apps")).toBe(true);
  });

  test("one route that is merely a string prefix of another is never falsely active", () => {
    expect(isActiveNavPath("/media-library", "/media")).toBe(false);
    expect(isActiveNavPath("/media", "/media-library")).toBe(false);
  });

  test("an unrelated path is not active", () => {
    expect(isActiveNavPath("/settings", "/apps")).toBe(false);
  });
});

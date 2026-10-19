import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8");

describe("deprecated cinema page tone", () => {
  test("tokens.css has no page-tone selector or cinema tokens", () => {
    expect(css).not.toContain("data-page-tone");
    expect(css).not.toContain("--cinema-");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "tokens.css"), "utf8");

describe("WORKSPACE-FILL-01: a page marked data-workspace-fill fills the rail workspace", () => {
  const block = /\[data-slot="rail-body"\]:has\(\[data-workspace-fill\]\) > \.container \{([^}]*)\}/.exec(css);
  test("the rail body's container drops its width cap, margin and padding for such a page", () => {
    expect(block).not.toBeNull();
    const body = block![1]!;
    expect(body).toMatch(/max-width:\s*none/);
    expect(body).toMatch(/margin:\s*0/);
    expect(body).toMatch(/padding:\s*0/);
  });
  test("no other page is affected: the rule needs the marker", () => {
    expect(css.match(/rail-body"\]:has\(/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(css).not.toMatch(/\[data-slot="rail-body"\] > \.container \{\s*max-width:\s*none/);
  });
  test("WORKSPACE-FILL-02: the workspace is one viewport tall and the content scrolls inside it", () => {
    expect(css).toMatch(/\[data-slot="rail-workspace"\]:has\(\[data-workspace-fill\]\) \{[^}]*height:\s*100svh/);
    expect(css).toMatch(/\[data-slot="rail-body"\]:has\(\[data-workspace-fill\]\) \{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\[data-workspace-fill\] \{[^}]*min-height:\s*0/);
  });
});

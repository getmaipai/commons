import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("StoryFeed phone tokens and strip", () => {
  test("sets the phone hero ratio and keeps scrolling pill strips steady", () => {
    expect(css).toContain("@media (max-width: 639.98px)");
    expect(css).toContain("--story-hero-ratio: 4 / 3");
    for (const selector of ['[data-slot="story-filters"]', '[data-slot="tabs-list"][data-variant="pill"]']) expect(css).toContain(selector);
    for (const rule of ["touch-action: pan-x", "overflow-y: hidden", "overscroll-behavior-x: contain", "scrollbar-width: none", "::-webkit-scrollbar", "mask-image: none", "-webkit-mask-image: none"]) expect(css).toContain(rule);
    expect(css).toContain('[data-slot="tabs-list"][data-variant="pill"] [data-slot="tabs-trigger"]');
  });

  test("a child's phone is one column through the page root's age band", () => {
    expect(css).toContain('html[data-age-band="child"] [data-slot="story-grid"]');
  });
});

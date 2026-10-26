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

  test("the lead spans both columns with a 22 px headline and the other cards use 15 px", () => {
    expect(css).toContain('[data-slot="story-grid"] [data-slot="story-card"][data-tier="hero"] { grid-column: 1 / -1; }');
    expect(css).toContain("font-size: 1.375rem");
    expect(css).toContain("font-size: 0.9375rem");
  });

  test("a feed with chips puts the strip in the shell bar row and hides its title block", () => {
    expect(css).toContain('[data-slot="story-feed"] > [data-slot="story-header"] { display: none; }');
    expect(css).toContain('[data-slot="story-feed"] > [data-slot="tabs"] { position: sticky; top: 0;');
    expect(css).toContain("[data-top-row-hide]");
  });

  test("the reader's sticky header keeps its resting offset and a section-bar app starts its page under the menu button", () => {
    expect(css).toContain('html[data-app-reading] [data-slot="article-sticky-header"] { top: 1rem; }');
    expect(css).toContain(':has([data-slot="phone-nav"]) [data-slot="rail-body"] { padding-top: 0; }');
  });

  test("a phone video watch page uses a floating shell header and full-bleed player", () => {
    expect(css).toContain('html:has([data-slot="player"][data-layout="video"]) [data-slot="rail-page-header"]');
    expect(css).toContain('html:has([data-slot="player"][data-layout="video"]) [data-slot="rail-body"] { padding-top: 0; }');
    expect(css).toContain('html:has([data-slot="player"][data-layout="video"]) [data-slot="player"]');
    expect(css).toContain("margin-inline: -1rem");
    expect(css).toContain("margin-top: -1rem");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("z-index: 40");
  });
});

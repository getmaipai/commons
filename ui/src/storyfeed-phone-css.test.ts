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

  test("section-bar apps start their page under the menu button", () => {
    expect(css).toContain('html:has([data-slot="phone-nav"]):not(:has([data-slot="story-filters"]):not(:has([data-slot="schema-page-body"] > * ~ * [data-slot="story-filters"]))) [data-slot="rail-body"], html:has([data-header-flat]) [data-slot="rail-body"] { padding-top: 0; }');
  });

  test("reader and detail controls form a second row and provider labels wrap below it", () => {
    expect(css).toContain('[data-slot="article-toolbar"], [data-slot="page-controls"] { display: flex; align-items: center; gap: 0.25rem; height: auto; min-height: 3rem; margin-top: 0; padding: 0.25rem 0.5rem; background: var(--background); }');
    expect(css).toContain('[data-slot="page-controls"] { position: sticky; top: 0; z-index: 30; }');
    expect(css).not.toContain('[data-slot="page-controls"] { position: sticky; top: 0; z-index: 30; margin-inline');
    expect(css).toContain('[data-slot="page-controls"] button { min-width: 44px; min-height: 44px; border-radius: 999px;');
    expect(css).toContain('[data-slot="article-sticky-header"] { top: 0; margin-bottom: 0; }');
    expect(css).toContain('[data-slot="article-toolbar-title"] { display: none; }');
    expect(css).toContain('[data-slot="article-provider"] { top: 3.25rem; justify-content: center; padding-inline: 1rem;');
    expect(css).toContain('[data-slot="article-column"] { margin-top: 0; padding-top: 1rem; }');
    expect(css).toContain('[data-slot="article-provider-label"] { white-space: normal; display: -webkit-box;');
  });

  test("a phone video watch page keeps the shell header and uses a full-bleed player", () => {
    expect(css).toContain('html:has([data-slot="player"][data-layout="video"]) [data-slot="player"]');
    expect(css).toContain("margin-inline: -1rem");
    expect(css).toContain("width: auto");
    const phone = css.slice(css.indexOf('@media (max-width: 639.98px)'), css.indexOf('@media', css.indexOf('@media (max-width: 639.98px)') + 1));
    expect(phone).not.toContain("data-app-reading");
    expect(phone).not.toContain('html:has([data-slot="player"][data-layout="video"]) [data-slot="rail-page-header"]');
    expect(phone).not.toContain('html:has([data-slot="player"][data-layout="video"]) [data-top-row-hide]');
    expect(phone).not.toContain('[data-slot="mobile-menu-button"] { z-index: 50; }');
  });

  test("data-header-flat gets the flat phone bar geometry", () => {
    expect(css).toContain('html:has([data-header-flat]) [data-slot="rail-page-header"]');
    expect(css).toContain('html:has([data-header-flat]) [data-slot="rail-body"]');
  });

  test("the chips bar spans the row so the avatar sits at the right and the chips keep clear of the controls", () => {
    expect(css).toContain('[data-slot="story-filters"]):not(:has([data-slot="schema-page-body"] > * ~ * [data-slot="story-filters"])) [data-slot="rail-page-header"] { position: fixed; inset: 0 0 auto 0;');
    expect(css).toContain('[data-slot="rail-page-header"] > * { pointer-events: auto; }');
    expect(css).toContain("padding: 0 3.75rem 0 3.75rem;");
    expect(css).toContain("padding-inline-end: 6.5rem;");
    expect(css).toContain('):not(:has([data-slot="schema-page-body"] > * ~ * [data-slot="story-filters"])):has([data-slot="rail-header-right"]) [data-slot="story-feed"] > [data-slot="tabs"] { padding-inline-end: 6.5rem;');
  });

  test("a feed with something above it is flat", () => {
    expect(css).toContain('html:has([data-slot="story-feed"] > [data-slot="tabs"] [data-slot="story-filters"]):has([data-slot="schema-page-body"] > * ~ * [data-slot="story-filters"]) [data-slot="story-feed"] > [data-slot="tabs"]');
    expect(css).toContain(' [data-slot="story-filters"] { display: flex; width: 100%; max-width: 100%; justify-content: flex-start; overflow-x: auto; padding-inline: 1rem;');
    expect(css).toContain('mask-image: linear-gradient(to right');
    expect(css).toContain('[data-slot="story-filters"]):not(:has([data-slot="schema-page-body"] > * ~ * [data-slot="story-filters"]))');
  });
});

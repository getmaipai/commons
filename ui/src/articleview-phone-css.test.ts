import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const phoneCss = css.slice(css.indexOf("@media (max-width: 639.98px)"), css.indexOf("\n}", css.indexOf("@media (max-width: 639.98px)")) + 2);

describe("ArticleView phone styles", () => {
  test("floats the controls and sizes the reader content", () => {
    expect(phoneCss).toContain('[data-slot="article-toolbar"]');
    expect(phoneCss).toContain("background: transparent");
    expect(phoneCss).toContain('[data-slot="article-actions"]');
    expect(phoneCss).toContain("border-radius: 999px");
    expect(phoneCss).toContain("font-size: 1.5rem");
    expect(phoneCss).toContain("font-size: 1.125rem");
    expect(phoneCss).toContain("--article-lead-ratio: 4 / 3");
    expect(phoneCss).toContain("border-radius: 12px");
  });

  test("keeps child reader text and toolbar targets large", () => {
    expect(css).toContain('html[data-age-band="child"] [data-slot="article-body"]');
    expect(css).toContain("font-size: 1.375rem");
    expect(css).toContain('html[data-age-band="child"] [data-slot="article-toolbar"] button');
    expect(css).toContain("min-height: 52px");
    expect(css).toContain("min-width: 52px");
  });
});

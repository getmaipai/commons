import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("the compact composer textarea is a block, so no descender gap lifts the text off the controls' centre line", () => {
  const css = readFileSync(new URL("./thread-composer.css", import.meta.url), "utf8");
  const rule = css.match(/\[data-density="compact"\] textarea \{[^}]*\}/);
  expect(rule?.[0]).toContain("display: block");
});

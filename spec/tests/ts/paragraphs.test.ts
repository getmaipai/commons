// GENUI-13a: the shared paragraph helper. Every case in fixtures/paragraphs/cases.json must come out the same here and
// in tests/py/test_paragraphs.py.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { atParagraphBoundary, insideCodeFence, paragraphCount, paragraphCut, splitAfterParagraph } from "../../interpreters/ts/paragraphs.js";

const cases = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "paragraphs", "cases.json"), "utf8"));

describe("paragraph helper", () => {
  for (const c of cases.count) test(`count: ${c.name}`, () => expect(paragraphCount(c.text)).toBe(c.count));
  for (const c of cases.split) {
    test(`split: ${c.name}`, () => {
      const [before, after] = splitAfterParagraph(c.text, c.n);
      expect([before, after]).toEqual([c.before, c.after]);
      expect(before + after).toBe(c.text);
    });
  }
  for (const c of cases.cut) test(`cut: ${c.name}`, () => expect(paragraphCut(c.released, c.piece)).toBe(c.cut));
  for (const c of cases.boundary) test(`boundary: ${c.name}`, () => expect(atParagraphBoundary(c.released)).toBe(c.at));

  test("the fence test is the parity of the ``` markers", () => {
    expect(insideCodeFence("")).toBe(false);
    expect(insideCodeFence("```js\nx")).toBe(true);
    expect(insideCodeFence("```js\nx\n```")).toBe(false);
  });

  test("a stored count and the split agree: splitting after the count of the text before the split gives the same cut", () => {
    const text = "One.\n\nTwo.\n\n```\nx\n\ny\n```\n\nThree.\n\nFour.";
    for (let n = 1; n <= paragraphCount(text); n++) {
      const [before] = splitAfterParagraph(text, n);
      if (before === text) continue;
      expect(paragraphCount(before)).toBe(n);
    }
  });

  test("it is the count the hub's pre-13a placer made for text without a fence", () => {
    const old = (t: string): number => t.split(/\n[ \t]*\n\s*/).filter((p) => p.trim().length > 0).length;
    for (const t of ["", "a", "a\n\nb", "a\n\nb\n\n", "\n\na\n\n\n\nb\nc\n\nd", "a\n \nb"]) expect(paragraphCount(t)).toBe(old(t));
  });
});

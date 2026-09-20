import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { FilterColumn } from "@/kit/blocks/filter-column/FilterColumn";

afterEach(cleanup);

const GROUP = { id: "category", title: "Category", options: [{ id: "Fun", label: "Fun", count: 2 }], selected: new Set<string>(), onChange: () => undefined };

// Regression: a group's own collapse/expand toggle and "Clear filters"
// both carried no touch-target treatment at all - axe measured the
// group toggle as small as 206x20px and "Clear filters" at 84x36px,
// both under docs/UI.md's 48px floor, on the Apps page's first real
// filter column (found live, before this shipped).
//
// A first fix attempt applied hitArea(3) to both as-is - a review
// caught the math: hitArea(3) is a fixed +24px (12px a side), so a
// 20px box only reaches 44px, still short. The toggle also needed
// `py-1` (+8px) to actually clear the floor (20+8+24=52); "Clear
// filters" needed hitArea(2), not (1) (36+16=52, where 36+8=44 still
// missed it - hitArea's own doc comment buckets a 32px box to step 2
// and a 40px box to step 1, and 36px sits between them, but only step
// 2 actually clears 48 from there).
test("a filter group's collapse toggle and Clear filters both carry a real touch-target extension", () => {
  render(<FilterColumn search={{ value: "", onChange: () => undefined }} groups={[GROUP]} onClear={() => undefined} />);
  const toggle = document.querySelector("button[aria-label='Collapse Category']")!;
  expect(toggle.className).toContain("before:-inset-3");
  expect(toggle.className).toContain("py-1");
  const clear = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Clear filters")!;
  expect(clear.className).toContain("before:-inset-2");
});

// Regression: the same review that caught the undersized hitArea steps
// above also caught this - an expanded group's toggle overhangs 12px
// below its own bottom edge (hitArea(3)), and CollapsibleContent's old
// `mt-2` (8px) left only 8px of clearance, so the overhang reached 4px
// into the first filter option's own 48px-tall clickable row: a tap in
// that sliver toggled the group closed instead of selecting the
// option. `mt-3` (12px) exactly cancels a 12px overhang.
test("an expanded group's first option sits clear of the toggle's own touch-target overhang", () => {
  render(<FilterColumn search={{ value: "", onChange: () => undefined }} groups={[GROUP]} onClear={() => undefined} />);
  const content = document.querySelector("[data-slot='collapsible-content']")!;
  expect(content.className).toContain("mt-3");
});

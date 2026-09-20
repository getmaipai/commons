import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { ChipRow } from "@/kit/blocks/phone/ChipRow";
import { ListRow } from "@/kit/blocks/phone/ListRow";

afterEach(cleanup);

// Regression: `min-h-11` (44px) missed docs/UI.md's 48px touch-target
// floor by 4px - caught live by the a11y gate on the Apps page's first
// real phone use of this row.
test("ChipRow's chips clear the 48px touch-target floor", () => {
  render(<ChipRow chips={["All", "Fun"]} active="All" />);
  const chip = document.querySelector("button")!;
  expect(chip.className).toContain("min-h-12");
});

// Regression: `text-emerald-600`/`text-amber-600` are raw, non-theme-aware
// Tailwind classes - axe caught emerald-600 failing AA on the phone
// list's light-theme background, live, before this shipped. The dot and
// text both switch to the same hue var this fix picks per tone.
test("ListRow's status text no longer uses a raw, unthemed Tailwind color class", () => {
  render(<ListRow name="Weather" status="Ready" tone="ready" />);
  const status = document.body.textContent;
  expect(status).toContain("Ready");
  const statusSpan = Array.from(document.querySelectorAll("span")).find((span) => span.textContent === "Ready")!;
  expect(statusSpan.className).not.toContain("text-emerald-600");
});

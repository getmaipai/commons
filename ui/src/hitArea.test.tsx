// Regression for the shared hitArea helper (docs/UI.md's 48 px floor):
// one place for the pseudo-element hit-area extension that was previously
// hand-derived in button.tsx, toggle.tsx and checkbox.tsx.
import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { hitArea } from "@/kit/utils";
import { Button } from "@/kit/ui/button";
import { Toggle } from "@/kit/ui/toggle";
import { Checkbox } from "@/kit/ui/checkbox";

afterEach(cleanup);

describe("hitArea helper", () => {
  test("returns the three full literal class strings", () => {
    expect(hitArea(1)).toBe("relative before:absolute before:-inset-1 before:content-['']");
    expect(hitArea(2)).toBe("relative before:absolute before:-inset-2 before:content-['']");
    expect(hitArea(3)).toBe("relative before:absolute before:-inset-3 before:content-['']");
  });

  test("Button's compact sizes keep the inset they had before the helper", () => {
    const xs = render(<Button size="xs">Save</Button>).getByRole("button");
    expect(xs.className).toContain("relative");
    expect(xs.className).toContain("before:-inset-3");
    cleanup();

    const sm = render(<Button size="sm">Save</Button>).getByRole("button");
    expect(sm.className).toContain("relative");
    expect(sm.className).toContain("before:-inset-2");
    cleanup();

    const iconXs = render(<Button size="icon-xs" aria-label="x" />).getByRole("button");
    expect(iconXs.className).toContain("relative");
    expect(iconXs.className).toContain("before:-inset-3");
    cleanup();

    const iconSm = render(<Button size="icon-sm" aria-label="x" />).getByRole("button");
    expect(iconSm.className).toContain("relative");
    expect(iconSm.className).toContain("before:-inset-2");
    cleanup();

    const iconLg = render(<Button size="icon-lg" aria-label="x" />).getByRole("button");
    expect(iconLg.className).toContain("relative");
    expect(iconLg.className).toContain("before:-inset-1");
  });

  test("Toggle's compact sizes keep the inset they had before the helper", () => {
    const sm = render(<Toggle size="sm" aria-label="bold" />).getByRole("button");
    expect(sm.className).toContain("relative");
    expect(sm.className).toContain("before:-inset-2");
    cleanup();

    const lg = render(<Toggle size="lg" aria-label="bold" />).getByRole("button");
    expect(lg.className).toContain("relative");
    expect(lg.className).toContain("before:-inset-1");
  });

  test("Checkbox's tap area keeps its stretched inset", () => {
    const el = render(<Checkbox />).getByRole("checkbox");
    expect(el.className).toContain("relative");
    expect(el.className).toContain("after:-inset-4");
  });
});

import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Textarea } from "./textarea";

afterEach(cleanup);

test("a textarea with maxRows scrolls inside itself past that height instead of growing", () => {
  const { container } = render(<Textarea maxRows={8} shape="rounded" />);
  const area = container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(area.className).toContain("overflow-y-auto"); expect(area.style.getPropertyValue("--textarea-max-rows")).toBe("8");
});

test("without maxRows the textarea is unchanged", () => {
  const { container } = render(<Textarea />);
  const area = container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(area.className).not.toContain("overflow-y-auto"); expect(area.getAttribute("style")).toBeNull();
});

test("textarea defaults retain their original classes and surface fill combines with rounded shape", () => {
  const baseline = render(<Textarea />).container.querySelector("textarea")!;
  expect(baseline.className).toBe("flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40");
  const surface = render(<Textarea fill="surface" shape="rounded" />).container.querySelector("textarea")!;
  expect(surface.className).toContain("bg-[var(--surface-1)]");
  expect(surface.className).toContain("border-transparent");
  expect(surface.className).toContain("shadow-none");
  expect(surface.className).toContain("rounded-2xl px-4 py-3");
  expect(surface.className).toContain("focus-visible:ring-3");
});

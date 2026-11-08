import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

afterEach(cleanup);

test("EmptyState default stays unchanged and tile variant renders its title and action", () => {
  const baseline = render(<EmptyState icon="check" text="Nothing here" />).container.firstElementChild!;
  expect(baseline.className).toBe("flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center");
  const { container, getByRole, getByText } = render(<EmptyState variant="tile" icon="check" title="No saved clips" text="Your clips will appear here." accent="hero" actionLabel="Browse" onAction={() => {}} />);
  expect(getByRole("heading", { name: "No saved clips" }).className).toBe("text-[22px] font-semibold");
  expect(getByText("Your clips will appear here.").className).toBe("text-sm text-[var(--muted-foreground)]");
  expect(getByRole("button", { name: "Browse" }).className).toContain("rounded-full");
  const tile = container.querySelector("[class*='size-24']")!;
  expect(tile.className).toContain("size-24");
  expect(tile.className).toContain("var(--accent-hero)");
});

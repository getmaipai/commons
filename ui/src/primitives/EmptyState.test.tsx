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

test("actionVariant maps to the kit Button looks; left out, the button stays secondary", () => {
  const draw = (actionVariant?: "default" | "secondary" | "ghost" | "outline", variant?: "tile") => {
    const button = render(<EmptyState icon="check" text="Nothing here" variant={variant} actionLabel="Add one" onAction={() => {}} actionVariant={actionVariant} />).getByRole("button", { name: "Add one" });
    const look = { variant: button.getAttribute("data-variant"), className: button.className };
    cleanup();
    return look;
  };
  for (const variant of [undefined, "tile"] as const) {
    const baseline = draw(undefined, variant);
    expect(baseline.variant).toBe("secondary");
    expect(draw("secondary", variant)).toEqual(baseline);
    for (const look of ["default", "ghost", "outline"] as const) expect(draw(look, variant).variant).toBe(look);
  }
  expect(draw("default").className).toContain("bg-primary");
  expect(draw("outline").className).toContain("border");
  expect(draw("outline", "tile").className).toContain("rounded-full");
});

test("actionVariant leaves the second button ghost", () => {
  const second = (actionVariant?: "outline") => {
    const className = render(<EmptyState icon="check" text="Nothing here" actionLabel="Add one" onAction={() => {}} actionVariant={actionVariant} secondaryLabel="Later" onSecondary={() => {}} />).getByRole("button", { name: "Later" }).className;
    cleanup();
    return className;
  };
  expect(second("outline")).toBe(second());
});

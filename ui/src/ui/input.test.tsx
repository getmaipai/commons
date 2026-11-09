import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Input } from "./input";

describe("Input valid", () => {
  test("valid sets data-valid and the success classes; default has neither", () => {
    const on = render(<Input aria-label="a" valid />).getByLabelText("a");
    expect(on.getAttribute("data-valid")).toBe("true");
    expect(on.className).toContain("--hue-teal");
    expect(render(<Input aria-label="b" />).getByLabelText("b").hasAttribute("data-valid")).toBe(false);
  });
});

test("Input defaults retain the exact class list and surface fill combines with pill shape", () => {
  const base = render(<Input aria-label="default" />).getByLabelText("default");
  expect(base.className).toBe("h-12 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[valid=true]:border-[color:var(--hue-teal)] data-[valid=true]:ring-[color:var(--hue-teal)]/30 data-[valid=true]:aria-invalid:border-destructive");
  const surface = render(<Input aria-label="surface" fill="surface" shape="pill" />).getByLabelText("surface");
  expect(surface.className).toContain("bg-[var(--surface-1)]");
  expect(surface.className).toContain("border-transparent");
  expect(surface.className).toContain("shadow-none");
  expect(surface.className).toContain("rounded-full px-5");
  expect(surface.className).toContain("focus-visible:ring-[3px]");
});


test("Input leading content sits inside a pill and adjusts its start padding", () => {
  const { getByLabelText, getByTestId } = render(<Input aria-label="Ask" shape="pill" leading={<svg data-testid="sparkle" />} />);
  expect(getByTestId("sparkle").parentElement?.className).toContain("absolute");
  expect(getByLabelText("Ask").className).toContain("ps-11");
  expect(getByLabelText("Ask").className).toContain("pe-5");
});

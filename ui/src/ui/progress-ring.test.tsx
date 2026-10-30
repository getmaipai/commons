import { render } from "@testing-library/react";
import { expect, test } from "bun:test";
import { ProgressRing } from "./progress-ring";

test("ProgressRing exposes its percentage and label", () => {
  const { getByRole } = render(<ProgressRing value={0.375} label="Timer progress">12:30</ProgressRing>);
  const progress = getByRole("progressbar", { name: "Timer progress" });
  expect(progress.getAttribute("aria-valuenow")).toBe("38");
  expect(progress.textContent).toContain("12:30");
});

test("ProgressRing defaults to primary and supports muted tone", () => {
  const { container, rerender } = render(<ProgressRing value={0.5} label="Progress" />);
  expect(container.querySelector('[data-tone="primary"]')).not.toBeNull();
  rerender(<ProgressRing value={0.5} label="Progress" tone="muted" />);
  expect(container.querySelector('[data-tone="muted"]')).not.toBeNull();
});

test("reduced motion disables the arc transition and animated can be disabled", () => {
  const { container, rerender } = render(<ProgressRing value={0.5} label="Progress" />);
  const arc = container.querySelector('[data-slot="progress-ring-arc"]') as SVGCircleElement;
  expect(arc.getAttribute("data-animated")).toBe("true");
  expect(arc.getAttribute("class")).toContain("motion-reduce:transition-none");
  rerender(<ProgressRing value={0.5} label="Progress" animated={false} />);
  expect(arc.getAttribute("data-animated")).toBe("false");
});

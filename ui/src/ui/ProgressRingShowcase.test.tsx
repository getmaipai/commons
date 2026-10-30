import { render } from "@testing-library/react";
import { expect, test } from "bun:test";
import { ProgressRingShowcase } from "./ProgressRingShowcase";

test("ProgressRing showcase demonstrates both tones", () => {
  const { container, getByText } = render(<ProgressRingShowcase />);
  expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(2);
  expect(getByText("68%")).toBeTruthy();
});

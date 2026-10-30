import { render } from "@testing-library/react";
import { expect, test } from "bun:test";
import { TabsBottomShowcase } from "./TabsBottomShowcase";

test("bottom tabs showcase lists phone destinations", () => {
  const { getByText, container } = render(<TabsBottomShowcase />);
  expect(getByText("Home")).toBeTruthy();
  expect(getByText("Library")).toBeTruthy();
  expect(container.querySelector('[data-variant="bottom"]')).not.toBeNull();
});

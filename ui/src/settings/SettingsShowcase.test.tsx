import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { SettingsShowcase } from "./SettingsShowcase";

afterEach(cleanup);

test("the showcase draws one card of setting rows with inset dividers and md switches", () => {
  const { container, getAllByRole } = render(<SettingsShowcase />);
  expect(container.querySelectorAll("[data-slot=item-group][data-variant=card]")).toHaveLength(1);
  expect(container.querySelectorAll("[data-slot=item][data-size=setting]")).toHaveLength(5);
  expect(container.querySelectorAll("[data-slot=item-separator][data-variant=inset]")).toHaveLength(4);
  expect(container.querySelectorAll("[data-slot=switch][data-size=md]")).toHaveLength(2);
  expect(getAllByRole("button", { name: "Change" })).toHaveLength(1);
});

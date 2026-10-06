import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { EmptyStateSuggestion } from "./empty-state";

afterEach(cleanup);

describe("EmptyStateSuggestion", () => {
  test("keeps a 48px touch target around the 36px chip through a pseudo-element", () => {
    const { getByRole } = render(<EmptyStateSuggestion>Plan a week of dinners</EmptyStateSuggestion>);
    const chip = getByRole("button", { name: "Plan a week of dinners" });
    expect(chip.className).toContain("before:-inset-y-1.5");
    expect(chip.className).toContain("relative");
  });
});

import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { NumberTicker } from "./number-ticker";

describe("NumberTicker", () => {
  test("renders its label with the contrast-safe muted foreground token", () => {
    const view = render(<NumberTicker value={42} label="People" />);

    const label = view.getByText("People");
    expect(label.className).toContain("text-muted-foreground");
    expect(label.className).not.toContain("text-foreground/35");
  });
});

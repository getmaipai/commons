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

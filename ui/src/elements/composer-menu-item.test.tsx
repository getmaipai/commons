import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ComposerMenuItem } from "./composer";

afterEach(cleanup);

describe("ComposerMenuItem", () => {
  test("keeps the 48 px touch-target floor as a minimum height", () => {
    const { getByRole } = render(<ComposerMenuItem>Add files</ComposerMenuItem>);
    expect(getByRole("button").className).toContain("min-h-12");
  });
});

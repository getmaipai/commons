import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ComposerMenu, ComposerMenuItem } from "./composer";

afterEach(cleanup);

describe("ComposerMenuItem", () => {
  test("keeps the 48 px touch-target floor as a minimum height, in px (min-h-12 measured 47 in Home)", () => {
    const { getByRole } = render(<ComposerMenuItem>Add files</ComposerMenuItem>);
    expect(getByRole("button").className).toContain("min-h-[48px]");
  });

  test("a closed menu is invisible, so its rows are neither measured, tabbed nor read", () => {
    const { container } = render(<ComposerMenu open={false}><ComposerMenuItem>Add files</ComposerMenuItem></ComposerMenu>);
    expect(container.querySelector('[data-slot="composer-menu"]')?.className).toContain("invisible");
    cleanup();
    const open = render(<ComposerMenu open><ComposerMenuItem>Add files</ComposerMenuItem></ComposerMenu>);
    expect(open.container.querySelector('[data-slot="composer-menu"]')?.className).not.toContain("invisible");
  });
});

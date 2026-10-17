import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

afterEach(cleanup);

describe("DropdownMenuContent density", () => {
  const open = (density?: "compact") =>
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>t</DropdownMenuTrigger>
        <DropdownMenuContent density={density}>
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

  test("defaults to the default density", () => {
    open();
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')?.getAttribute("data-density")).toBe("default");
  });

  test("compact is exposed on the content for its items to follow", () => {
    open("compact");
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')?.getAttribute("data-density")).toBe("compact");
    expect(document.querySelector('[data-slot="dropdown-menu-item"]')?.className).toContain("in-data-[density=compact]:min-h-8");
  });
});

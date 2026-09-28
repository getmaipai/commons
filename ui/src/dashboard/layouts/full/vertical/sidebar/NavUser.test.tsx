import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "../../../../components/ui/sidebar";
import { NavUser } from "./NavUser";

afterEach(cleanup);

describe("NavUser", () => {
  test("Settings and Help are links without nested button controls", () => {
    const { getByRole } = render(
      <MemoryRouter>
        <SidebarProvider>
          <NavUser />
        </SidebarProvider>
      </MemoryRouter>,
    );

    for (const name of ["Settings", "Help"]) {
      const link = getByRole("link", { name });
      expect(link.closest("button")).toBeNull();
    }
  });
});

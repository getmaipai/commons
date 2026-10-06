import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import RailProfileMenu, { type RailProfileMenuProps } from "./RailProfileMenu";

afterEach(cleanup);

async function openMenu(props: Partial<RailProfileMenuProps>) {
  const view = render(
    <MemoryRouter>
      <TooltipProvider>
        <RailProfileMenu
          displayName="Sage Willow"
          subtitle="Owner"
          notifications={{ count: 0, onOpen: () => {} }}
          status={{ label: "All good", level: "online", href: "/status" }}
          incognito={{ on: false, onChange: () => {} }}
          helpHref="/help"
          onLogout={() => {}}
          {...props}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
  fireEvent.click(view.getByRole("button", { name: /Open profile menu/ }));
  await waitFor(() => expect(view.getByRole("menuitem", { name: /Settings/ })).toBeTruthy());
  return view;
}

const rowNames = (view: ReturnType<typeof render>) =>
  view.getAllByRole("menuitem").map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());

describe("KIT-SET-04 homeSettings row", () => {
  test("no homeSettings prop draws no Home settings row", async () => {
    const view = await openMenu({});
    expect(rowNames(view).some((n) => n.includes("Home settings"))).toBe(false);
    expect(rowNames(view)).toEqual(["NotificationsNone", "System statusAll good", "IncognitoOff", "Settings", "Help", "Log out"]);
  });

  test("the prop draws the row straight after Settings, linking to its href with the host's copy", async () => {
    const view = await openMenu({ homeSettings: { href: "/settings/home", label: "Home settings" } });
    expect(rowNames(view)).toEqual(["NotificationsNone", "System statusAll good", "IncognitoOff", "Settings", "Home settings", "Help", "Log out"]);
    const row = view.getByRole("menuitem", { name: "Home settings" });
    expect(row.getAttribute("href")).toBe("/settings/home");
  });

  test("the label is copy passed by the host, not fixed in the kit", async () => {
    const view = await openMenu({ homeSettings: { href: "/settings/home", label: "Household" } });
    expect(view.getByRole("menuitem", { name: "Household" }).getAttribute("href")).toBe("/settings/home");
    expect(rowNames(view).some((n) => n.includes("Home settings"))).toBe(false);
  });

  test("the Incognito row is untouched by the new prop: still a toggle that reports its change", async () => {
    const changes: boolean[] = [];
    const view = await openMenu({
      incognito: { on: false, onChange: (on) => changes.push(on) },
      homeSettings: { href: "/settings/home", label: "Home settings" },
    });
    const incognito = view.getByRole("menuitem", { name: /Incognito/ });
    expect(incognito.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(incognito);
    expect(changes).toEqual([true]);
  });
});

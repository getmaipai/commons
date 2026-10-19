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
  test("profile menu trigger renders data-tour when tourId is set; renders no data-tour attribute otherwise", () => {
    const view = render(<MemoryRouter><TooltipProvider><RailProfileMenu displayName="Sage" tourId="shell.profile" /></TooltipProvider></MemoryRouter>);
    const trigger = view.getByRole("button", { name: /Open profile menu/ });
    expect(trigger.getAttribute("data-tour")).toBe("shell.profile");
    cleanup();
    const plain = render(<MemoryRouter><TooltipProvider><RailProfileMenu displayName="Sage" /></TooltipProvider></MemoryRouter>);
    expect(plain.getByRole("button", { name: /Open profile menu/ }).hasAttribute("data-tour")).toBe(false);
  });

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

  test("Help entries render under the supplied label and invoke onSelect", async () => {
    const selected: string[] = [];
    const view = await openMenu({ helpEntries: { label: "Show me around", items: [
      { label: "Your Home", onSelect: () => selected.push("home") },
      { label: "Chat", onSelect: () => selected.push("chat") },
    ] } });
    expect(rowNames(view).slice(-5)).toEqual(["Help", "Show me around", "Your Home", "Chat", "Log out"]);
    fireEvent.click(view.getByRole("menuitem", { name: "Show me around: Chat" }));
    expect(selected).toEqual(["chat"]);
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

describe("STATUS-COLORS-01 menu count badge", () => {
  // Owner bug: hovering a menu row focuses it, and the kit item's
  // `focus:**:text-accent-foreground` recolors every descendant, so the
  // count badge (bg-foreground) got accent-foreground text: light on light
  // in dark mode. The badge's own text color must win over that rule.
  test.each([
    [false, "bg-foreground", "text-background!"],
    [true, "bg-destructive", "text-destructive-foreground!"],
  ])("count badge (urgent %p) keeps its own text color through item focus", async (urgent, bg, text) => {
    const view = await openMenu({ notifications: { count: 22, urgent, onOpen: () => {} } });
    const badge = view.getByRole("menuitem", { name: /Notifications/ }).querySelector("[data-slot='rail-profile-menu-badge']");
    expect(badge?.className).toContain(bg);
    expect(badge?.className.split(" ")).toContain(text);
  });
});

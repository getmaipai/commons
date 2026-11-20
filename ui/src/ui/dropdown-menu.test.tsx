import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./dropdown-menu";

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

describe("DropdownMenuContent container", () => {
  test("portals into the given element (the Player root, so a menu shows in fullscreen)", () => {
    const host = document.createElement("div");
    document.body.append(host);
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>t</DropdownMenuTrigger>
        <DropdownMenuContent container={host}>
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(host.querySelector('[data-slot="dropdown-menu-content"]')).toBeTruthy();
    host.remove();
  });
});

describe("DropdownMenuSub on a phone", () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => { window.matchMedia = realMatchMedia; });
  const menu = () => render(
    <DropdownMenu open>
      <DropdownMenuTrigger>t</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Top</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change this clip</DropdownMenuSubTrigger>
          <DropdownMenuSubContent><DropdownMenuItem>Sharpen</DropdownMenuItem><DropdownMenuItem>Extend</DropdownMenuItem></DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  const trigger = () => [...document.body.querySelectorAll('[role="menuitem"]')].find((el) => el.textContent?.includes("Change this clip")) as HTMLElement;
  const texts = () => [...document.body.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent ?? "");

  test("below 640 px the submenu is an inline accordion: closed by default, a tap opens its items under the trigger, a second tap closes them", async () => {
    stubMatchMedia({ "(max-width: 639.98px)": true });
    menu();
    await waitFor(() => expect(trigger()).toBeTruthy());
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(texts().some((t) => t.includes("Sharpen"))).toBe(false);
    fireEvent.click(trigger());
    await waitFor(() => expect(texts().some((t) => t.includes("Sharpen"))).toBe(true));
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(document.body.querySelector('[data-slot="dropdown-menu-sub-content"][data-inline]')).not.toBeNull();
    expect(document.body.querySelector('[role="menu"][data-slot="dropdown-menu-sub-content"]')).toBeNull();
    fireEvent.click(trigger());
    await waitFor(() => expect(texts().some((t) => t.includes("Sharpen"))).toBe(false));
  });
  test("ArrowRight opens and ArrowLeft closes the inline group from the keyboard", async () => {
    stubMatchMedia({ "(max-width: 639.98px)": true });
    menu();
    await waitFor(() => expect(trigger()).toBeTruthy());
    fireEvent.keyDown(trigger(), { key: "ArrowRight" });
    await waitFor(() => expect(texts().some((t) => t.includes("Extend"))).toBe(true));
    fireEvent.keyDown(trigger(), { key: "ArrowLeft" });
    await waitFor(() => expect(texts().some((t) => t.includes("Extend"))).toBe(false));
  });
  test("at 640 px and wider it stays a fly-out submenu", async () => {
    stubMatchMedia({});
    menu();
    await waitFor(() => expect(trigger()).toBeTruthy());
    expect(document.body.querySelector('[data-slot="dropdown-menu-sub-content"][data-inline]')).toBeNull();
  });
});

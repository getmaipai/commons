import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HomeIcon, MessageCircleIcon } from "lucide-react";
import { SidebarProvider } from "../../../../components/ui/sidebar";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import NavCollapse from "./nav-collapse/index";

afterEach(cleanup);

const menu = [{
  heading: "Home",
  items: [
    { name: "Home", url: "/", icon: HomeIcon },
    { name: "Chat", url: "/chat", icon: MessageCircleIcon },
  ],
}];

describe("NavCollapse active marker", () => {
  for (const [label, defaultOpen] of [["expanded", true], ["folded (icon rail)", false]] as const) {
    test(`${label}: the current page's link is data-active and aria-current, others are not`, () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/chat"]}>
          <TooltipProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <NavCollapse menu={menu} />
            </SidebarProvider>
          </TooltipProvider>
        </MemoryRouter>,
      );
      const active = container.querySelector<HTMLAnchorElement>('a[href="/chat"]')!;
      const other = container.querySelector<HTMLAnchorElement>('a[href="/"]')!;
      expect(active.hasAttribute("data-active")).toBe(true);
      expect(active.getAttribute("aria-current")).toBe("page");
      expect(other.hasAttribute("data-active")).toBe(false);
      expect(other.hasAttribute("aria-current")).toBe(false);
    });
  }

  test("an app mounted at the root marks the entry for the unprefixed path", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/chat"]}>
        <TooltipProvider>
          <SidebarProvider defaultOpen>
            <NavCollapse menu={menu} />
          </SidebarProvider>
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector('a[href="/chat"]')!.getAttribute("aria-current")).toBe("page");
    expect(container.querySelector('a[href="/"]')!.hasAttribute("aria-current")).toBe(false);
  });
});

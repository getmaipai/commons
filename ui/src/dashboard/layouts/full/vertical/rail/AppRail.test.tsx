import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import AppRail, { type RailApp } from "./AppRail";

afterEach(cleanup);

function apps(pinnedCount: number): RailApp[] {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `App ${index + 1}`,
    url: `/apps/${index + 1}`,
    icon: "layout-grid",
    pinned: index < pinnedCount,
  }));
}

function rail(pinnedCount: number, onTogglePin: (url: string, pinned: boolean) => void = () => {}) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <AppRail apps={apps(pinnedCount)} onTogglePin={onTogglePin} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("RAIL-01 pinned apps", () => {
  test("shows all nine pinned apps in the scroll container", () => {
    const view = rail(9);
    expect(view.getAllByRole("link", { name: /^App / })).toHaveLength(9);
    const pinned = view.container.querySelector('[data-slot="app-rail-pinned"]');
    expect(pinned).not.toBeNull();
    expect(pinned?.className).toContain("min-h-0");
    expect(pinned?.className).toContain("flex-1");
    expect(pinned?.className).toContain("overflow-y-auto");
  });

  test("keeps pinning enabled with nine apps already pinned", async () => {
    const toggled: Array<[string, boolean]> = [];
    const view = rail(9, (url, pinned) => toggled.push([url, pinned]));
    fireEvent.click(view.getByRole("button", { name: "All apps" }));
    const pin = await waitFor(() => view.getByRole("button", { name: "Pin App 10 to the rail" }));
    expect((pin as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(pin);
    expect(toggled).toEqual([["/apps/10", true]]);
    expect(view.queryByText(/rail holds/i)).toBeNull();
  });
});

describe("PRO-LOOK labelled rail variant", () => {
  test("default remains the icon-only 56px rail", () => {
    const view = rail(0);
    const nav = view.container.querySelector('[data-slot="app-rail"]');
    expect(nav?.className).toContain("w-[var(--rail-width,56px)]");
    expect(view.queryByText("Chat")).toBeNull();
  });

  test("labelled variant shows names and uses the active surface pill", () => {
    const view = render(<MemoryRouter initialEntries={["/chat"]}><TooltipProvider><AppRail variant="labelled" /></TooltipProvider></MemoryRouter>);
    const nav = view.container.querySelector('[data-slot="app-rail"]');
    const chat = view.getByRole("link", { name: /^Chat/ });
    expect(nav?.className).toContain("w-[var(--rail-width-labelled)]");
    expect(nav?.getAttribute("style")).toContain("--rail-width-labelled: 80px");
    expect(chat.textContent).toContain("Chat");
    expect(chat.className).toContain("bg-[var(--surface-2)]");
    expect(chat.className).toContain("rounded-2xl");
  });
});

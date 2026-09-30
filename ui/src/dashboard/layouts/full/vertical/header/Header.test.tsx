import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout from "../../FullLayout";
import { ThemeProvider } from "../../../../context/shadcntheme/ThemeContext";
import { TooltipProvider } from "../../../../components/ui/tooltip";

afterEach(() => {
  cleanup();
  localStorage.removeItem("vite-ui-theme");
});

function renderLayout(showThemeToggle?: boolean, statusIndicator?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/next"]}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Routes>
            <Route path="/next" element={<FullLayout showThemeToggle={showThemeToggle} statusIndicator={statusIndicator} />}>
              <Route index element={<div />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("Header's showThemeToggle prop (THEME-TOGGLE-01, home 2026-09-26)", () => {
  test("defaults to showing the theme toggle when the prop is omitted", () => {
    const { container } = renderLayout(undefined);
    expect(container.querySelector("svg.lucide-moon, svg.lucide-sun")).not.toBeNull();
  });

  test("shows the theme toggle when explicitly true", () => {
    const { container } = renderLayout(true);
    expect(container.querySelector("svg.lucide-moon, svg.lucide-sun")).not.toBeNull();
  });

  test("hides the theme toggle when false, for a consumer with its own Settings control", () => {
    const { container } = renderLayout(false);
    expect(container.querySelector("svg.lucide-moon, svg.lucide-sun")).toBeNull();
  });
});

describe("Header's statusIndicator prop (STATUS-A1, home 2026-09-30)", () => {
  test("renders a provided indicator inside the header before notifications", () => {
    const { container, getByTestId, getByRole } = renderLayout(undefined, <span data-testid="dot" />);
    const indicator = getByTestId("dot");
    const notifications = getByRole("button", { name: "Notifications" });

    expect(indicator.closest("header")).not.toBeNull();
    expect(indicator.compareDocumentPosition(notifications) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="dot"]')).toHaveLength(1);
  });

  test("renders no indicator when the prop is omitted", () => {
    const { queryByTestId } = renderLayout();
    expect(queryByTestId("dot")).toBeNull();
  });
});

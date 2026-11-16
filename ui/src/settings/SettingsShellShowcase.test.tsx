import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { SettingsShellShowcase } from "./SettingsShellShowcase";

afterEach(cleanup);

test("the shell showcase opens a section on click and leaves arrow rows as links", () => {
  const view = render(<SettingsShellShowcase />);
  expect(view.getByRole("heading", { level: 1 }).textContent).toBe("General");
  fireEvent.click(view.getByText("Notifications"));
  expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Notifications");
  const tabs = view.getByRole("tablist", { name: "Notifications sections" });
  expect(within(tabs).getAllByRole("tab")).toHaveLength(3);
  expect(view.getByText("Profile").closest("a")!.getAttribute("data-kind")).toBe("link");
});

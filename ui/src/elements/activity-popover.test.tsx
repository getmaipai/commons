import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ActivityPopover, type ActivityPopoverItem } from "./activity-popover";

afterEach(cleanup);

const entries: ActivityPopoverItem[] = [
  { id: "done-old", state: "done", title: "Old result", at: "2026-11-10T10:00:00Z" },
  { id: "running-old", state: "running", title: "Running old", progress: 34, at: "2026-11-10T10:00:00Z" },
  { id: "failed-new", state: "failed", title: "Failed new", at: "2026-11-11T12:00:00Z" },
  { id: "running-new", state: "running", title: "Running new", progress: 68, at: "2026-11-11T12:00:00Z" },
  { id: "done-new", state: "done", title: "New result", at: "2026-11-11T11:00:00Z" },
];

describe("ActivityPopover", () => {
  test("orders running items first and then completed or failed items newest first", async () => {
    const view = render(<ActivityPopover items={entries} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(view.getByText("Running new")).toBeTruthy());
    expect([...document.querySelectorAll("[data-slot=activity-popover-list] li")].map((row) => row.textContent?.trim().split("\n")[0])).toEqual(["Running new", "Running old", "Failed new", "New result", "Old result"]);
  });

  test("shows running count, opens selected item, and exposes the progress value", async () => {
    const onOpen = mock(() => {});
    const view = render(<ActivityPopover items={entries} onOpen={onOpen} emptyLabel="Nothing here" />);
    const bell = view.getByRole("button", { name: "Activity" });
    expect(bell.textContent).toContain("2");
    fireEvent.click(bell);
    await waitFor(() => expect(view.getByRole("progressbar", { name: "Running new progress" }).getAttribute("aria-valuenow")).toBe("68"));
    fireEvent.click(view.getByRole("button", { name: "New result" }));
    expect(onOpen).toHaveBeenCalledWith("done-new");
  });

  test("renders empty copy and returns focus to the bell on close", async () => {
    const view = render(<ActivityPopover items={[]} onOpen={() => {}} emptyLabel="Nothing here" />);
    const bell = view.getByRole("button", { name: "Activity" });
    fireEvent.click(bell);
    await waitFor(() => expect(view.getByText("Nothing here")).toBeTruthy());
    fireEvent.keyDown(document.activeElement ?? bell, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(bell));
  });

  test("uses token colors and readable text and hit areas", () => {
    const { container, getByRole } = render(<ActivityPopover items={entries} onOpen={() => {}} emptyLabel="Nothing here" />);
    const bell = getByRole("button", { name: "Activity" });
    expect(bell.className).toContain("size-12");
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\brgb\(/i);
    expect(container.innerHTML).not.toMatch(/text-(?:\[\d+px\]|\[\d+\.\d+px\])/);
  });
});

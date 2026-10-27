import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { CompanionDock } from "./companion-dock";

afterEach(cleanup);

const base = { name: "Sage", face: <span data-testid="face" />, line: "Hi, I am here.", minimized: false, minimizeLabel: "Minimize Sage", expandLabel: "Show Sage", closeLabel: "Hide Sage" };

describe("CompanionDock", () => {
  test("shows the face, name and line, and no Review button unless one is supplied", () => {
    const { getByText, getByTestId, queryByRole } = render(<CompanionDock {...base} onMinimizedChange={() => {}} onClose={() => {}} />);
    expect(getByText("Sage")).toBeTruthy();
    expect(getByText("Hi, I am here.")).toBeTruthy();
    expect(getByTestId("face")).toBeTruthy();
    expect(queryByRole("button", { name: "Review" })).toBeNull();
  });

  test("Review, minimize and close call their handlers", () => {
    const onReview = mock(() => {}); const onMinimizedChange = mock((_: boolean) => {}); const onClose = mock(() => {});
    const { getByRole } = render(<CompanionDock {...base} reviewLabel="Review" onReview={onReview} onMinimizedChange={onMinimizedChange} onClose={onClose} />);
    fireEvent.click(getByRole("button", { name: "Review" }));
    fireEvent.click(getByRole("button", { name: "Minimize Sage" }));
    fireEvent.click(getByRole("button", { name: "Hide Sage" }));
    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onMinimizedChange).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("minimized draws only the expand button, which expands it", () => {
    const onMinimizedChange = mock((_: boolean) => {});
    const { getByRole, queryByText } = render(<CompanionDock {...base} minimized onMinimizedChange={onMinimizedChange} onClose={() => {}} />);
    expect(queryByText("Hi, I am here.")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Show Sage" }));
    expect(onMinimizedChange).toHaveBeenCalledWith(false);
  });
});

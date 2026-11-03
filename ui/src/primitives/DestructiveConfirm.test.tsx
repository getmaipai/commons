import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { DestructiveConfirm } from "@/kit/primitives/DestructiveConfirm";

afterEach(cleanup);

describe("DestructiveConfirm", () => {
  test("is a modal dialog with the question, the detail and both buttons", () => {
    render(<DestructiveConfirm message="Delete this song?" detail="It goes to Trash." confirmLabel="Delete" busyLabel="Deleting" onConfirm={() => {}} onCancel={() => {}} />);
    const dialog = document.querySelector("[role=alertdialog]");
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Delete this song?");
    expect(dialog?.textContent).toContain("It goes to Trash.");
    expect(dialog?.textContent).toContain("Keep it");
  });

  test("Delete confirms and Keep it cancels", () => {
    const onConfirm = mock(() => {}); const onCancel = mock(() => {});
    const { getByText } = render(<DestructiveConfirm message="Remove?" confirmLabel="Remove" busyLabel="Removing" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(getByText("Remove"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText("Keep it"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("while busy the label changes and both buttons are off", () => {
    const { getByText } = render(<DestructiveConfirm message="Remove?" confirmLabel="Remove" busyLabel="Removing" busy onConfirm={() => {}} onCancel={() => {}} />);
    expect((getByText("Removing") as HTMLButtonElement).disabled).toBe(true);
    expect((getByText("Keep it") as HTMLButtonElement).disabled).toBe(true);
  });
});

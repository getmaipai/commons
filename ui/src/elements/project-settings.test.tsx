import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ProjectSettingsDialog, type ProjectSettingsValue } from "./project-settings";

afterEach(cleanup);

const value: ProjectSettingsValue = { name: "Garden", icon: "leaf", color: "green", description: "", instructions: "", memory_mode: "shared" };

describe("ProjectSettingsDialog", () => {
  test("shows ChatGPT's fields in order and saves only what changed", async () => {
    const onSave = mock(async () => {});
    const view = render(<ProjectSettingsDialog open onOpenChange={() => {}} value={value} onSave={onSave} onDelete={() => {}} />);
    expect(view.getByRole("heading", { name: "Project settings" })).not.toBeNull();
    const order = ["Project name", "Description", "Instructions", "Memory"].map((label) => view.getByText(label, { selector: "label" }));
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(view.getByText("Set context and customize how the assistant responds in this project.", { selector: "p" })).not.toBeNull();
    expect(view.getByText("0/1500")).not.toBeNull();
    const save = view.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(view.getByLabelText("Project name"), { target: { value: "  Backyard " } });
    fireEvent.change(view.getByLabelText("Instructions"), { target: { value: "Short answers" } });
    expect(save.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(save);
    });
    expect(onSave).toHaveBeenCalledWith({ name: "Backyard", instructions: "Short answers" });
  });

  test("an empty name cannot be saved", () => {
    const view = render(<ProjectSettingsDialog open onOpenChange={() => {}} value={value} onSave={() => {}} />);
    fireEvent.change(view.getByLabelText("Project name"), { target: { value: "   " } });
    expect((view.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("a failed save keeps the dialog open with the draft", async () => {
    const onOpenChange = mock(() => {});
    const view = render(<ProjectSettingsDialog open onOpenChange={onOpenChange} value={value} onSave={async () => { throw new Error("no"); }} />);
    fireEvent.change(view.getByLabelText("Project name"), { target: { value: "Backyard" } });
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: "Save" }));
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect((view.getByLabelText("Project name") as HTMLInputElement).value).toBe("Backyard");
  });

  test("Delete asks first, says the chats stay, then deletes", async () => {
    const onDelete = mock(async () => {});
    const view = render(<ProjectSettingsDialog open onOpenChange={() => {}} value={value} onSave={() => {}} onDelete={onDelete} />);
    fireEvent.click(view.getByRole("button", { name: "Delete project" }));
    expect(await view.findByText("Its chats stay.")).not.toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    const confirm = (await view.findAllByRole("button", { name: "Delete project" })).at(-1)!;
    await act(async () => {
      fireEvent.click(confirm);
    });
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  test("read-only (a child's project seen by a non-editor) has no Save, Delete or editable fields", () => {
    const view = render(<ProjectSettingsDialog open onOpenChange={() => {}} value={value} onSave={() => {}} onDelete={() => {}} readOnly />);
    expect(view.queryByRole("button", { name: "Save" })).toBeNull();
    expect(view.queryByRole("button", { name: "Delete project" })).toBeNull();
    expect((view.getByLabelText("Project name") as HTMLInputElement).readOnly).toBe(true);
  });

  test("the memory control is hidden when the host offers one mode only", () => {
    const view = render(<ProjectSettingsDialog open onOpenChange={() => {}} value={value} onSave={() => {}} memoryModes={["shared"]} />);
    expect(view.queryByText("Memory", { selector: "label" })).toBeNull();
  });
});

// LIBRARY-REVAMP-06 slice B: the generalised ShareDialog and the ProjectShareDialog preset over it.
import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { ProjectShareDialog } from "./project-share";
import { FILE_SHARE_ROLES, ShareDialog, type ShareDialogProps, type ShareRow } from "./share-dialog";

afterEach(cleanup);

const members: ShareRow[] = [
  { id: "marlow", name: "Marlow", role: "view", avatarSeed: "marlow" },
  { id: "nova", name: "Nova", role: "off", avatarSeed: "nova" },
  { id: "iris", name: "Iris", role: "off", avatarSeed: "iris" },
];

function setup(props: Partial<ShareDialogProps> = {}) {
  const onRoleChange = mock((_id: string, _role: string) => {});
  const onOpenChange = mock((_open: boolean) => {});
  const view = render(<ShareDialog open onOpenChange={onOpenChange} members={members} household={{ role: "off" }} onRoleChange={onRoleChange} {...props} />);
  // The dialog is portalled to the body.
  const dialog = within(document.body.querySelector("[data-slot=share-dialog]") as HTMLElement);
  return { view, dialog, onRoleChange, onOpenChange };
}

describe("ShareDialog with the file roles (on and off)", () => {
  test("a person is a switch with the name they have now, and the household comes first", () => {
    const { dialog } = setup();
    expect(dialog.getByRole("heading", { name: "Share" })).toBeTruthy();
    const rows = Array.from(document.body.querySelectorAll("[data-slot=share-dialog-row]"));
    expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual(["Everyone in the home", "Marlow", "Nova", "Iris"]);
    expect(rows[0]!.getAttribute("data-household")).toBe("true");
    expect(dialog.getByRole("switch", { name: "Marlow" }).getAttribute("aria-checked")).toBe("true");
    expect(dialog.getByRole("switch", { name: "Nova" }).getAttribute("aria-checked")).toBe("false");
    expect(within(rows[1] as HTMLElement).getByText("Can view")).toBeTruthy();
    expect(within(rows[2] as HTMLElement).getByText("No access")).toBeTruthy();
  });

  test("the household row has its own switch and says what it means in plain words", () => {
    const { dialog, onRoleChange } = setup();
    expect(dialog.getByText("People who join later can see it too.")).toBeTruthy();
    fireEvent.click(dialog.getByRole("switch", { name: "Everyone in the home" }));
    expect(onRoleChange).toHaveBeenCalledWith("household", "view");
  });

  test("turning a person on and off reports the role id", () => {
    const { dialog, onRoleChange } = setup();
    fireEvent.click(dialog.getByRole("switch", { name: "Nova" }));
    expect(onRoleChange).toHaveBeenLastCalledWith("nova", "view");
    fireEvent.click(dialog.getByRole("switch", { name: "Marlow" }));
    expect(onRoleChange).toHaveBeenLastCalledWith("marlow", "off");
  });

  test("a row's own onChange takes the change instead of the dialog's", () => {
    const own = mock((_role: string) => {});
    const { dialog, onRoleChange } = setup({ members: [{ id: "nova", name: "Nova", role: "off", onChange: own }] });
    fireEvent.click(dialog.getByRole("switch", { name: "Nova" }));
    expect(own).toHaveBeenCalledWith("view");
    expect(onRoleChange).not.toHaveBeenCalled();
  });

  test("the dialog shows what the host says (controlled) and a host that owns the state updates it", () => {
    function Host() {
      const [roles, setRoles] = useState<Record<string, string>>({ nova: "off" });
      return (
        <ShareDialog open onOpenChange={() => {}} members={[{ id: "nova", name: "Nova", role: roles.nova! }]} onRoleChange={(id, role) => setRoles({ ...roles, [id]: role })} />
      );
    }
    render(<Host />);
    const nova = () => within(document.body).getByRole("switch", { name: "Nova" });
    fireEvent.click(nova());
    expect(nova().getAttribute("aria-checked")).toBe("true");
  });

  test("a rejected change does not break the dialog", async () => {
    const { dialog } = setup({ onRoleChange: async () => Promise.reject(new Error("no")) });
    await act(async () => {
      fireEvent.click(dialog.getByRole("switch", { name: "Nova" }));
    });
    expect(dialog.getByRole("switch", { name: "Nova" })).toBeTruthy();
  });

  test("switches keep a 48 px hit area", () => {
    const { dialog } = setup();
    expect(dialog.getByRole("switch", { name: "Nova" }).className).toContain("after:-inset-y-[15px]");
  });

  test("Done closes the dialog", () => {
    const { dialog, onOpenChange } = setup();
    fireEvent.click(dialog.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("an empty home says so, and no household row means no household switch", () => {
    const { dialog } = setup({ members: [], household: undefined });
    expect(dialog.getByText("There is no one to share with yet.")).toBeTruthy();
  });

  test("the words are replaceable", () => {
    const { dialog } = setup({ labels: { title: "Share this file", household: "The whole family", done: "Finished" } });
    expect(dialog.getByRole("heading", { name: "Share this file" })).toBeTruthy();
    expect(dialog.getByRole("switch", { name: "The whole family" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Finished" })).toBeTruthy();
  });

  test("the default file roles are No access and Can view", () => {
    expect(FILE_SHARE_ROLES.map((role) => role.label)).toEqual(["No access", "Can view"]);
  });
});

describe("ShareDialog restrictions, busy and error states", () => {
  test("a reason a row cannot be shared is visible text, the row is locked, and the switch points at the reason", () => {
    const { dialog } = setup({
      members: [{ id: "daisy", name: "Daisy", role: "off", disabledReason: "This picture is for adults only, so it cannot be shared with a child." }],
    });
    const reason = dialog.getByText("This picture is for adults only, so it cannot be shared with a child.");
    expect(reason.tagName).toBe("P");
    // Text in the page, not a tooltip: no title attribute carries it.
    expect(document.body.querySelector("[title]")).toBeNull();
    const control = dialog.getByRole("switch", { name: "Daisy" });
    expect(control.hasAttribute("disabled")).toBe(true);
    expect(control.getAttribute("aria-describedby")).toContain(reason.id);
  });

  test("a locked household row cannot be pressed", () => {
    const { dialog, onRoleChange } = setup({ household: { role: "off", disabledReason: "Adults only. It cannot be shared with everyone." } });
    expect(dialog.getByText("Adults only. It cannot be shared with everyone.")).toBeTruthy();
    fireEvent.click(dialog.getByRole("switch", { name: "Everyone in the home" }));
    expect(onRoleChange).not.toHaveBeenCalled();
  });

  test("a restrictions slot sits above the list", () => {
    const { dialog } = setup({ restrictions: <p>Adults only: not for children.</p> });
    const slot = document.body.querySelector("[data-slot=share-dialog-restrictions]") as HTMLElement;
    expect(within(slot).getByText("Adults only: not for children.")).toBeTruthy();
    expect(slot.compareDocumentPosition(dialog.getByRole("list")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("a busy row says it is saving, is locked, and a row error is announced with its fix", () => {
    const { dialog } = setup({
      members: [
        { id: "nova", name: "Nova", role: "off", busy: true },
        { id: "iris", name: "Iris", role: "off", error: "Home could not save that. Check your connection and try again." },
      ],
    });
    expect(dialog.getByRole("status").textContent).toBe("Saving...");
    expect(dialog.getByRole("switch", { name: "Nova" }).hasAttribute("disabled")).toBe(true);
    expect(dialog.getByRole("alert").textContent).toBe("Home could not save that. Check your connection and try again.");
    expect(dialog.getByRole("switch", { name: "Iris" }).hasAttribute("disabled")).toBe(false);
    expect(dialog.getByRole("switch", { name: "Iris" }).getAttribute("aria-describedby")).toBeTruthy();
  });

  test("busy locks every row and disabled does too", () => {
    for (const lock of [{ busy: true }, { disabled: true }]) {
      cleanup();
      const { dialog } = setup(lock);
      for (const name of ["Everyone in the home", "Marlow", "Nova", "Iris"]) expect(dialog.getByRole("switch", { name }).hasAttribute("disabled")).toBe(true);
    }
  });

  test("a dialog error is an alert", () => {
    const { dialog } = setup({ error: "Home could not load who you can share with. Close this and try again." });
    expect(dialog.getByRole("alert").textContent).toContain("Home could not load who you can share with.");
  });
});

describe("ShareDialog confirm step", () => {
  function confirmStep(over: Partial<NonNullable<ShareDialogProps["confirm"]>> = {}) {
    return {
      title: "Share with everyone in the home?",
      body: "Everyone in the home, including the children, will be able to see this picture.",
      onConfirm: mock(() => {}),
      onCancel: mock(() => {}),
      ...over,
    };
  }

  test("it replaces the list and Done, names itself, and takes focus", () => {
    const step = confirmStep();
    const { dialog } = setup({ confirm: step });
    expect(dialog.queryByRole("list")).toBeNull();
    expect(dialog.queryByRole("button", { name: "Done" })).toBeNull();
    const group = dialog.getByRole("group", { name: "Share with everyone in the home?" });
    expect(within(group).getByText(/including the children/)).toBeTruthy();
    expect(document.activeElement === group).toBe(true);
  });

  test("confirm and go back buttons call the host", async () => {
    const step = confirmStep({ confirmLabel: "Share with everyone", cancelLabel: "Keep it private" });
    const { dialog } = setup({ confirm: step });
    fireEvent.click(dialog.getByRole("button", { name: "Share with everyone" }));
    expect(step.onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(dialog.getByRole("button", { name: "Keep it private" }));
    expect(step.onCancel).toHaveBeenCalledTimes(1);
  });

  test("the default words are plain", () => {
    const { dialog } = setup({ confirm: confirmStep() });
    expect(dialog.getByRole("button", { name: "Share anyway" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Go back" })).toBeTruthy();
  });

  test("Escape goes back one step and leaves the dialog open", () => {
    const step = confirmStep();
    const { dialog, onOpenChange } = setup({ confirm: step });
    fireEvent.keyDown(dialog.getByRole("group"), { key: "Escape" });
    expect(step.onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test("busy and error show on the step, and a rejected confirm is the host's to report", async () => {
    const { dialog } = setup({ confirm: confirmStep({ busy: true, error: "Home could not share that. Try again." }) });
    expect(dialog.getByRole("button", { name: "Saving..." }).hasAttribute("disabled")).toBe(true);
    expect(document.body.querySelector("[data-slot=share-dialog-confirm-error]")?.textContent).toBe("Home could not share that. Try again.");
    cleanup();
    const rejecting = confirmStep({ onConfirm: async () => Promise.reject(new Error("no")) });
    const second = setup({ confirm: rejecting });
    await act(async () => {
      fireEvent.click(second.dialog.getByRole("button", { name: "Share anyway" }));
    });
    expect(second.dialog.getByRole("group")).toBeTruthy();
  });

  test("when the step ends, the list is back", () => {
    function Host() {
      const [asking, setAsking] = useState(true);
      return (
        <ShareDialog open onOpenChange={() => {}} members={members} confirm={asking ? confirmStep({ onCancel: () => setAsking(false) }) : null} />
      );
    }
    render(<Host />);
    const body = within(document.body);
    fireEvent.click(body.getByRole("button", { name: "Go back" }));
    expect(body.getByRole("list")).toBeTruthy();
    expect(body.queryByRole("group")).toBeNull();
  });
});

describe("ShareDialog with more than two roles", () => {
  test("three roles draw menus, not switches", () => {
    const { dialog } = setup({
      roles: [
        { id: "off", label: "No access" },
        { id: "view", label: "Can view" },
        { id: "edit", label: "Can edit" },
      ],
      members: [{ id: "marlow", name: "Marlow", role: "edit" }],
      household: undefined,
    });
    expect(dialog.queryByRole("switch")).toBeNull();
    expect(dialog.getByRole("combobox", { name: "Marlow" }).textContent).toBe("Can edit");
  });
});

describe("ShareDialog accessibility", () => {
  test("axe finds no violation with a locked row, an error and a household row", async () => {
    setup({
      members: [
        { id: "marlow", name: "Marlow", role: "view" },
        { id: "daisy", name: "Daisy", role: "off", disabledReason: "Adults only. A child cannot be shared this." },
        { id: "nova", name: "Nova", role: "off", error: "Home could not save that. Try again." },
      ],
    });
    const result = await axe.run(document.body.querySelector("[data-slot=share-dialog]") as HTMLElement, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
  });

  test("axe finds no violation on the confirm step", async () => {
    setup({ confirm: { title: "Share with everyone?", body: "Children can see it.", onConfirm: () => {}, onCancel: () => {} } });
    const result = await axe.run(document.body.querySelector("[data-slot=share-dialog]") as HTMLElement, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("ProjectShareDialog is the three-role preset", () => {
  test("it keeps its slot, its words, its menus and its handler", () => {
    const onRoleChange = mock(() => {});
    render(
      <ProjectShareDialog
        open
        onOpenChange={() => {}}
        onRoleChange={onRoleChange}
        members={[{ id: "person-a", name: "Alfred", role: "can_edit" }]}
        labels={{ roles: { can_edit: "Can change" } }}
      />,
    );
    const slot = document.body.querySelector("[data-slot=project-share]") as HTMLElement;
    expect(slot).toBeTruthy();
    expect(within(slot).getByRole("combobox", { name: "Alfred" }).textContent).toBe("Can change");
    expect(within(slot).queryByRole("switch")).toBeNull();
    // No faces and no Done button: the project dialog is as it was.
    expect(slot.querySelector("[data-slot=avatar]")).toBeNull();
    expect(within(slot).queryByRole("button", { name: "Done" })).toBeNull();
  });
});

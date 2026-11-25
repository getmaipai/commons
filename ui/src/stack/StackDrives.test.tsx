import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import { StackDrives } from "./StackDrives";
import { StackModelsPage } from "./StackModelsPage";
import { createFakeStackClient } from "./fakeStackClient";
import type { FakeStackClient } from "./fakeStackClient";

afterEach(cleanup);

const screen = within(document.body);
const click = (element: HTMLElement) => act(async () => { fireEvent.click(element); });
const calls = (client: FakeStackClient, method: string) => client.calls.filter((call) => call.method === method);

async function ready(client = createFakeStackClient(), pollMs = 0) {
  render(<StackModelsPage client={client} pollMs={pollMs} />);
  await screen.findByText("Qwen3 8B");
  await screen.findByRole("heading", { name: "Drives" });
  return client;
}

describe("Drives", () => {
  test("the section is absent when a host has no drives client", async () => {
    const client = createFakeStackClient();
    (client as { drives?: unknown }).drives = undefined;
    render(<StackModelsPage client={client} pollMs={0} />);
    await screen.findByText("Qwen3 8B");
    expect(screen.queryByRole("heading", { name: "Drives" })).toBeNull();
  });

  test("lists drive names, feature sizes, and Several drives when files are split", async () => {
    const client = await ready();
    expect(screen.getByText("This computer")).toBeTruthy();
    expect(screen.getByText("Backup drive")).toBeTruthy();
    expect(screen.getByText("Several drives", { exact: false })).toBeTruthy();
    expect(screen.getByText("12.0 GB", { exact: false })).toBeTruthy();
    expect(screen.getByText(/900 GB free of 2 TB/)).toBeTruthy();
    expect(calls(client, "drives.features").length).toBeGreaterThan(0);
  });

  test("an unconnected drive says how to fix it and disables Move", async () => {
    await ready();
    expect(screen.getByText("Drive not connected. Plug in Backup drive.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Pictures" }).hasAttribute("disabled")).toBe(true);
  });

  test("the dialog offers only other connected drives and shows the plan before moving", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Move Chat" }));
    const dialog = await screen.findByRole("dialog");
    const select = within(dialog).getByRole("combobox", { name: "Move to" });
    await click(select);
    expect(screen.getByRole("option", { name: "Backup drive" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Offline drive" })).toBeNull();
    await click(screen.getByRole("option", { name: "Backup drive" }));
    expect(await within(dialog).findByText("Moves 12.0 GB to Backup drive. Chat stops while it moves and starts again by itself.")).toBeTruthy();
    expect(calls(client, "drives.plan")).toHaveLength(1);
    await click(within(dialog).getByRole("button", { name: "Move" }));
    await waitFor(() => expect(calls(client, "drives.move")).toHaveLength(1));
  });

  test("a plan refusal is shown and keeps Move disabled", async () => {
    const client = await ready();
    client.failNext("drives.plan", "There is not enough free space on Backup drive.");
    await click(screen.getByRole("button", { name: "Move Chat" }));
    const dialog = await screen.findByRole("dialog");
    await click(within(dialog).getByRole("combobox", { name: "Move to" }));
    await click(screen.getByRole("option", { name: "Backup drive" }));
    expect(await within(dialog).findByText("There is not enough free space on Backup drive.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Move" }).hasAttribute("disabled")).toBe(true);
  });

  test("polling shows copying, checking, then done", async () => {
    await ready(createFakeStackClient(), 150);
    await click(screen.getByRole("button", { name: "Move Chat" }));
    const dialog = await screen.findByRole("dialog");
    await click(within(dialog).getByRole("combobox", { name: "Move to" }));
    await click(screen.getByRole("option", { name: "Backup drive" }));
    await within(dialog).findByText(/Moves 12\.0 GB/);
    await click(within(dialog).getByRole("button", { name: "Move" }));
    expect(await within(dialog).findByText("Copying 3.1 GB of 8.4 GB")).toBeTruthy();
    expect(await within(dialog).findByText("Checking the copy", {}, { timeout: 3000 })).toBeTruthy();
    expect(await within(dialog).findByText("Moved to Backup drive", {}, { timeout: 3000 })).toBeTruthy();
  });

  test("failed moves show the Stack error and say the files are still where they were", async () => {
    const client = await ready();
    client.drives!.failMoveWith("The drive disconnected during the move.");
    await click(screen.getByRole("button", { name: "Move Chat" }));
    const dialog = await screen.findByRole("dialog");
    await click(within(dialog).getByRole("combobox", { name: "Move to" }));
    await click(screen.getByRole("option", { name: "Backup drive" }));
    await within(dialog).findByText(/Moves 12\.0 GB/);
    await click(within(dialog).getByRole("button", { name: "Move" }));
    expect(await within(dialog).findByText("The drive disconnected during the move.")).toBeTruthy();
    expect(within(dialog).getByText("Your files are still where they were.")).toBeTruthy();
  });

  test("cancel calls the Stack while a move is running", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Move Chat" }));
    const dialog = await screen.findByRole("dialog");
    await click(within(dialog).getByRole("combobox", { name: "Move to" }));
    await click(screen.getByRole("option", { name: "Backup drive" }));
    await within(dialog).findByText(/Moves 12\.0 GB/);
    await click(within(dialog).getByRole("button", { name: "Move" }));
    await click(await within(dialog).findByRole("button", { name: "Cancel move" }));
    expect(calls(client, "drives.cancel")).toHaveLength(1);
  });

  test("lockedItems.move disables Move and shows the host sentence", async () => {
    render(<StackModelsPage client={createFakeStackClient()} pollMs={0} lockedItems={{ move: "Only an admin can move models." }} />);
    await screen.findByRole("heading", { name: "Drives" });
    expect(screen.getByText("Only an admin can move models.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Chat" }).hasAttribute("disabled")).toBe(true);
  });

  test("phone-width layout does not use horizontal overflow", async () => {
    await ready();
    const section = screen.getByRole("region", { name: "Drives" });
    expect(section.className).not.toMatch(/overflow-x-auto|w-max|min-w-max/);
    expect(section.className).toContain("min-w-0");
  });
});

test("StackDrives can render with a drives client", async () => {
  const client = createFakeStackClient();
  render(<StackDrives client={client.drives!} locked={null} pollMs={0} />);
  await screen.findByRole("heading", { name: "Drives" });
});

describe("Drives: add and remove", () => {
  test("adding a drive sends the name and folder, then lists it", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Add a drive" }));
    const dialog = await screen.findByRole("dialog");
    const add = within(dialog).getByRole("button", { name: "Add" });
    expect(add.hasAttribute("disabled")).toBe(true);
    await act(async () => { fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Spare disk" } }); fireEvent.change(within(dialog).getByLabelText("Folder on this computer"), { target: { value: "/Volumes/Spare" } }); });
    await click(within(dialog).getByRole("button", { name: "Add" }));
    expect(calls(client, "drives.add")[0]?.args[0]).toEqual({ label: "Spare disk", root_path: "/Volumes/Spare", removable: true });
    expect(await screen.findByText("Spare disk")).toBeTruthy();
  });
  test("a refused remove shows the Stack's sentence and keeps the drive", async () => {
    await ready();
    await click(screen.getByRole("button", { name: "Remove Backup drive" }));
    expect(await screen.findByText(/still has files on that drive/)).toBeTruthy();
    expect(screen.getAllByText("Backup drive").length).toBeGreaterThan(0);
  });
  test("main has no Remove button and lockedItems.move disables Add", async () => {
    const client = createFakeStackClient();
    render(<StackModelsPage client={client} pollMs={0} lockedItems={{ move: "Only an admin can do that." }} />);
    await screen.findByRole("heading", { name: "Drives" });
    expect(screen.queryByRole("button", { name: "Remove This computer" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add a drive" }).hasAttribute("disabled")).toBe(true);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { StackModelsPage } from "./StackModelsPage";
import { createFakeStackClient } from "./fakeStackClient";

afterEach(cleanup);
const screen = within(document.body);
const click = (element: HTMLElement) => act(async () => { fireEvent.mouseDown(element); fireEvent.click(element); });

async function openChat(withDrives = true, featureId = "chat") {
  const client = createFakeStackClient();
  const pageClient = withDrives ? client : { ...client, drives: undefined };
  render(<StackModelsPage client={pageClient} pollMs={0} />);
  await screen.findByText("Qwen3 8B");
  await click(within(screen.getByTestId(`feature-${featureId}`)).getByRole("button", { name: new RegExp(featureId === "music" ? "Music" : featureId === "pictures" ? "Pictures" : "Chat") }));
  return { client, sheet: await screen.findByRole("dialog") };
}

describe("feature tabs", () => {
  test("opens on Tiers and switches to Models and Location", async () => {
    const { sheet } = await openChat();
    expect(within(sheet).getByRole("tab", { name: "Tiers" }).getAttribute("aria-selected")).toBe("true");
    expect(within(sheet).getByRole("heading", { name: "Which model each level uses" })).toBeTruthy();
    await click(within(sheet).getByRole("tab", { name: "Models" }));
    expect(within(sheet).getByRole("list", { name: "Models" })).toBeTruthy();
    await click(within(sheet).getByRole("tab", { name: "Location" }));
    expect(within(sheet).getByText("Total size: 12.0 GB")).toBeTruthy();
  });

  test("lists each drive when a feature is on several drives", async () => {
    const { sheet } = await openChat(true, "music");
    await click(within(sheet).getByRole("tab", { name: "Location" }));
    expect(within(sheet).getByText("Several drives")).toBeTruthy();
    expect(within(sheet).getByText("This computer")).toBeTruthy();
    expect(within(sheet).getByText("Backup drive")).toBeTruthy();
    expect(within(sheet).getByText(/412 GB free of/)).toBeTruthy();
    expect(within(sheet).getByText(/900 GB free of/)).toBeTruthy();
  });

  test("an offline drive explains the problem and disables Move", async () => {
    const { sheet } = await openChat(true, "pictures");
    await click(within(sheet).getByRole("tab", { name: "Location" }));
    expect(within(sheet).getByText("Drive not connected. Plug in Backup drive.")).toBeTruthy();
    expect(within(sheet).getByRole("button", { name: "Move Pictures" }).hasAttribute("disabled")).toBe(true);
  });

  test("a move in progress shows progress and disables Move", async () => {
    const { client, sheet } = await openChat();
    await client.drives.move("chat", "backup");
    await click(within(sheet).getByRole("tab", { name: "Location" }));
    expect(await within(sheet).findByText("Copying 3.1 GB of 8.4 GB")).toBeTruthy();
    expect(within(sheet).getByRole("button", { name: "Move Chat" }).hasAttribute("disabled")).toBe(true);
  });

  test("omits Location when the host has no drives client", async () => {
    const { sheet } = await openChat(false);
    expect(within(sheet).queryByRole("tab", { name: "Location" })).toBeNull();
  });
});

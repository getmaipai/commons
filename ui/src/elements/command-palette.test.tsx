import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CommandPaletteDialog } from "./command-palette";

afterEach(cleanup);

const commands = [
  { id: "new-chat", label: "New chat", group: "Chat", keys: ["⌘/Ctrl+⇧O"] },
  { id: "search-chats", label: "Search chats", group: "Navigation", keys: [] },
];

test("CommandPaletteDialog supplies its accessible title, command content, and focus", async () => {
  const onOpenChange = mock((_open: boolean) => {});
  const view = render(
    <CommandPaletteDialog
      open
      onOpenChange={onOpenChange}
      title="Chat commands"
      commands={commands}
      query=""
      activeId="new-chat"
    />,
  );

  expect(view.getByRole("dialog", { name: "Chat commands" })).toBeTruthy();
  const input = view.getByRole("combobox", { name: "Type a command" });
  expect(input).toBeTruthy();
  expect(view.getByRole("option", { name: /New chat/ })).toBeTruthy();
  expect(view.getByRole("option", { name: /Search chats/ })).toBeTruthy();
  const dialogClassName = document.querySelector('[data-slot="dialog-content"]')?.getAttribute("class") ?? "";
  expect(dialogClassName).toContain("bg-transparent");
  expect(dialogClassName).toContain("max-w-[calc(100%-2rem)]");
  expect(dialogClassName).toContain("sm:max-w-sm");
  await waitFor(() => expect(document.activeElement).toBe(input));
});

test("Escape closes the controlled dialog and restores prior focus", async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open palette</button>
        <CommandPaletteDialog
          open={open}
          onOpenChange={setOpen}
          title="Chat commands"
          commands={commands}
          query=""
          activeId="new-chat"
        />
      </>
    );
  }

  const view = render(<Harness />);
  const opener = view.getByRole("button", { name: "Open palette" });
  opener.focus();
  expect(document.activeElement).toBe(opener);
  fireEvent.click(opener);
  const input = await view.findByRole("combobox", { name: "Type a command" });
  await waitFor(() => expect(document.activeElement).toBe(input));
  fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
  await waitFor(() => expect(view.queryByRole("dialog", { name: "Chat commands" })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(opener));
});

test("size lg widens the dialog and fixes the palette height with the list scrolling inside", () => {
  const view = render(
    <CommandPaletteDialog
      open
      onOpenChange={() => {}}
      title="Chat commands"
      commands={commands}
      query=""
      activeId="new-chat"
      size="lg"
    />,
  );
  const dialogClassName = document.querySelector('[data-slot="dialog-content"]')?.getAttribute("class") ?? "";
  expect(dialogClassName).toContain("max-w-[calc(100%-2rem)]");
  expect(dialogClassName).toContain("sm:max-w-3xl");
  expect(dialogClassName).not.toContain("sm:max-w-sm");
  const palette = document.querySelector('[data-slot="command-palette"]')?.getAttribute("class") ?? "";
  expect(palette).toContain("max-w-none");
  expect(palette).toContain("h-[min(40rem,calc(100dvh-4rem))]");
  const list = view.getByRole("listbox", { name: "Commands" }).getAttribute("class") ?? "";
  expect(list).toContain("min-h-0");
  expect(list).toContain("flex-1");
  expect(list).not.toContain("max-h-72");
});

test("the default size is unchanged", () => {
  const view = render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Chat commands" commands={commands} query="" activeId="new-chat" />,
  );
  const palette = document.querySelector('[data-slot="command-palette"]')?.getAttribute("class") ?? "";
  expect(palette).toContain("max-w-xl");
  expect(view.getByRole("listbox", { name: "Commands" }).getAttribute("class")).toContain("max-h-72");
});

test("renders optional result subtitles and icon tiles with an active row", () => {
  const view = render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Chat commands" commands={[
      { ...commands[0]!, subtitle: "Start a conversation", iconUrl: "/icons/chat.png" },
      commands[1]!,
    ]} query="" activeId="new-chat" />,
  );
  expect(view.getByText("Start a conversation")).toBeTruthy();
  const option = view.getByRole("option", { name: /New chat Start a conversation/ });
  expect(option.getAttribute("aria-selected")).toBe("true");
  expect(option.className).toContain("bg-accent");
  expect(option.querySelector("img")?.getAttribute("src")).toBe("/icons/chat.png");
  const palette = document.querySelector('[data-slot="command-palette"]')?.getAttribute("class") ?? "";
  expect(palette).toContain("rounded-[24px]");
  expect(palette).toContain("backdrop-blur-2xl");
});

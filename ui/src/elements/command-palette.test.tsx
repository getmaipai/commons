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

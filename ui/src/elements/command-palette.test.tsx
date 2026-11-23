import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
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
  expect(palette).toContain("surface-dialog");
  expect(palette).toContain("backdrop-blur-2xl");
});

test("prefiltered shows every command in the caller's order, with the caller's placeholder and empty line", () => {
  const view = render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Search" placeholder="Search..." prefiltered commands={[
      { id: "a", label: "Zeta", group: "People", keys: [], subtitle: "matched in the subtitle" },
    ]} query="subtitle" activeId="a" />,
  );
  expect(view.getByRole("option", { name: /Zeta/ })).toBeTruthy();
  expect(view.getByRole("combobox", { name: "Search..." })).toBeTruthy();
  view.rerender(<CommandPaletteDialog open onOpenChange={() => {}} title="Search" prefiltered emptyMessage="No results." commands={[]} query="x" activeId="" />);
  expect(view.getByText("No results.")).toBeTruthy();
});

test("a command's match range is emphasized inside its label", () => {
  render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Search" commands={[
      { id: "a", label: "Walk with Sage", group: "Alarms", keys: [], match: [10, 14] },
    ]} query="" activeId="a" />,
  );
  expect(document.querySelector("mark")?.textContent).toBe("Sage");
});

test("tabs, rich cards and a footer render, and the tab buttons report their id", () => {
  const picked: string[] = [];
  const view = render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Search" prefiltered
      tabs={[{ id: "all", label: "All" }, { id: "chats", label: "Chats" }]} activeTab="all" onTabChange={(id) => picked.push(id)}
      footer="Search anywhere in Home"
      commands={[{ id: "a", label: "Aurora", group: "Wikipedia", keys: [], source: "Wikipedia", description: "A natural light display.", meta: "Article", thumbnailUrl: "/aurora.jpg", actionLabel: "Open" }]}
      query="aurora" activeId="a" />,
  );
  expect(view.getByRole("tab", { name: "All" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(view.getByRole("tab", { name: "Chats" }));
  expect(picked).toEqual(["chats"]);
  expect(view.getByText("A natural light display.")).toBeTruthy();
  expect(view.getByText("Article")).toBeTruthy();
  expect(view.getByText("Open")).toBeTruthy();
  expect(view.getByText("Search anywhere in Home")).toBeTruthy();
});

test("a submit tab calls onSubmitQuery on Enter until the query was submitted, then runs the active row", () => {
  const onSubmitQuery = mock((_query: string) => {});
  const onRun = mock((_id: string) => {});
  const props = {
    open: true,
    onOpenChange: () => {},
    title: "Search",
    commands,
    activeId: "new-chat",
    prefiltered: true,
    tabs: [{ id: "all", label: "All" }, { id: "web", label: "Web", submit: true }],
    activeTab: "web",
    onSubmitQuery,
    onRun,
  };
  const view = render(<CommandPaletteDialog {...props} query=" tea " />);
  fireEvent.keyDown(view.getByRole("combobox"), { key: "Enter" });
  expect(onSubmitQuery).toHaveBeenCalledWith("tea");
  expect(onRun).not.toHaveBeenCalled();
  view.rerender(<CommandPaletteDialog {...props} query=" tea " submittedQuery="tea" />);
  fireEvent.keyDown(view.getByRole("combobox"), { key: "Enter" });
  expect(onSubmitQuery).toHaveBeenCalledTimes(1);
  expect(onRun).toHaveBeenCalledWith("new-chat");
});

test("Enter on a tab that is not a submit tab never calls onSubmitQuery", () => {
  const onSubmitQuery = mock((_query: string) => {});
  const onRun = mock((_id: string) => {});
  const view = render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Search" commands={commands} query="new" activeId="new-chat" tabs={[{ id: "all", label: "All" }, { id: "web", label: "Web", submit: true }]} activeTab="all" onSubmitQuery={onSubmitQuery} onRun={onRun} />,
  );
  fireEvent.keyDown(view.getByRole("combobox"), { key: "Enter" });
  expect(onSubmitQuery).not.toHaveBeenCalled();
  expect(onRun).toHaveBeenCalledWith("new-chat");
});

const spotCommands = [
  { id: "a", label: "Neon Rain", group: "Media", keys: [], source: "Music", thumbnailUrl: "/neon.jpg", match: [0, 4] as [number, number] },
  { id: "b", label: "Neon Rain (Bass)", group: "Media", keys: [], source: "Music" },
  { id: "c", label: "Neon notes", group: "Files", keys: [], source: "Library", icon: <span>f</span> },
];

function spotlight(extra: Record<string, unknown> = {}) {
  return render(
    <CommandPaletteDialog open onOpenChange={() => {}} title="Search" variant="spotlight" topHitLabel="Top hit" prefiltered
      commands={spotCommands} query="neon" activeId="a" onRun={() => {}} {...extra} />,
  );
}

test("spotlight puts the first result alone under the Top hit heading and the rest in their groups", () => {
  const view = spotlight();
  const groups = view.getAllByRole("group").map((group) => group.getAttribute("aria-label"));
  expect(groups).toEqual(["Top hit", "Media", "Files"]);
  expect(within(view.getByRole("group", { name: "Top hit" })).getAllByRole("option")).toHaveLength(1);
  expect(within(view.getByRole("group", { name: "Media" })).getAllByRole("option")).toHaveLength(1);
});

test("spotlight keeps arrow-key order across the top hit and highlights the active row", () => {
  const onActiveChange = mock((_id: string) => {});
  const view = spotlight({ onActiveChange });
  fireEvent.keyDown(view.getByRole("combobox"), { key: "ArrowDown" });
  expect(onActiveChange).toHaveBeenCalledWith("b");
  expect(view.getByRole("option", { name: /Neon Rain Music/ }).getAttribute("aria-selected")).toBe("true");
});

test("spotlight shows the picture in a rounded tile at the start of the row and the type label at the end", () => {
  const view = spotlight();
  const option = view.getAllByRole("option")[0]!;
  const img = option.querySelector("img");
  expect(img?.getAttribute("src")).toBe("/neon.jpg");
  expect(option.firstElementChild?.contains(img!)).toBe(true);
  expect(img?.className ?? "").not.toContain("w-28");
  const label = within(option).getByText("Music");
  expect(label.getAttribute("data-slot")).toBe("command-palette-type");
});

test("spotlight is one floating rounded panel with no fixed height, pill tabs and key hints", () => {
  const view = spotlight({ tabs: [{ id: "all", label: "All" }, { id: "files", label: "Files" }], activeTab: "all" });
  const palette = document.querySelector('[data-slot="command-palette"]');
  expect(palette?.getAttribute("data-variant")).toBe("spotlight");
  const cls = palette?.getAttribute("class") ?? "";
  expect(cls).toContain("rounded-3xl");
  expect(cls).not.toContain("h-[min(40rem");
  expect(view.getByRole("tab", { name: "Files" }).className).toContain("rounded-full");
  const hints = document.querySelector('[data-slot="command-palette-hints"]');
  expect(hints?.textContent).toContain("to move");
  expect(hints?.textContent).toContain("to open");
});

test("spotlight with no query shows no Top hit heading", () => {
  const view = spotlight({ query: "" });
  expect(view.queryByRole("group", { name: "Top hit" })).toBeNull();
});

test("spotlight dialog opens near the top third instead of dead centre", () => {
  spotlight();
  const cls = document.querySelector('[data-slot="dialog-content"]')?.getAttribute("class") ?? "";
  expect(cls).toContain("translate-y-0");
});

test("the default variant has no Top hit and no key hints", () => {
  const view = render(<CommandPaletteDialog open onOpenChange={() => {}} title="Search" topHitLabel="Top hit" prefiltered commands={spotCommands} query="neon" activeId="a" />);
  expect(view.queryByRole("group", { name: "Top hit" })).toBeNull();
  expect(document.querySelector('[data-slot="command-palette-hints"]')).toBeNull();
});

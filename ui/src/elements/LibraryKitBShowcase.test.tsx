import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { DataTableSelectionShowcase } from "./DataTableSelectionShowcase";
import { MediaViewerShowcase } from "./MediaViewerShowcase";
import { ShareDialogShowcase } from "./ShareDialogShowcase";

afterEach(cleanup);
beforeEach(() => stubMatchMedia({ "(min-width: 960px)": true }));

describe("Library kit slice B showcases", () => {
  test("DataTableSelectionShowcase draws thumbnails, selects with the select mode and range, and names each box", () => {
    const view = render(<DataTableSelectionShowcase />);
    const body = within(view.container.querySelector("[data-slot='data-table-body']") as HTMLElement);
    expect(view.container.querySelectorAll("[data-slot='data-table-body'] img")).toHaveLength(3);
    fireEvent.click(view.getByRole("button", { name: "Select" }));
    expect(view.getByText("0 selected")).toBeTruthy();
    fireEvent.click(body.getByRole("checkbox", { name: "Select Otters in a kitchen" }));
    fireEvent.click(body.getByRole("checkbox", { name: "Select Moonlit lullaby" }), { shiftKey: true });
    expect(view.getByText("3 selected")).toBeTruthy();
  });

  test("MediaViewerShowcase opens on a file, moves on, and says when it closes", async () => {
    const view = render(<MediaViewerShowcase />);
    fireEvent.click(view.getByRole("button", { name: "Garden at dawn" }));
    await act(async () => {});
    const dialog = within(document.body).getByRole("dialog", { name: "Garden at dawn" });
    expect(within(dialog).getByRole("button", { name: "Share" })).toBeTruthy();
    expect(within(dialog).getByText("880 KB")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(document.body).getByRole("dialog", { name: "Otters in a kitchen" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await act(async () => {});
    expect(view.getByText(/Closed\./)).toBeTruthy();
  });

  test("MediaViewerShowcase mounts a full MusicTrack in the song details area", async () => {
    const view = render(<MediaViewerShowcase />);
    const finishedShowcaseCard = view.container.querySelector('[data-slot="music-track"][data-status="ready"]')!;
    expect(within(finishedShowcaseCard as HTMLElement).getByRole("button", { name: "Edit" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Moonlit lullaby" }));
    await act(async () => {});
    const details = document.body.querySelector("aside[data-slot='media-viewer-details']") as HTMLElement;
    const song = details.querySelector('[data-slot="music-track"]') as HTMLElement;
    expect(song.getAttribute("data-width")).toBe("full");
    expect(within(song).getByRole("img", { name: "Moonlit lullaby album art" })).toBeTruthy();
    fireEvent.click(within(song).getByRole("button", { name: "Lyrics" }));
    expect(within(song).getByText("Moonlight settles")).toBeTruthy();
    expect(song.querySelector("ol")?.className ?? "").not.toContain("overflow-y-auto");
    expect(within(song).getByText("Version 2 of 2")).toBeTruthy();
    act(() => fireEvent.click(within(song).getByRole("button", { name: "Edit" })));
    expect(within(document.body).getByRole("dialog", { name: "Edit Moonlit lullaby" })).toBeTruthy();
    expect(within(document.body).getByRole("tab", { name: "New cover" })).toBeTruthy();
    expect(within(song).getByRole("button", { name: "Play" })).toBeTruthy();
    expect(view.container.querySelectorAll('[data-status="generating"]')).toHaveLength(1);
    expect(view.container.querySelectorAll('[data-status="queued"]')).toHaveLength(1);
    expect(view.container.querySelectorAll('[data-status="ready"]')).toHaveLength(1);
  });

  test("ShareDialogShowcase shows the locked row's reason, saves a change, and asks before the household", async () => {
    const view = render(<ShareDialogShowcase />);
    fireEvent.click(view.getByRole("button", { name: "Share a file" }));
    await act(async () => {});
    const dialog = within(document.body.querySelector("[data-slot=share-dialog]") as HTMLElement);
    expect(dialog.getByText("This picture is for adults only, so it cannot be shared with a child.")).toBeTruthy();
    expect(dialog.getByRole("switch", { name: "Daisy" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(dialog.getByRole("switch", { name: "Everyone in the home" }));
    expect(dialog.getByRole("group", { name: "Share with everyone in the home?" })).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Share with everyone" }));
    expect(dialog.getByRole("switch", { name: "Everyone in the home" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(dialog.getByRole("switch", { name: "Quill" }));
    expect(dialog.getByText("Saving...")).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(dialog.getByRole("alert").textContent).toContain("Home could not save that.");
  });

  test("ShareDialogShowcase opens the project preset", async () => {
    const view = render(<ShareDialogShowcase />);
    fireEvent.click(view.getByRole("button", { name: "Share a project" }));
    await act(async () => {});
    expect(within(document.body).getByRole("heading", { name: "Share project" })).toBeTruthy();
  });
});

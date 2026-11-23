import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { CommandPaletteDialog } from "./command-palette";

afterEach(cleanup);

const commands = [
  { id: "photo", label: "Harbor sunrise", group: "Files", keys: [], source: "Library", meta: "PNG · 2 MB", thumbnailUrl: "/api/files/file-1/thumb?w=320" },
  { id: "plain", label: "Export data", group: "Settings", keys: [] },
];

function row(id: string): HTMLElement {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  return rows.find((node) => node.id.endsWith(id)) ?? rows[id === "photo" ? 0 : 1]!;
}

test("a result with a thumbnail shows it on the left, before the title, and nowhere else in the row", () => {
  render(<CommandPaletteDialog open onOpenChange={() => {}} title="Search" prefiltered commands={commands} query="" activeId="plain" />);
  const photo = row("photo");
  const images = photo.querySelectorAll("img");
  expect(images).toHaveLength(1);
  expect(images[0]!.getAttribute("src")).toBe("/api/files/file-1/thumb?w=320");
  const title = Array.from(photo.querySelectorAll("span")).find((node) => node.textContent === "Harbor sunrise")!;
  // DOCUMENT_POSITION_FOLLOWING (4): the title comes after the image.
  expect(images[0]!.compareDocumentPosition(title) & 4).toBe(4);
});

test("the thumbnail replaces the icon slot: it is a compact square, not the old wide right-hand picture", () => {
  render(<CommandPaletteDialog open onOpenChange={() => {}} title="Search" prefiltered commands={commands} query="" activeId="plain" />);
  const image = row("photo").querySelector("img")!;
  expect(image.className).toContain("size-10");
  expect(image.className).not.toContain("w-28");
});

test("a result without a thumbnail still shows its icon slot", () => {
  render(<CommandPaletteDialog open onOpenChange={() => {}} title="Search" prefiltered commands={commands} query="" activeId="plain" />);
  expect(row("plain").querySelectorAll("img")).toHaveLength(0);
});

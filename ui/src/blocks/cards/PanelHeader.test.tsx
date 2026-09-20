import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";
import { PanelHeader } from "@/kit/blocks/cards/PanelHeader";

afterEach(cleanup);

test("PanelHeader renders the icon tile, the title, and a linked View all", () => {
  render(<MemoryRouter><PanelHeader icon="brain" hue="--hue-teal" title="Recent memories" linkLabel="View all" linkHref="/memory" /></MemoryRouter>);
  expect(document.body.textContent).toContain("Recent memories");
  const link = document.querySelector('a[href="/memory"]');
  expect(link?.textContent).toContain("View all");
});

test("PanelHeader fires onLinkClick when given no href", () => {
  let clicked = false;
  render(<PanelHeader icon="download" hue="--hue-orange" title="Updates" linkLabel="Browse all" onLinkClick={() => { clicked = true; }} />);
  fireEvent.click(document.querySelector("button")!);
  expect(clicked).toBe(true);
});

test("PanelHeader renders with no link at all", () => {
  render(<PanelHeader icon="users" hue="--hue-violet" title="People" />);
  expect(document.querySelector("a")).toBeNull();
  expect(document.querySelector("button")).toBeNull();
});

test("PanelHeader's link carries a distinct accessible name when two panels share the same visible label", () => {
  render(<MemoryRouter><PanelHeader icon="brain" hue="--hue-teal" title="Recent memories" linkLabel="View all" linkAriaLabel="View all memories" linkHref="/memory" /></MemoryRouter>);
  const link = document.querySelector("a")!;
  expect(link.textContent).toContain("View all");
  expect(link.getAttribute("aria-label")).toBe("View all memories");
});

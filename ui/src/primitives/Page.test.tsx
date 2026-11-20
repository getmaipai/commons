import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Page } from "./Page";

afterEach(cleanup);

// A page drawn under a row (a package app's section tabs, a controls row) sits in a flex column. With only `h-full` it is as tall as
// the whole column and ignores that row, so its scroller ends one row below the screen and hides the last lines (PHONE-07). It must
// also take the room that is left (flex-1, min-h-0), and keep h-full for a parent that is not a flex column.
test("Page fills the room left in a flex column instead of the column's full height", () => {
  const root = render(<Page title="Videos">body</Page>).container.firstElementChild as HTMLElement;
  const classes = root.className.split(" ");
  expect(classes).toContain("flex-1");
  expect(classes).toContain("min-h-0");
  expect(classes).toContain("h-full");
});

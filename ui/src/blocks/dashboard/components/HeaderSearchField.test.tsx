import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { HeaderSearchField } from "@/kit/blocks/dashboard/components/HeaderSearchField";

afterEach(cleanup);

test("HeaderSearchField shows the placeholder and the ⌘K pill, and opens on click", () => {
  let opened = false;
  render(<HeaderSearchField placeholder="Search, or ask MaiPai..." onOpen={() => { opened = true; }} />);
  expect(document.body.textContent).toContain("Search, or ask MaiPai...");
  expect(document.body.textContent).toContain("⌘K");
  fireEvent.click(document.querySelector("button")!);
  expect(opened).toBe(true);
});

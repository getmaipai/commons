import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Dialog, DialogBody, DialogContent } from "./dialog";
import { Textarea } from "../elements/ui/textarea";

afterEach(cleanup);

test("the flow dialog is the 5xl card, and its xl size is the wide 7xl card", () => {
  render(<Dialog open><DialogContent variant="flow" showCloseButton={false}><span /></DialogContent></Dialog>);
  expect(document.body.querySelector<HTMLElement>("[data-slot='dialog-content']")?.className).toContain("sm:max-w-5xl");
  cleanup();
  render(<Dialog open><DialogContent variant="flow" size="xl" showCloseButton={false}><span /></DialogContent></Dialog>);
  const wide = document.body.querySelector<HTMLElement>("[data-slot='dialog-content']")?.className ?? "";
  expect(wide).toContain("sm:max-w-7xl"); expect(wide).not.toContain("sm:max-w-5xl");
});

test("the dialog body lays three columns from lg up", () => {
  const { container } = render(<DialogBody columns="three"><i /><i /><i /></DialogBody>);
  const body = container.querySelector<HTMLElement>("[data-slot='dialog-body']");
  expect(body?.className).toContain("lg:grid-cols-3"); expect(body?.getAttribute("data-columns")).toBe("three");
});

test("a textarea with maxRows scrolls inside itself past that height instead of growing", () => {
  const { container } = render(<Textarea maxRows={6} />);
  const area = container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(area.className).toContain("overflow-y-auto"); expect(area.style.getPropertyValue("--textarea-max-rows")).toBe("6");
  cleanup();
  const plain = render(<Textarea />).container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(plain.className).not.toContain("overflow-y-auto");
});

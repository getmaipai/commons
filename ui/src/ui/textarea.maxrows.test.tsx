import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Textarea } from "./textarea";

afterEach(cleanup);

test("a textarea with maxRows scrolls inside itself past that height instead of growing", () => {
  const { container } = render(<Textarea maxRows={8} shape="rounded" />);
  const area = container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(area.className).toContain("overflow-y-auto"); expect(area.style.getPropertyValue("--textarea-max-rows")).toBe("8");
});

test("without maxRows the textarea is unchanged", () => {
  const { container } = render(<Textarea />);
  const area = container.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(area.className).not.toContain("overflow-y-auto"); expect(area.getAttribute("style")).toBeNull();
});

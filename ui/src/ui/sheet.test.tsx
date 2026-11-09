import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/kit/ui/sheet";

afterEach(cleanup);

const open = (side: "bottom" | "right") =>
  render(
    <Sheet open>
      <SheetContent side={side}>
        <SheetTitle>Details</SheetTitle>
        <SheetDescription>More</SheetDescription>
      </SheetContent>
    </Sheet>,
  );

describe("SheetContent grabber", () => {
  test("a bottom sheet draws a hidden-from-readers grabber in token colours", () => {
    open("bottom");
    const grabber = document.body.querySelector("[data-slot=sheet-grabber]")!;
    expect(grabber).toBeTruthy();
    expect(grabber.getAttribute("aria-hidden")).toBe("true");
    expect(grabber.className).toContain("bg-border");
  });
  test("a side sheet has none", () => {
    open("right");
    expect(document.body.querySelector("[data-slot=sheet-grabber]")).toBeNull();
  });
});

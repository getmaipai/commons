// Additive Button layout variants (RULE9-COMMONS-VARIANTS-01): the default
// look is unchanged, and each variant adds only its own classes.
import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Button, buttonVariants } from "@/kit/ui/button";

afterEach(cleanup);

const cls = (el: HTMLElement) => el.className.split(/\s+/);

describe("Button layout variants", () => {
  test("a Button that sets none of them renders the pre-variant classes", () => {
    const el = render(<Button>Save</Button>).getByRole("button");
    const c = cls(el);
    expect(c).toContain("justify-center");
    expect(c).toContain("whitespace-nowrap");
    expect(c).toContain("h-12");
    expect(c).not.toContain("w-full");
    expect(c).not.toContain("justify-start");
    expect(c).not.toContain("h-auto");
    expect(c).not.toContain("whitespace-normal");
  });

  test("explicit defaults equal omitted props", () => {
    expect(buttonVariants({ align: "center", height: "fixed", width: "auto", wrap: "nowrap" })).toBe(
      buttonVariants({}),
    );
  });

  test("align=start replaces centering", () => {
    const c = cls(render(<Button align="start">Row</Button>).getByRole("button"));
    expect(c).toContain("justify-start");
    expect(c).not.toContain("justify-center");
  });

  test("height=auto replaces the fixed height and keeps the 48px floor", () => {
    const c = cls(render(<Button height="auto">Row</Button>).getByRole("button"));
    expect(c).toContain("h-auto");
    expect(c).toContain("min-h-12");
    expect(c).not.toContain("h-12");
  });

  test("width=full fills the row", () => {
    expect(cls(render(<Button width="full">Row</Button>).getByRole("button"))).toContain("w-full");
  });

  test("wrap=wrap lets long text wrap", () => {
    const c = cls(render(<Button wrap="wrap">A long label</Button>).getByRole("button"));
    expect(c).toContain("whitespace-normal");
    expect(c).not.toContain("whitespace-nowrap");
  });

  test("the variants combine with size and variant", () => {
    const c = cls(
      render(
        <Button variant="ghost" size="sm" align="start" height="auto" width="full" wrap="wrap">
          x
        </Button>,
      ).getByRole("button"),
    );
    expect(c).toEqual(expect.arrayContaining(["justify-start", "h-auto", "w-full", "whitespace-normal"]));
  });
});

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "bun:test";
import { IconTile } from "@/kit/primitives/IconTile";

afterEach(cleanup);

test("IconTile renders the icon tinted with its hue, with a glow by default", () => {
  const { container } = render(<IconTile icon="box" hue="--hue-blue" />);
  const tile = container.firstElementChild as HTMLElement;
  expect(tile.style.color).toBe("var(--hue-blue)");
  expect(tile.style.boxShadow).not.toBe("");
});

test("IconTile turns the glow off when asked, and renders a smaller size", () => {
  const { container } = render(<IconTile icon="box" hue="--hue-teal" size="sm" glow={false} />);
  const tile = container.firstElementChild as HTMLElement;
  expect(tile.className).toContain("size-8");
  expect(tile.style.boxShadow).toBe("");
});

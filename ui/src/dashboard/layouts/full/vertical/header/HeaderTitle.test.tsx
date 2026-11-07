import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { getIcon } from "../../../../../icons";
import { HeaderTitle } from "./HeaderTitle";

afterEach(cleanup);

describe("HeaderTitle", () => {
  test("a long name wraps to two lines and is never single-line truncated", () => {
    const { container } = render(<HeaderTitle icon={getIcon("clock")} label="Recordatorios" />);
    const name = container.querySelector('[data-slot="header-title"]') as HTMLElement;
    expect(name.textContent).toBe("Recordatorios");
    expect(name.className).toContain("line-clamp-2");
    expect(name.className).toContain("wrap-anywhere");
    expect(name.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(name.className).toContain("max-sm:text-base");
    expect(name.getAttribute("title")).toBe("Recordatorios");
  });

  test("the icon keeps its size and `heading` makes the name an h1 and hides the icon on a phone", () => {
    const { container, getByRole } = render(<HeaderTitle icon={getIcon("clock")} label="News" heading hideInTopRow />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe("News");
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("class")).toContain("shrink-0");
    expect(svg.getAttribute("class")).toContain("max-sm:hidden");
    expect(container.querySelector("[data-top-row-hide]")).not.toBeNull();
  });

  test("without `heading` the name is a plain span", () => {
    const { container } = render(<HeaderTitle icon={getIcon("clock")} label="Clock" />);
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("span[data-slot=header-title]")).not.toBeNull();
  });
});

import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { PageSkeleton, ShelfSkeleton } from "./PageSkeleton";

describe("PageSkeleton", () => {
  test("draws one hero box and the asked number of shelves of tile boxes", () => {
    const view = render(<PageSkeleton shelves={3} />);
    expect(view.container.querySelectorAll('[data-slot="shelf-skeleton"]')).toHaveLength(3);
    expect(view.container.querySelector('[data-slot="page-skeleton"]')!.getAttribute("role")).toBe("status");
    expect(view.container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(3 * 6);
  });
  test("a shelf draws the asked number of tiles and holds back for 200 ms like the route skeleton", () => {
    const view = render(<ShelfSkeleton tiles={4} />);
    expect(view.container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5);
    expect((view.container.firstElementChild as HTMLElement).style.animation).toContain("200ms");
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { KitGalleryShowcase } from "./KitGalleryShowcase";

afterEach(cleanup);

describe("KitGalleryShowcase", () => {
  test("renders all nine gallery sections without literal hex color styles", () => {
    const { container, getByRole } = render(<KitGalleryShowcase />);
    for (const heading of ["Buttons", "Chips and badges", "Fields", "Cards and surfaces", "Media", "Navigation", "Status", "Media players", "Tokens"]) {
      expect(getByRole("heading", { name: heading, level: 2 })).toBeTruthy();
    }
    expect(container.querySelector('[style*="color:#"]')).toBeNull();
  });
});

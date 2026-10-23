import { describe, expect, test } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach } from "bun:test";
import { CreationKitShowcase } from "./CreationKitShowcase";

afterEach(cleanup);

describe("CreationKitShowcase", () => {
  test("shows the header and opens its sharing panel", async () => {
    const view = render(<CreationKitShowcase />);
    expect(view.getByRole("heading", { name: "Garden at dawn" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Shared, manage sharing" }));
    expect(await view.findByRole("dialog")).toBeTruthy();
  });
});

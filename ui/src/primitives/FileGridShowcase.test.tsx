import { describe, expect, test, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { FileGridShowcase } from "@/kit/primitives/FileGridShowcase";
import { StorageBarShowcase } from "@/kit/primitives/StorageBarShowcase";

afterEach(cleanup);

describe("Library kit showcases", () => {
  test("FileGridShowcase draws every sample file, selects with the select mode button, and opens a menu from the actions button", async () => {
    const view = render(<FileGridShowcase />);
    expect(view.getByRole("list", { name: "Library files" }).children).toHaveLength(8);
    fireEvent.click(view.getByRole("button", { name: "Select" }));
    expect(view.getByText("0 selected")).toBeTruthy();
    fireEvent.click(view.getByRole("checkbox", { name: "Select Fox in the snow" }));
    expect(view.getByText("1 selected")).toBeTruthy();
    const actions = view.getByRole("button", { name: "Actions for Fox in the snow" });
    expect(actions.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.pointerDown(actions, { button: 0, ctrlKey: false });
    expect(actions.getAttribute("aria-expanded")).toBe("true");
    expect(await view.findByRole("menuitem", { name: "Share" })).toBeTruthy();
  });

  test("the empty slot shows when the sample has no files", () => {
    const view = render(<FileGridShowcase />);
    fireEvent.click(view.getByRole("button", { name: "Show the empty state" }));
    expect(view.getByText(/Nothing here yet/)).toBeTruthy();
  });

  test("StorageBarShowcase draws five bars", () => {
    const view = render(<StorageBarShowcase />);
    expect(view.getAllByRole("img")).toHaveLength(5);
  });
});

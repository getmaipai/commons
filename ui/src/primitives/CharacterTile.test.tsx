import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { CharacterTile } from "@/kit/primitives/CharacterTile";

afterEach(cleanup);

describe("CharacterTile", () => {
  test("is an accessible selectable button with selected check and optional slots", () => {
    let selected = 0;
    const { getByRole, getByText } = render(<CharacterTile name="Marlow" selected onSelect={() => selected++} media={<span>portrait</span>} line="Ready" status={<span>Online</span>} menu={<button aria-label="More actions" />} />);
    expect(getByRole("button", { name: "Marlow" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByText("portrait")).toBeTruthy();
    expect(getByText("Ready")).toBeTruthy();
    expect(getByText("Online")).toBeTruthy();
    expect(getByRole("button", { name: "More actions" })).toBeTruthy();
    expect(getByRole("button", { name: "Marlow" }).querySelector("svg")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Marlow" }));
    expect(selected).toBe(1);
  });

  test("renders add tile with its accessible label", () => {
    const { getByRole, getByText } = render(<CharacterTile name="Add character" variant="add" />);
    expect(getByRole("button", { name: "Add character" })).toBeTruthy();
    expect(getByText("+")).toBeTruthy();
  });
});

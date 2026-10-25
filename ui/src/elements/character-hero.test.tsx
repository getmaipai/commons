import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { CharacterHero } from "@/kit/elements/character-hero";

afterEach(cleanup);

describe("CharacterHero", () => {
  test("renders media, name, line, actions and owns sticky positioning", () => {
    const { getByText, getByRole, container } = render(<CharacterHero name="Marlow" media={<span>portrait</span>} line="Ready to chat" sticky actions={<button aria-label="Talk">Talk</button>} />);
    expect(getByText("portrait")).toBeTruthy();
    expect(getByText("Marlow")).toBeTruthy();
    expect(getByText("Ready to chat")).toBeTruthy();
    expect(getByRole("button", { name: "Talk" })).toBeTruthy();
    expect(container.querySelector("section")?.className).toContain("sticky");
  });
});

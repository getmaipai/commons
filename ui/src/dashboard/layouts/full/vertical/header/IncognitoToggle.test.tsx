import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { IncognitoToggle } from "./Header";

afterEach(cleanup);

describe("IncognitoToggle (Home INCOGNITO-08, pill redesign)", () => {
  test("the active state is a solid violet pill badge with an icon and a text label", () => {
    const { getByRole } = render(<IncognitoToggle on onChange={() => {}} />);
    const toggle = getByRole("button", { name: "Incognito On" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle.className).toContain("rounded-full");
    expect(toggle.className).toContain("bg-violet-600");
    expect(toggle.className).toContain("text-white");
    expect(toggle.textContent).toContain("Incognito");
    expect(toggle.querySelector("svg.lucide-venetian-mask")).not.toBeNull();
    expect(toggle.querySelector("svg.lucide-eye-off")).toBeNull();
  });

  test("clicking the active pill requests turning it off", () => {
    const onChange = mock(() => {});
    const { getByRole } = render(<IncognitoToggle on onChange={onChange} />);
    fireEvent.click(getByRole("button", { name: "Incognito On" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test("the inactive state is a plain 40px icon toggle, no pill and no label", () => {
    const onChange = mock(() => {});
    const { getByRole } = render(<IncognitoToggle on={false} onChange={onChange} />);
    const toggle = getByRole("button", { name: "Incognito Off" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle.className).toContain("h-10");
    expect(toggle.className).toContain("w-10");
    expect(toggle.className).not.toContain("bg-violet-600");
    expect(toggle.textContent).not.toContain("Incognito");
    expect(toggle.querySelector("svg.lucide-venetian-mask")).not.toBeNull();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

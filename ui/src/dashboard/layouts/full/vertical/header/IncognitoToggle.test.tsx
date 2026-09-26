import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { IncognitoToggle } from "./Header";

afterEach(cleanup);

describe("IncognitoToggle (Home INCOGNITO-08)", () => {
  test("is an accessible 40px icon toggle with a purple active state", () => {
    const { getByRole } = render(<IncognitoToggle on onChange={() => {}} />);
    const toggle = getByRole("button", { name: "Incognito On" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle.className).toContain("h-10");
    expect(toggle.className).toContain("w-10");
    expect(toggle.className).toContain("text-violet-600");
    expect(toggle.className).toContain("ring-2");
    expect(toggle.className).toContain("ring-violet-500");
    expect(toggle.querySelector("svg.lucide-venetian-mask")).not.toBeNull();
    expect(toggle.querySelector("svg.lucide-eye-off")).toBeNull();
  });

  test("reports the off state and requests the opposite value when clicked", () => {
    const onChange = mock(() => {});
    const { getByRole } = render(<IncognitoToggle on={false} onChange={onChange} />);
    const toggle = getByRole("button", { name: "Incognito Off" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle.className).not.toContain("ring-2");
    expect(toggle.querySelector("svg.lucide-venetian-mask")).not.toBeNull();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { Card } from "@/dashboard/components/ui/card";

describe("Card accent variant", () => {
  test("sets the shared accent token and keeps the default card unchanged", () => {
    const plain = render(<Card />);
    const defaultCard = plain.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(defaultCard.dataset.accent).toBeUndefined();
    plain.unmount();

    const accented = render(<Card accent="violet" interactive />);
    const card = accented.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(card.dataset.accent).toBe("violet");
    expect(card.style.getPropertyValue("--profile-accent-active")).toBe("var(--profile-accent-violet)");
    expect(card.className).toContain("ring-[var(--profile-accent-active)]");
    expect(card.className).toContain("hover:shadow-md");
  });
});

describe("Card state", () => {
  test("invalid outlines and tints the card in the destructive colour and valid in the success hue", () => {
    const bad = render(<Card state="invalid" />);
    const badCard = bad.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(badCard.dataset.state).toBe("invalid");
    expect(badCard.className).toContain("outline-destructive");
    bad.unmount();
    const good = render(<Card state="valid" />);
    const goodCard = good.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(goodCard.dataset.state).toBe("valid");
    expect(goodCard.className).toContain("--hue-teal");
  });
});

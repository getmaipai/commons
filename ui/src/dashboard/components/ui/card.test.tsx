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

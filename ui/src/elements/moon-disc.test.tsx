import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { MoonDisc } from "./moon-disc";

describe("MoonDisc", () => {
  test("renders waxing and waning lit sides with opposite paths", () => {
    const waxing = render(<MoonDisc phase="Waxing Crescent" illumination={28} size={64} />).container.querySelector("svg")!;
    const waning = render(<MoonDisc phase="Waning Crescent" illumination={28} size={64} />).container.querySelector("svg")!;
    expect(waxing.querySelector('[data-lit-path="right"]')?.getAttribute("d")).toContain("0 0 1");
    expect(waning.querySelector('[data-lit-path="left"]')?.getAttribute("d")).toContain("0 0 0");
  });
  test("renders full and new extremes", () => {
    const full = render(<MoonDisc phase="Full Moon" illumination={100} size={64} />).container.querySelector("svg")!;
    const fresh = render(<MoonDisc phase="New Moon" illumination={0} size={64} />).container.querySelector("svg")!;
    expect(full.getAttribute("data-phase-extreme")).toBe("full");
    expect(fresh.getAttribute("data-phase-extreme")).toBe("new");
  });
  test("clamps illumination, uses token colors, and has an accessible label", () => {
    const { container } = render(<MoonDisc phase="Waxing Crescent" illumination={128} size={64} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toBe("Waxing Crescent, 100% illuminated");
    expect(svg.outerHTML).not.toMatch(/#|rgb\(/i);
    expect(svg.outerHTML).toContain("var(--weather-moon-lit)");
    expect(svg.outerHTML).toContain("var(--weather-moon-dark)");
  });
});

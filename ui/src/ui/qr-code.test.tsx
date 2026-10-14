import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { QrCode } from "@/kit/ui/qr-code";

afterEach(cleanup);

describe("QrCode", () => {
  test("renders a labelled SVG for its value", () => {
    const { getByRole } = render(<QrCode value="https://home.example" size={192} label="Home access QR code" />);
    const image = getByRole("img", { name: "Home access QR code" });
    expect(image.tagName.toLowerCase()).toBe("svg");
    expect(image.querySelector("path")).toBeTruthy();
  });

  test("updates the rendered code when the value changes", () => {
    const { container, rerender } = render(<QrCode value="first" size={192} label="Access QR code" />);
    const svg = container.querySelector("svg");
    const initialPath = svg?.querySelector("path")?.getAttribute("d");
    rerender(<QrCode value="a different access URL" size={192} label="Access QR code" />);
    expect(container.querySelector("svg")).toBe(svg);
    expect(svg?.querySelector("path")?.getAttribute("d")).not.toBe(initialPath);
  });

  test("uses the scan contrast tokens and light quiet zone", () => {
    const { container } = render(<QrCode value="https://home.example" size={192} label="Access QR code" />);
    const svg = container.querySelector("svg");
    const paths = svg?.querySelectorAll("path");
    expect(paths?.[0]?.getAttribute("fill")).toBe("var(--qr-background, #ffffff)");
    expect(paths?.[1]?.getAttribute("fill")).toBe("var(--qr-foreground, #000000)");
    const quietZone = container.firstElementChild as HTMLElement;
    expect(quietZone.style.backgroundColor).toBe("var(--qr-background, #ffffff)");
    expect(quietZone.style.color).toBe("var(--qr-foreground, #000000)");
    expect(quietZone.style.padding).toBe("var(--qr-quiet-zone, 4px)");
  });
});

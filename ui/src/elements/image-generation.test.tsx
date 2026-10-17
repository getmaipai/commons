import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ImageGeneration } from "./image-generation";

afterEach(cleanup);

describe("ImageGeneration progress, Stop and size", () => {
  test("generating shows the status, the clock and a bar, and Stop calls onStop", () => {
    let stops = 0;
    const view = render(
      <ImageGeneration prompt="A quiet garden" generating progress={40} statusLabel="Drawing" elapsedLabel="12s" sizeLabel="768 × 512" onStop={() => stops++} />,
    );
    expect(view.getByText("Drawing")).toBeTruthy();
    expect(view.getByText("12s")).toBeTruthy();
    expect(view.getByText("768 × 512")).toBeTruthy();
    const bar = view.getByRole("progressbar");
    expect(bar.getAttribute("aria-label")).toBe("Drawing");
    expect((bar.querySelector("[data-slot=progress-indicator]") as HTMLElement).style.transform).toContain("-60%");
    fireEvent.click(view.getByRole("button", { name: "Stop" }));
    expect(stops).toBe(1);
  });

  test("the regenerate button is hidden while generating with Stop, and back when done", () => {
    const view = render(<ImageGeneration prompt="Garden" generating onStop={() => {}} onRegenerate={() => {}} />);
    expect(view.queryByRole("button", { name: "Regenerate image" })).toBeNull();
    view.rerender(<ImageGeneration prompt="Garden" generating={false} onStop={() => {}} onRegenerate={() => {}} />);
    expect(view.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(view.getByRole("button", { name: "Regenerate image" })).toBeTruthy();
    expect(view.getByText("Garden")).toBeTruthy();
  });

  test("without the new props nothing new is drawn (default unchanged)", () => {
    const view = render(<ImageGeneration prompt="Garden" generating />);
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(view.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(view.getByText("Generating")).toBeTruthy();
    expect(view.getByText("1024 × 1024")).toBeTruthy();
  });

  test("size large fills the width; motion is switched off for reduced motion", () => {
    const view = render(<ImageGeneration prompt="Garden" generating size="large" />);
    const root = view.container.querySelector("[data-slot='image-generation']") as HTMLElement;
    expect(root.className).toContain("w-full");
    expect(root.className).not.toContain("w-52");
    const dots = Array.from(view.container.querySelectorAll("span.rounded-full"));
    expect(dots.length).toBe(64);
    expect(dots.every((dot) => dot.className.includes("motion-reduce:animate-none"))).toBe(true);
  });
});

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { SafeImage } from "./SafeImage";

describe("SafeImage", () => {
  test("uses the picture tile without a source and names it when alt is meaningful", () => {
    const view = render(<SafeImage alt="Album cover" />);
    expect(view.queryByRole("img", { name: "Album cover" })?.getAttribute("data-slot")).toBe("safe-image-fallback");
    expect(view.queryByRole("img", { name: "Album cover" })?.getAttribute("data-kind")).toBe("picture");
    expect(view.queryByRole("img", { name: "Album cover" })?.querySelector("img")).toBeNull();
  });

  test("keeps decorative fallbacks hidden from assistive technology", () => {
    const view = render(<SafeImage alt="" />);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(view.container.querySelector('[role="img"]')).toBeNull();
  });

  test("keeps an unbounded picture slot visible with a stable fallback frame", () => {
    const view = render(<SafeImage alt="Article picture" className="max-w-full" />);
    const fallback = view.container.querySelector('[data-slot="safe-image-fallback"]') as HTMLElement;
    expect(fallback.className).toContain("aspect-video");
    expect(fallback.className).toContain("min-h-16");
  });

  test("shows the placeholder after an image error and resets for a new source", () => {
    const view = render(<SafeImage src="/bad.jpg" alt="Cover" />);
    fireEvent.error(view.getByRole("img", { name: "Cover" }));
    expect(view.getByRole("img", { name: "Cover" }).getAttribute("data-slot")).toBe("safe-image-fallback");
    view.rerender(<SafeImage src="/good.jpg" alt="Cover" />);
    expect(view.getByRole("img", { name: "Cover" }).tagName).toBe("IMG");
    expect(view.getByRole("img", { name: "Cover" }).getAttribute("src")).toBe("/good.jpg");
  });

  test("renders a source that loads as an img with lazy loading by default", () => {
    let loaded = false;
    const view = render(<SafeImage src="/good.jpg" alt="Mountain" onLoad={() => { loaded = true; }} />);
    const image = view.getByRole("img", { name: "Mountain" });
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("loading")).toBe("lazy");
    fireEvent.load(image);
    expect(loaded).toBe(true);
  });

  test("selects each themed placeholder kind", () => {
    for (const kind of ["music", "video", "file", "person", "picture"] as const) {
      const view = render(<SafeImage kind={kind} />);
      expect(view.container.querySelector(`[data-slot="safe-image-fallback"][data-kind="${kind}"]`)).not.toBeNull();
      expect(view.container.querySelector(`[data-slot="safe-image-fallback"][data-kind="${kind}"] svg`)).not.toBeNull();
      view.unmount();
    }
  });
});

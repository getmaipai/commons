import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { SafeImage, initials } from "./SafeImage";

describe("SafeImage tinted fallback", () => {
  test("a seeded fallback is a soft theme-token tint with the first letters, never the flat gray", () => {
    const view = render(<SafeImage kind="music" tintSeed="Blue Hour" alt="" />);
    const tile = view.container.querySelector('[data-slot="safe-image-fallback"]') as HTMLElement;
    expect(tile.getAttribute("data-tinted")).toBe("");
    expect(tile.className).not.toContain("bg-muted");
    expect(tile.className).toContain("color-mix(in_oklab,var(--tile-tint)_22%,var(--card))");
    expect(tile.style.getPropertyValue("--tile-tint")).toMatch(/^var\(--[a-z-]+\)$/);
    expect(tile.textContent).toBe("BH");
  });
  test("a seed with no letters falls back to the kind icon; initials skips punctuation", () => {
    const view = render(<SafeImage kind="video" tintSeed="" alt="" />);
    expect(view.container.querySelector("svg")).not.toBeNull();
    expect(initials("  the-quiet  Hours ")).toBe("TQ");
    expect(initials("!!!")).toBe("");
  });
  test("without a seed the old muted tile is unchanged", () => {
    const view = render(<SafeImage alt="" />);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"]')?.className).toContain("bg-muted");
  });
});

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

  test("a class that sizes the tile beats the width and height hints, so the icon stays inside a narrow tile", () => {
    const sized = render(<SafeImage kind="music" width={320} height={240} className="absolute inset-0 size-full" />);
    const tile = sized.container.querySelector('[data-slot="safe-image-fallback"]') as HTMLElement;
    expect(tile.style.width).toBe("");
    expect(tile.style.height).toBe("");
    sized.unmount();
    const hinted = render(<SafeImage kind="music" width={320} height={240} />);
    const plain = hinted.container.querySelector('[data-slot="safe-image-fallback"]') as HTMLElement;
    expect(plain.style.width).toBe("320px");
    expect(plain.style.height).toBe("240px");
    hinted.unmount();
    const wide = render(<SafeImage kind="music" width={320} height={240} className="w-full" />);
    const half = wide.container.querySelector('[data-slot="safe-image-fallback"]') as HTMLElement;
    expect(half.style.width).toBe("");
    expect(half.style.height).toBe("240px");
  });
});

describe("small tinted covers keep the kind icon (KIT-QA-01)", () => {
  test("a tinted fallback carries the kind icon beside the initials, the container query picks one", () => {
    const { container } = render(<SafeImage kind="music" tintSeed="Blue Hour" className="size-10" />);
    const tile = container.querySelector('[data-slot="safe-image-fallback"]')!;
    expect(tile.className).toContain("@container/safe-art");
    const icon = tile.querySelector('[data-slot="safe-image-icon"]')!;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute("class")).toContain("@[6rem]/safe-art:hidden");
    expect(tile.querySelector('[data-slot="safe-image-initials"]')!.getAttribute("class")).toContain("hidden");
  });
  test("a podcast placeholder is a mic", () => {
    const { container } = render(<SafeImage kind="podcast" className="size-10" />);
    expect(container.querySelector('[data-slot="safe-image-fallback"]')!.getAttribute("data-kind")).toBe("podcast");
  });
});

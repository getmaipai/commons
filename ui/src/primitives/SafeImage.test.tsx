import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { SafeImage, initials } from "./SafeImage";

describe("SafeImage seeded art fallback", () => {
  test("stable seeds choose stable hue pairs and distinct seeds choose different art", () => {
    const renderTile = (seed: string) => render(<SafeImage kind="music" tintSeed={seed} />);
    const first = renderTile("Blue Hour");
    const originalPair = first.container.querySelector("[data-slot=safe-image-fallback]")!.getAttribute("style") ?? "";
    const same = renderTile("Blue Hour");
    expect(same.container.querySelector("[data-slot=safe-image-fallback]")!.getAttribute("style") ?? "").toBe(originalPair);
    const different = renderTile("Night Drive");
    expect(different.container.querySelector("[data-slot=safe-image-fallback]")!.getAttribute("style") ?? "").not.toBe(originalPair);
  });
  test("shows a kind glyph and optional label without initials", () => {
    const view = render(<SafeImage kind="video" tintSeed="Blue Hour" label="Blue Hour" alt="" />);
    const tile = view.container.querySelector('[data-slot="safe-image-fallback"]')!;
    expect(tile.querySelector('[data-slot="safe-image-icon"]')).not.toBeNull();
    expect(tile.querySelector('[data-slot="safe-image-label"]')?.textContent).toBe("Blue Hour");
    expect(tile.querySelector('[data-slot="safe-image-initials"]')).toBeNull();
    expect(initials("  the-quiet  Hours ")).toBe("TQ");
    expect(initials("!!!")).toBe("");
  });
  test("the art fallback has no fixed color literals", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./SafeImage.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/(?:#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\()/i);
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
    expect(fallback.className).toContain("aspect-square");
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

describe("art covers keep the kind icon (KIT-QA-01)", () => {
  test("a cover fallback carries the kind icon", () => {
    const { container } = render(<SafeImage kind="music" tintSeed="Blue Hour" className="size-10" />);
    const tile = container.querySelector('[data-slot="safe-image-fallback"]')!;
    expect(tile.className).toContain("@container/safe-art");
    const icon = tile.querySelector('[data-slot="safe-image-icon"]')!;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute("class")).toContain("bottom-2");
    expect(tile.querySelector('[data-slot="safe-image-initials"]')).toBeNull();
  });
  test("a podcast placeholder is a mic", () => {
    const { container } = render(<SafeImage kind="podcast" className="size-10" />);
    expect(container.querySelector('[data-slot="safe-image-fallback"]')!.getAttribute("data-kind")).toBe("podcast");
  });
  test("a seeded empty cover draws a poster cover, an unseeded one does not, and the same name draws the same art", () => {
    const a = render(<SafeImage src={null} tintSeed="Night Bus" />);
    const b = render(<SafeImage src={null} tintSeed="Night Bus" />);
    const plain = render(<SafeImage src={null} />);
    expect(a.container.querySelector('[data-slot="generated-cover"]')).not.toBeNull();
    expect(a.container.querySelector('[data-slot="generated-cover"]')!.innerHTML).toBe(b.container.querySelector('[data-slot="generated-cover"]')!.innerHTML);
    expect(plain.container.querySelector('[data-slot="generated-cover"]')).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { act } from "@testing-library/react";
import { GALLERY_GAP, GALLERY_TILE_MIN, ImageGallery, tilesThatFit } from "./image-gallery";

afterEach(cleanup);

describe("ImageGallery", () => {
  test("shows three pictures and a +N tile for five pictures", () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      id: `picture-${index + 1}`,
      src: `https://example.test/${index}.jpg`,
      alt: `Picture ${index + 1}`,
    }));
    const { getByText, container } = render(
      <ImageGallery images={images} maxVisible={3} />,
    );
    expect(container.querySelectorAll(".grid button[aria-label^=\"Open image\"]")).toHaveLength(3);
    expect(getByText("+2")).toBeTruthy();
  });

  test("opens a lightbox when a tile is clicked", () => {
    const images = [
      { id: "one", src: "https://example.test/one.jpg", alt: "Picture one" },
      { id: "two", src: "https://example.test/two.jpg", alt: "Picture two" },
    ];
    const { getByRole } = render(<ImageGallery images={images} />);
    fireEvent.click(getByRole("button", { name: "Open image: Picture one" }));
    expect(getByRole("dialog")).toBeTruthy();
  });

  test("a failed tile and lightbox image show the shared picture fallback", () => {
    const images = [{ id: "one", src: "https://example.test/one.jpg", alt: "Picture one" }];
    const { container, getByRole } = render(<ImageGallery images={images} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector('[data-slot="safe-image-fallback"][data-kind="picture"]')).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Open image: Picture one" }));
    expect(document.body.querySelectorAll('[data-slot="safe-image-fallback"][data-kind="picture"]')).toHaveLength(2);
  });

  test("Edit button per tile: reveal classes, click edits once and does not open the lightbox", () => {
    const images = [
      { id: "one", src: "https://example.test/one.jpg", alt: "Picture one" },
      { id: "two", src: "https://example.test/two.jpg", alt: "Picture two" },
    ];
    const edits: unknown[] = [];
    const opens: string[] = [];
    const { getAllByRole, queryByRole } = render(
      <ImageGallery
        images={images}
        onOpen={(id) => opens.push(id)}
        onEditImage={(image) => edits.push(image)}
        canEditImage={(image) => image.id !== "two"}
      />,
    );
    const buttons = getAllByRole("button", { name: "Edit picture" });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.className).toContain("group-hover/edit-tile:opacity-100");
    expect(buttons[0]!.className).toContain("[@media(hover:none)]:opacity-100");
    fireEvent.click(buttons[0]!);
    expect(edits).toEqual([
      { id: "one", src: "https://example.test/one.jpg", alt: "Picture one", index: 0 },
    ]);
    expect(opens).toEqual([]);
    expect(queryByRole("dialog")).toBeNull();
  });

  test("actions: an outline button per action with its hint; none when the list is empty; a disabled one does not fire", () => {
    const images = [{ id: "a", src: "https://example.test/a.jpg", alt: "A" }];
    const picked: string[] = [];
    const { getByRole, getByText, container, rerender } = render(
      <ImageGallery
        images={images}
        actions={[
          { id: "detail", label: "Make it Detailed", hint: "Slower, with finer detail", onSelect: () => picked.push("detail") },
          { id: "off", label: "Off", disabled: true, onSelect: () => picked.push("off") },
        ]}
      />,
    );
    fireEvent.click(getByRole("button", { name: "Make it Detailed" }));
    fireEvent.click(getByRole("button", { name: "Off" }));
    expect(picked).toEqual(["detail"]);
    expect(getByText("Slower, with finer detail")).toBeTruthy();
    expect(container.querySelector('[data-slot="image-gallery-actions"]')).not.toBeNull();
    rerender(<ImageGallery images={images} actions={[]} />);
    expect(container.querySelector('[data-slot="image-gallery-actions"]')).toBeNull();
  });

  test("no onEditImage: no Edit button", () => {
    const { queryByRole } = render(
      <ImageGallery images={[{ id: "a", src: "https://example.test/a.jpg", alt: "A" }]} />,
    );
    expect(queryByRole("button", { name: "Edit picture" })).toBeNull();
  });

  test("always-visible Edit is in picture tab order and has a 48px target; default remains revealed on hover/focus", () => {
    const images = [{ id: "a", src: "https://example.test/a.jpg", alt: "A" }];
    const { container, getByRole, rerender } = render(<ImageGallery images={images} onEditImage={() => {}} editAlwaysVisible />);
    const edit = getByRole("button", { name: "Edit picture" });
    expect(edit.className).toContain("opacity-100");
    expect(edit.className).toContain("size-12");
    expect([...container.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim())).toEqual(["Open image: A", "Edit picture"]);
    rerender(<ImageGallery images={images} onEditImage={() => {}} />);
    expect(getByRole("button", { name: "Edit picture" }).className).toContain("group-hover/edit-tile:opacity-100");
    expect(getByRole("button", { name: "Edit picture" }).className).not.toMatch(/(?:^| )opacity-100(?: |$)/);
  });

  test("size large gives one picture the whole width and leaves several in the grid", () => {
    const one = [{ id: "a", src: "https://example.test/a.jpg", alt: "A" }];
    const many = [...one, { id: "b", src: "https://example.test/b.jpg", alt: "B" }];
    const single = render(<ImageGallery images={one} size="large" />);
    expect(single.container.querySelector('[data-slot="image-gallery"] > div')!.className).toContain("grid-cols-1");
    single.unmount();
    const grid = render(<ImageGallery images={many} size="large" layout="grid" />);
    expect(grid.container.querySelector('[data-slot="image-gallery"] > div')!.className).toContain("grid-cols-2");
    grid.unmount();
    const plain = render(<ImageGallery images={one} layout="grid" />);
    expect(plain.container.querySelector('[data-slot="image-gallery"] > div')!.className).toContain("grid-cols-2");
  });

  test("size large keeps a single picture's own proportions; the grid and the default stay square crops", () => {
    const one = [{ id: "a", src: "https://example.test/a.jpg", alt: "A" }];
    const many = [...one, { id: "b", src: "https://example.test/b.jpg", alt: "B" }];
    const single = render(<ImageGallery images={one} size="large" />);
    expect(single.container.querySelector("button")!.className).not.toContain("aspect-square");
    expect(single.container.querySelector("img")!.className).toContain("object-contain");
    expect(single.container.querySelector("img")!.className).toContain("h-auto");
    single.unmount();
    const grid = render(<ImageGallery images={many} size="large" layout="grid" />);
    expect(grid.container.querySelector("button")!.className).toContain("aspect-square");
    expect(grid.container.querySelector("img")!.className).toContain("object-cover");
    grid.unmount();
    const plain = render(<ImageGallery images={one} layout="grid" />);
    expect(plain.container.querySelector("button")!.className).toContain("aspect-square");
  });
});

// jsdom cannot lay out, so a fake ResizeObserver reports the container width the test chooses.
const observers: Array<(width: number) => void> = [];
const realObserver = globalThis.ResizeObserver;
beforeEach(() => {
  observers.length = 0;
  globalThis.ResizeObserver = class {
    constructor(private readonly cb: ResizeObserverCallback) {
      observers.push((width) =>
        this.cb([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver),
      );
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  globalThis.ResizeObserver = realObserver;
});

const fit = (width: number, max = 6) => tilesThatFit(width, GALLERY_TILE_MIN, GALLERY_GAP, max);
const nine = Array.from({ length: 9 }, (_, i) => ({
  id: `p${i + 1}`,
  src: `https://example.test/${i}.jpg`,
  alt: `Picture ${i + 1}`,
}));
const tiles = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="image-gallery"] > div button[aria-label^="Open image"]');

describe("tilesThatFit", () => {
  test("phone widths fit fewer tiles than the 448 px desktop cap", () => {
    expect(fit(328)).toBe(4); // a 360 px phone minus the 16 px gutters
    expect(fit(358)).toBe(4); // 390 px
    expect(fit(448)).toBe(5); // 1440 px, the gallery's max-w-md
    expect(fit(1000)).toBe(6); // never more than maxVisible
  });
  test("never fewer than one, an unknown width shows the cap, a bad cap is 1", () => {
    expect(fit(20)).toBe(1);
    expect(fit(0)).toBe(6);
    expect(fit(Number.NaN)).toBe(6);
    expect(tilesThatFit(400, 72, 8, 0)).toBe(1);
  });
});

describe("ImageGallery one row", () => {
  const widths: Array<[number, number]> = [[328, 4], [358, 4], [448, 5]];
  for (const [width, count] of widths) {
    test(`container ${width}px draws ${count} square tiles in one row, +N on the last`, () => {
      const { container, getByText } = render(<ImageGallery images={nine} />);
      act(() => observers.forEach((send) => send(width)));
      expect(tiles(container)).toHaveLength(count);
      const grid = container.querySelector('[data-layout="row"]') as HTMLElement;
      expect(grid.style.gridTemplateColumns).toBe(`repeat(${count}, minmax(0, 1fr))`);
      expect(tiles(container)[0]!.className).toContain("aspect-square");
      expect(getByText(`+${nine.length - count}`)).toBeTruthy();
      expect(tiles(container)[count - 1]!.textContent).toBe(`+${nine.length - count}`);
    });
  }

  test("five pictures fit one row of five with no +N; empty slots keep the tile size", () => {
    const five = nine.slice(0, 5);
    const { container, queryByText } = render(<ImageGallery images={five} />);
    act(() => observers.forEach((send) => send(448)));
    expect(tiles(container)).toHaveLength(5);
    expect(queryByText(/^\+\d/)).toBeNull();
    const two = render(<ImageGallery images={nine.slice(0, 2)} />);
    act(() => observers.forEach((send) => send(448)));
    const grid = two.container.querySelector('[data-layout="row"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(5, minmax(0, 1fr))");
  });

  test("tab order follows picture order and the +N tile opens its own picture", () => {
    const opened: string[] = [];
    const { container, getByRole } = render(<ImageGallery images={nine} onOpen={(id) => opened.push(id)} />);
    act(() => observers.forEach((send) => send(328)));
    const labels = [...tiles(container)].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Picture 1", "Picture 2", "Picture 3", "Picture 4"].map((l) => `Open image: ${l}`));
    fireEvent.click(tiles(container)[3]!);
    expect(opened).toEqual(["p4"]);
    expect(getByRole("dialog")).toBeTruthy();
  });

  test("layout=\"grid\" keeps the wrapping columns", () => {
    const { container } = render(<ImageGallery images={nine} layout="grid" maxVisible={5} />);
    act(() => observers.forEach((send) => send(328)));
    const grid = container.querySelector('[data-layout="grid"]') as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
    expect(tiles(container)).toHaveLength(5);
  });

  test("a single large picture keeps its natural shape", () => {
    const { container } = render(<ImageGallery images={nine.slice(0, 1)} size="large" />);
    expect(container.querySelector('[data-layout="grid"]')).not.toBeNull();
  });
});

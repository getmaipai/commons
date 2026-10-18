import { describe, expect, test, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { StorageBar, STORAGE_BAR_HUES, type StorageBarSegment } from "@/kit/primitives/StorageBar";

afterEach(cleanup);

const GB = 1024 ** 3;
const kinds: StorageBarSegment[] = [
  { id: "pictures", label: "Pictures", bytes: 4 * GB },
  { id: "videos", label: "Videos", bytes: 2 * GB },
  { id: "songs", label: "Songs", bytes: 1 * GB },
];

function segmentsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-slot="storage-bar-segment"]'));
}

describe("StorageBar", () => {
  test("one sentence names each kind, its size and the total", () => {
    const { getByRole } = render(<StorageBar segments={kinds} capacityBytes={20 * GB} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Storage used: Pictures 4 GB, Videos 2 GB, Songs 1 GB. 7 GB in total of 20 GB.");
  });

  test("without a capacity the sentence has no 'of' and the segments fill the bar", () => {
    const { getByRole, container } = render(<StorageBar segments={kinds} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Storage used: Pictures 4 GB, Videos 2 GB, Songs 1 GB. 7 GB in total.");
    const widths = segmentsOf(container).map((el) => el.style.flexBasis);
    expect(widths.map((w) => Number.parseFloat(w))).toEqual([(4 / 7) * 100, (2 / 7) * 100, (1 / 7) * 100]);
  });

  test("with a capacity the segments take their share of it and Free is listed", () => {
    const { container, getByText } = render(<StorageBar segments={kinds} capacityBytes={14 * GB} />);
    expect(Number.parseFloat(segmentsOf(container)[0]!.style.flexBasis)).toBeCloseTo((4 / 14) * 100, 5);
    expect(getByText("Free")).toBeTruthy();
    expect(getByText("7 GB", { selector: "span.text-muted-foreground" })).toBeTruthy();
  });

  test("used past the capacity still draws a full bar, never more than 100%", () => {
    const { container } = render(<StorageBar segments={kinds} capacityBytes={3 * GB} />);
    const total = segmentsOf(container).reduce((sum, el) => sum + Number.parseFloat(el.style.flexBasis), 0);
    expect(total).toBeCloseTo(100, 5);
  });

  test("segments use the themed hue tokens by position, never a raw colour", () => {
    const { container } = render(<StorageBar segments={kinds} />);
    const colours = segmentsOf(container).map((el) => el.style.backgroundColor);
    expect(colours).toEqual(STORAGE_BAR_HUES.slice(0, 3).map((hue) => `var(${hue})`));
  });

  test("a segment can name its own hue", () => {
    const { container } = render(<StorageBar segments={[{ id: "a", label: "Atlas", bytes: 10, hue: "--hue-green" }]} />);
    expect(segmentsOf(container)[0]!.style.backgroundColor).toBe("var(--hue-green)");
  });

  test("a zero total draws no segments and says nothing is stored", () => {
    const { getByRole, container } = render(<StorageBar segments={kinds.map((k) => ({ ...k, bytes: 0 }))} />);
    expect(segmentsOf(container)).toHaveLength(0);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Nothing is stored yet.");
  });

  test("no segments at all and a capacity says how much room there is", () => {
    const { getByRole } = render(<StorageBar segments={[]} capacityBytes={20 * GB} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Nothing is stored yet. 20 GB is available.");
  });

  test("a tiny segment keeps a visible minimum width and still has a legend entry", () => {
    const { container, getByText } = render(
      <StorageBar segments={[{ id: "big", label: "Videos", bytes: 10 * GB }, { id: "tiny", label: "Notes", bytes: 12 }]} />,
    );
    const [, tiny] = segmentsOf(container);
    expect(tiny!.style.minWidth).toBe("0.375rem");
    expect(getByText("Notes")).toBeTruthy();
    expect(getByText("12 B")).toBeTruthy();
  });

  test("a kind with zero bytes is in the legend but not in the bar", () => {
    const { container, getByText } = render(<StorageBar segments={[...kinds, { id: "docs", label: "Documents", bytes: 0 }]} />);
    expect(segmentsOf(container)).toHaveLength(3);
    expect(getByText("Documents")).toBeTruthy();
    expect(getByText("0 B")).toBeTruthy();
  });

  test("negative and not-a-number sizes count as zero", () => {
    const { getByRole } = render(<StorageBar segments={[{ id: "a", label: "Atlas", bytes: -5 }, { id: "b", label: "Bruno", bytes: Number.NaN }]} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Nothing is stored yet.");
  });

  test("many kinds all get a legend entry, the palette repeats, and the legend wraps", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `k${i}`, label: `Kind ${i}`, bytes: (i + 1) * 1000 }));
    const { container } = render(<StorageBar segments={many} />);
    expect(container.querySelectorAll('[data-slot="storage-bar-legend-item"]')).toHaveLength(9);
    expect(segmentsOf(container)[5]!.style.backgroundColor).toBe(`var(${STORAGE_BAR_HUES[0]})`);
    expect(container.querySelector("ul")!.className).toContain("flex-wrap");
  });

  test("a formatter prop and a summary label change the words", () => {
    const { getByRole, getAllByText } = render(
      <StorageBar
        segments={[{ id: "a", label: "Alfred", bytes: 5 }]}
        formatBytes={(b) => `${b} bytes`}
        labels={{ summary: ({ kinds: k, used }) => `${k.length} kind, ${used}` }}
      />,
    );
    expect(getByRole("img").getAttribute("aria-label")).toBe("1 kind, 5 bytes");
    expect(getAllByText("5 bytes").length).toBe(1);
  });

  test("it is not interactive", () => {
    const { container } = render(<StorageBar segments={kinds} />);
    expect(container.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
  });

  test("the legend text is at the 16px floor, never smaller", () => {
    const { container } = render(<StorageBar segments={kinds} />);
    expect(container.innerHTML).not.toMatch(/text-(xs|sm)\b/);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ImageGallery } from "./image-gallery";

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

  test("no onEditImage: no Edit button", () => {
    const { queryByRole } = render(
      <ImageGallery images={[{ id: "a", src: "https://example.test/a.jpg", alt: "A" }]} />,
    );
    expect(queryByRole("button", { name: "Edit picture" })).toBeNull();
  });
});

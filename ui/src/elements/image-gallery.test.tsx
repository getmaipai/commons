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
    expect(container.querySelectorAll(".grid > button")).toHaveLength(3);
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
});

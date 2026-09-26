import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MediaGrid, type MediaGridItem } from "@/kit/primitives/MediaGrid";

afterEach(cleanup);

const fixtureItems: MediaGridItem[] = [
  { id: "photo-1", thumbnailUrl: "/fixtures/garden.jpg", mediaType: "image", altText: "A garden in spring" },
  { id: "video-1", thumbnailUrl: "/fixtures/birds.mp4", mediaType: "video", altText: "Birds at the feeder" },
];

describe("MediaGrid", () => {
  test("renders image and video thumbnails in the responsive grid", () => {
    const { getByRole, getAllByRole, container } = render(<MediaGrid items={fixtureItems} emptyMessage="No media" />);

    expect(getByRole("list", { name: "Media" })).toBeInTheDocument();
    expect(getAllByRole("button")).toHaveLength(2);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(getByRole("list").className).toContain("grid-cols-1");
    expect(getByRole("list").className).toContain("sm:grid-cols-2");
  });

  test("renders the supplied empty state message", () => {
    const { getByText } = render(<MediaGrid items={[]} emptyMessage="Nothing here yet" />);
    expect(getByText("Nothing here yet")).toBeInTheDocument();
  });

  test("opens the selected image in the lightbox", async () => {
    const { getByRole, findByRole, findByAltText } = render(<MediaGrid items={fixtureItems} emptyMessage="No media" />);

    fireEvent.click(getByRole("button", { name: "Open media: A garden in spring" }));

    expect(await findByRole("dialog")).toBeInTheDocument();
    expect(await findByAltText("A garden in spring")).toBeInTheDocument();
  });
});

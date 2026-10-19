import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ImagePreview } from "./image";

afterEach(cleanup);

describe("ImagePreview safe fallback", () => {
  test("a failed image renders the shared picture tile instead of an error glyph", () => {
    const view = render(<ImagePreview src="https://example.com/picture.jpg" alt="Picture" />);
    fireEvent.error(view.container.querySelector("img")!);
    expect(view.container.querySelector('[data-slot="safe-image-fallback"][data-kind="picture"]')?.getAttribute("aria-label")).toBe("Picture");
    expect(view.container.querySelector("img")).toBeNull();
  });
});

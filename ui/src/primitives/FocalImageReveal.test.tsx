import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { FocalImage, FocalImageProvider } from "./FocalImage";

afterEach(cleanup);

describe("FocalImage reveal", () => {
  test("with an analyzer the picture stays hidden until its crop is known, so it never slides to its subject", () => {
    const view = render(
      <FocalImageProvider analyze={() => new Promise(() => {})}>
        <FocalImage src="/pic.webp" alt="A boat" />
      </FocalImageProvider>,
    );
    expect(view.getByAltText("A boat").style.opacity).toBe("0");
  });

  test("with no analyzer the picture shows at once", () => {
    const view = render(<FocalImage src="/pic.webp" alt="A boat" />);
    expect(view.getByAltText("A boat").style.opacity).toBe("1");
  });
});

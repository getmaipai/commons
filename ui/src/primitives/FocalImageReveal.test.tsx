import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { FocalImage, FocalImageProvider, focalPointPosition } from "./FocalImage";

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

describe("FocalImage with a subject point from the hub", () => {
  test("shows at once, framed on the point, and never calls the analyzer", () => {
    let calls = 0;
    const view = render(
      <FocalImageProvider analyze={() => { calls += 1; return new Promise(() => {}); }}>
        <FocalImage src="/pic.webp" alt="A boat" aspectRatio={1} focal={{ x: 60, y: 50, aspect: 2 }} />
      </FocalImageProvider>,
    );
    const image = view.getByAltText("A boat");
    expect(image.style.opacity).toBe("1");
    expect(image.style.objectPosition).toBe("70% 50%");
    expect(calls).toBe(0);
  });
});

describe("focalPointPosition", () => {
  test("centres on the point, clamped to the picture, on the axis that crops", () => {
    expect(focalPointPosition({ x: 50, y: 10, aspect: 2 }, 1)).toBe("50% 50%");
    expect(focalPointPosition({ x: 100, y: 50, aspect: 2 }, 1)).toBe("100% 50%");
    expect(focalPointPosition({ x: 0, y: 50, aspect: 2 }, 1)).toBe("0% 50%");
    expect(focalPointPosition({ x: 50, y: 25, aspect: 0.5 }, 1)).toBe("50% 0%");
    expect(focalPointPosition({ x: 20, y: 40, aspect: 1 }, 1)).toBe("50% 50%");
    expect(focalPointPosition({ x: 20, y: 40, aspect: 0 }, 1)).toBe("50% 50%");
  });
});

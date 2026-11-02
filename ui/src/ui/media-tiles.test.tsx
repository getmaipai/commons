import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Cover, MediaCarousel, MediaTile, coverVars, seedOf } from "@/kit/ui/media-tiles";

afterEach(cleanup);

describe("media tiles", () => {
  test("the same id always gives the same cover colors, from kit hues only", () => {
    expect(coverVars("song-1")).toEqual(coverVars("song-1"));
    expect(seedOf("a")).not.toBe(seedOf("b"));
    for (const key of ["--c1", "--c2", "--c3"]) expect(coverVars("song-2")[key]).toMatch(/^var\(--hue-(violet|teal|orange|pink|red|green)\)$/);
  });
  test("a cover shows the picture when there is one, otherwise the title", () => {
    expect(render(<Cover id="a" title="Night Drive" url="/x.png" />).container.querySelector("img")).toBeTruthy();
    cleanup();
    expect(render(<Cover id="a" title="Night Drive" url={null} />).getByText("Night Drive")).toBeTruthy();
  });
  test("a tile opens on click and a carousel labels its row", () => {
    let opened = 0;
    const { getByRole } = render(<MediaCarousel title="Songs" label="Songs"><MediaTile id="a" title="Night Drive" coverUrl={null} onOpen={() => { opened += 1; }} /></MediaCarousel>);
    getByRole("button", { name: "Open Night Drive" }).click();
    expect(opened).toBe(1);
    expect(getByRole("list", { name: "Songs" })).toBeTruthy();
  });
});

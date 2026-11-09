import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { AmbientGlow, averageQuadrants } from "@/kit/primitives/AmbientGlow";
import { Player } from "@/kit/primitives/Player";
import { VideoPlayer } from "@/kit/elements/video-player";
import { Chip } from "@/kit/primitives/Chip";
import { MediaCarousel, MediaTile } from "@/kit/ui/media-tiles";

afterEach(cleanup);

describe("ambient glow", () => {
  test("averages a 16x9 frame into four quadrant colors", () => {
    const data = new Uint8ClampedArray(16 * 9 * 4);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      const c = y < 4.5 ? (x < 8 ? [255, 0, 0] : [0, 255, 0]) : (x < 8 ? [0, 0, 255] : [10, 20, 30]);
      data.set([...c, 255], i);
    }
    expect(averageQuadrants(data)).toEqual(["color(srgb 1.000 0.000 0.000)", "color(srgb 0.000 1.000 0.000)", "color(srgb 0.000 0.000 1.000)", "color(srgb 0.039 0.078 0.118)"]);
  });
  test("is aria-hidden and presentational, and draws nothing when ambient is false", () => {
    const on = render(<AmbientGlow />);
    const el = on.container.querySelector('[data-slot="ambient-glow"]')!;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("pointer-events-none");
    on.unmount();
    const off = render(<AmbientGlow ambient={false} />);
    expect(off.container.querySelector('[data-slot="ambient-glow"]')).toBeNull();
  });
  test("fails silently when the frame cannot be read", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "paused", { value: false });
    Object.defineProperty(video, "readyState", { value: 4 });
    const { container } = render(<AmbientGlow getVideo={() => video} poster="/nope.jpg" />);
    expect(container.querySelector('[data-slot="ambient-glow"]')!.getAttribute("data-ready")).toBe("false");
  });
});

describe("kit polish 0.5.558", () => {
  test("a tile follows its grid cell; only a carousel fixes the width", () => {
    const tile = render(<ul><MediaTile id="a" title="Night" coverUrl={null} onOpen={() => {}} /></ul>).container.querySelector("li")!;
    expect(tile.className).toContain("w-full");
    expect(tile.className).not.toContain("w-44");
    cleanup();
    const track = render(<MediaCarousel title="Songs" label="Songs"><MediaTile id="a" title="Night" coverUrl={null} onOpen={() => {}} /></MediaCarousel>).container.querySelector("ul")!;
    expect(track.className).toContain("[&>li]:w-44");
  });
  test("the carousel heading is sentence case, not all caps", () => {
    const h = render(<MediaCarousel title="Songs" label="Songs"><li /></MediaCarousel>).getByRole("heading", { name: "Songs" });
    expect(h.className).not.toContain("uppercase");
    expect(h.className).not.toContain("font-black");
  });
  test("a strip chip never wraps or shrinks", () => {
    const { getByText } = render(<Chip size="strip">All files</Chip>);
    const cls = getByText("All files").closest("[class*=rounded-full]")!.className;
    expect(cls).toContain("shrink-0");
    expect(cls).toContain("whitespace-nowrap");
  });
  test("pill tab strips are flat (no fade patch) in the pro look", () => {
    const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
    expect(css).toContain('html[data-pro-look] [data-slot="tabs-list"][data-variant="pill"] { background: none; }');
  });
});

describe("ambient glow is on by default", () => {
  test("the video Player draws it; ambient={false}, audio and mini do not", () => {
    expect(render(<Player src="/v.mp4" kind="video" title="Clip" poster="/p.jpg" />).container.querySelector('[data-slot="ambient-glow"]')).not.toBeNull();
    cleanup();
    expect(render(<Player src="/v.mp4" kind="video" title="Clip" ambient={false} />).container.querySelector('[data-slot="ambient-glow"]')).toBeNull();
    cleanup();
    expect(render(<Player src="/s.mp3" kind="audio" title="Song" layout="audio" />).container.querySelector('[data-slot="ambient-glow"]')).toBeNull();
    cleanup();
    expect(render(<Player src="/s.mp3" kind="audio" title="Song" layout="mini" />).container.querySelector('[data-slot="ambient-glow"]')).toBeNull();
  });
  test("VideoPlayer draws it when ready; ambient={false} opts out", () => {
    const base = { status: "ready", prompt: "A cat", src: "/v.mp4", poster: "/p.jpg" } as const;
    expect(render(<VideoPlayer {...base} />).container.querySelector('[data-slot="ambient-glow"]')).not.toBeNull();
    cleanup();
    expect(render(<VideoPlayer {...base} ambient={false} />).container.querySelector('[data-slot="ambient-glow"]')).toBeNull();
  });
});

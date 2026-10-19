import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { findPictureRenderings, scanPictureSource, scanPictureSurfaces, type PictureAllowEntry } from "./pictureRendering";

describe("content picture lint", () => {
  const uiRoot = fileURLToPath(new URL("./", import.meta.url));

  test("kit picture surfaces use SafeImage or a named exception", () => {
    const result = scanPictureSurfaces(uiRoot);
    expect(result.violations).toEqual([]);
    expect(result.unusedAllow).toEqual([]);
  });

  test("a raw rendering fails and an exact allowlist entry passes", () => {
    const allow: PictureAllowEntry[] = [{ file: "sample.tsx", match: /^<img\b/, reason: "fixture SVG logo has its accessible name on the surrounding link" }];
    const bad = scanPictureSource("sample.tsx", "<img src={picture} />", []);
    expect(bad.violations).toEqual(["sample.tsx:1: <img"]);
    const good = scanPictureSource("sample.tsx", "<img src={logoSvg} />", allow);
    expect(good.violations).toEqual([]);
    expect(good.unusedAllow).toEqual([]);
  });

  test("a stale allowlist entry fails", () => {
    const allow: PictureAllowEntry[] = [{ file: "sample.tsx", match: /^new\s+Image\s*\(/, reason: "fixture offscreen canvas decoder used to load pixels" }];
    const result = scanPictureSource("sample.tsx", "const picture = 1;", allow);
    expect(result.violations).toEqual([]);
    expect(result.unusedAllow).toHaveLength(1);
  });

  test("finds raw JSX, image constructors and CSS background images", () => {
    expect(findPictureRenderings("<img src={src} />\nnew Image()\nbackground-image: url(art.png)")).toEqual([
      { text: "<img", line: 1 },
      { text: "new Image(", line: 2 },
      { text: "background-image: url(", line: 3 },
    ]);
  });
});

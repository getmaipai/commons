import { describe, expect, test } from "bun:test";
import { PackageManifest } from "../../gen/ts/manifest.js";

const BASE = {
  id: "test-companion", version: "0.1.0", kind: "companion", category: "Info", display: "Test Companion", description: "A test companion.",
  author: "MaiPai", license: "AGPL-3.0", platforms: ["home"], min_role: "child", consequential: false, offline: "full", min_app: "0.1.0", tier: 0, incognito: "unaffected",
  companion: { display_name: "Pip", formality: "casual", complexity: "simple", engagement: "balanced", filler_density: "none" },
} as const;

const mouth = { anchor: { x: 0.4, y: 0.35, w: 0.2, h: 0.12 }, shapes: { A: "pip-a.png", B: "pip-b.png", C: "pip-c.png", D: "pip-d.png", E: "pip-e.png", F: "pip-f.png" } };
const eyes = { anchor: { x: 0.3, y: 0.2, w: 0.4, h: 0.1 }, closed: "pip-eyes-closed.png", half: "pip-eyes-half.png" };
const animation = {
  kind: "video", spec_version: 2, key: "#00FF00", sheet: { rest: "pip-rest.png", card: "pip-card.png" },
  states: { idle: { h264: "pip-idle.mp4", still: "pip-idle.png", loop: true } },
};
const withAnimation = (extra: Record<string, unknown>) => ({ ...BASE, companion: { ...BASE.companion, animation: { ...animation, ...extra } } });

describe("TALK-04 mouth shapes and eyes in the companion animation", () => {
  test("the full mouth and eyes set round-trips and both are optional", () => {
    const parsed = PackageManifest.parse(withAnimation({ mouth, eyes }));
    expect(parsed.companion?.animation?.mouth).toEqual(mouth);
    expect(parsed.companion?.animation?.eyes).toEqual(eyes);
    const plain = PackageManifest.parse(withAnimation({}));
    expect(plain.companion?.animation?.mouth).toBeUndefined();
    expect(plain.companion?.animation?.eyes).toBeUndefined();
    expect(PackageManifest.parse(withAnimation({ mouth })).companion?.animation?.eyes).toBeUndefined();
    expect(PackageManifest.parse(withAnimation({ eyes: { anchor: eyes.anchor, closed: eyes.closed } })).companion?.animation?.eyes?.half).toBeUndefined();
  });

  test("rejects a missing shape, a stray shape, a path with dots, and an anchor outside 0 to 1", () => {
    const { F: _f, ...fiveShapes } = mouth.shapes;
    const refused: Array<[string, Record<string, unknown>]> = [
      ["missing shape", { mouth: { ...mouth, shapes: fiveShapes } }],
      ["unknown shape X", { mouth: { ...mouth, shapes: { ...mouth.shapes, X: "pip-x.png" } } }],
      ["dot dot path", { mouth: { ...mouth, shapes: { ...mouth.shapes, A: "pip..a.png" } } }],
      ["slash path", { mouth: { ...mouth, shapes: { ...mouth.shapes, A: "shapes/a.png" } } }],
      ["anchor above 1", { mouth: { ...mouth, anchor: { ...mouth.anchor, w: 1.2 } } }],
      ["anchor below 0", { mouth: { ...mouth, anchor: { ...mouth.anchor, x: -0.1 } } }],
      ["missing anchor", { mouth: { shapes: mouth.shapes } }],
      ["eyes without closed", { eyes: { anchor: eyes.anchor } }],
      ["eyes extra key", { eyes: { ...eyes, wide: "pip-wide.png" } }],
    ];
    for (const [name, extra] of refused) expect(PackageManifest.safeParse(withAnimation(extra)).success, name).toBe(false);
  });
});

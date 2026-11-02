import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { checkAppPackage, type AppContributes } from "../../ui/app-check";

// MUSIC-KIT-01: the music page blocks (quick_tiles, top_result, category_tiles, track_rows) and the media_shelf and player additions.
const uiDir = join(import.meta.dir, "../../ui");
const validate = new Ajv2020({ strict: true }).compile(JSON.parse(readFileSync(join(uiDir, "schema.json"), "utf8")));
const bind = { source: "package", path: "recent" };
const play = { play: { media_id: "{id}" } };
const nodes = {
  quick_tiles: { type: "quick_tiles", label: "Pick up", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover" },
  top_result: { type: "top_result", bind, item_label_field: "title" },
  category_tiles: { type: "category_tiles", label: "Browse", bind, item_key_field: "id", item_label_field: "title" },
  track_rows: { type: "track_rows", label: "Tracks", bind, item_key_field: "id", item_label_field: "title", on_play: play },
} as const;
const shelf = { type: "media_shelf", bind, item_key_field: "id", item_label_field: "title", item_media_field: "cover" };

describe("music blocks schema", () => {
  for (const [name, node] of Object.entries(nodes)) {
    test(`${name} validates, and refuses unknown keys`, () => {
      expect(validate(node)).toBe(true);
      expect(validate({ ...node, extra: 1 })).toBe(false);
    });
  }
  test("required fields: a label on the groups, an on_play on track_rows, a title on top_result", () => {
    expect(validate({ ...nodes.quick_tiles, label: undefined })).toBe(false);
    expect(validate({ ...nodes.category_tiles, label: undefined })).toBe(false);
    expect(validate({ ...nodes.track_rows, on_play: undefined })).toBe(false);
    expect(validate({ ...nodes.top_result, item_label_field: undefined })).toBe(false);
  });
  test("quick_tiles max stays 1 to 12; top_result art_shape is default or circle", () => {
    expect(validate({ ...nodes.quick_tiles, max: 12 })).toBe(true);
    expect(validate({ ...nodes.quick_tiles, max: 0 })).toBe(false);
    expect(validate({ ...nodes.quick_tiles, max: 13 })).toBe(false);
    expect(validate({ ...nodes.top_result, art_shape: "circle" })).toBe(true);
    expect(validate({ ...nodes.top_result, art_shape: "oval" })).toBe(false);
  });
  test("media_shelf takes card_radius, press_scale, on_play and play_label; player takes art_spring and lyrics_blur", () => {
    expect(validate({ ...shelf, card_radius: "tight", press_scale: true, on_play: play, play_label: "Play {title}" })).toBe(true);
    expect(validate({ ...shelf, card_radius: "round" })).toBe(false);
    expect(validate({ ...shelf, press_scale: "yes" })).toBe(false);
    const player = { type: "player", bind: { source: "package", path: "item" }, kind: "audio" };
    expect(validate({ ...player, art_spring: true, lyrics_blur: true })).toBe(true);
    expect(validate({ ...player, art_spring: 1 })).toBe(false);
  });
});

describe("music blocks on a package page", () => {
  const entries: AppContributes = { pages: [{ id: "index", module: "index" }, { id: "x", module: "x" }], data: [{ id: "recent", rows: "list" }] };
  const check = (node: unknown) => checkAppPackage("music", entries, (m) => (m === "index" ? { type: "page", body: [] } : { type: "page", id: "x", title: "X", body: [node] })).join("\n");

  test("the fixture validates and binds only declared data", () => {
    const fixture = JSON.parse(readFileSync(join(uiDir, "pages", "music-listen.json"), "utf8"));
    expect(validate(fixture)).toBe(true);
    const ids = ["recent", "top", "categories", "tracks"];
    const full: AppContributes = { pages: entries.pages, data: ids.map((id) => ({ id, rows: "list" })) };
    expect(checkAppPackage("music", full, (m) => (m === "index" ? { type: "page", body: [] } : fixture))).toEqual([]);
    expect(checkAppPackage("music", { ...full, data: full.data!.filter((e) => e.id !== "top") }, (m) => (m === "index" ? { type: "page", body: [] } : fixture)).join("\n")).toContain('bind.path "top"');
  });
  test("each block may play and stays inside the package", () => {
    for (const node of Object.values(nodes)) expect(check({ ...node, on_play: play })).toBe("");
    expect(check({ ...nodes.track_rows, on_play: { call: { target: "/api/plugins/other/x" } } })).toContain("track_rows.on_play: call.target");
    expect(check({ ...nodes.quick_tiles, on_select: { navigate: { to: "/apps/shows" } } })).toContain("quick_tiles.on_select: navigate.to");
    expect(check({ ...shelf, on_play: { call: { target: "/api/plugins/other/x" } } })).toContain("media_shelf.on_play: call.target");
  });
  test("track_rows row_actions and a labelled creation_header shuffle validate, and a row action stays inside the package (MUSIC-POLISH-01)", () => {
    const remove = { icon: "x", label: "Remove", action: { call: { target: "/api/plugins/music/playlist", args: { op: "remove", media_id: "{id}" } } } };
    expect(check({ ...nodes.track_rows, row_actions: [remove] })).toBe("");
    expect(validate({ ...nodes.track_rows, row_actions: [remove] })).toBe(true);
    expect(validate({ ...nodes.track_rows, row_actions: [remove, remove, remove] })).toBe(false);
    expect(validate({ ...nodes.track_rows, row_actions: [{ icon: "x", label: "Remove" }] })).toBe(false);
    expect(check({ ...nodes.track_rows, row_actions: [{ ...remove, action: { call: { target: "/api/plugins/other/x" } } }] })).toContain("track_rows.row_actions[0]");
    const header = { type: "creation_header", bind, share_change: { add: { call: { target: "/api/plugins/music/x" } }, remove: { call: { target: "/api/plugins/music/x" } }, make_private: { call: { target: "/api/plugins/music/x" } } }, shuffle: { label: "Start radio", icon: "radio", labeled: true, action: play } };
    expect(validate(header)).toBe(true);
    expect(validate({ ...header, shuffle: { ...header.shuffle, labeled: "yes" } })).toBe(false);
  });
  test("an art address with a scheme is refused", () => {
    expect(check({ ...nodes.quick_tiles, item_media_field: "https://example.com/a.jpg" })).toContain("item_media_field must be a field path");
  });
});

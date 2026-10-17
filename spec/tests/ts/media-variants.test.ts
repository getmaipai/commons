import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { checkAppPackage, type AppContributes } from "../../ui/app-check";

const uiDir = join(import.meta.dir, "../../ui");
const validate = new Ajv2020({ strict: true }).compile(JSON.parse(readFileSync(join(uiDir, "schema.json"), "utf8")));
const shelf = {
  type: "media_shelf", bind: { source: "package", path: "items" },
  item_key_field: "id", item_label_field: "title", item_media_field: "art",
};
const play = { icon: "play", label: "Play", action: { play: { media_id: "{id}" } } };
const save = { icon: "bookmark", label: "Save", label_field: "copy.label", action: { call: { target: "/api/plugins/music/save", args: { id: "{id}" } } } };
const loadFixture = (name: string) => JSON.parse(readFileSync(join(uiDir, "pages", `${name}.json`), "utf8"));

describe("media shelf variants schema", () => {
  for (const [field, accepted, rejected] of [
    ["layout", ["rail", "grid"], ["masonry", 2]],
    ["art_shape", ["default", "circle"], ["oval", true]],
    ["density", ["default", "compact"], ["dense", 72]],
    ["item_highlight_field", ["current", "flags.next"], [true, 1]],
    ["item_index_field", ["number", "track.index"], [1, false]],
  ] as const) {
    test(`${field} accepts its declared values and rejects invalid types/variants`, () => {
      for (const value of accepted) expect(validate({ ...shelf, [field]: value })).toBe(true);
      for (const value of rejected) expect(validate({ ...shelf, [field]: value })).toBe(false);
    });
  }

  test("grid supports square and poster art and an absent empty shelf", () => {
    for (const aspect of ["square", "poster"]) {
      expect(validate({ ...shelf, aspect, layout: "grid", hide_when_empty: true })).toBe(true);
    }
    expect(validate({ ...shelf, orientation: "vertical", density: "compact", item_index_field: "number", item_meta_field: "duration_s" })).toBe(true);
    expect(validate(shelf)).toBe(true);
  });

  test("row actions allow zero to two complete actions, with an optional label field", () => {
    for (const row_actions of [[], [play], [play, save]]) expect(validate({ ...shelf, row_actions })).toBe(true);
    for (const row_actions of [
      [play, save, play], [{ ...play, action: undefined }], [{ ...play, label: "" }],
      [{ ...play, icon: "" }], [{ ...save, label_field: false }], [{ ...save, label_field: "" }],
      [{ ...play, unexpected: true }], [{ ...play, action: { launch: {} } }],
    ]) expect(validate({ ...shelf, row_actions })).toBe(false);
  });

  test("bound season pills retain the picker's required state, label and row fields", () => {
    const picker = { type: "picker", variant: "pill", state: "season", label: "Seasons", bind: { source: "package", path: "seasons" }, item_key_field: "id", item_label_field: "label" };
    expect(validate(picker)).toBe(true);
    expect(validate({ ...picker, variant: "select" })).toBe(true);
    expect(validate({ ...picker, variant: "chips" })).toBe(false);
    expect(validate({ ...picker, item_key_field: undefined })).toBe(false);
    expect(validate({ ...picker, state: undefined })).toBe(false);
  });
});

describe("media variants package conformance", () => {
  const contributes: AppContributes = { pages: [{ id: "index", module: "index" }], data: [{ id: "items", rows: "list" }] };
  const check = (row_actions: unknown[]) => checkAppPackage("music", contributes, () => ({ type: "page", body: [{ ...shelf, row_actions }] }));

  test("row actions allow play and own-package calls, like on_select", () => {
    expect(check([play, save])).toEqual([]);
  });

  test("each row action is checked for calls and navigation outside the package, including confirms", () => {
    const failures = check([
      { ...save, action: { call: { target: "/api/plugins/shows/save" } } },
      { ...save, action: { confirm: { prompt: "Save?", on_confirm: { navigate: { to: "/apps/shows" } } } } },
    ]).join("\n");
    expect(failures).toContain("media_shelf.row_actions[0]: call.target");
    expect(failures).toContain("media_shelf.row_actions[1]: navigate.to");
    expect(check([{ ...play, action: { confirm: { prompt: "Play?", on_confirm: play.action } } }])).toEqual([]);
  });

  for (const [pkg, name, paths] of [
    ["music", "music-album", ["album", "tracks", "albums", "artists"]],
    ["shows", "shows-detail", ["show", "seasons", "episodes", "related"]],
  ] as const) {
    test(`${name} fixture validates and binds only its own declared data/actions`, () => {
      const fixture = loadFixture(name);
      expect(validate(fixture)).toBe(true);
      const entries: AppContributes = {
        pages: [{ id: "index", module: "index" }, { id: fixture.id, module: name }],
        data: paths.map((id) => ({ id, rows: "list" })),
      };
      const load = (module: string) => module === "index" ? { type: "page", body: [] } : fixture;
      expect(checkAppPackage(pkg, entries, load)).toEqual([]);
      if (pkg === "shows") {
        expect(checkAppPackage(pkg, { ...entries, data: entries.data!.filter((entry) => entry.id !== "seasons") }, load).join("\n")).toContain('bind.path "seasons"');
      }
    });
  }
});

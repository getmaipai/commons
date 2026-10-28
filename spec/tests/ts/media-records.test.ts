// MEDIA-SPEC-01: the media records (home docs/design/media-apps-blend-2026-10-17.md section 7). MediaItem,
// MediaSource, MediaProgress, MediaCollection and OfflineManifest are new; File gains origin `fetched`, Feed gains
// `purpose` (news or podcast), Device gains `offline_scope`. Every case passes ajv and the generated Zod, and Zod keeps
// every field.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { MediaItem } from "../../gen/ts/media-item.js";
import { MediaSource } from "../../gen/ts/media-source.js";
import { MediaProgress } from "../../gen/ts/media-progress.js";
import { MediaCollection } from "../../gen/ts/media-collection.js";
import { OfflineManifest } from "../../gen/ts/offline-manifest.js";
import { File } from "../../gen/ts/file.js";
import { Feed } from "../../gen/ts/feed.js";
import { Device } from "../../gen/ts/device.js";
import { GenerationProvenance } from "../../gen/ts/generation-provenance.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const fixture = (name: string) => read(`fixtures/records/${name}.example.json`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const GEN_ID = "https://getmaipai.github.io/shared/spec/schemas/generation-provenance.schema.json";
ajv.addSchema(read("schemas/generation-provenance.schema.json"));
const compiled = new Map<string, ReturnType<typeof ajv.compile>>();
const schema = (name: string) => {
  if (name === "generation-provenance") return ajv.getSchema(GEN_ID)!;
  if (!compiled.has(name)) compiled.set(name, ajv.compile(read(`schemas/${name}.schema.json`)));
  return compiled.get(name)!;
};
type Model = { parse: (v: unknown) => unknown; safeParse: (v: unknown) => { success: boolean } };

const CASES: Array<[string, string, Model]> = [
  ["media-item.video", "media-item", MediaItem],
  ["media-item.episode", "media-item", MediaItem],
  ["media-item.track-explicit", "media-item", MediaItem],
  ["media-item.podcast-stream", "media-item", MediaItem],
  ["media-item.book", "media-item", MediaItem],
  ["media-item.audiobook", "media-item", MediaItem],
  ["media-item.audiobook-chapter", "media-item", MediaItem],
  ["media-source.root", "media-source", MediaSource],
  ["media-source.feed", "media-source", MediaSource],
  ["media-source.channel", "media-source", MediaSource],
  ["media-source.station", "media-source", MediaSource],
  ["media-progress.seconds", "media-progress", MediaProgress],
  ["media-progress.book", "media-progress", MediaProgress],
  ["media-collection.queue", "media-collection", MediaCollection],
  ["media-collection.watchlist", "media-collection", MediaCollection],
  ["offline-manifest.album", "offline-manifest", OfflineManifest],
  ["file.fetched", "file", File],
  ["feed.podcast", "feed", Feed],
  ["device.offline-phone", "device", Device],
];

describe("Media records", () => {
  for (const [name, schemaName, model] of CASES) {
    test(`${name}: the schema and the generated Zod accept it, and Zod keeps every field`, () => {
      const data = fixture(name);
      const validate = schema(schemaName);
      expect(validate(data), JSON.stringify(validate.errors)).toBe(true);
      expect(model.safeParse(data).success).toBe(true);
      expect(model.parse(data)).toMatchObject(data);
    });
  }

  test("the shipped File, Feed and Device fixtures still validate unchanged (additive)", () => {
    for (const [name, schemaName] of [["file", "file"], ["file.made-image", "file"], ["feed", "feed"], ["feed.news-app", "feed"], ["device", "device"]] as const) {
      expect(schema(schemaName)(fixture(name)), name).toBe(true);
    }
  });

  test("a media item's location is exactly one shape", () => {
    const item = fixture("media-item.video");
    const v = schema("media-item");
    for (const bad of [
      { file_id: "file-vid001", url: "https://videos.example.com/a" },
      { root_id: "msrc-root01" },
      { root_id: "msrc-root01", path: "../etc/passwd" },
      { root_id: "msrc-root01", path: "/abs/path.mp4" },
      {},
    ]) {
      expect(v({ ...item, location: bad }), JSON.stringify(bad)).toBe(false);
    }
  });

  test("closed sets refuse values outside them", () => {
    const item = fixture("media-item.video");
    const v = schema("media-item");
    for (const bad of [{ kind: "movie" }, { playable: "maybe" }, { band_ok: "baby" }, { advisory: { explicit: "yes", source: "tag" } }, { id: "item-1" }]) {
      expect(v({ ...item, ...bad }), JSON.stringify(bad)).toBe(false);
    }
    const source = fixture("media-source.channel");
    for (const bad of [{ kind: "playlist" }, { auto: { save: "all" } }, { auto: { save: "video", max_per_check: 50 } }, { poll_minutes: 1 }]) {
      expect(schema("media-source")({ ...source, ...bad }), JSON.stringify(bad)).toBe(false);
    }
    const coll = fixture("media-collection.queue");
    expect(schema("media-collection")({ ...coll, kind: "favourites" })).toBe(false);
    expect(schema("media-collection")({ ...coll, rules: { genre: "rock" } })).toBe(false);
  });

  test("lyrics and locked fields have closed, validated shapes", () => {
    const item = fixture("media-item.track-explicit");
    const v = schema("media-item");
    const valid = fixture("media-item.lyrics-locked");
    expect(v(valid), JSON.stringify(v.errors)).toBe(true);
    expect(MediaItem.parse(valid)).toMatchObject(valid);
    for (const name of [
      "media-item.invalid-lyrics-source",
      "media-item.invalid-lyrics-empty-text",
      "media-item.invalid-lyrics-timestamp",
      "media-item.invalid-lyrics-extra-field",
      "media-item.invalid-locked-field",
      "media-item.invalid-locked-duplicate",
    ]) {
      const bad = fixture(name);
      expect(v(bad), name).toBe(false);
      expect(MediaItem.safeParse(bad).success, name).toBe(false);
    }
    expect((MediaItem.parse(item) as { locked_fields?: string[] }).locked_fields).toEqual([]);
  });

  test("a progress position is seconds or a reader locator, never both", () => {
    const row = fixture("media-progress.seconds");
    const v = schema("media-progress");
    expect(v({ ...row, position: { seconds: -1 } })).toBe(false);
    expect(v({ ...row, position: { seconds: 3, locator: { kind: "page", page: 2 }, percent: 1 } })).toBe(false);
    expect(v({ ...row, position: { locator: { kind: "page", page: 2 }, percent: 101 } })).toBe(false);
    expect(v({ ...row, position: { locator: { kind: "page", page: 2 }, percent: 10 } })).toBe(true);
  });

  test("an offline manifest only points at hub paths", () => {
    const m = fixture("offline-manifest.album");
    const bad = structuredClone(m);
    bad.entries[0].url = "https://cdn.example.com/a.flac";
    expect(schema("offline-manifest")(bad)).toBe(false);
  });

  test("device offline_scope is a closed, default-deny list", () => {
    const d = fixture("device.offline-phone");
    expect(schema("device")({ ...d, offline_scope: ["everything"] })).toBe(false);
    expect((Device.parse(fixture("device")) as { offline_scope: string[] }).offline_scope).toEqual([]);
  });

  test("file origin fetched and feed purpose podcast are accepted; other values are not", () => {
    expect(schema("file")({ ...fixture("file.fetched"), origin: "downloaded" })).toBe(false);
    expect(schema("feed")({ ...fixture("feed.podcast"), purpose: "video" })).toBe(false);
  });
});

describe("GenerationProvenance (MUSIC-SPEC-01)", () => {
  test("the song record and a made audio file accept, and Zod keeps every field", () => {
    const g = fixture("generation-provenance");
    expect(schema("generation-provenance")(g)).toBe(true);
    expect(GenerationProvenance.parse(g)).toEqual(g);
    const f = fixture("file.made-audio");
    expect(schema("file")(f), JSON.stringify(schema("file").errors)).toBe(true);
    expect(File.parse(f)).toEqual(f);
    expect(f.provenance.generation.task).toBe("repaint");
    expect(f.provenance.generation.parent_file_id).toMatch(/^file-/);
  });

  test("an unknown task or a missing commercial_use is refused", () => {
    for (const name of ["generation-provenance.invalid-task", "generation-provenance.invalid-no-commercial-use"]) {
      const bad = fixture(name);
      expect(schema("generation-provenance")(bad), name).toBe(false);
      expect(GenerationProvenance.safeParse(bad).success, name).toBe(false);
    }
  });

  test("closed fields stay closed", () => {
    const g = fixture("generation-provenance");
    const v = schema("generation-provenance");
    for (const bad of [{ kind: "video" }, { source_kind: "stream" }, { bpm: 20 }, { bpm: 301 }, { duration_s: -1 }, { parent_file_id: "x" }, { lyrics: "la" }, { commercial_basis: "" }]) {
      expect(v({ ...g, ...bad }), JSON.stringify(bad)).toBe(false);
    }
  });

  test("file.provenance.generation is optional and nullable", () => {
    const f = fixture("file.made-audio");
    const v = schema("file");
    expect(v({ ...f, provenance: { ...f.provenance, generation: null } })).toBe(true);
    const { generation: _g, ...rest } = f.provenance;
    expect(v({ ...f, provenance: rest })).toBe(true);
  });
});


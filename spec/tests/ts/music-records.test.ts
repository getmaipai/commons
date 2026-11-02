// MUSIC-STUDIO-S2, MUSIC-LISTEN-C5: SongStyle and MadeArtist. The schemas and the generated Zod agree, both records share
// ONE style definition and ONE seed field, and the answer-block `band` kind validates.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { SongStyle } from "../../gen/ts/song-style.js";
import { MadeArtist } from "../../gen/ts/made-artist.js";
import { AnswerBlock } from "../../gen/ts/answer-block.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(read("schemas/song-style.schema.json"));
const validateStyle = ajv.getSchema("https://getmaipai.github.io/shared/spec/schemas/song-style.schema.json")!;
ajv.addSchema(read("schemas/made-artist.schema.json"));
const validateArtist = ajv.getSchema("https://getmaipai.github.io/shared/spec/schemas/made-artist.schema.json")!;
const style = read("fixtures/records/song-style.example.json");
const artist = read("fixtures/records/made-artist.example.json");
const COMMON = ["id", "source", "provenance", "created_at", "updated_at", "hlc"];

const both = [
  ["SongStyle", SongStyle, validateStyle, style, [...COMMON, "title", "origin", "style"]],
  ["MadeArtist", MadeArtist, validateArtist, artist, [...COMMON, "name", "origin", "style"]],
] as const;

for (const [name, model, validate, base, required] of both) {
  describe(name, () => {
    test("the schema and the generated Zod accept the fixture, and Zod keeps every field", () => {
      expect(validate(base)).toBe(true);
      expect(model.parse(base)).toEqual(base);
    });

    test("needs its required fields", () => {
      for (const field of required) {
        const broken: Record<string, unknown> = { ...base };
        delete broken[field];
        expect(model.safeParse(broken).success, `without ${field}`).toBe(false);
        expect(validate(broken), `schema without ${field}`).toBe(false);
      }
    });

    test("optional fields default away: a minimal record validates", () => {
      const minimal: Record<string, unknown> = { ...base };
      for (const field of ["owner_person_id", "seed", "shared_to", "deleted_at"]) delete minimal[field];
      expect(model.safeParse(minimal).success).toBe(true);
      expect(validate(minimal)).toBe(true);
    });

    test("refuses extra fields, a foreign id prefix, a bad clock stamp and a bad deleted_at", () => {
      for (const bad of [{ extra: 1 }, { id: "song-a1b2c3d4" }, { id: "sstyle-ab" }, { hlc: "now" }, { source: "cloud" }, { deleted_at: "yesterday" }, { updated_at: "soon" }]) {
        expect(model.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(false);
        expect(validate({ ...base, ...bad }), `schema ${JSON.stringify(bad)}`).toBe(false);
      }
    });

    test("one shared style: words are required, never empty, lengths and tempo are bounded", () => {
      for (const bad of [{}, { description: "" }, { description: "x", bpm: 10 }, { description: "x", length_s: 2 }, { description: "x", key: "H sharp" }, { description: "x", extra: 1 }]) {
        expect(model.safeParse({ ...base, style: bad }).success, JSON.stringify(bad)).toBe(false);
        expect(validate({ ...base, style: bad }), `schema ${JSON.stringify(bad)}`).toBe(false);
      }
    });

    test("one seed field: a made file or a library item, exactly one, null when none", () => {
      for (const good of [{ file_id: "file-m4de0001" }, { media_id: "media-tr4ck001" }, null]) {
        expect(model.safeParse({ ...base, seed: good }).success, JSON.stringify(good)).toBe(true);
        expect(validate({ ...base, seed: good })).toBe(true);
      }
      for (const bad of [{}, { file_id: "file-m4de0001", media_id: "media-tr4ck001" }, { file_id: "media-tr4ck001" }, { media_id: "file-m4de0001" }, { path: "a/b.mp3" }]) {
        expect(model.safeParse({ ...base, seed: bad }).success, JSON.stringify(bad)).toBe(false);
        expect(validate({ ...base, seed: bad }), `schema ${JSON.stringify(bad)}`).toBe(false);
      }
    });

    test("shared_to is null, household or a list of people", () => {
      for (const good of [null, "household", ["person-nova1x"]]) expect(model.safeParse({ ...base, shared_to: good }).success).toBe(true);
      for (const bad of ["everyone", ["nova"], [123]]) expect(model.safeParse({ ...base, shared_to: bad }).success, JSON.stringify(bad)).toBe(false);
    });
  });
}

describe("SongStyle and MadeArtist share their definitions", () => {
  test("made-artist points at the one style and the one seed in song-style, and defines neither", () => {
    const text = readFileSync(join(SPEC, "schemas/made-artist.schema.json"), "utf-8");
    expect(text).toContain("song-style.schema.json#/$defs/style");
    expect(text).toContain("song-style.schema.json#/$defs/seed");
    expect(read("schemas/made-artist.schema.json").$defs).toBeUndefined();
  });
  test("a SongStyle origin is starter or household; a MadeArtist origin is always made", () => {
    expect(SongStyle.safeParse({ ...style, origin: "starter" }).success).toBe(true);
    expect(SongStyle.safeParse({ ...style, origin: "made" }).success).toBe(false);
    expect(MadeArtist.safeParse({ ...artist, origin: "household" }).success).toBe(false);
  });
  test("a band holds at most twelve members, each with a name and a role", () => {
    const member = { name: "Iris Vale", role: "bass" };
    expect(MadeArtist.safeParse({ ...artist, members: Array.from({ length: 12 }, () => member) }).success).toBe(true);
    expect(MadeArtist.safeParse({ ...artist, members: Array.from({ length: 13 }, () => member) }).success).toBe(false);
    expect(MadeArtist.safeParse({ ...artist, members: [{ name: "Iris Vale" }] }).success).toBe(false);
  });
});

describe("answer-block band kind", () => {
  const block = read("fixtures/answer-block/valid-band.json");
  test("the fixture parses and keeps its props", () => {
    expect(AnswerBlock.parse(block)).toEqual(block);
  });
  test("refuses a remote image address, an unknown action and extra props", () => {
    const withProps = (props: Record<string, unknown>) => ({ ...block, props: { ...block.props, ...props } });
    for (const bad of [{ portrait: { src: "https://example.com/a.png", alt: "x" } }, { actions: ["buy_now"] }, { extra: 1 }, { name: "" }, { members: [{ name: "Iris Vale" }] }]) {
      expect(AnswerBlock.safeParse(withProps(bad)).success, JSON.stringify(bad)).toBe(false);
    }
  });
  test("a bare band with only a name and no actions is a valid card", () => {
    expect(AnswerBlock.safeParse({ ...block, props: { name: "Lantern Hollow", actions: [] } }).success).toBe(true);
  });
});

describe("the word recipe stays out of the music spec", () => {
  test("no schema or fixture of these records uses it", () => {
    for (const file of ["schemas/song-style.schema.json", "schemas/made-artist.schema.json", "fixtures/records/song-style.example.json", "fixtures/records/made-artist.example.json", "fixtures/answer-block/valid-band.json"]) {
      expect(readFileSync(join(SPEC, file), "utf-8").toLowerCase()).not.toContain("recipe");
    }
  });
});

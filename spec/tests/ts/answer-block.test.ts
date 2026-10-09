// GENUI-01: every AnswerBlock fixture under fixtures/answer-block/ goes through
// the JSON Schema (Ajv 2020) and the generated Zod model, and both must agree
// with the fixture's own name (valid-*, invalid-*). Also covers the additive
// fields that carry blocks: PluginResult.blocks, the turn's `blocks` and the
// manifest's `returns_blocks`.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AnswerBlock } from "../../gen/ts/answer-block.js";
import { PluginResult } from "../../gen/ts/result.js";
import { ConversationTurn } from "../../gen/ts/conversation-turn.js";
import { PackageManifest } from "../../gen/ts/manifest.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (...parts: string[]): any => JSON.parse(readFileSync(join(SPEC, ...parts), "utf8"));

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const schema = read("schemas", "answer-block.schema.json");
const validate = ajv.compile(schema);

const V1_KINDS = ["spec_sheet", "data_table", "chart", "timeline", "todo_list", "image_gallery", "schedule_card", "comparison"];

describe("answer-block fixtures", () => {
  const fixtures = readdirSync(join(SPEC, "fixtures", "answer-block")).filter((f) => f.endsWith(".json")).sort();

  test("declares its $id under shared/spec", () => {
    expect(schema.$id).toBe("https://getmaipai.github.io/shared/spec/schemas/answer-block.schema.json");
  });

  test("there is one valid fixture for every v1 kind", () => {
    for (const kind of V1_KINDS) expect(fixtures).toContain(`valid-${kind}.json`);
  });

  test("the kind enum is exactly the v1 list, and the schema has a branch for each", () => {
    expect(schema.$defs.kind.enum).toEqual(V1_KINDS);
    expect(schema.oneOf.map((b: { $ref: string }) => b.$ref.replace("#/$defs/", ""))).toEqual(V1_KINDS);
    for (const kind of V1_KINDS) expect(schema.$defs[kind].properties.kind.const).toBe(kind);
  });

  for (const fixture of fixtures) {
    const accept = fixture.startsWith("valid-");
    test(`${fixture}: schema and Zod both ${accept ? "accept" : "refuse"}`, () => {
      const value = read("fixtures", "answer-block", fixture);
      expect(validate(value), ajv.errorsText(validate.errors)).toBe(accept);
      expect(AnswerBlock.safeParse(value).success).toBe(accept);
    });
  }

  test("every block carries id, kind, alt, provenance and a clock stamp", () => {
    for (const kind of V1_KINDS) {
      const block = read("fixtures", "answer-block", `valid-${kind}.json`);
      for (const key of ["id", "kind", "alt", "provenance", "created_at", "hlc"]) expect(block[key]).toBeTruthy();
    }
  });
});

describe("after_paragraph (GENUI-13a)", () => {
  test("one shared $def, referenced by every kind", () => {
    expect(schema.$defs.after_paragraph).toMatchObject({ type: "integer", minimum: 0 });
    for (const kind of V1_KINDS) expect(schema.$defs[kind].properties.after_paragraph).toEqual({ $ref: "#/$defs/after_paragraph" });
  });

  test("optional on every kind: 0 and a count are valid, -1 and a fraction are not, and absent is valid", () => {
    for (const kind of V1_KINDS) {
      const block = read("fixtures", "answer-block", `valid-${kind}.json`);
      expect(block.after_paragraph).toBeUndefined();
      expect(validate(block), kind).toBe(true);
      for (const good of [0, 1, 7]) {
        expect(validate({ ...block, after_paragraph: good }), `${kind} ${good}`).toBe(true);
        expect(AnswerBlock.safeParse({ ...block, after_paragraph: good }).success).toBe(true);
      }
      for (const bad of [-1, 1.5, "2", null]) {
        expect(validate({ ...block, after_paragraph: bad }), `${kind} ${String(bad)}`).toBe(false);
        expect(AnswerBlock.safeParse({ ...block, after_paragraph: bad }).success).toBe(false);
      }
    }
  });

  test("it survives a parse (the stamped value is kept) and a stored turn carries it", () => {
    const stamped = read("fixtures", "answer-block", "valid-after-paragraph.json");
    expect(AnswerBlock.parse(stamped).after_paragraph).toBe(2);
    const turn = read("fixtures", "records", "conversation-turn.blocks.example.json");
    const withPlace = { ...turn, blocks: [{ ...turn.blocks[0], after_paragraph: 1 }, ...turn.blocks.slice(1)] };
    expect(ConversationTurn.parse(withPlace).blocks[0]?.after_paragraph).toBe(1);
    expect(ConversationTurn.parse(turn).blocks[0]?.after_paragraph).toBeUndefined();
  });
});

describe("additive carriers of answer blocks", () => {
  const chart = read("fixtures", "answer-block", "valid-chart.json");

  test("PluginResult.blocks is optional and typed", () => {
    expect(PluginResult.parse({ reply: { text: "hi" } }).blocks).toEqual([]);
    expect(() => PluginResult.parse(read("fixtures", "records", "plugin-result.blocks.example.json"))).not.toThrow();
    expect(() => PluginResult.parse({ blocks: [{ ...chart, alt: "" }] })).toThrow();
  });

  test("a stored turn carries blocks, and an older turn without them still validates", () => {
    const turn = read("fixtures", "records", "conversation-turn.blocks.example.json");
    expect(ConversationTurn.parse(turn).blocks).toHaveLength(2);
    const { blocks: _omit, ...older } = turn;
    expect(ConversationTurn.parse(older).blocks).toEqual([]);
    expect(() => ConversationTurn.parse({ ...turn, blocks: [{ ...chart, hlc: "nope" }] })).toThrow();
  });

  test("a manifest may list returns_blocks, only from the v1 kinds, without repeats", () => {
    const manifest = read("fixtures", "records", "manifest.returns-blocks.example.json");
    expect(PackageManifest.parse(manifest).returns_blocks).toEqual(["chart", "data_table"]);
    expect(() => PackageManifest.parse({ ...manifest, returns_blocks: ["hologram"] })).toThrow();
    expect(() => PackageManifest.parse({ ...manifest, returns_blocks: ["chart", "chart"] })).toThrow();
    const manifestSchema = read("schemas", "manifest.schema.json");
    const mv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(mv);
    mv.addSchema(schema);
    mv.addSchema(read("schemas", "settings-key.schema.json"));
    // The manifest schema imports a standards-owned shape that is not in this checkout; only the field is checked here.
    const field = mv.compile({ ...manifestSchema.properties.returns_blocks, $id: "https://getmaipai.github.io/shared/spec/schemas/_rb.json" });
    expect(field(["chart"])).toBe(true);
    expect(field(["hologram"])).toBe(false);
  });
});

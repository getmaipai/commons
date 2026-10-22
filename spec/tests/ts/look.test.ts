import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { LookResult } from "../../gen/ts/look-result.js";

const root = join(import.meta.dir, "../..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const ajv = new Ajv2020({ strict: false });
const validate = ajv.compile(read("schemas/look-result.schema.json"));

test("LookResult fixtures validate and round-trip through Zod", () => {
  const value = read("fixtures/records/look-result.example.json");
  expect(validate(value)).toBe(true);
  expect(LookResult.parse(value)).toEqual(value);
  const invalid = read("fixtures/records/look-result.invalid-no-light.example.json");
  expect(validate(invalid)).toBe(false);
  expect(LookResult.safeParse(invalid).success).toBe(false);
});

test("Look vocabulary has the pinned COCO classes and tidy household lists", () => {
  const vocab = read("vocab/look-vocabulary.json");
  expect(vocab.detector_classes).toEqual("person,chair,couch,potted plant,bed,dining table,tv,laptop,cell phone,book,bottle,cup,clock,vase,cat,dog,backpack,handbag,umbrella,bowl,refrigerator,microwave,oven,sink,toaster,keyboard,mouse,remote,scissors,teddy bear,bench,suitcase,wine glass,fork,knife,spoon,banana,apple,orange,sandwich,pizza,cake".split(","));
  for (const list of Object.values(vocab) as unknown[][]) {
    if (!Array.isArray(list)) continue;
    expect(new Set(list).size).toBe(list.length);
    for (const entry of list) expect(entry).toBe(entry.toLowerCase());
  }
  expect(vocab.nouns.length).toBeGreaterThanOrEqual(250);
  expect(vocab.nouns.length).toBeLessThanOrEqual(350);
  expect(vocab.colours).toEqual("black,white,gray,beige,brown,red,orange,yellow,green,teal,blue,purple,pink".split(","));
  expect(vocab.scene_types.length).toBeGreaterThanOrEqual(12);
  expect(vocab.scene_types.length).toBeLessThanOrEqual(16);
  for (const noun of vocab.nouns) expect(noun.length).toBeGreaterThanOrEqual(1);
  for (const noun of vocab.nouns) expect(noun.length).toBeLessThanOrEqual(32);
});

test("YOLOX nano pin has the approved checksum", () => {
  const assets = read("assets/robot-assets.json");
  expect(assets).toContainEqual({ id: "yolox-nano-0.1.1rc0", file: "yolox_nano.onnx",
    sha256: "c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d", bytes: 3659407,
    licence: "Apache-2.0", source_url: "https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx", kind: "model" });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
describe("EMO-MAP-01", () => {
  test("closed labels have primitives and all optional clips exist in the pack fixture", () => {
    const map = read("vocab/emotion-map.json") as { labels: {label:string; primitive:string|null; clip_candidates:string[]; child_band:string}[]; legacy_labels: Record<string,string|null> };
    const examples = read("fixtures/moves/emotion-map.examples.json") as typeof map.labels;
    const signalSchema = read("schemas/turn-signal.schema.json") as { properties: { expressed_emotion: { enum: string[] } } };
    const pack = read("fixtures/moves/pollen-emotions-library.example.json") as {files:string[]};
    const primitiveFixture = read("fixtures/moves/primitive-names.example.json") as {primitives:string[]};
    expect(map.labels.map(x=>x.label)).toEqual(["neutral","happy","excited","curious","surprised","thinking","gentle","sad","confused","proud","tired","playful"]);
    const primitives = new Set(primitiveFixture.primitives);
    expect(examples).toEqual(map.labels);
    expect(new Set(signalSchema.properties.expressed_emotion.enum)).toEqual(new Set([...map.labels.map(x=>x.label), ...Object.keys(map.legacy_labels)]));
    expect(map.legacy_labels).toEqual({ happiness: "happy", surprise: "surprised", sadness: "sad", anger: null, disgust: null, fear: null });
    const clips = new Set(pack.files);
    for (const row of map.labels) { if (row.primitive !== null) expect(primitives.has(row.primitive), row.label).toBe(true); for (const clip of row.clip_candidates) expect(clips.has(`${clip}.json`), clip).toBe(true); }
    expect(map.labels.find(x=>x.label==="sad")?.clip_candidates).toEqual([]);
  });
});

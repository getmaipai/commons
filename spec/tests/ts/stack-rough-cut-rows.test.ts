// VF-ROUGHCUT-01: the one result fixture the Stack's media.rough_cut test and the kit storyboard_player block both read. The rows Home builds from
// the result (roughCutShotRows) must satisfy ui/schema.json `storyboard_shot_row`, the shape the kit block takes, so the result maps 1:1.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { roughCutShotRows, StackRoughCutResult } from "../../stack/ts/stack-rough-cut";

const SPEC = join(import.meta.dir, "..", "..");
const schema = JSON.parse(readFileSync(join(SPEC, "ui", "schema.json"), "utf-8"));
const ajv = new Ajv2020({ strict: true });
const row = ajv.compile({ $schema: schema.$schema, $id: "https://example.com/storyboard-shot-row-check.schema.json", $defs: schema.$defs, $ref: "#/$defs/storyboard_shot_row" });
const fixture = (name: string) => StackRoughCutResult.parse(JSON.parse(readFileSync(join(SPEC, "fixtures", "stack-rough-cut-result", name), "utf-8")));
const own = {
  captions: { "shot-1": "She holds the mug", "shot-2": "Please put it back" } as Record<string, string>,
  stills: Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`shot-${i}`, `/media/film/still-${i}.png`])) as Record<string, string>,
  lineTexts: { "shot-2": "Please put the blue mug back.", "shot-3": "It was my grandmother's.", "shot-5": "Thank you for keeping it safe." } as Record<string, string>,
};

describe("a rough-cut result maps 1:1 to the storyboard_player rows", () => {
  test("every row of the six-shot, three-line result satisfies storyboard_shot_row", () => {
    const rows = roughCutShotRows(fixture("valid-six-shots-three-lines.json"), own);
    expect(rows).toHaveLength(6);
    for (const r of rows) expect([r.shot_id, row(r)]).toEqual([r.shot_id, true]);
  });
  test("a line's start is seconds after its shot's start, and shots without a line carry none", () => {
    const rows = roughCutShotRows(fixture("valid-six-shots-three-lines.json"), own);
    expect(rows.map((r) => [r.shot_id, r.duration_sec, r.line_speaker, r.line_start_sec])).toEqual([
      ["shot-1", 5, null, null], ["shot-2", 5, "iris", 0.2], ["shot-3", 5, "iris", 0.2], ["shot-4", 5, null, null], ["shot-5", 5, "iris", 0.2], ["shot-6", 5, null, null],
    ]);
    expect(rows[1]).toMatchObject({ line_text: "Please put the blue mug back.", line_audio: "/media/out/line-1.wav" });
  });
  test("the silent result gives rows with no line, and a shot with no picture is no_picture", () => {
    const rows = roughCutShotRows(fixture("valid-silent.json"), { captions: {}, stills: { "shot-1": "/a.png" }, lineTexts: {} });
    expect(rows.every((r) => r.line_speaker === null && r.line_audio === null)).toBe(true);
    expect(rows[0]!.status).toBe("ready"); expect(rows[1]!.status).toBe("no_picture");
    for (const r of rows) expect(row(r)).toBe(true);
  });
});

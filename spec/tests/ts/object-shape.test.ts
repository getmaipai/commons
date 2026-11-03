// SPEC-FILE-OBJECT-01: a record whose schema carries an `allOf` of if/then rules must still generate as a plain Zod object.
// spec 0.1.309 emitted File as `object.and(z.any())` (an intersection), which has no `.shape`, and Home crashed at import
// reading `File.shape.kind`. Consumers read `.shape`, `.extend` and `.pick`, so this pins them for every such record.
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { File } from "../../gen/ts/file.js";
import { Lora } from "../../gen/ts/lora.js";
import { LikenessAdapter } from "../../gen/ts/likeness-adapter.js";
import { ProblemReport } from "../../gen/ts/problem-report.js";

const GEN = join(import.meta.dir, "..", "..", "gen", "ts");

describe("generated records stay plain objects", () => {
  test("File, Lora, LikenessAdapter and ProblemReport expose .shape and .extend", () => {
    for (const schema of [File, Lora, LikenessAdapter, ProblemReport] as const) {
      expect(Object.keys(schema.shape).length).toBeGreaterThan(5);
      expect(typeof schema.extend).toBe("function");
    }
    expect(File.shape.kind.options).toContain("video");
    expect(File.shape.made_audience.unwrap().options).toEqual(["all-ages", "adult-only"]);
    expect(File.shape.lock.unwrap().options).toEqual(["on", "off"]);
    expect(File.pick({ media_type: true }).shape.media_type).toBeDefined();
  });

  test("File made_audience and lock are ordinary optional fields", () => {
    const file = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "records", readdirSync(join(import.meta.dir, "..", "..", "fixtures", "records")).find((n) => n.startsWith("file."))!), "utf-8"));
    expect(File.safeParse(file).success).toBe(true);
    expect(File.safeParse({ ...file, made_audience: "adult-only", lock: "on" }).success).toBe(true);
    expect(File.safeParse({ ...file, lock: "maybe" }).success).toBe(false);
  });

  test("those four modules emit no z.any() intersection", () => {
    for (const name of ["file", "lora", "likeness-adapter", "problem-report"]) {
      expect(readFileSync(join(GEN, `${name}.ts`), "utf-8")).not.toMatch(/\.and\(\s*z\.(any\(\)|intersection\()/);
    }
  });
});

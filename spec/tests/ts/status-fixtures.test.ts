import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import { StatusNote } from "../../gen/ts/status-note.js";
import { MaintenanceWindow } from "../../gen/ts/maintenance-window.js";
import { PackageManifest } from "../../gen/ts/manifest.js";

const SPEC = join(import.meta.dir, "..", "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(JSON.parse(readFileSync(join(SPEC, "schemas", "status-component.schema.json"), "utf8")));
const SHAPES: Array<{ name: string; zod: ZodType }> = [
  { name: "status-note", zod: StatusNote },
  { name: "maintenance-window", zod: MaintenanceWindow },
];
for (const shape of SHAPES) {
  describe(shape.name, () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", `${shape.name}.schema.json`), "utf8"));
    const validate = ajv.compile(schema);
    const files = readdirSync(join(SPEC, "fixtures", shape.name), { withFileTypes: true })
      .flatMap((entry) => entry.isDirectory() ? [] : [entry.name]).sort();
    for (const file of files) test(`${file}: JSON Schema and generated model match name`, () => {
      const value = JSON.parse(readFileSync(join(SPEC, "fixtures", shape.name, file), "utf8"));
      const expected = file.startsWith("valid-");
      expect(validate(value), ajv.errorsText(validate.errors)).toBe(expected);
      expect(shape.zod.safeParse(value).success).toBe(expected);
    });
  });
}
test("window end ordering is accepted by schema; the hub must reject it", () => {
  const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "maintenance-window.schema.json"), "utf8"));
  const validate = ajv.getSchema(schema.$id)!;
  const value = JSON.parse(readFileSync(join(SPEC, "fixtures", "maintenance-window", "hub-enforced", "window-ends-before-start.json"), "utf8"));
  // JSON Schema cannot express ends_at > starts_at, so the hub must reject this.
  expect(validate(value)).toBe(true);
});

test("app needs fixtures match JSON Schema and generated manifest model", () => {
  const schema = JSON.parse(readFileSync(join(SPEC, "schemas.resolved", "manifest.schema.json"), "utf8"));
  const settingsSchema = JSON.parse(readFileSync(join(SPEC, "schemas", "settings-key.schema.json"), "utf8"));
  const privacySchema = JSON.parse(readFileSync(join(SPEC, "..", "..", ".github", "standards", "schemas", "privacy-row.schema.json"), "utf8"));
  ajv.addSchema(settingsSchema);
  ajv.addSchema(privacySchema, "https://getmaipai.github.io/shared/spec/schemas/privacy-row.schema.json");
  const validate = ajv.compile(schema);
  for (const file of readdirSync(join(SPEC, "fixtures", "manifest-needs")).sort()) {
    const value = JSON.parse(readFileSync(join(SPEC, "fixtures", "manifest-needs", file), "utf8"));
    const expected = file.startsWith("valid-");
    expect(validate(value), ajv.errorsText(validate.errors)).toBe(expected);
    expect(PackageManifest.safeParse(value).success).toBe(expected);
  }
});

test("status components allow internet and well-formed service ids only", () => {
  const validate = ajv.getSchema("https://getmaipai.github.io/shared/spec/schemas/status-component.schema.json")!;
  for (const [value, expected] of [["internet", true], ["service:youtube", true], ["service:Bad", false], ["service:", false], ["internet2", false]] as const) {
    expect(validate(value), ajv.errorsText(validate.errors)).toBe(expected);
  }
});

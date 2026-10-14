// SPEC-SETUP-STATE-01: schema and generated-model fixtures for setup state
// and hero slides. Fixture names state whether each value must pass or fail.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HeroSlide } from "../../gen/ts/hero-slide.js";
import { SetupState } from "../../gen/ts/setup-state.js";
import { Acknowledgment } from "../../gen/ts/acknowledgment.js";

const SPEC = join(import.meta.dir, "..", "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const healthItem = JSON.parse(readFileSync(join(SPEC, "schemas", "health-item.schema.json"), "utf8"));
ajv.addSchema(healthItem);

for (const shape of ["setup-state", "hero-slide"] as const) {
  const schema = JSON.parse(readFileSync(join(SPEC, "schemas", `${shape}.schema.json`), "utf8"));
  const validate = ajv.compile(schema);
  const model = shape === "setup-state" ? SetupState : HeroSlide;
  describe(`${shape} fixtures`, () => {
    for (const file of readdirSync(join(SPEC, "fixtures", shape)).filter((name) => name.endsWith(".json")).sort()) {
      const accept = file.startsWith("valid-");
      test(`${file}: ${accept ? "is accepted" : "is rejected"}`, () => {
        const value = JSON.parse(readFileSync(join(SPEC, "fixtures", shape, file), "utf8"));
        expect(validate(value), JSON.stringify(validate.errors)).toBe(accept);
        expect(model.safeParse(value).success).toBe(accept);
      });
    }
  });
}

const acknowledgmentSchema = JSON.parse(readFileSync(join(SPEC, "schemas", "acknowledgment.schema.json"), "utf8"));
const validateAcknowledgment = ajv.compile(acknowledgmentSchema);
describe("acknowledgment fixtures", () => {
  for (const file of readdirSync(join(SPEC, "fixtures", "acknowledgment")).filter((name) => name.endsWith(".json")).sort()) {
    const accept = file.startsWith("valid-");
    test(`${file}: ${accept ? "is accepted" : "is rejected"}`, () => {
      const value = JSON.parse(readFileSync(join(SPEC, "fixtures", "acknowledgment", file), "utf8"));
      expect(validateAcknowledgment(value), JSON.stringify(validateAcknowledgment.errors)).toBe(accept);
      if (file !== "invalid-duplicate-item-id.json") expect(Acknowledgment.safeParse(value).success).toBe(accept);
    });
  }
});

test("acknowledgment item ids stay unique when wording versions differ", () => {
  const value = JSON.parse(readFileSync(join(SPEC, "fixtures", "acknowledgment", "invalid-duplicate-item-id.json"), "utf8"));
  expect(validateAcknowledgment(value)).toBe(false);
});

test("a setup step with an unknown status is rejected", () => {
  const value = JSON.parse(readFileSync(join(SPEC, "fixtures", "setup-state", "invalid-step-unknown-status.json"), "utf8"));
  expect(SetupState.safeParse(value).success).toBe(false);
});

test("proposed hero copy cannot also name a COPY.md reference", () => {
  const valid = JSON.parse(readFileSync(join(SPEC, "fixtures", "hero-slide", "valid-copy-reference.json"), "utf8"));
  expect(ajv.validate("https://getmaipai.github.io/shared/spec/schemas/hero-slide.schema.json", { ...valid, copy_source: "proposed", text: "Proposed line" })).toBe(false);
});

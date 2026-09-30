import { expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { StatusEvent } from "../../gen/ts/status-event.js";

const SPEC = join(import.meta.dir, "..", "..");
const FIXTURES = join(SPEC, "fixtures", "status-event");
const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "status-event.schema.json"), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(JSON.parse(readFileSync(join(SPEC, "schemas", "status-component.schema.json"), "utf8")));
const validate = ajv.compile(schema);

for (const file of readdirSync(FIXTURES).sort()) test(`${file}: JSON Schema and generated model match name`, () => {
  const value = JSON.parse(readFileSync(join(FIXTURES, file), "utf8"));
  const expected = file.startsWith("valid-");
  expect(validate(value), ajv.errorsText(validate.errors)).toBe(expected);
  expect(StatusEvent.safeParse(value).success).toBe(expected);
});

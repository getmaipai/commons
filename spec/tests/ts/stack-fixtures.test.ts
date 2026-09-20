// Round-trips every fixture under spec/fixtures/<shape>/ through both its
// JSON Schema (Ajv 2020, as catalog/tools/src/lint.ts validates manifests)
// and its hand-written Zod mirror under spec/stack/ts/, and requires the
// two to agree with the fixture's own name (valid-*, invalid-*). Landed
// here at spec-v0.1.0 (RF-05b): these are the Stack's wire shapes, moved
// whole from stack/backend/src/spec/ (schemas, fixtures, ts mirrors, and
// this test, adapted from stack/backend/tests/spec.test.ts) so the Stack
// imports @maipai/spec instead of carrying its own temporary copy.
//
// The mirrors stay hand-written on purpose, not by oversight: dropping
// them in favor of `gen:ts`'s own output (tried once, spec-v0.1.1) broke
// three `stack-event` fixtures - `json-schema-to-zod` doesn't preserve
// the per-branch `required` fields inside this schema's `allOf`/`if`/
// `then` conditionals (`role.state`'s data needs different required
// fields than `job.progress`'s), the exact class of gap
// `spec/records/ts/validate.ts`'s own header already documents for
// JSON Schema conditionals generally ("neither generator preserves
// them"). `gen-ts.ts`/`bundle-schemas.ts` exclude these nine schemas
// from their sweep for the same reason - see `STACK_SCHEMA_NAMES`
// there.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import { RoleRequest } from "../../stack/ts/role-request";
import { RoleReplyHeaders } from "../../stack/ts/role-reply-headers";
import { StackEvent } from "../../stack/ts/stack-event";
import { HealthItem } from "../../stack/ts/health-item";
import { StackSetting } from "../../stack/ts/stack-setting";
import { PreciousState } from "../../stack/ts/precious-state";
import { SttWireEvent } from "../../stack/ts/stt-wire-event";
import { SttTranscribeResponse } from "../../stack/ts/stt-transcribe-response";
import { StackJob } from "../../stack/ts/stack-job";

const SPEC = join(import.meta.dir, "..", "..");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const SHAPES: Array<{ name: string; zod: ZodType }> = [
  { name: "role-request", zod: RoleRequest },
  { name: "role-reply-headers", zod: RoleReplyHeaders },
  { name: "stack-event", zod: StackEvent },
  { name: "health-item", zod: HealthItem },
  { name: "stack-setting", zod: StackSetting },
  { name: "precious-state", zod: PreciousState },
  { name: "stt-wire-event", zod: SttWireEvent },
  { name: "stt-transcribe-response", zod: SttTranscribeResponse },
  { name: "stack-job", zod: StackJob },
];

for (const shape of SHAPES) {
  describe(shape.name, () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", `${shape.name}.schema.json`), "utf8")) as { $id: string; $schema: string };
    const validate = ajv.compile(schema);
    const fixtures = readdirSync(join(SPEC, "fixtures", shape.name)).filter((entry) => entry.endsWith(".json")).sort();

    test("declares its $id under shared/spec and has a valid and an invalid fixture", () => {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.$id).toBe(`https://getmaipai.github.io/shared/spec/schemas/${shape.name}.schema.json`);
      expect(fixtures.some((entry) => entry.startsWith("valid-"))).toBe(true);
      expect(fixtures.some((entry) => entry.startsWith("invalid-"))).toBe(true);
    });

    for (const fixture of fixtures) {
      const expected = fixture.startsWith("valid") ? "accept" : "refuse";
      test(`${fixture}: the schema and the Zod mirror both ${expected}`, () => {
        const value = JSON.parse(readFileSync(join(SPEC, "fixtures", shape.name, fixture), "utf8")) as unknown;
        const bySchema = validate(value);
        const byZod = shape.zod.safeParse(value).success;
        expect(bySchema, `JSON Schema: ${ajv.errorsText(validate.errors)}`).toBe(expected === "accept");
        expect(byZod, "Zod mirror").toBe(expected === "accept");
      });
    }
  });
}

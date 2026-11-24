// The four per-category fields the Stack's `GET /stack/v1/choices` added for the
// feature cards (icon, description, steps, requires) must exist in all three
// places that have to agree: the Zod mirror under spec/stack/ts/, the JSON Schema
// under spec/schemas/ and the fixtures under spec/fixtures/. This checks the
// declarations; `stack-fixtures.test.ts` keeps the fixtures valid against both.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StackChoiceCategory } from "../../stack/ts/stack-choices";

const SPEC = join(import.meta.dir, "..", "..");
const FIELDS = ["icon", "description", "steps", "requires"] as const;

describe("StackChoiceCategory per-feature fields", () => {
  test("the Zod mirror declares icon, description, steps and requires", () => {
    const shape = StackChoiceCategory.shape as Record<string, unknown>;
    for (const field of FIELDS) {
      expect(shape[field], `StackChoiceCategory.shape.${field}`).toBeDefined();
    }
  });

  test("every fixture category carries icon, description, steps and requires", () => {
    const view = JSON.parse(readFileSync(join(SPEC, "fixtures", "stack-choices-view", "valid-two-categories.json"), "utf8")) as { categories: Array<Record<string, unknown>> };
    expect(view.categories.length > 0).toBe(true);
    for (const category of view.categories) {
      for (const field of FIELDS) {
        expect(category[field], `${category["id"]}.${field}`).toBeDefined();
      }
    }
  });

  test("the JSON Schema requires icon, description, steps and requires on each category", () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "stack-choices-view.schema.json"), "utf8")) as {
      properties: { categories: { items: { required: string[]; properties: Record<string, unknown> } } };
    };
    const category = schema.properties.categories.items;
    for (const field of FIELDS) {
      expect(category.properties[field], `schema category properties.${field}`).toBeDefined();
      expect(category.required.includes(field), `schema category required: ${field}`).toBe(true);
    }
  });
});

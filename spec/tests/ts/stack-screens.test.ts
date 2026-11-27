// STACK-MENU-SYNC-01: the Stack's admin screens are declared once in spec/stack/screens.json.
// This test checks the file against its schema and against Home's Stack settings section, so a
// screen can never point at a tab Home does not have. The Stack's admin-ui and Home each add
// their own drift test over the same file.
import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = join(import.meta.dir, "..", "..");
const read = (...p: string[]) => JSON.parse(readFileSync(join(SPEC, ...p), "utf8"));
const schema = read("schemas", "stack-screens.schema.json");
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
const file = read("stack", "screens.json") as { screens: { id: string; label: string; question: string; group: string; tab: string; kit: string | null }[] };
const stack = read("settings", "areas.json").areas[0].sections.find((s: { id: string }) => s.id === "stack") as { id: string; min_role: string; tabs: { id: string }[] };

describe("stack screens", () => {
  test("the file conforms to its schema", () => {
    expect(validate(file), JSON.stringify(validate.errors)).toBe(true);
  });
  test("fixtures: valid-* accepted, invalid-* refused", () => {
    const names = readdirSync(join(SPEC, "fixtures", "stack-screens")).filter((n) => n.endsWith(".json"));
    expect(names.some((n) => n.startsWith("valid-")) && names.some((n) => n.startsWith("invalid-"))).toBe(true);
    for (const n of names) expect(validate(read("fixtures", "stack-screens", n)), n).toBe(n.startsWith("valid-"));
  });
  test("lists the fourteen screens in menu order, ids unique", () => {
    expect(file.screens.map((s) => s.id)).toEqual(["overview", "health", "resources", "models", "styles", "modes", "drives", "connections", "licences", "engines", "updates", "settings", "tools", "helper"]);
    expect(new Set(file.screens.map((s) => s.id)).size).toBe(file.screens.length);
  });
  test("kit pages are named where they exist", () => {
    const kit = Object.fromEntries(file.screens.map((s) => [s.id, s.kit]));
    expect(kit).toMatchObject({ models: "StackModelsPage", styles: "StackLorasPage", drives: "StackDrives", licences: "StackLicences", overview: null, helper: null });
  });
  test("every screen's tab is a tab of the Stack settings section", () => {
    const tabs = stack.tabs.map((t) => t.id);
    for (const s of file.screens) expect(tabs, `screen ${s.id} has tab ${s.tab}`).toContain(s.tab);
  });
  test("the Stack section has General plus four tabs, admin only, and General has no Stack twin", () => {
    expect(stack.tabs.map((t) => t.id)).toEqual(["general", "models", "styles", "monitor", "maintain"]);
    expect(stack.min_role).toBe("admin");
    expect(file.screens.some((s) => s.tab === "general")).toBe(false);
  });
});

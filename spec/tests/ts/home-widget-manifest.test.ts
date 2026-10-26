import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PackageManifest } from "../../gen/ts/manifest.js";
import { checkAppPackage, type AppContributes } from "../../ui/app-check.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (name: string): any => JSON.parse(readFileSync(join(SPEC, "schemas", name), "utf8"));

describe("manifest Home widget placement fields", () => {
  test("optional fields preserve existing widget manifests and accept all placement fields", () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const schema = read("manifest.schema.json");

    // Exercise the widget item schema directly so unrelated package requirements do not obscure this contract.
    const widgets = schema.properties.contributes.properties.widgets.items;
    const check = ajv.compile(widgets);
    expect(check({ id: "forecast", title: "Weather", size: "card", refresh_s: 60 }), ajv.errorsText(check.errors)).toBe(true);
    expect(check({
      id: "forecast", title: "Weather", size: "card", refresh_s: 60,
      min_role: "adult", priority: 100, hero: true, data: "weather", surfaces: ["home", "tv", "robot"],
    }), ajv.errorsText(check.errors)).toBe(true);
  });

  test("rejects out-of-range priority, unknown surfaces, and undeclared data ids", () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const schema = read("manifest.schema.json");
    const widgetSchema = schema.properties.contributes.properties.widgets.items;
    const check = ajv.compile(widgetSchema);
    const base = { id: "forecast", title: "Weather", size: "card", refresh_s: 60 };
    expect(check({ ...base, priority: 101 })).toBe(false);
    expect(check({ ...base, surfaces: ["lobby"] })).toBe(false);

    // JSON Schema cannot compare an id with a sibling array using the current dialect;
    // the package manifest's cross-field check owns this reference.
    const manifest = {
      id: "test", version: "0.1.0", kind: "plugin", category: "Info", display: "Test",
      description: "Test", author: "Test", license: "AGPL-3.0", platforms: ["home"],
      min_role: "child", consequential: false, offline: "full", min_app: "0.1.0", tier: 0,
      incognito: "unaffected", contributes: { widgets: [{ ...base, data: "missing" }], data: [{ id: "known" }] },
    };
    expect(() => PackageManifest.parse(manifest)).not.toThrow();
    expect(checkAppPackage("test", manifest.contributes as AppContributes, () => undefined).join("\n")).toContain('widget "forecast": data id "missing" is not a contributes.data id');
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SettingsKey } from "../../gen/ts/settings-key.js";
import { describeSetting, lintSettingCopy, type DescribeSettingContext, type SettingDefinition, type SettingDescription } from "../../interpreters/ts/describeSetting.js";

const SPEC = join(import.meta.dir, "..", "..");
const rows = JSON.parse(readFileSync(join(SPEC, "fixtures", "describe-setting.json"), "utf8")) as {
  setting: SettingDefinition;
  context: DescribeSettingContext;
  expected: SettingDescription;
}[];
const registry = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf8")) as SettingDefinition[];
const baseline = JSON.parse(readFileSync(join(SPEC, "settings", "copy-lint-baseline.json"), "utf8")) as string[];

describe("describeSetting shared fixtures", () => {
  test("matches the shared outputs", () => {
    for (const row of rows) expect(describeSetting(row.setting, row.context)).toEqual(row.expected);
  });

  test("keeps a teen's setting state and reason private from an admin", () => {
    const row = rows.find((item) => item.context.subjectBand === "teen")!;
    expect(describeSetting(row.setting, row.context)).not.toHaveProperty("state");
    expect(describeSetting(row.setting, row.context)).not.toHaveProperty("reason");
  });
});

describe("COPY-LINT-01", () => {
  test("the missing-copy baseline only shrinks", () => {
    expect(lintSettingCopy(registry, baseline)).toEqual([]);
    const newBasic = { ...registry[0]!, key: "person.new_basic_key", level: "basic" };
    expect(lintSettingCopy([...registry, newBasic], baseline).join("\n")).toContain("missing copy.does outside the baseline");
    expect(lintSettingCopy(registry, [...baseline, "person.fixed_key"]).join("\n")).toContain("shrink-only baseline");
  });

  test("new settings copy rejects policy language and missing option lines", () => {
    const setting = {
      ...registry[0]!,
      key: "person.copy_test",
      selector: "select",
      range: { options: ["first", "second"] },
      copy: { does: "Adults and teens can use this override setting." },
    } as SettingDefinition;
    expect(lintSettingCopy([setting], ["person.copy_test"]).join("\n")).toContain("names another audience");
    expect(lintSettingCopy([setting], ["person.copy_test"]).join("\n")).toContain("option first has no copy line");
    const parsed = SettingsKey.parse({
      ...setting,
      range: { options: ["first", "second"], options_from: "companion" },
      control: { child: "guardian", teen: "self", adult: "self" },
      band_default: { child: false, teen: true, adult: true },
    });
    expect(parsed.range).toMatchObject({ options: ["first", "second"], options_from: "companion" });
    expect(SettingsKey.parse({
      ...setting,
      control: { child: "guardian", teen: "self", adult: "self" },
      band_default: { child: 0, teen: 3, adult: 5 },
    }).band_default).toEqual({ child: 0, teen: 3, adult: 5 });
  });
});

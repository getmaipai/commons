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

  test("voice enrollment copy follows reader consent rules", () => {
    const key = registry.find((entry) => entry.key === "person.voice_print.enrollment")!;
    for (const [subjectBand, viewer, consent] of [
      ["adult", "self", "I agree to save my voice pattern on this Home."],
      ["teen", "self", "I agree to save my voice pattern on this Home."],
      ["child", "guardian", "A parent must agree before a child's voice pattern is saved."],
      ["adult", "admin", "Guests cannot enroll a voice print."],
    ] as const) {
      expect(describeSetting(key, { subjectBand, viewer, value: false, source: "default", effective: false })).toMatchObject({
        title: "Voice print enrollment",
        what_is_stored: "A voice pattern is stored on this Home to recognize you.",
        consent,
      });
    }
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
    expect(SettingsKey.parse(registry.find((entry) => entry.key === "person.voice_print.enrollment")!)).toMatchObject({
      copy: {
        title: "Voice print enrollment",
        what_is_stored: "A voice pattern is stored on this Home to recognize you.",
        consent_guest: "Guests cannot enroll a voice print.",
      },
    });
    expect(SettingsKey.parse({
      ...setting,
      control: { child: "guardian", teen: "self", adult: "self" },
      band_default: { child: 0, teen: 3, adult: 5 },
    }).band_default).toEqual({ child: 0, teen: 3, adult: 5 });
  });
});

describe("describeSetting translator (I18N-K2)", () => {
  const contexts = (band: DescribeSettingContext["subjectBand"]): DescribeSettingContext[] =>
    (["self", "guardian", "admin"] as const).flatMap((viewer) =>
      ([[true, true, "user"], [false, false, "default"], [true, false, "user"], [false, false, "user"]] as const).map(([value, effective, source]) => ({
        subjectBand: band, viewer, value, effective, source, adminName: "Dad", personName: "Nova",
      })),
    );

  test("an identity translator is byte-identical to no translator over every key, band and reader", () => {
    const identity = (_id: string, fallback: string) => fallback;
    for (const setting of registry) {
      for (const band of ["child", "teen", "adult"] as const) {
        for (const context of contexts(band)) {
          expect(JSON.stringify(describeSetting(setting, context, identity))).toBe(JSON.stringify(describeSetting(setting, context)));
        }
      }
    }
    for (const row of rows) expect(JSON.stringify(describeSetting(row.setting, row.context))).toBe(JSON.stringify(row.expected));
  });

  test("a translator sees stable ids and the English text, and its result is used", () => {
    const seen: [string, string][] = [];
    const t = (id: string, fallback: string) => { seen.push([id, fallback]); return `[es] ${fallback}`; };
    const setting: SettingDefinition = {
      key: "demo.key", label: "Demo", scope: "person", selector: "toggle", default: true,
      copy: { does: "Does a thing.", does_child: "Kid thing.", title: "Title", what_is_stored: "Stored.", consent_adult_self: "OK?" },
      control: { child: "guardian", teen: "self", adult: "self" },
      band_default: { child: false, teen: true, adult: true },
    };
    const adult = describeSetting(setting, { subjectBand: "adult", viewer: "self", value: true, source: "user", effective: true }, t);
    expect(adult).toEqual({ does: "[es] Does a thing.", title: "[es] Title", what_is_stored: "[es] Stored.", consent: "[es] OK?" });
    expect(seen.map(([id]) => id)).toEqual(["setting.demo.key.does", "setting.demo.key.title", "setting.demo.key.what_is_stored", "setting.demo.key.consent"]);
    const child = describeSetting(setting, { subjectBand: "child", viewer: "admin", value: false, source: "default", effective: false, adminName: "Dad", personName: "Nova" }, t);
    expect(child.does).toBe("[es] Kid thing.");
    expect(seen.some(([id]) => id === "setting.demo.key.does.child")).toBe(true);
    expect(child.reason).toStartWith("[es] ");
    expect(seen.some(([id]) => id.startsWith("setting.demo.key.reason."))).toBe(true);
  });

  test("the label is the fallback copy and is translated too", () => {
    const setting: SettingDefinition = { key: "bare.key", label: "Bare", scope: "person", selector: "toggle", default: false };
    const t = (id: string, fallback: string) => (id === "setting.bare.key.label" ? "Desnudo" : fallback);
    expect(describeSetting(setting, { subjectBand: "adult", viewer: "self", value: false, source: "default", effective: false }, t).does).toBe("Desnudo");
  });
});

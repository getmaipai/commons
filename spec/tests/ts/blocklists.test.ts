// MINOR-SEARCH-01e-1: the blocked-site list policy is declared once (search/blocklists.json) and the three
// settings keys' options and defaults are derived from it, never written a second time by hand.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { Blocklists } from "../../gen/ts/blocklists.js";

const SPEC = join(import.meta.dir, "..", "..");
const catalog = Blocklists.parse(JSON.parse(readFileSync(join(SPEC, "search", "blocklists.json"), "utf8")));
const keys = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf8")) as {
  key: string; default: string[]; range: { options: string[]; multiple?: boolean };
  copy: { options: Record<string, string>; option_labels: Record<string, string> };
}[];
const BANDS = ["child", "teen", "adult"] as const;
const keyFor = (band: string) => keys.find((k) => k.key === `search.blocklists.${band}`)!;

describe("blocked-site list policy", () => {
  test("the file matches its JSON Schema and fixture", () => {
    const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "blocklists.schema.json"), "utf8"));
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(JSON.parse(readFileSync(join(SPEC, "search", "blocklists.json"), "utf8")))).toBe(true);
    expect(JSON.parse(readFileSync(join(SPEC, "fixtures", "blocklists", "valid-default-lists.json"), "utf8"))).toEqual(catalog);
  });

  test("ids are unique and a locked list is always on by default for that band", () => {
    const ids = catalog.lists.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of catalog.lists) for (const b of l.locked_for) expect(l.default_for, `${l.id} ${b}`).toContain(b);
  });

  test("the adult-site list is locked on for child and teen", () => {
    const porn = catalog.lists.find((l) => l.category === "adult")!;
    expect(porn.locked_for.sort()).toEqual(["child", "teen"]);
    expect(porn.default_for.sort()).toEqual(["child", "teen"]);
  });

  test("the default set: scam, phishing, malware and gambling for both bands, drugs for child only", () => {
    const on = (band: string) => catalog.lists.filter((l) => l.default_for.includes(band as never)).map((l) => l.category).sort();
    expect(on("child")).toEqual(["adult", "drugs", "gambling", "malware", "phishing", "scam"]);
    expect(on("teen")).toEqual(["adult", "gambling", "malware", "phishing", "scam"]);
    expect(on("adult")).toEqual([]);
  });

  for (const band of BANDS) {
    test(`search.blocklists.${band}: options are the lists not locked for the band, default is the unlocked defaults`, () => {
      const key = keyFor(band);
      const offered = catalog.lists.filter((l) => !l.locked_for.includes(band));
      expect(key.range.multiple).toBe(true);
      expect(key.range.options).toEqual(offered.map((l) => l.id));
      expect(key.default).toEqual(offered.filter((l) => l.default_for.includes(band)).map((l) => l.id));
      for (const l of offered) {
        expect(key.copy.option_labels[l.id]).toBe(l.label);
        expect(key.copy.options[l.id]).toBeTruthy();
      }
    });
  }

  test("a locked list is not an option of its band's key at all", () => {
    for (const l of catalog.lists) for (const b of l.locked_for) expect(keyFor(b).range.options).not.toContain(l.id);
  });
});

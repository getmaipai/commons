// KS-05: the news feed list policy is declared once (news/feed-lists.json); the three
// news.lists.<band> settings keys' options and defaults derive from it, never written twice by hand.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { FeedLists } from "../../gen/ts/feed-lists.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (...p: string[]) => JSON.parse(readFileSync(join(SPEC, ...p), "utf8"));
const catalog = FeedLists.parse(read("news", "feed-lists.json"));
const keys = read("settings", "keys.json") as {
  key: string; default: string[]; lives_in: string; range: { options: string[]; multiple?: boolean };
  copy: { options: Record<string, string>; option_labels: Record<string, string> };
}[];
const BANDS = ["child", "teen", "adult"] as const;
const keyFor = (band: string) => keys.find((k) => k.key === `news.lists.${band}`)!;

describe("news feed list policy", () => {
  test("the file matches its JSON Schema and fixture, and a file with no lists is refused", () => {
    const validate = new Ajv2020({ strict: false }).compile(read("schemas", "feed-lists.schema.json"));
    expect(validate(read("news", "feed-lists.json"))).toBe(true);
    expect(read("fixtures", "feed-lists", "valid-default-lists.json")).toEqual(catalog);
    expect(validate(read("fixtures", "feed-lists", "invalid-missing-lists.json"))).toBe(false);
  });

  test("ids are unique and a list's defaults are a subset of the user types it is offered to", () => {
    expect(new Set(catalog.lists.map((l) => l.id)).size).toBe(catalog.lists.length);
    for (const l of catalog.lists) for (const b of l.default_for) expect(l.offered_for, `${l.id} ${b}`).toContain(b);
  });

  test("the kids' list is offered to child only and the household list never to child", () => {
    expect(catalog.lists.find((l) => l.id === "feeds-children")!.offered_for).toEqual(["child"]);
    expect(catalog.lists.find((l) => l.id === "feeds-household")!.offered_for).not.toContain("child");
  });

  for (const band of BANDS) {
    test(`news.lists.${band}: options are the lists offered to the band, default is the band's defaults`, () => {
      const key = keyFor(band);
      const offered = catalog.lists.filter((l) => l.offered_for.includes(band));
      expect(key.range.multiple).toBe(true);
      expect(key.lives_in).toBe("household.news");
      expect(key.range.options).toEqual(offered.map((l) => l.id));
      expect(key.default).toEqual(offered.filter((l) => l.default_for.includes(band)).map((l) => l.id));
      for (const l of offered) {
        expect(key.copy.option_labels[l.id]).toBe(l.label);
        expect(key.copy.options[l.id]).toBe(l.does);
      }
    });
  }

  test("a list not offered to a band is not an option of that band's key", () => {
    for (const l of catalog.lists) for (const b of BANDS) if (!l.offered_for.includes(b)) expect(keyFor(b).range.options).not.toContain(l.id);
  });

  test("a feed-list package file needs https feed addresses", () => {
    const validate = new Ajv2020({ strict: false }).compile(read("schemas", "feed-list-package.schema.json"));
    expect(validate({ list_id: "feeds-household", feeds: [{ url: "https://example.com/rss.xml", title: "Example", publisher: "Example" }] })).toBe(true);
    expect(validate({ list_id: "feeds-household", feeds: [{ url: "http://example.com/rss.xml", title: "Example", publisher: "Example" }] })).toBe(false);
  });
});

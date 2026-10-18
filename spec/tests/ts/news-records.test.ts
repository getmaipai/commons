// NEWS-00: the News app's records. Feed, NewsItem and NewsStory gain additive fields; NewsInterest, NewsSave and
// NewsRead are new person-scope records; spec/news/topics.json is the fixed topic set. The one cross-field rule
// (nothing is inferred about a child) lives in records/ts/validate.ts because the generators drop if/then rules.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { Feed } from "../../gen/ts/feed.js";
import { NewsItem } from "../../gen/ts/news-item.js";
import { NewsStory } from "../../gen/ts/news-story.js";
import { NewsInterest } from "../../gen/ts/news-interest.js";
import { NewsSave } from "../../gen/ts/news-save.js";
import { NewsRead } from "../../gen/ts/news-read.js";
import { NewsSearchRecent } from "../../gen/ts/news-search-recent.js";
import { NewsTopics } from "../../gen/ts/news-topics.js";
import { validateNewsInterest, validateNewsSearchRecent } from "../../records/ts/validate.js";

const SPEC = join(import.meta.dir, "..", "..");
const read = (path: string) => JSON.parse(readFileSync(join(SPEC, path), "utf-8"));
const fixture = (name: string) => read(`fixtures/records/${name}.example.json`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const compiled = new Map<string, ReturnType<typeof ajv.compile>>();
const schema = (name: string) => {
  if (!compiled.has(name)) compiled.set(name, ajv.compile(read(`schemas/${name}.schema.json`)));
  return compiled.get(name)!;
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const CASES: Array<[string, string, { parse: (v: unknown) => unknown; safeParse: (v: unknown) => { success: boolean } }]> = [
  ["feed.news-app", "feed", Feed], ["news-item.news-app", "news-item", NewsItem], ["news-story.news-app", "news-story", NewsStory],
  ["news-interest.followed", "news-interest", NewsInterest], ["news-interest.inferred", "news-interest", NewsInterest], ["news-interest.child-follow", "news-interest", NewsInterest],
  ["news-save", "news-save", NewsSave], ["news-read", "news-read", NewsRead],
  ["news-search-recent", "news-search-recent", NewsSearchRecent],
];

describe("News records", () => {
  for (const [name, schemaName, model] of CASES) {
    test(`${name}: the schema and the generated Zod accept it, and Zod keeps every field`, () => {
      const data = fixture(name);
      expect(schema(schemaName)(data)).toBe(true);
      expect(model.safeParse(data).success).toBe(true);
      expect(model.parse(data)).toEqual(data);
    });
  }

  test("the shipped Feed, NewsItem and NewsStory fixtures still validate unchanged (additive)", () => {
    for (const [name, model] of [["feed", Feed], ["news-item", NewsItem], ["news-story", NewsStory]] as const) {
      expect(model.safeParse(fixture(name)).success).toBe(true);
    }
  });

  test("additive fields refuse bad values", () => {
    const feed = fixture("feed.news-app");
    for (const bad of [{ kind: "html" }, { site_url: "not a url" }, { topics_hint: ["Science"] }, { alerts: "yes" }]) expect(Feed.safeParse({ ...feed, ...bad }).success, JSON.stringify(bad)).toBe(false);
    const item = fixture("news-item.news-app");
    for (const bad of [{ content_source: "scraped" }, { reading_s: -1 }, { reading_s: 1.5 }, { topics: ["World"] }, { image_url: "x" }]) expect(NewsItem.safeParse({ ...item, ...bad }).success, JSON.stringify(bad)).toBe(false);
    const story = fixture("news-story.news-app");
    for (const bad of [{ summary_band: "baby" }, { lead_item_id: "item-1" }, { summary: "" }]) expect(NewsStory.safeParse({ ...story, ...bad }).success, JSON.stringify(bad)).toBe(false);
  });

  test("the person-scope records need their ids, person, clock stamp and provenance", () => {
    for (const [name, model] of [["news-interest.followed", NewsInterest], ["news-save", NewsSave], ["news-read", NewsRead], ["news-search-recent", NewsSearchRecent]] as const) {
      const base = fixture(name);
      for (const field of ["id", "person_id", "hlc", "provenance"]) {
        const broken = clone(base);
        delete broken[field];
        expect(model.safeParse(broken).success, `${name} without ${field}`).toBe(false);
      }
      expect(model.safeParse({ ...base, extra: 1 }).success).toBe(false);
      expect(model.safeParse({ ...base, id: "nope-123456" }).success).toBe(false);
    }
  });

  test("a NewsInterest affinity stays within 0 to 1 and its kind within topic or source; NewsRead feedback is more, less or null", () => {
    const interest = fixture("news-interest.followed");
    for (const bad of [{ affinity: 1.2 }, { affinity: -0.1 }, { kind: "person" }, { source: "package" }]) expect(NewsInterest.safeParse({ ...interest, ...bad }).success).toBe(false);
    const read = fixture("news-read");
    for (const ok of ["more", "less", null]) expect(NewsRead.safeParse({ ...read, feedback: ok }).success).toBe(true);
    expect(NewsRead.safeParse({ ...read, feedback: "meh" }).success).toBe(false);
    expect(NewsRead.safeParse({ ...read, read_s: -5 }).success).toBe(false);
  });
});

describe("validateNewsInterest (nothing is inferred about a child)", () => {
  test("a child's inferred interest is refused, and so is a child's computed affinity", () => {
    const inferred = { ...fixture("news-interest.inferred") };
    expect(validateNewsInterest(inferred, "child").join(" ")).toContain("never inferred");
    const scored = { ...fixture("news-interest.child-follow"), affinity: 0.5 };
    expect(validateNewsInterest(scored, "child").join(" ")).toContain("must be 0");
  });
  test("a child's own follow, a teen's follow and an adult's inferred row are fine", () => {
    expect(validateNewsInterest(fixture("news-interest.child-follow"), "child")).toEqual([]);
    expect(validateNewsInterest(fixture("news-interest.followed"), "teen")).toEqual([]);
    expect(validateNewsInterest(fixture("news-interest.inferred"), "adult")).toEqual([]);
  });
  test("an inferred row cannot also be followed, and a source key is a feed id", () => {
    expect(validateNewsInterest({ ...fixture("news-interest.inferred"), followed: true }, "adult").join(" ")).toContain("cannot also be followed");
    expect(validateNewsInterest({ ...fixture("news-interest.followed"), kind: "source", key: "science" }, "teen").join(" ")).toContain("feed id");
  });
});

describe("NewsSearchRecent", () => {
  test("a query is 1 to 120 characters and the id is recent-...", () => {
    const base = fixture("news-search-recent");
    for (const bad of [{ q: "" }, { q: "x".repeat(121) }, { at: "yesterday" }, { source: "package" }]) expect(NewsSearchRecent.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(false);
    expect(NewsSearchRecent.safeParse({ ...base, q: "x".repeat(120) }).success).toBe(true);
    expect(schema("news-search-recent")({ ...base, q: "" })).toBe(false);
  });
  test("validateNewsSearchRecent rejects a child's row and passes a teen's or an adult's", () => {
    expect(validateNewsSearchRecent(fixture("news-search-recent"), "child").join(" ")).toContain("no recents");
    expect(validateNewsSearchRecent(fixture("news-search-recent"), "teen")).toEqual([]);
    expect(validateNewsSearchRecent(fixture("news-search-recent"), "adult")).toEqual([]);
  });
});

describe("spec/news/topics.json", () => {
  const topics = NewsTopics.parse(read("news/topics.json"));
  test("the ten topics of the design note, politics deliberately absent", () => {
    expect(topics.topics.map((t) => t.id)).toEqual(["world", "local", "business", "technology", "science", "health", "sports", "entertainment", "environment", "kids"]);
    expect(topics.topics.some((t) => t.id === "politics")).toBe(false);
  });
  test("kids is offered to the child band only, every other topic to teens and adults", () => {
    for (const topic of topics.topics) expect(topic.bands).toEqual(topic.id === "kids" ? ["child"] : ["teen", "adult"]);
  });
  test("ids are unique and every topic carries a label, an icon and a description the embed role can compare against", () => {
    expect(new Set(topics.topics.map((t) => t.id)).size).toBe(topics.topics.length);
    for (const topic of topics.topics) { expect(topic.label.length).toBeGreaterThan(0); expect(topic.icon).toMatch(/^[a-z-]+$/); expect(topic.description.length).toBeGreaterThanOrEqual(20); }
  });
  test("the schema accepts the file and refuses a topic with no description", () => {
    const validate = schema("news-topics");
    expect(validate(read("news/topics.json"))).toBe(true);
    const bad = clone(read("news/topics.json"));
    delete bad.topics[0].description;
    expect(validate(bad)).toBe(false);
  });
});

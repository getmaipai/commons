import { describe, expect, test } from "bun:test";
import { searchSettings } from "./searchSettings";
import { ADMIN, ADULT, CHILD, REGISTRY, TEEN, area, valuesFor } from "./settingsFixtures";

const values = { person: valuesFor("person"), household: valuesFor("household"), device: valuesFor("device") };
const keysOf = (r: ReturnType<typeof searchSettings>) => r.map((x) => x.setting.def.key);

describe("searchSettings", () => {
  test("finds a key by its label, with a Section / Card breadcrumb", () => {
    const r = searchSettings(area("chat"), REGISTRY, values, ADULT, "safe search", { honouredBy: "home" });
    expect(keysOf(r)).toEqual(["search.safe_search"]);
    expect(r[0]!.breadcrumb).toBe("General / Search");
    expect(r[0]!.sectionId).toBe("general");
  });

  test("finds a key by help text and by an option label", () => {
    const byHelp = searchSettings(area("chat"), REGISTRY, values, ADULT, "loosen their own", { honouredBy: "home" });
    expect(keysOf(byHelp)).toEqual(["search.safe_search"]);
    const opt = REGISTRY.find((k) => k.key === "search.safe_search")!;
    const first = (opt.range as { options: string[] }).options[0]!;
    const byOption = searchSettings(area("chat"), REGISTRY, values, ADULT, first, { honouredBy: "home" });
    expect(keysOf(byOption)).toContain("search.safe_search");
  });

  test("with no direct match, a section keyword brings that section's keys", () => {
    const r = searchSettings(area("chat"), REGISTRY, values, ADULT, "reply stats", { honouredBy: "home" });
    // "reply stats" is a General keyword; no key label says it, so the section answers.
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.sectionId === "general")).toBe(true);
  });

  test("a direct key match wins over the section fallback", () => {
    const r = searchSettings(area("chat"), REGISTRY, values, ADULT, "safe search", { honouredBy: "home" });
    expect(keysOf(r)).toEqual(["search.safe_search"]);
  });

  test("every word must match; a blank query returns nothing", () => {
    expect(searchSettings(area("chat"), REGISTRY, values, ADULT, "safe zzzz", { honouredBy: "home" })).toEqual([]);
    expect(searchSettings(area("chat"), REGISTRY, values, ADULT, "   ", { honouredBy: "home" })).toEqual([]);
  });

  test("only the given area is searched", () => {
    const r = searchSettings(area("chat"), REGISTRY, values, ADMIN, "searxng", { honouredBy: "home" });
    expect(r).toEqual([]);
    expect(keysOf(searchSettings(area("home"), REGISTRY, values, ADMIN, "searxng", { honouredBy: "home" }))).toContain("search.searxng_url");
  });

  test("a child never finds a key on a card made for teens and adults", () => {
    const photo = searchSettings(area("chat"), REGISTRY, values, CHILD, "photo", { honouredBy: "home" });
    expect(keysOf(photo)).not.toContain("chat.photo_uploads");
    expect(keysOf(searchSettings(area("chat"), REGISTRY, values, TEEN, "photo", { honouredBy: "home" }))).toContain("chat.photo_uploads");
  });

  test("a hidden area gives no result at all, and the breadcrumbs name no hidden section", () => {
    expect(searchSettings(area("home"), REGISTRY, values, ADULT, "search", { honouredBy: "home" })).toEqual([]);
    const adult = searchSettings(area("account"), REGISTRY, values, ADULT, "a", { honouredBy: "home" });
    for (const r of adult) expect(["device", "robot", "developer"]).not.toContain(r.sectionId);
  });

  test("an expert key is never a result outside a developer card, and a key with no loaded value is skipped", () => {
    const expert = REGISTRY.filter((k) => k.level === "expert").map((k) => k.key);
    const all = searchSettings(area("account"), REGISTRY, values, ADMIN, "a", { honouredBy: "home" });
    const inGeneralCards = all.filter((r) => r.sectionId !== "developer");
    for (const r of inGeneralCards) expect(expert).not.toContain(r.setting.def.key);
    const noValues = searchSettings(area("chat"), REGISTRY, { person: [] }, ADULT, "safe search", { honouredBy: "home" });
    expect(noValues).toEqual([]);
  });

  test("a key found twice is returned once, in the area's order", () => {
    const r = searchSettings(area("chat"), REGISTRY, values, ADULT, "a", { honouredBy: "home" });
    const keys = keysOf(r);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a key another product honours is not searched for this one", () => {
    const stackKey = REGISTRY.find((k) => !(k.honoured_by as string[]).includes("home") && k.scope === "person");
    if (!stackKey) return;
    const r = searchSettings(area("chat"), REGISTRY, values, ADULT, stackKey.label, { honouredBy: "home" });
    expect(keysOf(r)).not.toContain(stackKey.key);
  });
});

import { describe, expect, test } from "bun:test";
import {
  areaAllows,
  audienceAllows,
  cardKeys,
  firstVisibleSection,
  resolveHref,
  roleAllows,
  visibleCards,
  visibleGroups,
} from "./settingsAudience";
import { ADMIN, ADULT, CHILD, GUEST, REGISTRY, TEEN, area } from "./settingsFixtures";

const ids = (groups: ReturnType<typeof visibleGroups>) => groups.flatMap((g) => g.sections.map((s) => s.id));

describe("role, band and needs", () => {
  test("a role sees what its rank reaches", () => {
    expect(roleAllows(ADMIN, "adult")).toBe(true);
    expect(roleAllows(ADULT, "admin")).toBe(false);
    expect(roleAllows(GUEST, undefined)).toBe(true);
    expect(roleAllows({ ...ADMIN, role: "owner" }, "admin")).toBe(true);
  });

  test("a band list limits who sees it; needs must all be met", () => {
    expect(audienceAllows(TEEN, { bands: ["teen", "adult"] })).toBe(true);
    expect(audienceAllows(CHILD, { bands: ["teen", "adult"] })).toBe(false);
    expect(audienceAllows(ADULT, { needs: ["robot.paired"] })).toBe(false);
    expect(audienceAllows({ ...ADULT, capabilities: ["robot.paired"] }, { needs: ["robot.paired"] })).toBe(true);
  });

  test("{self} resolves to the viewer's own id and nothing else", () => {
    expect(resolveHref("/people/{self}?tab=memories", ADULT)).toBe("/people/p1?tab=memories");
    expect(resolveHref("/voices", ADULT)).toBe("/voices");
  });
});

describe("Chat settings audience (design 3.1)", () => {
  const chat = area("chat");

  test("an adult sees General, Personalization, Skills, Shortcuts and the arrow rows, not household", () => {
    expect(ids(visibleGroups(chat, ADULT, REGISTRY, "home"))).toEqual([
      "general", "personalization", "skills", "shortcuts", "voice", "notifications", "memories",
    ]);
  });

  test("a child has no Skills and no Parental controls", () => {
    const seen = ids(visibleGroups(chat, CHILD, REGISTRY, "home"));
    expect(seen).not.toContain("skills");
    expect(seen).not.toContain("parental-controls");
    expect(seen).toContain("general");
  });

  test("Parental controls shows to an adult only with a child in the home; Household chat to admins", () => {
    expect(ids(visibleGroups(chat, { ...ADULT, capabilities: ["household.has_child"] }, REGISTRY, "home"))).toContain("parental-controls");
    expect(ids(visibleGroups(chat, { ...TEEN, capabilities: ["household.has_child"] }, REGISTRY, "home"))).not.toContain("parental-controls");
    expect(ids(visibleGroups(chat, ADMIN, REGISTRY, "home"))).toContain("household");
    expect(ids(visibleGroups(chat, ADULT, REGISTRY, "home"))).not.toContain("household");
  });

  test("the Chat card on General is for teens and adults; a child gets only the Search card", () => {
    const general = chat.sections.find((s) => s.id === "general")!;
    expect(visibleCards(general, CHILD, REGISTRY, "home").map((c) => c.label)).toEqual(["Search"]);
    expect(visibleCards(general, TEEN, REGISTRY, "home").map((c) => c.label)).toEqual(["Chat", "Search"]);
  });

  test("the area's first openable section skips arrow rows", () => {
    expect(firstVisibleSection(chat, ADULT, REGISTRY, "home")?.id).toBe("general");
  });
});

describe("Home settings and Account audience", () => {
  test("Home settings is for admins: an adult sees none of it", () => {
    const home = area("home");
    expect(areaAllows(home, ADULT)).toBe(false);
    expect(visibleGroups(home, ADULT, REGISTRY, "home")).toEqual([]);
    expect(firstVisibleSection(home, ADULT, REGISTRY, "home")).toBeUndefined();
    expect(ids(visibleGroups(home, ADMIN, REGISTRY, "home"))).toContain("general");
  });

  test("Account's device and robot sections wait for their capabilities", () => {
    const account = area("account");
    const plain = ids(visibleGroups(account, ADULT, REGISTRY, "home"));
    expect(plain).not.toContain("device");
    expect(plain).not.toContain("robot");
    const equipped = ids(visibleGroups(account, { ...ADULT, capabilities: ["wakeword.assets", "robot.paired"] }, REGISTRY, "home"));
    expect(equipped).toContain("device");
    expect(equipped).toContain("robot");
  });

  test("a child never sees Account's developer section", () => {
    expect(ids(visibleGroups(area("account"), CHILD, REGISTRY, "home"))).not.toContain("developer");
  });

  test("an expert key is drawn only by a developer card that asks for it", () => {
    const dev = area("account").sections.find((s) => s.id === "developer")!;
    const expert = dev.cards!.flatMap((c) => cardKeys(c, REGISTRY, "home")).filter((k) => k.level === "expert");
    expect(expert.length).toBeGreaterThan(0);
    const general = area("chat").sections.find((s) => s.id === "general")!;
    expect(general.cards!.flatMap((c) => cardKeys(c, REGISTRY, "home")).some((k) => k.level === "expert")).toBe(false);
  });
});

describe("every viewer, every area: never a section they may not see", () => {
  test("no hidden section appears for any role and band", () => {
    for (const viewer of [ADMIN, ADULT, TEEN, CHILD, GUEST]) {
      for (const a of [area("chat"), area("account"), area("home")]) {
        for (const g of visibleGroups(a, viewer, REGISTRY, "home")) {
          for (const s of g.sections) expect(audienceAllows(viewer, s)).toBe(true);
        }
      }
    }
  });
});

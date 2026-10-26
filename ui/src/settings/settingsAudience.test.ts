import { describe, expect, test } from "bun:test";
import {
  audienceAllows,
  cardsInTab,
  resolveHref,
  resolveTab,
  sectionTabs,
  roleAllows,
  visibleCards,
  visibleGroups,
  visibleTabs,
} from "./settingsAudience";
import liveAreasFile from "../../../spec/settings/areas.json";
import legacySnapshot from "./fixtures/areas.legacy.json";
import { ADMIN, ADULT, CHILD, GUEST, REGISTRY, TEEN } from "./settingsFixtures";
import type { SettingsAreaDef } from "./settingsAudience";

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

describe("section tabs and tabbed cards", () => {
  test("returns declared tabs and resolves unknown requests to the first", () => {
    const tabs = [{ id: "one", label: "One" }, { id: "two", label: "Two" }];
    expect(sectionTabs({ id: "s", label: "S", icon: "settings", kind: "keys", tabs })).toEqual(tabs);
    expect(sectionTabs({ id: "s", label: "S", icon: "settings", kind: "keys" })).toEqual([]);
    expect(resolveTab(tabs, "two")).toBe("two");
    expect(resolveTab(tabs, "missing")).toBe("one");
    expect(resolveTab([], "missing")).toBeUndefined();
  });

  test("keeps summary cards on every tab and all cards when tab is undefined", () => {
    const cards = [{ label: "Summary" }, { label: "One", tab: "one" }, { label: "Two", tab: "two" }];
    expect(cardsInTab(cards, "one").map((card) => card.label)).toEqual(["Summary", "One"]);
    expect(cardsInTab(cards, "two").map((card) => card.label)).toEqual(["Summary", "Two"]);
    expect(cardsInTab(cards).map((card) => card.label)).toEqual(["Summary", "One", "Two"]);
  });

  test("filters tabs by role, band, and capability while keeping a page with a visible tab", () => {
    const section = { id: "s", label: "S", icon: "settings", kind: "keys" as const, tabs: [
      { id: "adult", label: "Adult", min_role: "adult" as const },
      { id: "child", label: "Child", bands: ["child"] as const },
      { id: "paired", label: "Paired", needs: ["robot.paired"] },
    ] };
    expect(visibleTabs(section, CHILD).map((tab) => tab.id)).toEqual(["child"]);
    expect(visibleTabs(section, ADULT).map((tab) => tab.id)).toEqual(["adult"]);
    expect(visibleTabs(section, { ...ADULT, capabilities: ["robot.paired"] }).map((tab) => tab.id)).toEqual(["adult", "paired"]);
  });
});

describe("single Settings area audience", () => {
  const liveAreas = (liveAreasFile as unknown as { areas: SettingsAreaDef[] }).areas;
  const settings = liveAreas[0]!;

  test("a non-admin sees Yours only; admins see both headings", () => {
    expect(settings.groups.map((g) => g.label)).toEqual(["Yours", "The home"]);
    expect(visibleGroups(settings, ADULT, REGISTRY, "home").map((g) => g.label)).toEqual(["Yours"]);
    expect(ids(visibleGroups(settings, ADULT, REGISTRY, "home"))).toEqual(["profile", "appearance", "chat", "voice", "notifications", "pictures", "data"]);
    expect(visibleGroups(settings, ADMIN, REGISTRY, "home").map((g) => g.label)).toEqual(["Yours", "The home"]);
  });

  test("child and teen sections are no broader than the frozen pre-regroup pages", () => {
    const legacy = (legacySnapshot as unknown as { areas: SettingsAreaDef[] }).areas;
    for (const viewer of [CHILD, TEEN]) {
      for (const oldArea of legacy) for (const oldSection of oldArea.sections) {
        if (!oldSection.scope) continue;
        const mapped = settings.sections.find((s) => s.id === (oldArea.id === "home" && oldSection.id === "voice" ? "home-voice" : oldSection.id));
        if (!mapped) continue;
        expect(audienceAllows(viewer, mapped), mapped.id).toBe(audienceAllows(viewer, oldSection));
      }
    }
  });

  test("empty groups disappear and household pages stay admin gated", () => {
    expect(visibleGroups(settings, CHILD, REGISTRY, "home").map((g) => g.label)).toEqual(["Yours"]);
    expect(settings.sections.filter((s) => s.scope === "household").every((s) => s.min_role === "admin")).toBe(true);
  });
});

describe("every viewer, every area: never a section they may not see", () => {
  test("no hidden section appears for any role and band", () => {
    const liveAreas = (liveAreasFile as unknown as { areas: SettingsAreaDef[] }).areas;
    for (const viewer of [ADMIN, ADULT, TEEN, CHILD, GUEST]) {
      for (const a of liveAreas) {
        for (const g of visibleGroups(a, viewer, REGISTRY, "home")) {
          for (const s of g.sections) expect(audienceAllows(viewer, s)).toBe(true);
          for (const s of g.sections) {
            if (s.tabs?.length) expect(visibleTabs(s, viewer).length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test("live product data has the single Settings area", () => {
    const liveAreas = (liveAreasFile as unknown as { areas: SettingsAreaDef[] }).areas;
    expect(liveAreas.map((a) => a.id)).toEqual(["settings"]);
    expect(liveAreas[0]!.sections.filter((s) => s.scope === "household")).toHaveLength(9);
    expect(liveAreas[0]!.sections.filter((s) => s.scope === "person")).toHaveLength(7);
  });
});

describe("view cards", () => {
  test("a view card with no group is kept for anyone its audience allows; a grouped one still needs a key to draw", () => {
    const section = { id: "ai", label: "AI", icon: "cpu", kind: "keys" as const, cards: [
      { label: "Always on", view: "ai.always_on", description: "Needed." },
      { label: "Nothing here", view: "ai.job_choices", group: "household.nothing", scope: "household" as const },
    ] };
    expect(visibleCards(section, ADMIN, REGISTRY).map((card) => card.label)).toEqual(["Always on"]);
  });
});

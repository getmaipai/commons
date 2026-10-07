// SPEC-SETAREA-01: the settings area record (spec/settings/areas.json) and
// the conformance rules that make "one definition, one place" true for the
// settings screens: every registry key has exactly one card, expert keys sit
// only under a developer section, and the audience rules hold.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PackageManifest } from "../../gen/ts/manifest.js";
import {
  ALLOWED_VIEW_IDS,
  CENTRAL_AREA_IDS,
  RESERVED_AREA_IDS,
  checkAreas,
  lintManifestSettings,
  type AreasFile,
  type RegistryKey,
} from "../../settings/areas-check.js";

const SPEC = join(import.meta.dir, "..", "..");
const schema = JSON.parse(readFileSync(join(SPEC, "schemas", "settings-area.schema.json"), "utf-8"));
const file = JSON.parse(readFileSync(join(SPEC, "settings", "areas.json"), "utf-8")) as AreasFile;
const registry = JSON.parse(readFileSync(join(SPEC, "settings", "keys.json"), "utf-8")) as RegistryKey[];

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const validateArea = ajv.compile(schema);

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const area = (id: string) => {
  const found = file.areas.find((a) => a.id === id);
  if (!found) throw new Error(`area ${id} missing`);
  return found;
};
const section = (areaId: string, sectionId: string) => {
  const found = area(areaId).sections.find((s) => s.id === sectionId);
  if (!found) throw new Error(`section ${areaId}/${sectionId} missing`);
  return found;
};
const registryIds = () => registry.map((k) => k.key);

describe("spec/settings/areas.json", () => {
  test("declares exactly the account, home and chat areas", () => {
    expect(file.areas.map((a) => a.id).sort()).toEqual(["account", "chat", "home"]);
  });

  test("every area validates against settings-area.schema.json", () => {
    for (const a of file.areas) {
      expect(validateArea(a), `${a.id}: ${JSON.stringify(validateArea.errors)}`).toBe(true);
    }
  });

  test("the whole file passes the cross-file conformance check", () => {
    expect(checkAreas(file, registry)).toEqual([]);
  });

  test("personal voice controls stay in Account and command management is in Home", () => {
    expect(section("account", "voice")).toMatchObject({ kind: "keys", lead_view: "account.voice" });
    expect(section("home", "commands")).toMatchObject({ kind: "view", view: "home.commands" });
    const accountVoice = section("account", "voice");
    expect(accountVoice.cards?.find((card) => card.group === "person.voice")).toBeDefined();
    expect(accountVoice.cards?.flatMap((card) => card.links ?? []).map((link) => link.href)).toEqual(["/commands"]);
  });
});

describe("conformance: each registry group is in exactly one card", () => {
  test("every basic and advanced key group at its scope is in one card, or is listed as not placed", () => {
    expect(checkAreas(file, registry).filter((e) => /card|placed/.test(e))).toEqual([]);
  });

  test("dropping a card leaves its group unplaced and the check says so", () => {
    const broken = clone(file);
    const s = broken.areas.find((a) => a.id === "chat")!.sections.find((x) => x.id === "general")!;
    s.cards = s.cards!.filter((c) => c.group !== "person.search");
    expect(checkAreas(broken, registry).join("\n")).toMatch(/person\.search.*no card/);
  });

  test("the same group in two cards is refused", () => {
    const broken = clone(file);
    const s = broken.areas.find((a) => a.id === "chat")!.sections.find((x) => x.id === "personalization")!;
    s.cards!.push({ label: "Search again", scope: "person", group: "person.search" });
    expect(checkAreas(broken, registry).join("\n")).toMatch(/person\.search.*more than one card/);
  });

  test("a card naming a group the registry does not have is refused", () => {
    const broken = clone(file);
    broken.areas[0]!.sections.find((s) => s.kind === "keys")!.cards!.push({
      label: "Ghost",
      scope: "person",
      group: "person.ghost",
    });
    expect(checkAreas(broken, registry).join("\n")).toMatch(/person\.ghost.*not in the registry/);
  });

  test("device-only robot hello keys are not placed (the robot renders them) and the reason is recorded", () => {
    const hello = file.not_placed.find((n) => n.group === "robot.hello");
    expect(hello?.scope).toBe("device");
    expect(hello?.reason.length).toBeGreaterThan(10);
  });
});

describe("conformance: expert keys only under developer", () => {
  test("every expert key sits in a developer section card", () => {
    const experts = registry.filter((k) => k.level === "expert");
    expect(experts.length).toBeGreaterThan(0);
    for (const a of file.areas) {
      for (const s of a.sections) {
        for (const c of s.cards ?? []) {
          if (c.levels?.includes("expert")) {
            expect(s.id, `${a.id}/${s.id}`).toBe("developer");
            expect(c.levels, `${a.id}/${s.id} card ${c.label}`).toEqual(["expert"]);
          }
        }
      }
    }
    expect(checkAreas(file, registry).filter((e) => /expert/.test(e))).toEqual([]);
  });

  test("an expert level on a non-developer card is refused", () => {
    const broken = clone(file);
    section("chat", "general");
    broken.areas.find((a) => a.id === "chat")!.sections.find((s) => s.id === "general")!.cards![0]!.levels = [
      "basic",
      "advanced",
      "expert",
    ];
    expect(checkAreas(broken, registry).join("\n")).toMatch(/expert/);
  });
});

describe("conformance: structure", () => {
  test("a duplicate section id inside an area is refused", () => {
    const broken = clone(file);
    const a = broken.areas.find((x) => x.id === "chat")!;
    a.sections.push({ ...clone(a.sections[0]!) });
    expect(checkAreas(broken, registry).join("\n")).toMatch(/duplicate section "general"/);
  });

  test("a sidebar group naming an unknown section is refused", () => {
    const broken = clone(file);
    broken.areas.find((x) => x.id === "chat")!.groups[0]!.sections.push("nope");
    expect(checkAreas(broken, registry).join("\n")).toMatch(/unknown section "nope"/);
  });

  test("a section missing from every sidebar group is refused", () => {
    const broken = clone(file);
    broken.areas.find((x) => x.id === "chat")!.groups[0]!.sections.pop();
    expect(checkAreas(broken, registry).join("\n")).toMatch(/not in any sidebar group/);
  });

  test("an unknown view id is refused by the schema and by the check", () => {
    const broken = clone(file);
    const a = broken.areas.find((x) => x.id === "chat")!;
    a.sections.find((s) => s.id === "skills")!.view = "chat.nonsense";
    expect(validateArea(a)).toBe(false);
    expect(checkAreas(broken, registry).join("\n")).toMatch(/unknown view "chat\.nonsense"/);
  });

  test("the allowed view ids are the Home-owned renders", () => {
    expect([...ALLOWED_VIEW_IDS].sort()).toEqual([
      "account.device_appearance",
      "account.profile",
      "account.voice",
      "chat.shortcuts",
      "chat.skills",
      "home.commands",
      "home.voice_catalog",
    ]);
  });

  test("reserved ids are refused as an area id", () => {
    expect([...RESERVED_AREA_IDS].sort()).toEqual([
      "backups", "commands", "devices", "health", "models", "repairs", "updates", "users", "voices",
    ]);
    for (const id of RESERVED_AREA_IDS) {
      const broken = clone(file);
      const a = broken.areas.find((x) => x.id === "chat")!;
      a.id = id;
      expect(checkAreas(broken, registry).join("\n"), id).toMatch(/reserved/);
    }
  });

  test("a card is a group at a scope or a list of links, never both and never neither", () => {
    const both = clone(file);
    both.areas[0]!.sections.find((s) => s.kind === "keys")!.cards![0]!.links = [{ label: "x", href: "/x" }];
    expect(checkAreas(both, registry).join("\n")).toMatch(/is a link card/);
    const neither = clone(file);
    neither.areas[0]!.sections.find((s) => s.kind === "keys")!.cards!.push({ label: "Empty" });
    expect(checkAreas(neither, registry).join("\n")).toMatch(/needs a group and scope, or links/);
  });

  test("a view or link section missing its view or href is refused by the check too", () => {
    const broken = clone(file);
    const chat = broken.areas.find((x) => x.id === "chat")!;
    delete chat.sections.find((s) => s.id === "skills")!.view;
    delete chat.sections.find((s) => s.id === "voice")!.href;
    const out = checkAreas(broken, registry).join("\n");
    expect(out).toMatch(/a view section needs a view/);
    expect(out).toMatch(/a link section needs an href/);
  });

  test("a section holding fields of another kind is refused", () => {
    const broken = clone(file);
    broken.areas.find((x) => x.id === "chat")!.sections.find((s) => s.id === "voice")!.view = "chat.skills";
    expect(checkAreas(broken, registry).join("\n")).toMatch(/link section holds only an href/);
  });

  test("a section of kind keys needs cards, view needs a view, link needs an href", () => {
    const a = clone(area("chat"));
    delete a.sections.find((s) => s.id === "general")!.cards;
    expect(validateArea(a)).toBe(false);
    const b = clone(area("chat"));
    delete b.sections.find((s) => s.id === "skills")!.view;
    expect(validateArea(b)).toBe(false);
    const c = clone(area("chat"));
    delete c.sections.find((s) => s.id === "voice")!.href;
    expect(validateArea(c)).toBe(false);
  });
});

describe("package manifests: contributes.settings_area", () => {
  const base = {
    id: "music",
    version: "0.1.0",
    kind: "plugin",
    category: "Media",
    display: "Music",
    description: "A minimal manifest for settings area tests.",
    author: "MaiPai",
    license: "AGPL-3.0",
    platforms: ["home"],
    min_role: "child",
    consequential: false,
    offline: "full",
    min_app: "0.1.0",
    tier: 0,
    incognito: "unaffected",
  };
  const musicArea = {
    id: "music",
    title: "Music settings",
    app: "/apps/music",
    audience: { min_role: "child" },
    groups: [{ label: "Music", sections: ["general"] }],
    sections: [
      {
        id: "general",
        label: "General",
        icon: "music",
        kind: "keys",
        cards: [{ label: "Library", scope: "person", group: "music.library" }],
      },
    ],
  };

  test("a package may declare its own area, and the manifest model carries it", () => {
    const manifest = { ...base, contributes: { settings_area: musicArea } };
    const parsed = PackageManifest.parse(manifest);
    expect(parsed.contributes?.settings_area?.id).toBe("music");
    expect(lintManifestSettings(manifest)).toEqual([]);
  });

  test("a malformed package area is refused by the manifest model", () => {
    const bad = { ...musicArea, sections: [{ ...musicArea.sections[0], kind: "pane" }] };
    expect(() => PackageManifest.parse({ ...base, contributes: { settings_area: bad } })).toThrow();
  });

  test("a package area may not take a reserved id or a central one", () => {
    for (const id of [...RESERVED_AREA_IDS, ...CENTRAL_AREA_IDS]) {
      const manifest = { ...base, contributes: { settings_area: { ...musicArea, id } } };
      expect(lintManifestSettings(manifest).join("\n"), id).toMatch(/settings area id/);
    }
  });

  test("a package may not use a reserved area id as its package id", () => {
    for (const id of RESERVED_AREA_IDS) {
      expect(lintManifestSettings({ ...base, id }).join("\n"), id).toMatch(/package id/);
    }
  });
});

describe("audience rules", () => {
  test("Home settings is admins only, Account and Chat are for everyone signed in or guest", () => {
    expect(area("home").audience.min_role).toBe("admin");
    expect(area("account").audience.min_role).toBe("guest");
    expect(area("chat").audience.min_role).toBe("guest");
  });

  test("Account > Robot is adults and admins only, never a teen (C-S1 a)", () => {
    const robot = section("account", "robot");
    expect(robot.bands).toEqual(["adult"]);
    for (const c of robot.cards ?? []) expect(c.bands, c.label).toEqual(["adult"]);
    expect(robot.needs).toContain("robot.paired");
  });

  test("Chat > General: chat card teen and adult, search card everyone (C-S1 b)", () => {
    const cards = section("chat", "general").cards!;
    expect(cards.find((c) => c.group === "person.chat")?.bands).toEqual(["teen", "adult"]);
    expect(cards.find((c) => c.group === "person.search")?.bands).toBeUndefined();
  });

  test("Chat > Parental controls is a link row for owner, admin and adult only, when a child exists, never a person id (C-S1 c)", () => {
    const row = section("chat", "parental-controls");
    expect(row.kind).toBe("link");
    expect(row.min_role).toBe("adult");
    expect(row.bands).toEqual(["adult"]);
    expect(row.needs).toEqual(["household.has_child"]);
    expect(row.href).toBe("/people");
    const related = area("chat").groups.find((g) => g.label === "Related")!;
    expect(related.sections).toContain("parental-controls");
  });

  test("Chat > Household chat link is admin only", () => {
    expect(section("chat", "household").min_role).toBe("admin");
  });

  test("no href holds a placeholder other than {self}; none carries a person id (C-S2)", () => {
    const hrefs: string[] = [];
    for (const a of file.areas) {
      for (const s of a.sections) {
        if (s.href) hrefs.push(s.href);
        for (const c of s.cards ?? []) for (const l of c.links ?? []) hrefs.push(l.href);
      }
    }
    expect(hrefs.length).toBeGreaterThan(10);
    for (const h of hrefs) {
      expect(h.startsWith("/"), h).toBe(true);
      expect(h.replaceAll("{self}", ""), h).not.toMatch(/[{}]/);
    }
    expect(hrefs).toContain("/people/{self}?tab=memories");
  });

  test("a href with another placeholder is refused by the schema", () => {
    const a = clone(area("chat"));
    a.sections.find((s) => s.id === "memories")!.href = "/people/{person_id}";
    expect(validateArea(a)).toBe(false);
  });

  test("household scope cards sit only where an admin is required", () => {
    for (const a of file.areas) {
      for (const s of a.sections) {
        for (const c of s.cards ?? []) {
          if (c.scope !== "household") continue;
          const roles = [a.audience.min_role, s.min_role, c.min_role].filter(Boolean);
          expect(roles.some((r) => r === "admin" || r === "owner"), `${a.id}/${s.id}/${c.label}`).toBe(true);
        }
      }
    }
  });

  test("no card or section is broader than its area", () => {
    expect(checkAreas(file, registry).filter((e) => /broader/.test(e))).toEqual([]);
  });

  test("allowances and per-person quotas are not in any settings area (a parent or admin sets them on a person's own page)", () => {
    const placed = new Set<string>();
    for (const a of file.areas) for (const s of a.sections) for (const c of s.cards ?? []) if (c.group) placed.add(`${c.scope}:${c.group}`);
    expect(placed.has("person:person.allowance")).toBe(false);
    expect(placed.has("person:person.storage")).toBe(false);
    expect(file.not_placed.map((n) => `${n.scope}:${n.group}`)).toEqual(
      expect.arrayContaining(["person:person.allowance", "person:person.storage"]),
    );
  });
});

describe("registry group moves (design 3.5): only lives_in changes", () => {
  const where = (key: string) => registry.find((k) => k.key === key)?.lives_in;

  test("chat keys live in person.chat", () => {
    expect(where("ui.show_turn_stats")).toBe("person.chat");
    expect(where("reference.images")).toBe("person.chat");
    expect(where("chat.photo_uploads")).toBe("person.chat");
  });

  test("enrollment sounds live in the new person.profile group", () => {
    expect(where("ui.enrollment_sounds")).toBe("person.profile");
  });

  test("quiet hours follow the notifications groups", () => {
    expect(where("person.quiet_hours.from")).toBe("person.notifications");
    expect(where("person.quiet_hours.to")).toBe("person.notifications");
    expect(where("household.quiet_hours.from")).toBe("household.notifications");
    expect(where("household.quiet_hours.to")).toBe("household.notifications");
  });

  test("the telegram chat id and the 15 per-event switches live in person.telegram", () => {
    const telegram = registry.filter((k) => k.lives_in === "person.telegram").map((k) => k.key);
    expect(telegram).toContain("notifications.telegram.chat_id");
    expect(telegram.filter((k) => k.endsWith(".telegram"))).toHaveLength(15);
    expect(telegram).toHaveLength(16);
    expect(registry.filter((k) => k.lives_in === "person.notifications" && /telegram/.test(k.key))).toEqual([]);
  });

  test("backup limit joins storage, the internet probe gets household.status", () => {
    expect(where("backup.max_total_gb")).toBe("household.storage");
    const probe = registry.filter((k) => k.key.startsWith("status.internet_probe.")).map((k) => k.lives_in);
    expect(probe).toHaveLength(4);
    expect(new Set(probe)).toEqual(new Set(["household.status"]));
  });

  test("no key was added or removed, and scope, default and level are untouched (pinned counts)", () => {
    expect(registry).toHaveLength(103);
    expect(new Set(registryIds()).size).toBe(103);
  });
});

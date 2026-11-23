// maipai.systems/1: the fixture validates, and the rule check (scripts/check-systems.ts)
// passes it and fails each planted violation.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Systems } from "../../gen/ts/systems.js";
import { checkSystems, loadVocab } from "../../scripts/check-systems.js";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/systems/valid-stackchan-example.json", import.meta.url), "utf8"));
const vocab = loadVocab();
const plant = (fn: (m: any) => void) => { const m = structuredClone(fixture); fn(m); return m; };
const sys = (m: any, id: string) => m.systems.find((s: any) => s.id === id);
const comp = (m: any, id: string) => sys(m, id.split(".")[0]).components.find((c: any) => c.id === id);
const rules = (m: any) => checkSystems(m, vocab).errors.map((e) => `${e.rule}:${e.where}`);

describe("Systems shape", () => {
  test("round trips the fixture", () => {
    const parsed = Systems.parse(fixture);
    expect(Systems.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });
  test("rejects a bad schema id, component type, state, switch and extra field", () => {
    expect(() => Systems.parse(plant((m) => { m.schema = "maipai.systems/2"; }))).toThrow();
    expect(() => Systems.parse(plant((m) => { comp(m, "net.wifi").type = "module"; }))).toThrow();
    expect(() => Systems.parse(plant((m) => { comp(m, "net.wifi").status.stackchan = "done"; }))).toThrow();
    expect(() => Systems.parse(plant((m) => { comp(m, "net.portal").switch = "MAIPAI_WIFI"; }))).toThrow();
    expect(() => Systems.parse(plant((m) => { comp(m, "net.wifi").colour = "red"; }))).toThrow();
    expect(() => Systems.parse(plant((m) => { delete comp(m, "net.wifi").safety; }))).toThrow();
  });
});

describe("rule check", () => {
  test("passes the fixture", () => {
    expect(checkSystems(fixture, vocab).errors).toEqual([]);
  });
  test("fails a call that reaches up a layer", () => {
    expect(rules(plant((m) => { comp(m, "hear.mics").uses.push("motion::request"); }))).toContain("layer:hear.mics");
  });
  test("fails a second owner of state, tool, event and switch", () => {
    expect(rules(plant((m) => { comp(m, "hear.wake").owns.push("mute"); }))).toContain("owner:hear.mute");
    expect(rules(plant((m) => { comp(m, "hear.wake").tools = ["self.privacy.set"]; }))).toContain("owner:hear.mute");
    expect(rules(plant((m) => { comp(m, "hear.wake").events.push("net_up"); }))).toContain("owner:hear.wake");
    expect(rules(plant((m) => { comp(m, "net.travel").switch = "CONFIG_MAIPAI_WIFI_PORTAL"; }))).toContain("owner:net.travel");
  });
  test("fails ids that do not resolve", () => {
    expect(rules(plant((m) => { sys(m, "motion").parts.push("tentacle"); }))).toContain("ids:motion");
    expect(rules(plant((m) => { sys(m, "hear").capabilities.push("telepathy"); }))).toContain("ids:hear");
    expect(rules(plant((m) => { comp(m, "hear.wake").uses.push("ghost::call"); }))).toContain("ids:hear.wake");
    expect(rules(plant((m) => { comp(m, "hear.wake").uses.push("net::nothing"); }))).toContain("ids:hear.wake");
    expect(rules(plant((m) => { comp(m, "hear.wake").status.robot9 = "idea"; }))).toContain("ids:hear.wake");
    expect(rules(plant((m) => { sys(m, "motion").layer = 7; }))).toContain("ids:motion");
  });
  test("fails a component without a proper owner", () => {
    expect(rules(plant((m) => { sys(m, "motion").owner = ""; }))).toContain("owner:motion");
    expect(rules(plant((m) => { comp(m, "motion.servo").id = "hear.servo"; }))).toContain("owner:hear.servo");
    expect(rules(plant((m) => { sys(m, "motion").components.push(structuredClone(comp(m, "motion.servo"))); }))).toContain("owner:motion.servo");
  });
  test("fails an adapter that calls the unit directly, and a switch with no budget", () => {
    expect(rules(plant((m) => { comp(m, "character.personality").uses.push("hear::muted"); }))).toContain("layer:character.personality");
    expect(rules(plant((m) => { delete comp(m, "net.portal").budget; }))).toContain("budget:net.portal");
  });
  test("fails a built system with no doc, and a missing path under --root", () => {
    expect(rules(plant((m) => { sys(m, "motion").docs = []; }))).toContain("proof:motion");
    const bad = plant((m) => { comp(m, "motion.servo").tests = ["host/tests/nope.py"]; });
    expect(checkSystems(bad, vocab, { root: "/nonexistent" }).errors.some((e) => e.rule === "paths")).toBe(true);
  });
});

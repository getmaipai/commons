// SPEC-CAP-01: the `policy` field on vocab/permissions.json and
// vocab/grant-actions.json. The gate in Home reads these cells; this test
// is the promise that no cell can quietly loosen what a child or teen may do.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VOCAB_DIR = join(import.meta.dir, "..", "..", "vocab");
const load = (name: string) => JSON.parse(readFileSync(join(VOCAB_DIR, name), "utf-8"));

const ORDER = ["none", "self", "parent", "never"] as const;
type Approver = (typeof ORDER)[number];
type Cells = { child: Approver; teen: Approver; adult: Approver };
const RISKS = ["read", "lookup", "chosen_destination", "write_own", "write_household", "action", "spend", "admin"];
const rank = (a: Approver) => ORDER.indexOf(a);

interface Entry {
  id: string;
  parameterized: boolean;
  policy?: {
    risk: string;
    outbound: boolean;
    reversible: boolean;
    approver: Cells;
    by_parameter?: Record<string, Cells>;
    limits?: string[];
    model_callable?: boolean;
    shown_to_approver?: string[];
  };
  policy_ref?: string;
}

const perms = load("permissions.json") as { permissions: Entry[]; unknown_default: Cells };
const grants = load("grant-actions.json") as { actions: Entry[]; unknown_default: Cells };

function checkCells(label: string, cells: Cells) {
  for (const band of ["child", "teen", "adult"] as const) {
    expect(ORDER.includes(cells[band]), `${label}: ${band} cell "${cells[band]}" is not a valid approver`).toBe(true);
  }
  expect(Object.keys(cells).sort(), `${label}: exactly the three bands`).toEqual(["adult", "child", "teen"]);
  expect(rank(cells.child), `${label}: a child's cell is looser than a teen's`).toBeGreaterThanOrEqual(rank(cells.teen));
  expect(rank(cells.teen), `${label}: a teen's cell is looser than an adult's`).toBeGreaterThanOrEqual(rank(cells.adult));
  expect(cells.adult, `${label}: parent is invalid for an adult`).not.toBe("parent");
}

const cases: Array<[string, Entry[], Cells]> = [
  ["permissions.json", perms.permissions, perms.unknown_default],
  ["grant-actions.json", grants.actions, grants.unknown_default],
];

for (const [file, entries, unknownDefault] of cases) {
  describe(`${file} policy`, () => {
    test("an id with no policy decides ask-a-parent for a minor, never allow", () => {
      expect(unknownDefault.child).toBe("parent");
      expect(unknownDefault.teen).toBe("parent");
      expect(unknownDefault.adult).toBe("self");
      checkCells("unknown_default", unknownDefault);
    });

    test("every entry has a complete, monotonic policy (child never looser than teen, teen never looser than adult)", () => {
      for (const e of entries) {
        if (e.policy_ref) continue;
        expect(e.policy, `${e.id} has no policy`).toBeDefined();
        const p = e.policy!;
        expect(RISKS.includes(p.risk), `${e.id}: unknown risk ${p.risk}`).toBe(true);
        expect(typeof p.outbound, `${e.id}: outbound`).toBe("boolean");
        expect(typeof p.reversible, `${e.id}: reversible`).toBe("boolean");
        checkCells(e.id, p.approver);
        for (const [param, cells] of Object.entries(p.by_parameter ?? {})) checkCells(`${e.id}[${param}]`, cells);
        if (["chosen_destination", "action", "spend"].includes(p.risk)) {
          expect(p.approver.child, `${e.id}: a child may not run a ${p.risk} with no ask`).not.toBe("none");
        }
      }
    });

    test("no entry loosens a child below a teen through by_parameter either", () => {
      for (const e of entries) {
        for (const [param, cells] of Object.entries(e.policy?.by_parameter ?? {})) {
          expect(rank(cells.child)).toBeGreaterThanOrEqual(rank(cells.teen));
          expect(param.length).toBeGreaterThan(0);
        }
      }
    });
  });
}

describe("one definition per id", () => {
  test("an id in both files is defined once: the grant copy points at permissions", () => {
    const permIds = new Set(perms.permissions.map((p) => p.id));
    for (const g of grants.actions) {
      if (!permIds.has(g.id)) {
        expect(g.policy, `${g.id} needs its own policy`).toBeDefined();
        expect(g.policy_ref).toBeUndefined();
      } else {
        expect(g.policy_ref).toBe("permissions");
        expect(g.policy).toBeUndefined();
      }
    }
  });

  test("ids are unique inside each file", () => {
    for (const [, entries] of cases) {
      const ids = entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("the owner's 2026-10-06 rows", () => {
  const find = (id: string) => [...perms.permissions, ...grants.actions].find((e) => e.id === id)!;
  test("hosted search is never for a minor", () => {
    expect(find("search.hosted").policy!.approver).toEqual({ child: "never", teen: "never", adult: "none" });
  });
  test("a family name in a web search needs a parent for a child, the teen themselves", () => {
    expect(find("search.household_subject").policy!.approver).toEqual({ child: "parent", teen: "self", adult: "self" });
  });
  test("security home domains are never for a child and need a parent for a teen", () => {
    const by = find("home:<domain>").policy!.by_parameter!;
    for (const d of ["lock", "alarm_control_panel", "cover", "garage_door", "valve"]) {
      expect(by[d]).toEqual({ child: "never", teen: "parent", adult: "none" });
    }
  });
  test("approvals.decide can never be held by a model, tool or package", () => {
    expect(find("approvals.decide").policy!.model_callable).toBe(false);
  });
  test("the generic integration policy preserves the original tainted-action and ask-parent floor", () => {
    expect(find("integration:<id>").policy).toEqual({
      risk: "action",
      outbound: false,
      reversible: false,
      approver: { child: "parent", teen: "parent", adult: "none" },
    });
  });
  test("SearXNG alone is a fixed lookup with no approval for any age band", () => {
    expect(find("integration:searxng").policy).toEqual({
      risk: "lookup",
      outbound: true,
      reversible: true,
      approver: { child: "none", teen: "none", adult: "none" },
    });
  });
  test("show_images has an offer-only capability policy row", () => {
    expect(find("tool.offer:show_images").policy).toEqual({
      risk: "read",
      outbound: false,
      reversible: true,
      approver: { child: "none", teen: "none", adult: "none" },
    });
  });
});

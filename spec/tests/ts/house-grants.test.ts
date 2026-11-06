import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(import.meta.dir, "..", "..", "vocab", "grant-actions.json");
const actions = JSON.parse(readFileSync(path, "utf-8")).actions as Array<any>;
const find = (id: string) => actions.find((entry) => entry.id === id)!;
const order = ["none", "self", "parent", "never"] as const;
const rank = (cell: string) => order.indexOf(cell as (typeof order)[number]);
const ids = ["house.see:<target>", "house.control:<target>", "house.confirm:<target>", "house.server"];

describe("house grants", () => {
  test("the four house actions exist", () => {
    for (const id of ids) expect(find(id)).toBeDefined();
  });

  test("every base and parameter policy is strictness-monotonic", () => {
    for (const id of ids) {
      const policy = find(id).policy;
      for (const [label, cells] of [["base", policy.approver], ...Object.entries(policy.by_parameter ?? {})] as Array<[string, any]>) {
        expect(rank(cells.child), `${id}[${label}] child vs teen`).toBeGreaterThanOrEqual(rank(cells.teen));
        expect(rank(cells.teen), `${id}[${label}] teen vs adult`).toBeGreaterThanOrEqual(rank(cells.adult));
        expect(cells.adult, `${id}[${label}] adult`).not.toBe("parent");
      }
    }
  });

  test("children cannot see or control sensitive devices", () => {
    for (const device of ["lock", "alarm", "garage", "entry_cover"]) {
      expect(find("house.control:<target>").policy.by_parameter[device].child).toBe("never");
      expect(find("house.confirm:<target>").policy.by_parameter[device].child).toBe("never");
      expect(find("house.see:<target>").policy.by_parameter[device].child).toBe("never");
    }
    for (const id of ["house.control:<target>", "house.confirm:<target>", "house.see:<target>"]) {
      for (const device of ["camera", "server"]) expect(find(id).policy.by_parameter[device].child).toBe("never");
    }
  });

  test("the server action is never callable by a child or teen", () => {
    const server = find("house.server");
    expect(server.policy.approver.child).toBe("never");
    expect(server.policy.approver.teen).toBe("never");
    expect(server.policy.model_callable).toBe(false);
  });
});

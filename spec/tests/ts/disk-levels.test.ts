import { expect, test } from "bun:test";
import { diskLevel, diskLines } from "../../stack/ts/disk-levels";

const TB18 = 1_800_000_000_000;
const GB = 1_000_000_000;

test("a 1.8 TB drive warns at 180 GB and is critical at 54 GB", () => {
  const l = diskLines(TB18);
  expect(l.warnBytes).toBe(180 * GB);
  expect(l.criticalBytes).toBe(54 * GB);
});
test("the 47 GB free of 1.8 TB incident is critical", () => { expect(diskLevel(47 * GB, TB18)).toBe("critical"); });
test("a small drive uses the byte floors", () => {
  const l = diskLines(100 * GB);
  expect(l.warnBytes).toBe(30 * GB);
  expect(l.criticalBytes).toBe(10 * GB);
});
test("levels step normal, warn, critical", () => {
  expect(diskLevel(300 * GB, TB18)).toBe("normal");
  expect(diskLevel(100 * GB, TB18)).toBe("warn");
  expect(diskLevel(20 * GB, TB18)).toBe("critical");
});
test("a level clears only a margin above its line (hysteresis)", () => {
  expect(diskLevel(60 * GB, TB18, "critical")).toBe("critical"); // 54 + 18 margin
  expect(diskLevel(73 * GB, TB18, "critical")).toBe("warn");
  expect(diskLevel(185 * GB, TB18, "warn")).toBe("warn");
  expect(diskLevel(199 * GB, TB18, "warn")).toBe("normal");
});
test("overrides replace the rule, 0 means the rule", () => {
  expect(diskLines(TB18, { warnFreeGb: 50, criticalFreeGb: 20 })).toMatchObject({ warnBytes: 50 * GB, criticalBytes: 20 * GB });
  expect(diskLines(TB18, { warnFreeGb: 0, criticalFreeGb: 0 }).warnBytes).toBe(180 * GB);
});

test("the two disk keys are numbers that default to 0 (use the rule) and live with storage", async () => {
  const keys = (await Bun.file(new URL("../../settings/keys.json", import.meta.url)).json()) as Array<Record<string, unknown>>;
  for (const name of ["storage.warn_free_gb", "storage.critical_free_gb"]) {
    const key = keys.find((k) => k.key === name);
    expect(key, name).toBeDefined();
    expect(key).toMatchObject({ selector: "number", default: 0, lives_in: "household.storage", scope: "household" });
  }
});

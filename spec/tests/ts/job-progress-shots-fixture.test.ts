import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// VIDEO-KIT-01 (K7): the one shared file Home's film-progress rows and the kit's job_progress block both test against.
const rows = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "job-progress-shots", "valid-five-shots.json"), "utf8")) as Array<Record<string, any>>;

test("every row has an id, a label and a state the job_progress block knows", () => {
  const states = ["queued", "running", "done", "held", "failed"];
  expect(rows.length).toBe(5);
  for (const row of rows) {
    expect(typeof row.id).toBe("string");
    expect(typeof row.label).toBe("string");
    expect(states).toContain(row.state);
    if (row.progress !== undefined) expect(row.progress >= 0 && row.progress <= 100).toBe(true);
  }
  expect(rows.map((r) => r.state)).toEqual(["done", "running", "queued", "held", "failed"]);
});

test("a failed row carries what went wrong and its choices; a held row says why", () => {
  const failed = rows.find((r) => r.state === "failed")!;
  expect(failed.failure.message.length).toBeGreaterThan(0);
  expect(failed.failure.actions.length).toBe(2);
  expect(rows.find((r) => r.state === "held")!.heldReason.length).toBeGreaterThan(0);
});

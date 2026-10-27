// A household key whose only reader is gone is removed from the one definition, not left as a control that does nothing.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const keys = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "settings", "keys.json"), "utf8")) as { key: string }[];

test("chat.teen_gate_grain is gone: a teen's replies are always checked per sentence, so no setting chooses it", () => {
  expect(keys.some((k) => k.key === "chat.teen_gate_grain")).toBe(false);
});

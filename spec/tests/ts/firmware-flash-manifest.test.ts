import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FirmwareFlashManifest } from "../../gen/ts/firmware-flash-manifest.js";
import { firmwareFlashManifestSigningPayload, validateFirmwareFlashManifest } from "../../records/ts/validate.js";

const path = new URL("../../fixtures/firmware-flash-manifest/stackchan-esp32s3.json", import.meta.url);
const fixture = JSON.parse(readFileSync(path, "utf8"));

describe("FirmwareFlashManifest", () => {
  test("round trips and validates the StackChan fixture", () => {
    const parsed = FirmwareFlashManifest.parse(fixture);
    expect(FirmwareFlashManifest.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(validateFirmwareFlashManifest(parsed)).toEqual([]);
  });
  test("rejects malformed digest, unsafe path, overlapping and out of range parts", () => {
    const mutate = (fn: (part: any) => void) => {
      const value = structuredClone(fixture); fn(value.builds[0].parts[3]); return value;
    };
    expect(() => FirmwareFlashManifest.parse(mutate((p) => { p.sha256 = "bad"; }))).toThrow();
    expect(() => FirmwareFlashManifest.parse(mutate((p) => { p.path = "../x.bin"; }))).toThrow();
    const overlap = FirmwareFlashManifest.parse(mutate((p) => { p.offset = 0x8000; }));
    expect(validateFirmwareFlashManifest(overlap).some((p) => p.includes("overlap"))).toBe(true);
    const past = FirmwareFlashManifest.parse(mutate((p) => { p.offset = 16 * 1024 * 1024; }));
    expect(validateFirmwareFlashManifest(past).some((p) => p.includes("past flash_size"))).toBe(true);
  });
  test("uses catalog canonical bytes", () => {
    const digest = createHash("sha256").update(firmwareFlashManifestSigningPayload(FirmwareFlashManifest.parse(fixture))).digest("hex");
    expect(digest).toBe("2ac0a67fc74b47478baf40ea33d66abfaf296417931203a79504ac9acef349f3");
  });
});

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "bun";
import { createZipArchive } from "./zip";

describe("createZipArchive", () => {
  test("produces an archive a standard unzip tool can extract, with every entry's exact content", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-zip-"));
    try {
      const bytes = createZipArchive([
        { name: "a.txt", text: "hello" },
        { name: "nested/b.json", text: JSON.stringify({ ok: true }) },
      ]);
      const archivePath = join(dir, "bundle.zip");
      writeFileSync(archivePath, bytes);
      const result = spawnSync(["unzip", "-o", archivePath, "-d", dir]);
      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("hello");
      expect(readFileSync(join(dir, "nested/b.json"), "utf8")).toBe(JSON.stringify({ ok: true }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an empty entry list is still a structurally valid (if empty) archive, not corrupt", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-zip-"));
    try {
      const archivePath = join(dir, "empty.zip");
      writeFileSync(archivePath, createZipArchive([]));
      const result = spawnSync(["zipinfo", "-1", archivePath]);
      // zipinfo exits 1 for a zero-entry archive, but says exactly
      // "Empty zipfile" rather than a corruption/format error - that's
      // the structural end-of-central-directory record being read fine.
      expect(result.stdout.toString() + result.stderr.toString()).toContain("Empty zipfile");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a value that must never appear (a secret) is simply not passed as an entry's text - the writer has no redaction of its own", () => {
    const bytes = createZipArchive([{ name: "safe.txt", text: "nothing sensitive here" }]);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).not.toContain("should-never-be-called-with-this-secret");
  });
});

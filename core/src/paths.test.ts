import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDataDir, statMtimeMs } from "./paths";

describe("ensureDataDir", () => {
  test("creates a missing directory, owner-only", () => {
    const parent = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    const dir = join(parent, "nested", "dir");
    try {
      ensureDataDir(dir);
      expect(existsSync(dir)).toBe(true);
      expect(statSync(dir).mode & 0o777).toBe(0o700);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test("is a no-op when the directory already exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    try {
      expect(() => ensureDataDir(dir)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("statMtimeMs", () => {
  test("returns the file's mtime in milliseconds", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    const file = join(dir, "f.txt");
    writeFileSync(file, "x");
    try {
      const mtime = statMtimeMs(file);
      expect(mtime).not.toBeNull();
      expect(mtime).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns null for a path that doesn't exist, rather than throwing", () => {
    expect(statMtimeMs("/nonexistent/path/for/sure")).toBeNull();
  });
});

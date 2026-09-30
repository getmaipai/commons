import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DataDirMissingError, ensureDataDir, statMtimeMs } from "./paths";

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

describe("ensureDataDir with { create: false }", () => {
  test("throws a typed error naming the class and path instead of making an empty folder", () => {
    const parent = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    const dir = join(parent, "models");
    try {
      let caught: unknown;
      try {
        ensureDataDir(dir, { create: false, className: "stack-models" });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(DataDirMissingError);
      const err = caught as DataDirMissingError;
      expect(err.className).toBe("stack-models");
      expect(err.path).toBe(dir);
      expect(err.message).toContain("stack-models");
      expect(err.message).toContain(dir);
      expect(existsSync(dir)).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test("names the path alone when no class is given", () => {
    const parent = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    const dir = join(parent, "gone");
    try {
      expect(() => ensureDataDir(dir, { create: false })).toThrow(DataDirMissingError);
      expect(existsSync(dir)).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  test("is a no-op when the directory exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    try {
      expect(() => ensureDataDir(dir, { create: false, className: "records" })).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("{ create: true } and no options behave exactly as before", () => {
    const parent = mkdtempSync(join(tmpdir(), "maipai-core-paths-"));
    try {
      ensureDataDir(join(parent, "a"), { create: true });
      ensureDataDir(join(parent, "b"), {});
      expect(existsSync(join(parent, "a"))).toBe(true);
      expect(existsSync(join(parent, "b"))).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
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

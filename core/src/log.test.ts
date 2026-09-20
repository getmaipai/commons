import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger } from "./log";

let dir: string;
afterEach(() => {
  if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

describe("createLogger", () => {
  test("appends lines to <dir>/<name>.log, creating the dir if missing", () => {
    dir = join(mkdtempSync(join(tmpdir(), "maipai-core-log-")), "nested", "logs");
    const logger = createLogger(dir, "app");
    logger.appendLine("hello");
    expect(readFileSync(join(dir, "app.log"), "utf8")).toContain("hello");
  });

  test("redacts every registered secret from a line before it's written", () => {
    dir = mkdtempSync(join(tmpdir(), "maipai-core-log-"));
    const logger = createLogger(dir, "app");
    logger.registerSecret("mps_secrettoken");
    logger.appendLine("key=mps_secrettoken");
    const written = readFileSync(join(dir, "app.log"), "utf8");
    expect(written).not.toContain("mps_secrettoken");
    expect(written).toContain("[REDACTED]");
  });

  test("rotates the file once it grows past maxBytes, pruning nothing yet within maxAgeDays", () => {
    dir = mkdtempSync(join(tmpdir(), "maipai-core-log-"));
    const logger = createLogger(dir, "app", { maxBytes: 100 });
    logger.appendLine("x".repeat(200));
    logger.appendLine("after rotation");
    const entries = readdirSync(dir);
    expect(entries.some((entry) => entry.startsWith("app.log."))).toBe(true);
    expect(readFileSync(join(dir, "app.log"), "utf8")).toContain("after rotation");
  });

  test("a write failure is swallowed, never thrown", () => {
    dir = mkdtempSync(join(tmpdir(), "maipai-core-log-"));
    // A file where the log's own directory should be forces every fs
    // call inside appendLine to fail.
    const blockedDir = join(dir, "blocked");
    writeFileSync(blockedDir, "not a directory");
    const logger = createLogger(blockedDir, "app");
    expect(() => logger.appendLine("never written")).not.toThrow();
  });

  test("installConsoleMirror is idempotent per logger name (survives being called twice, e.g. a hot reload)", () => {
    dir = mkdtempSync(join(tmpdir(), "maipai-core-log-"));
    const logger = createLogger(dir, `mirror-${Date.now()}`);
    const originalLog = console.log;
    try {
      logger.installConsoleMirror();
      logger.installConsoleMirror();
      console.log("after reload");
      const written = readFileSync(join(dir, readdirSync(dir).find((e) => e.endsWith(".log"))!), "utf8");
      expect(written).toContain("after reload");
    } finally {
      console.log = originalLog;
    }
  });
});

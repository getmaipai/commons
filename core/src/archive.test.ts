import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "bun";
import { extractArchive } from "./archive";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "maipai-core-archive-"));
}

function makeTarGz(root: string, files: Record<string, string>): string {
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(root, relPath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  const archivePath = `${root}.tar.gz`;
  const result = spawnSync(["tar", "-czf", archivePath, "-C", root, "."]);
  if (result.exitCode !== 0) throw new Error(`tar setup failed: ${result.stderr.toString()}`);
  return archivePath;
}

describe("extractArchive", () => {
  test("flattens a single top-level wrapper directory", async () => {
    const stage = tempDir();
    const archive = makeTarGz(join(stage, "src"), { "llama-b10797/llama-server": "binary" });
    const destDir = join(stage, "dest");
    try {
      await extractArchive(archive, destDir);
      expect(existsSync(join(destDir, "llama-server"))).toBe(true);
      expect(existsSync(join(destDir, "llama-b10797"))).toBe(false);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("merges entries directly when there's no single top-level directory", async () => {
    const stage = tempDir();
    const archive = makeTarGz(join(stage, "src"), { "a.txt": "a", "b.txt": "b" });
    const destDir = join(stage, "dest");
    try {
      await extractArchive(archive, destDir);
      expect(readFileSync(join(destDir, "a.txt"), "utf8")).toBe("a");
      expect(readFileSync(join(destDir, "b.txt"), "utf8")).toBe("b");
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("a second archive extracted into the same destDir merges alongside the first", async () => {
    const stage = tempDir();
    const first = makeTarGz(join(stage, "first"), { "first.txt": "one" });
    const second = makeTarGz(join(stage, "second"), { "second.txt": "two" });
    const destDir = join(stage, "dest");
    try {
      await extractArchive(first, destDir);
      await extractArchive(second, destDir);
      expect(readFileSync(join(destDir, "first.txt"), "utf8")).toBe("one");
      expect(readFileSync(join(destDir, "second.txt"), "utf8")).toBe("two");
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("rejects with the command's stderr when tar fails", async () => {
    const stage = tempDir();
    const missing = join(stage, "does-not-exist.tar.gz");
    try {
      await expect(extractArchive(missing, join(stage, "dest"))).rejects.toThrow(/tar/);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });
});

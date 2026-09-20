import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBackupCrypto } from "./backupCrypto";
import { createKeystore } from "./keystore";

process.env.MAIPAI_KEYSTORE_BACKEND = "file";

function tempSetup() {
  const dir = mkdtempSync(join(tmpdir(), "maipai-core-backupcrypto-"));
  const keystore = createKeystore({ keysDir: join(dir, "keys"), appId: "test-app" });
  return { dir, crypto: createBackupCrypto(keystore) };
}

describe("createBackupCrypto", () => {
  test("round-trips a real file's bytes", () => {
    const { dir, crypto } = tempSetup();
    try {
      const plainPath = join(dir, "plain.db");
      const encPath = join(dir, "backup.db.enc");
      const decPath = join(dir, "restored.db");
      writeFileSync(plainPath, "real household bytes");
      crypto.encryptFile(plainPath, encPath);
      crypto.decryptFile(encPath, decPath);
      expect(readFileSync(decPath, "utf8")).toBe("real household bytes");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the encrypted file never contains the plaintext", () => {
    const { dir, crypto } = tempSetup();
    try {
      const plainPath = join(dir, "plain.db");
      const encPath = join(dir, "backup.db.enc");
      writeFileSync(plainPath, "a very identifiable household secret string");
      crypto.encryptFile(plainPath, encPath);
      const encrypted = readFileSync(encPath, "utf8");
      expect(encrypted).not.toContain("a very identifiable household secret string");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a tampered archive fails GCM's tag check rather than restoring corrupted bytes", () => {
    const { dir, crypto } = tempSetup();
    try {
      const plainPath = join(dir, "plain.db");
      const encPath = join(dir, "backup.db.enc");
      const decPath = join(dir, "restored.db");
      writeFileSync(plainPath, "real household bytes");
      crypto.encryptFile(plainPath, encPath);
      const raw = readFileSync(encPath);
      raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff; // flip a ciphertext byte
      writeFileSync(encPath, raw);
      expect(() => crypto.decryptFile(encPath, decPath)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("two backup-crypto instances at different key names never decrypt each other's archives", () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-core-backupcrypto-"));
    try {
      const keystore = createKeystore({ keysDir: join(dir, "keys"), appId: "test-app" });
      const a = createBackupCrypto(keystore, "backup-a");
      const b = createBackupCrypto(keystore, "backup-b");
      const plainPath = join(dir, "plain.db");
      const encPath = join(dir, "backup.db.enc");
      const decPath = join(dir, "restored.db");
      writeFileSync(plainPath, "real household bytes");
      a.encryptFile(plainPath, encPath);
      expect(() => b.decryptFile(encPath, decPath)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

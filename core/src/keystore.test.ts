import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createKeystore,
  dpapiProtectInvocation,
  dpapiUnprotectInvocation,
  keychainWriteCommand,
  KeystoreProtectionFailedError,
  KeystoreUnavailableError,
} from "./keystore";

const originalBackend = process.env.MAIPAI_KEYSTORE_BACKEND;
process.env.MAIPAI_KEYSTORE_BACKEND = "file";
afterEach(() => {
  if (originalBackend === undefined) delete process.env.MAIPAI_KEYSTORE_BACKEND;
  else process.env.MAIPAI_KEYSTORE_BACKEND = originalBackend;
  process.env.MAIPAI_KEYSTORE_BACKEND = "file"; // keep forced for the whole file
});

function tempKeystore() {
  const keysDir = mkdtempSync(join(tmpdir(), "maipai-core-keystore-"));
  return { keysDir, keystore: createKeystore({ keysDir, appId: "test-app" }) };
}

describe("getOrCreateHexKey (file backend)", () => {
  test("creates a key on first call and returns the same one afterward", () => {
    const { keysDir, keystore } = tempKeystore();
    try {
      const first = keystore.getOrCreateHexKey("secrets_key");
      const second = keystore.getOrCreateHexKey("secrets_key");
      expect(first).toBe(second);
      expect(first).toMatch(/^[0-9a-fA-F]{64}$/);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("respects a requested byte length", () => {
    const { keysDir, keystore } = tempKeystore();
    try {
      expect(keystore.getOrCreateHexKey("short_key", 16)).toMatch(/^[0-9a-fA-F]{32}$/);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("two keystores rooted at different directories never share a key", () => {
    const a = tempKeystore();
    const b = tempKeystore();
    try {
      expect(a.keystore.getOrCreateHexKey("k")).not.toBe(b.keystore.getOrCreateHexKey("k"));
    } finally {
      rmSync(a.keysDir, { recursive: true, force: true });
      rmSync(b.keysDir, { recursive: true, force: true });
    }
  });
});

describe("keychain provisioning marker", () => {
  test("a key that was never marked reports as not provisioned", () => {
    const { keysDir, keystore } = tempKeystore();
    try {
      expect(keystore.wasKeychainProvisioned(`never-marked-${Date.now()}`)).toBe(false);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("marking a key makes it report as provisioned, and creates keysDir if missing", () => {
    const keysDir = join(mkdtempSync(join(tmpdir(), "maipai-core-keystore-")), "nested");
    const keystore = createKeystore({ keysDir, appId: "test-app" });
    try {
      const name = `test-key-${Date.now()}`;
      expect(keystore.wasKeychainProvisioned(name)).toBe(false);
      keystore.markKeychainProvisioned(name);
      expect(existsSync(keysDir)).toBe(true);
      expect(keystore.wasKeychainProvisioned(name)).toBe(true);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });
});

describe("key material never rides on an argv element or in the script text", () => {
  test("keychainWriteCommand's own return value carries the secret (it's stdin content, not an argv element)", () => {
    const hex = "deadbeef1234";
    const command = keychainWriteCommand("test-app", "com.test-app.keystore.test-key", hex);
    expect(command).toContain(hex);
    expect(command).toContain("add-generic-password");
  });

  test("dpapiProtectInvocation never puts the secret in args or the script text - only in env", () => {
    const hex = "deadbeef1234";
    const { args, input, env } = dpapiProtectInvocation(hex);
    expect(args.join(" ")).not.toContain(hex);
    expect(input).not.toContain(hex);
    expect(env.MAIPAI_KEYSTORE_VALUE).toBe(hex);
  });

  test("dpapiUnprotectInvocation never puts the blob in args or the script text - only in env", () => {
    const blob = "dpapi:not-real-ciphertext-just-a-test-fixture";
    const { args, input, env } = dpapiUnprotectInvocation(blob);
    expect(args.join(" ")).not.toContain(blob);
    expect(input).not.toContain(blob);
    expect(env.MAIPAI_KEYSTORE_VALUE).toBe(blob.slice("dpapi:".length));
  });

  test("the PowerShell script text itself is fixed - no interpolation site for any future caller to reintroduce", () => {
    const { input: protectScript } = dpapiProtectInvocation("anything");
    const { input: unprotectScript } = dpapiUnprotectInvocation("dpapi:anything");
    expect(protectScript).toContain("$env:MAIPAI_KEYSTORE_VALUE");
    expect(unprotectScript).toContain("$env:MAIPAI_KEYSTORE_VALUE");
  });
});

describe("DPAPI protection failure on Windows never falls back to storing an unprotected key", () => {
  test("getOrCreateHexKey throws KeystoreProtectionFailedError rather than writing the raw hex key when DPAPI itself fails", () => {
    const { keysDir, keystore } = tempKeystore();
    const originalPlatform = process.platform;
    // powershell isn't on this (real) machine's PATH under test, so
    // faking win32 makes the real dpapiProtect() call fail exactly the
    // way it would on a Windows box with PowerShell blocked/unavailable.
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      expect(() => keystore.getOrCreateHexKey("windows_key")).toThrow(KeystoreProtectionFailedError);
      // And critically: no file was left behind carrying the plaintext key.
      expect(existsSync(join(keysDir, "windows_key.key"))).toBe(false);
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      rmSync(keysDir, { recursive: true, force: true });
    }
  });
});

describe("KeystoreUnavailableError", () => {
  test("names the key and explains why it refuses to mint a replacement", () => {
    const err = new KeystoreUnavailableError("secret_pepper");
    expect(err.message).toContain("secret_pepper");
    expect(err.message).toContain("Refusing to generate a replacement key");
  });
});

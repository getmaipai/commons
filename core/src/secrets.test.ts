import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKeystore } from "./keystore";
import { createSecrets } from "./secrets";

process.env.MAIPAI_KEYSTORE_BACKEND = "file";

function tempSecrets() {
  const keysDir = mkdtempSync(join(tmpdir(), "maipai-core-secrets-"));
  const keystore = createKeystore({ keysDir, appId: "test-app" });
  const secrets = createSecrets({ keystore, keyName: "secrets_key", envKeyVar: "TEST_SECRETS_KEY" });
  return { keysDir, secrets };
}

afterEach(() => {
  delete process.env.TEST_SECRETS_KEY;
});

describe("createSecrets", () => {
  test("round-trips a real value", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      const blob = secrets.encrypt("hf_aVeryRealLookingToken1234567890");
      expect(secrets.decrypt(blob)).toBe("hf_aVeryRealLookingToken1234567890");
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("the ciphertext never contains the plaintext", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      const plain = "hf_aVeryRealLookingToken1234567890";
      const blob = secrets.encrypt(plain);
      expect(blob).not.toContain(plain);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("two encryptions of the same plaintext produce different ciphertext (a fresh random IV each time)", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      const a = secrets.encrypt("same value");
      const b = secrets.encrypt("same value");
      expect(a).not.toBe(b);
      expect(secrets.decrypt(a)).toBe("same value");
      expect(secrets.decrypt(b)).toBe("same value");
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("decrypting a tampered blob throws rather than returning corrupted plaintext", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      const blob = secrets.encrypt("a real secret");
      const [iv, tag] = blob.split(":");
      // Swap in different ciphertext bytes - GCM's auth tag must reject
      // this, not silently decrypt to garbage.
      const tampered = `${iv}:${tag}:${Buffer.from("tampered garbage").toString("base64")}`;
      expect(() => secrets.decrypt(tampered)).toThrow();
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("decrypting a malformed blob throws a clear error instead of crashing obscurely", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      expect(() => secrets.decrypt("not-a-real-blob")).toThrow(/malformed ciphertext/);
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("respects an operator-set env key over the keystore-generated one", () => {
    const { keysDir, secrets } = tempSecrets();
    try {
      process.env.TEST_SECRETS_KEY = "11".repeat(32); // 64 hex chars = 32 bytes
      secrets.__resetKeyCacheForTests();
      const blob = secrets.encrypt("keyed by env");
      expect(secrets.decrypt(blob)).toBe("keyed by env");
    } finally {
      rmSync(keysDir, { recursive: true, force: true });
    }
  });

  test("two independent instances never share a key cache", () => {
    const a = tempSecrets();
    const b = tempSecrets();
    try {
      const blob = a.secrets.encrypt("only decryptable by a");
      expect(() => b.secrets.decrypt(blob)).toThrow();
    } finally {
      rmSync(a.keysDir, { recursive: true, force: true });
      rmSync(b.keysDir, { recursive: true, force: true });
    }
  });
});

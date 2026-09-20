// Reversible at-rest encryption for a real credential a product stores
// (an OAuth refresh token, an app password). Unlike a one-way PIN
// hasher, a credential like this has to be decryptable to actually use
// it, so this uses AES-256-GCM (CLAUDE.md > Credentials and secrets).
//
// Key management: an operator-set env var (passed in as `envKeyVar`)
// takes precedence so the key can live outside the data directory
// entirely; otherwise the given keystore keeps a generated one outside
// the database, so a fresh install works with no manual setup and a
// stolen database never carries its own key. NEVER log or return the
// plaintext to a client - a caller resolving a secret-shaped value for a
// person-facing response must redact it first; this module is only for
// the internal call sites that genuinely need the real value (e.g.
// attaching it to an outbound request).
import { aesGcmDecrypt, aesGcmEncrypt } from "./aesGcm";
import type { Keystore } from "./keystore";

export interface SecretsOptions {
  keystore: Keystore;
  /** The keystore key's own name, e.g. "secrets_key". */
  keyName: string;
  /** An env var (hex, 32 bytes) that overrides the keystore-held key
   * when set - lets the key live outside the data directory entirely. */
  envKeyVar?: string;
}

export interface Secrets {
  encrypt(plain: string): string;
  decrypt(blob: string): string;
  /** Test-only: forces the next encrypt/decrypt to re-resolve the key
   * (picking up a changed env key or a fresh keystore file) instead of
   * reusing the cached one from an earlier call. */
  __resetKeyCacheForTests(): void;
}

export function createSecrets(options: SecretsOptions): Secrets {
  const { keystore, keyName, envKeyVar } = options;
  let cachedKey: Buffer | null = null;

  function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    const envKey = envKeyVar ? process.env[envKeyVar] : undefined;
    if (envKey && /^[0-9a-fA-F]{64}$/.test(envKey)) {
      cachedKey = Buffer.from(envKey, "hex");
      return cachedKey;
    }
    cachedKey = Buffer.from(keystore.getOrCreateHexKey(keyName, 32), "hex");
    return cachedKey;
  }

  return {
    // Serialized as base64 iv:authTag:ciphertext, three fixed-shape
    // parts so decrypt can split unambiguously (the first two are
    // constant length; only the payload varies).
    encrypt(plain: string): string {
      const { iv, authTag, ciphertext } = aesGcmEncrypt(getKey(), Buffer.from(plain, "utf8"));
      return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
    },
    decrypt(blob: string): string {
      const [ivB64, tagB64, dataB64] = blob.split(":");
      if (!ivB64 || !tagB64 || !dataB64) throw new Error("decrypt: malformed ciphertext");
      return aesGcmDecrypt(getKey(), Buffer.from(ivB64, "base64"), Buffer.from(tagB64, "base64"), Buffer.from(dataB64, "base64")).toString(
        "utf8",
      );
    },
    __resetKeyCacheForTests(): void {
      cachedKey = null;
    },
  };
}

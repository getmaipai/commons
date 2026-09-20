// Backup encryption: AES-256-GCM, keyed from a keystore, never inside
// the archive itself. Format: [12-byte IV][16-byte auth tag][ciphertext].
// A dedicated key (passed by name), not necessarily the same key a
// product's PIN/password pepper or its other secrets use: a compromised
// or rotated pepper must never also invalidate every existing backup,
// and vice versa.
import { readFileSync, writeFileSync } from "node:fs";
import { AES_GCM_AUTH_TAG_BYTES, AES_GCM_IV_BYTES, aesGcmDecrypt, aesGcmEncrypt } from "./aesGcm";
import type { Keystore } from "./keystore";

export interface BackupCrypto {
  encryptFile(plainPath: string, outPath: string): void;
  decryptFile(inPath: string, outPath: string): void;
}

export function createBackupCrypto(keystore: Keystore, keyName = "backup"): BackupCrypto {
  return {
    encryptFile(plainPath: string, outPath: string): void {
      const key = Buffer.from(keystore.getOrCreateHexKey(keyName), "hex");
      const { iv, authTag, ciphertext } = aesGcmEncrypt(key, readFileSync(plainPath));
      writeFileSync(outPath, Buffer.concat([iv, authTag, ciphertext]), { mode: 0o600 });
    },
    decryptFile(inPath: string, outPath: string): void {
      const key = Buffer.from(keystore.getOrCreateHexKey(keyName), "hex");
      const raw = readFileSync(inPath);
      const iv = raw.subarray(0, AES_GCM_IV_BYTES);
      const authTag = raw.subarray(AES_GCM_IV_BYTES, AES_GCM_IV_BYTES + AES_GCM_AUTH_TAG_BYTES);
      const ciphertext = raw.subarray(AES_GCM_IV_BYTES + AES_GCM_AUTH_TAG_BYTES);
      // A tampered or corrupted archive fails GCM's tag check inside
      // aesGcmDecrypt, before any bytes are written to outPath.
      writeFileSync(outPath, aesGcmDecrypt(key, iv, authTag, ciphertext), { mode: 0o600 });
    },
  };
}

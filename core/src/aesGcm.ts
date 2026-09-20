// The one AES-256-GCM encrypt/decrypt primitive every product's own
// at-rest secret (secrets.ts's tokens, backupCrypto.ts's archives) is
// built on - each keeps its own serialization (a colon-joined base64
// string, a concatenated binary file), but the actual cipher call and
// its correctness (IV length, auth-tag check ordering) is declared once.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const AES_GCM_IV_BYTES = 12;
export const AES_GCM_AUTH_TAG_BYTES = 16;

export interface AesGcmCiphertext {
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

export function aesGcmEncrypt(key: Buffer, plaintext: Buffer): AesGcmCiphertext {
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, authTag: cipher.getAuthTag(), ciphertext };
}

/** Throws if `authTag` doesn't match (a tampered or corrupted
 * ciphertext) - decipher.final() throws before any plaintext is
 * returned. */
export function aesGcmDecrypt(key: Buffer, iv: Buffer, authTag: Buffer, ciphertext: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

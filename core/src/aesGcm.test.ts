import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { aesGcmDecrypt, aesGcmEncrypt } from "./aesGcm";

describe("aesGcmEncrypt / aesGcmDecrypt", () => {
  test("round-trips real bytes", () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from("a real secret value");
    const { iv, authTag, ciphertext } = aesGcmEncrypt(key, plaintext);
    expect(aesGcmDecrypt(key, iv, authTag, ciphertext)).toEqual(plaintext);
  });

  test("two encryptions of the same plaintext use different IVs and produce different ciphertext", () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from("same value");
    const a = aesGcmEncrypt(key, plaintext);
    const b = aesGcmEncrypt(key, plaintext);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  test("a tampered ciphertext fails the auth tag check rather than decrypting to garbage", () => {
    const key = randomBytes(32);
    const { iv, authTag, ciphertext } = aesGcmEncrypt(key, Buffer.from("real bytes"));
    ciphertext[0] = ciphertext[0]! ^ 0xff;
    expect(() => aesGcmDecrypt(key, iv, authTag, ciphertext)).toThrow();
  });

  test("the wrong key fails the auth tag check", () => {
    const { iv, authTag, ciphertext } = aesGcmEncrypt(randomBytes(32), Buffer.from("real bytes"));
    expect(() => aesGcmDecrypt(randomBytes(32), iv, authTag, ciphertext)).toThrow();
  });
});

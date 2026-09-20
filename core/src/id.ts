import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A random base36-alphabet string of the given length, drawn from
 * crypto bytes - the one primitive every product's own record-id
 * generators (`person-<suffix>`, `job-<suffix>`, and the rest) build on,
 * so it's declared once instead of hand-rolled per product. */
export function randomSuffix(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** `<prefix>-<randomSuffix(length)>` - the shape almost every spec-typed
 * or hub-internal id in a product follows. A product's own id module
 * still owns which prefix means what (and which ones must match a spec
 * schema's own pattern); this is just the one place the template lives. */
export function newPrefixedId(prefix: string, length = 10): string {
  return `${prefix}-${randomSuffix(length)}`;
}

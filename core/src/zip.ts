// A dependency-free stored (uncompressed) ZIP writer: enough for a
// downloadable diagnostics bundle or a small export, without pulling in
// a compression library for content that's already small text. Neither
// product's own diagnostics report is generic (each reads its own DB,
// health list or settings), only this byte-level format is.
const encoder = new TextEncoder();

export interface ZipEntry {
  name: string;
  text: string;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}

function u32(value: number): Uint8Array {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/** Builds a valid ZIP archive holding each entry's text, uncompressed
 * (method 0, "stored"). Every standard unzip tool reads a stored entry
 * the same as a deflated one. */
export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const body = encoder.encode(entry.text);
    const crc = crc32(body);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0),
      name, body,
    ]);
    locals.push(local);
    central.push(
      concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(body.length), u32(body.length), u16(name.length), u16(0),
        u16(0), u16(0), u16(0), u32(0), u32(offset), name,
      ]),
    );
    offset += local.length;
  }
  const directory = concat(central);
  return concat([
    ...locals,
    directory,
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(directory.length), u32(offset), u16(0),
  ]);
}

// MINOR-SEARCH-01e-1: the one definition of how a synced blocked-site list file is read. The catalog's re-pin script
// counts entries with it (the pin's `entries`) and the hub's sync job counts again with it, and the two counts must
// be equal, so the rule lives here once. TS only; both consumers are TypeScript.
//
// Two formats: `hosts` (lines such as `0.0.0.0 example.com`, the first field is an address) and `domains` (one name
// per line). `#` starts a comment. A line is skipped, and counted by reason, when it is longer than 253 characters,
// when its name is not a valid hostname (fewer than two labels, a bad label, bad characters) or when the name is
// only an IP address. Names are lowercased, a trailing dot is dropped, and non-ASCII names are punycoded.
import { domainToASCII } from "node:url";

export type HostListFormat = "hosts" | "domains";

export interface HostListParse {
  /** Unique valid names, in first-seen order. */
  hosts: string[];
  /** hosts.length: the number that must equal the pin's `entries`. */
  entries: number;
  skipped: { tooLong: number; invalid: number; ipOnly: number };
}

export const HOST_LINE_MAX = 253;
const LABEL = /^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** True when `name` is a syntactically valid multi-label hostname (already lowercase ASCII). */
export function isValidHostname(name: string): boolean {
  if (name.length === 0 || name.length > HOST_LINE_MAX) return false;
  const labels = name.split(".");
  return labels.length >= 2 && labels.every((label) => LABEL.test(label)) && !/^\d+$/.test(labels[labels.length - 1]!);
}

export function parseHostList(text: string, format: HostListFormat): HostListParse {
  const seen = new Set<string>();
  const hosts: string[] = [];
  const skipped = { tooLong: 0, invalid: 0, ipOnly: 0 };
  for (const raw of text.split(/\r?\n/)) {
    const hash = raw.indexOf("#");
    const line = (hash === -1 ? raw : raw.slice(0, hash)).trim();
    if (line.length > HOST_LINE_MAX + 40) {
      // Longer than a name plus an address could ever be; counted once, never split.
      skipped.tooLong += 1;
      continue;
    }
    if (line === "") continue;
    const fields = line.split(/\s+/);
    let candidate: string | undefined;
    if (format === "hosts") {
      if (fields.length < 2) {
        skipped.invalid += 1;
        continue;
      }
      candidate = fields[1];
    } else {
      candidate = fields[0];
    }
    if (candidate === undefined) continue;
    if (candidate.length > HOST_LINE_MAX) {
      skipped.tooLong += 1;
      continue;
    }
    let name = candidate.toLowerCase();
    if (name.endsWith(".")) name = name.slice(0, -1);
    if (IPV4.test(name) || (name.includes(":") && /^[0-9a-f:.]+$/.test(name))) {
      skipped.ipOnly += 1;
      continue;
    }
    if (/[^\x00-\x7f]/.test(name)) name = domainToASCII(name);
    if (!isValidHostname(name)) {
      skipped.invalid += 1;
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    hosts.push(name);
  }
  return { hosts, entries: hosts.length, skipped };
}

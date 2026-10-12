import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOST_LINE_MAX, isValidHostname, parseHostList, type HostListFormat } from "../../interpreters/ts/hostList.js";

const cases = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "host-list", "cases.json"), "utf8")) as {
  name: string; format: HostListFormat; text: string; hosts: string[]; skipped: { tooLong: number; invalid: number; ipOnly: number };
}[];

describe("parseHostList", () => {
  for (const c of cases) {
    test(c.name, () => {
      const parsed = parseHostList(c.text, c.format);
      expect(parsed.hosts).toEqual(c.hosts);
      expect(parsed.entries).toBe(c.hosts.length);
      expect(parsed.skipped).toEqual(c.skipped);
    });
  }

  test("a name longer than 253 characters is skipped and counted, not matched", () => {
    const long = `${"a".repeat(60)}.`.repeat(5) + "com";
    expect(long.length).toBeGreaterThan(HOST_LINE_MAX);
    const parsed = parseHostList(`${long}\nok.example\n`, "domains");
    expect(parsed.hosts).toEqual(["ok.example"]);
    expect(parsed.skipped.tooLong).toBe(1);
  });

  test("a runaway line is skipped without being split", () => {
    const parsed = parseHostList(`0.0.0.0 ${"x".repeat(10_000)}.com\n0.0.0.0 ok.example\n`, "hosts");
    expect(parsed.hosts).toEqual(["ok.example"]);
    expect(parsed.skipped.tooLong).toBe(1);
  });

  test("a long trailing comment does not cost the entry, and a host with a port is invalid, not an address", () => {
    const parsed = parseHostList(`0.0.0.0 ok.example # ${"c".repeat(400)}\nhost.example:8080\n`, "hosts");
    expect(parsed.hosts).toEqual(["ok.example"]);
    expect(parsed.skipped).toEqual({ tooLong: 0, invalid: 1, ipOnly: 0 });
  });

  test("hostname rules", () => {
    expect(isValidHostname("a.co")).toBe(true);
    expect(isValidHostname("localhost")).toBe(false);
    expect(isValidHostname("-a.com")).toBe(false);
    expect(isValidHostname("a..com")).toBe(false);
    expect(isValidHostname("1.2")).toBe(false);
  });
});

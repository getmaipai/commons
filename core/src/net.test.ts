import { describe, expect, test } from "bun:test";
import { isHouseholdNetworkHost, type HouseholdHostLookup } from "./net";

const lookupTo = (address: string, family = address.includes(":") ? 6 : 4): HouseholdHostLookup =>
  async () => [{ address, family }];

const states: boolean[] = [false, true];

describe("isHouseholdNetworkHost", () => {
  test.each(states)("home network addresses pass with allowTailnet=%s", async (allowTailnet) => {
    for (const [host, family] of [
      ["10.2.3.4", 4],
      ["172.16.0.1", 4],
      ["172.31.255.254", 4],
      ["192.168.1.2", 4],
      ["169.254.10.20", 4],
      ["fd12:3456::1", 6],
      ["fe80::1", 6],
      ["::ffff:192.168.1.2", 6],
    ] as const) {
      expect(await isHouseholdNetworkHost(host, { allowTailnet })).toBe(true);
      expect(family).toBe(host.includes(":") ? 6 : 4);
    }
    expect(await isHouseholdNetworkHost("printer.local", { allowTailnet }, lookupTo("192.168.1.8"))).toBe(true);
    expect(await isHouseholdNetworkHost("nas.home.arpa", { allowTailnet }, lookupTo("fd12:3456::2"))).toBe(true);
  });

  test.each(states)("tailnet addresses follow the flag allowTailnet=%s", async (allowTailnet) => {
    expect(await isHouseholdNetworkHost("100.64.0.5", { allowTailnet })).toBe(allowTailnet);
    expect(await isHouseholdNetworkHost("100.127.255.254", { allowTailnet })).toBe(allowTailnet);
    expect(await isHouseholdNetworkHost("fd7a:115c:a1e0::5", { allowTailnet })).toBe(allowTailnet);
    expect(await isHouseholdNetworkHost("box.example.ts.net", { allowTailnet }, lookupTo("100.64.0.9"))).toBe(allowTailnet);
    expect(await isHouseholdNetworkHost("box.example.ts.net", { allowTailnet }, lookupTo("fd7a:115c:a1e0::9"))).toBe(allowTailnet);
  });

  test.each(states)("public and documentation addresses always fail with allowTailnet=%s", async (allowTailnet) => {
    expect(await isHouseholdNetworkHost("192.0.2.10", { allowTailnet })).toBe(false);
    expect(await isHouseholdNetworkHost("::ffff:8.8.8.8", { allowTailnet })).toBe(false);
    expect(await isHouseholdNetworkHost("8.8.8.8", { allowTailnet })).toBe(false);
    expect(await isHouseholdNetworkHost("example.com", { allowTailnet }, lookupTo("93.184.216.34"))).toBe(false);
    expect(await isHouseholdNetworkHost("printer.local", { allowTailnet }, lookupTo("8.8.8.8"))).toBe(false);
    expect(await isHouseholdNetworkHost("box.example.ts.net", { allowTailnet }, lookupTo("8.8.8.8"))).toBe(false);
  });

  test("refuses a name with mixed allowed and public DNS answers", async () => {
    const lookup: HouseholdHostLookup = async () => [
      { address: "192.168.1.10", family: 4 },
      { address: "8.8.8.8", family: 4 },
    ];
    expect(await isHouseholdNetworkHost("printer.local", {}, lookup)).toBe(false);
  });

  test("the default is tailnet off", async () => {
    expect(await isHouseholdNetworkHost("100.64.0.5")).toBe(false);
    expect(await isHouseholdNetworkHost("100.64.0.5", { allowTailnet: true })).toBe(true);
    expect(await isHouseholdNetworkHost("::ffff:100.64.0.5")).toBe(false);
    expect(await isHouseholdNetworkHost("::ffff:100.64.0.5", { allowTailnet: true })).toBe(true);
  });

  test("DNS failure, empty answers and malformed hosts fail closed", async () => {
    expect(await isHouseholdNetworkHost("printer.local", {}, async () => [])).toBe(false);
    expect(await isHouseholdNetworkHost("printer.local", {}, async () => { throw new Error("DNS failed"); })).toBe(false);
    expect(await isHouseholdNetworkHost("not..valid.local", {}, lookupTo("192.168.1.1"))).toBe(false);
    expect(await isHouseholdNetworkHost("fe80::1%en0")).toBe(false);
  });
});

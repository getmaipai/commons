import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export interface HouseholdNetworkOptions {
  allowTailnet?: boolean;
}

export type HouseholdHostLookup = (hostname: string) => Promise<Array<{ address: string; family: number }> | { address: string; family: number }>;

const homeV4 = new BlockList();
for (const [range, prefix] of [["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16], ["169.254.0.0", 16]] as const) {
  homeV4.addSubnet(range, prefix, "ipv4");
}
const tailnetV4 = new BlockList();
tailnetV4.addSubnet("100.64.0.0", 10, "ipv4");
const homeV6 = new BlockList();
homeV6.addSubnet("fc00::", 7, "ipv6");
homeV6.addSubnet("fe80::", 10, "ipv6");
const tailnetV6 = new BlockList();
tailnetV6.addSubnet("fd7a:115c:a1e0::", 48, "ipv6");

function isInRange(address: string, family: number, ranges: BlockList): boolean {
  const mappedV4 = address.toLowerCase().match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedV4) return isInRange(mappedV4[1]!, 4, ranges);
  if (isIP(address) !== family) return false;
  return ranges.check(address, family === 4 ? "ipv4" : "ipv6");
}

function isHomeAddress(address: string): boolean {
  return isInRange(address, 4, homeV4) || (isInRange(address, 6, homeV6) && !isInRange(address, 6, tailnetV6));
}

function isTailnetAddress(address: string): boolean {
  return isInRange(address, 4, tailnetV4) || isInRange(address, 6, tailnetV6);
}

/** True only for household-network addresses, with Tailscale ranges opt-in. */
export async function isHouseholdNetworkHost(
  host: string,
  { allowTailnet = false }: HouseholdNetworkOptions = {},
  hostLookup: HouseholdHostLookup = (hostname) => lookup(hostname, { all: true }),
): Promise<boolean> {
  const normalized = host.trim().replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized.includes("%")) return false;

  const family = isIP(normalized);
  if (family) {
    return isHomeAddress(normalized) || (allowTailnet && isTailnetAddress(normalized));
  }

  const isTailnetName = normalized.endsWith(".ts.net");
  const isHomeName = normalized.endsWith(".local") || normalized.endsWith(".home.arpa");
  if ((!isHomeName && !(allowTailnet && isTailnetName)) || normalized.includes("..")) return false;

  try {
    const result = await hostLookup(normalized);
    const addresses = Array.isArray(result) ? result : [result];
    if (addresses.length === 0) return false;
    return addresses.every(({ address }) => {
      if (isTailnetName) return allowTailnet && isTailnetAddress(address);
      return isHomeAddress(address);
    });
  } catch {
    return false;
  }
}

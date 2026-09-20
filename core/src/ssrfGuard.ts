// Refuses a fetch whose target resolves to a private, loopback, or
// link-local address, before a real request is ever attempted - a
// package or plugin's own outbound fetch has no business landing on the
// household's own LAN (the router admin page, another device's control
// panel, a service with no auth because it trusts "anything on this
// network"). A product's own permissioned paths for reaching household
// devices are the real way to do that; a generic fetch step is not one
// of them.
//
// A known, accepted gap, not a silent one: this checks the hostname's
// resolved address BEFORE the real request, not the address the
// underlying TCP connection actually lands on - a DNS answer that
// changes between this check and the real fetch (DNS rebinding) is not
// caught. Closing that fully needs a custom resolver/socket hook tied
// directly into the fetch call; the live threat this catches is a bug in
// first-party code reaching an internal address by mistake, not a
// hostile actor deliberately racing a DNS TTL.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface DnsLookup {
  (hostname: string): Promise<{ address: string; family: number }>;
}

export function isCgnatIpv4(a: number, b: number): boolean {
  return a === 100 && b >= 64 && b <= 127; // 100.64.0.0/10
}

export function isPrivateOrLoopbackIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b! >= 16 && b! <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 0) return true; // 0.0.0.0/8
  // 100.64.0.0/10 (CGNAT/Tailscale): a hub's own tailnet address, or
  // another device's, sits in this range too.
  if (isCgnatIpv4(a!, b!)) return true;
  return false;
}

// ::ffff:a.b.c.d (an IPv4-mapped address, the form a DNS lookup can
// legitimately return for an AAAA-mapped A record) reports family 6 from
// isIP() - without unwrapping it, the entire ::ffff:0:0/96 range would
// sail through as "public" while actually naming a private, loopback, or
// link-local IPv4 target underneath.
const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;

function isPrivateOrLoopbackIp(ip: string, family: number): boolean {
  if (family === 4) return isPrivateOrLoopbackIpv4(ip);
  const lower = ip.toLowerCase();
  const mapped = lower.match(IPV4_MAPPED_RE);
  if (mapped) return isPrivateOrLoopbackIpv4(mapped[1]!);
  // Plain IPv6: ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local).
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  return false;
}

export class SsrfBlockedError extends Error {
  constructor(host: string) {
    super(`refusing to fetch ${host}: resolves to a private, loopback, or link-local address`);
    this.name = "SsrfBlockedError";
  }
}

/** Throws SsrfBlockedError if `hostname` (already extracted from the
 * request URL, never re-parsed here) is, or resolves to, a private,
 * loopback, or link-local address. A bare IP literal is checked
 * directly; a real hostname is resolved via DNS first (a real lookup by
 * default; `dnsLookup` is a test-only override). */
export async function assertNotPrivateHost(hostname: string, dnsLookup: DnsLookup = lookup): Promise<void> {
  // new URL("http://[::1]/").hostname keeps its brackets ("[::1]"),
  // which isIP() doesn't recognize at all - every real IPv6-literal
  // target, private or legitimately public, would otherwise fall
  // through to a DNS lookup that fails with ENOTFOUND rather than being
  // correctly allowed or blocked. Bracket stripping only ever affects an
  // IPv6 literal's own delimiter syntax; it never changes what a real
  // hostname (never bracketed) resolves to.
  const bareHost = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const literalFamily = isIP(bareHost);
  if (literalFamily) {
    if (isPrivateOrLoopbackIp(bareHost, literalFamily)) throw new SsrfBlockedError(hostname);
    return;
  }
  if (hostname === "localhost") throw new SsrfBlockedError(hostname);
  const { address, family } = await dnsLookup(hostname);
  if (isPrivateOrLoopbackIp(address, family)) throw new SsrfBlockedError(hostname);
}

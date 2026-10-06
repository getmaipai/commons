// Shared outbound URL guard. Resolve once per hop, reject non-public targets,
// and connect to that exact address while preserving the URL hostname for Host
// and TLS SNI. Callers must use guardedFetch rather than checking then fetch().
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";

export interface DnsLookup {
  (hostname: string): Promise<{ address: string; family: number }>;
}

export function isCgnatIpv4(a: number, b: number): boolean {
  return a === 100 && b >= 64 && b <= 127;
}

function parseIpv4(ip: string): number[] | null {
  // Node's URL parser normalizes legacy decimal, octal and hexadecimal IPv4
  // spellings before they reach this function. DNS answers are canonical too.
  if (isIP(ip) !== 4) return null;
  return ip.split(".").map(Number);
}

export function isPrivateOrLoopbackIpv4(ip: string): boolean {
  const parts = parseIpv4(ip);
  if (!parts) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b! >= 64 && b! <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b! >= 16 && b! <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a! >= 224) return true; // multicast and reserved/broadcast space
  return false;
}

function embeddedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  const dottedMapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedMapped) return dottedMapped[1]!;
  const bytes = ipv6Bytes(lower);
  if (!bytes) return null;
  // IPv4-mapped ::ffff:0:0/96, including canonical hexadecimal spellings.
  if (bytes.slice(0, 10).every((value) => value === 0) && bytes[10] === 0xff && bytes[11] === 0xff) return bytes.slice(12).join(".");
  // 64:ff9b::/96: final 32 bits are the IPv4 address.
  if (bytes[0] === 0 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && bytes.slice(4, 12).every((value) => value === 0)) return bytes.slice(12).join(".");
  // 64:ff9b:1::/48: RFC 8215's local-use prefix, IPv4 in the final 32 bits.
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && bytes[4] === 0 && bytes[5] === 1) return bytes.slice(12).join(".");
  // 6to4 (2002::/16) stores the IPv4 endpoint in bytes 2..5.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return bytes.slice(2, 6).join(".");
  return null;
}

function ipv6Bytes(ip: string): number[] | null {
  if (ip.includes(".")) {
    const splitAt = ip.lastIndexOf(":");
    const tail = ip.slice(splitAt + 1);
    const octets = parseIpv4(tail);
    if (!octets || splitAt < 0) return null;
    ip = `${ip.slice(0, splitAt)}:${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const words = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  if (words.length !== 8 || words.some((word) => !/^[\da-f]{1,4}$/.test(word))) return null;
  return words.flatMap((word) => {
    const n = parseInt(word, 16);
    return [n >> 8, n & 0xff];
  });
}

function isPrivateOrLoopbackIp(ip: string, family: number): boolean {
  if (family === 4 || isIP(ip) === 4) return isPrivateOrLoopbackIpv4(ip);
  const lower = ip.toLowerCase();
  const embedded = embeddedIpv4(lower);
  if (embedded) return isPrivateOrLoopbackIpv4(embedded);
  if (lower === "::" || lower === "::1") return true;
  if (/^(fc|fd)/.test(lower)) return true; // ULA
  if (/^fe[89ab]/.test(lower)) return true; // link-local
  if (/^ff/.test(lower)) return true; // multicast
  return false;
}

export class SsrfBlockedError extends Error {
  constructor(host: string) {
    super(`refusing to fetch ${host}: resolves to a non-public address`);
    this.name = "SsrfBlockedError";
  }
}

export interface GuardedTarget {
  hostname: string;
  address: string;
  family: number;
}

/** Resolve and validate once. The returned address is the one guardedFetch uses. */
export async function resolvePublicTarget(hostname: string, dnsLookup: DnsLookup = lookup): Promise<GuardedTarget> {
  const bareHost = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const literalFamily = isIP(bareHost);
  if (literalFamily) {
    if (isPrivateOrLoopbackIp(bareHost, literalFamily)) throw new SsrfBlockedError(hostname);
    return { hostname: bareHost, address: bareHost, family: literalFamily };
  }
  if (hostname.toLowerCase() === "localhost" || hostname.toLowerCase().endsWith(".localhost")) throw new SsrfBlockedError(hostname);
  const { address, family } = await dnsLookup(hostname);
  if (isPrivateOrLoopbackIp(address, family)) throw new SsrfBlockedError(hostname);
  return { hostname, address, family };
}

/** Compatibility check for code that only needs validation. Network callers
 * should use guardedFetch so the connection cannot perform a second lookup. */
export async function assertNotPrivateHost(hostname: string, dnsLookup: DnsLookup = lookup): Promise<void> {
  await resolvePublicTarget(hostname, dnsLookup);
}

export interface GuardedFetchOptions {
  method?: string;
  headers?: Headers | Record<string, string> | [string, string][];
  body?: string | Uint8Array | ArrayBuffer | null;
  signal?: AbortSignal;
  redirect?: "manual" | "error" | "follow";
  maxRedirects?: number;
}

export type PinnedRequest = (url: URL, target: GuardedTarget, options: GuardedFetchOptions) => Promise<Response>;

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** Fetch with a pinned DNS result, validating every redirect before its hop. */
export async function guardedFetch(input: string | URL, options: GuardedFetchOptions = {}, dnsLookup: DnsLookup = lookup, request: PinnedRequest = requestPinned): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  let url = new URL(input);
  let method = options.method ?? "GET";
  let body = options.body;
  for (let hop = 0; ; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("guardedFetch only supports http and https");
    if (options.signal?.aborted) throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
    const target = await resolvePublicTarget(url.hostname, dnsLookup);
    const response = await request(url, target, { ...options, method, body });
    const location = response.headers.get("location");
    if (!REDIRECTS.has(response.status) || !location) return response;
    if ((options.redirect ?? "follow") === "manual") return response;
    if ((options.redirect ?? "follow") === "error") throw new TypeError("redirect mode is error");
    if (hop >= maxRedirects) throw new TypeError(`redirect limit (${maxRedirects}) exceeded`);
    const next = new URL(location, url);
    response.body?.cancel().catch(() => {});
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method !== "GET" && method !== "HEAD")) {
      method = "GET";
      body = undefined;
    }
    url = next;
  }
}

function requestPinned(url: URL, target: GuardedTarget, options: GuardedFetchOptions): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = new Headers(options.headers);
    if (!headers.has("host")) headers.set("host", url.host);
    const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requestFn(url, {
      method: options.method ?? "GET",
      headers: Object.fromEntries(headers.entries()),
      lookup: (_host: string, opts: { all?: boolean } | number, callback: (error: Error | null, addressOrResults: string | { address: string; family: number }[], family?: number) => void) => {
        if (typeof opts === "object" && opts.all) callback(null, [{ address: target.address, family: target.family }]);
        else callback(null, target.address, target.family);
      },
      servername: url.hostname,
    }, (res) => {
      const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(res.headers as IncomingHttpHeaders)) {
        if (Array.isArray(value)) for (const entry of value) responseHeaders.append(key, entry);
        else if (value !== undefined) responseHeaders.set(key, value);
      }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          res.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
          res.on("end", () => controller.close());
          res.on("error", (error) => controller.error(error));
        },
        cancel() { res.destroy(); },
      });
      resolve(new Response(body, { status: res.statusCode ?? 500, statusText: res.statusMessage, headers: responseHeaders }));
    });
    const abort = () => req.destroy(options.signal?.reason instanceof Error ? options.signal.reason : new DOMException("Aborted", "AbortError"));
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
    req.on("error", reject);
    req.on("close", () => options.signal?.removeEventListener("abort", abort));
    if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === "string" || options.body instanceof Uint8Array) req.write(options.body);
      else if (options.body instanceof ArrayBuffer) req.write(new Uint8Array(options.body));
      else reject(new TypeError("guardedFetch supports string or byte request bodies"));
    }
    req.end();
  });
}

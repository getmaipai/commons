import { describe, expect, test } from "bun:test";
import { assertNotPrivateHost, guardedFetch, SsrfBlockedError, type DnsLookup } from "./ssrfGuard";

describe("assertNotPrivateHost", () => {
  test("blocks IPv4 loopback, private, and link-local literals directly, no DNS involved", async () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1"]) {
      await expect(assertNotPrivateHost(ip)).rejects.toThrow(SsrfBlockedError);
    }
  });

  test("does not block a public-looking IPv4 literal", async () => {
    await expect(assertNotPrivateHost("93.184.216.34")).resolves.toBeUndefined();
  });

  test("blocks the 100.64.0.0/10 CGNAT/Tailscale range", async () => {
    for (const ip of ["100.64.0.1", "100.100.1.1", "100.127.255.255"]) {
      await expect(assertNotPrivateHost(ip)).rejects.toThrow(SsrfBlockedError);
    }
  });

  test("100.63.x and 100.128.x are just outside 100.64.0.0/10 and are not blocked", async () => {
    await expect(assertNotPrivateHost("100.63.255.255")).resolves.toBeUndefined();
    await expect(assertNotPrivateHost("100.128.0.0")).resolves.toBeUndefined();
  });

  test("172.15.x and 172.32.x are outside the 172.16.0.0/12 private range and are not blocked", async () => {
    await expect(assertNotPrivateHost("172.15.0.1")).resolves.toBeUndefined();
    await expect(assertNotPrivateHost("172.32.0.1")).resolves.toBeUndefined();
  });

  test("blocks IPv6 loopback and unique-local literals", async () => {
    await expect(assertNotPrivateHost("::1")).rejects.toThrow(SsrfBlockedError);
    await expect(assertNotPrivateHost("fd00::1")).rejects.toThrow(SsrfBlockedError);
    await expect(assertNotPrivateHost("fe80::1")).rejects.toThrow(SsrfBlockedError);
  });

  test("blocks NAT64 and 6to4 addresses embedding private IPv4", async () => {
    for (const ip of ["64:ff9b::a00:1", "64:ff9b:1::a00:1", "2002:a00:1::1"]) {
      await expect(assertNotPrivateHost(ip)).rejects.toThrow(SsrfBlockedError);
    }
  });

  test("blocks unspecified, multicast, reserved IPv4, and IPv6 multicast", async () => {
    for (const ip of ["0.0.0.0", "0.2.3.4", "224.0.0.1", "255.255.255.255", "::", "ff02::1"]) {
      await expect(assertNotPrivateHost(ip)).rejects.toThrow(SsrfBlockedError);
    }
  });

  test("normalizes legacy IPv4 literal spellings before checking", async () => {
    for (const ip of ["0177.0.0.1", "0x7f000001", "2130706433"]) {
      await expect(assertNotPrivateHost(new URL(`http://${ip}`).hostname)).rejects.toThrow(SsrfBlockedError);
    }
  });

  test("blocks the literal hostname 'localhost' without ever consulting DNS", async () => {
    const neverCalled: DnsLookup = () => {
      throw new Error("should never be called for 'localhost'");
    };
    await expect(assertNotPrivateHost("localhost", neverCalled)).rejects.toThrow(SsrfBlockedError);
  });

  test("a real hostname is checked against what it resolves to, via the injected resolver", async () => {
    const resolvesPrivate: DnsLookup = async () => ({ address: "10.1.2.3", family: 4 });
    await expect(assertNotPrivateHost("internal.example", resolvesPrivate)).rejects.toThrow(SsrfBlockedError);

    const resolvesPublic: DnsLookup = async () => ({ address: "93.184.216.34", family: 4 });
    await expect(assertNotPrivateHost("public.example", resolvesPublic)).resolves.toBeUndefined();
  });

  test("guardedFetch connects to the checked DNS answer and does not resolve again", async () => {
    let calls = 0;
    const resolver: DnsLookup = async () => {
      calls++;
      return { address: calls === 1 ? "93.184.216.34" : "127.0.0.1", family: 4 };
    };
    await expect(guardedFetch("http://rebind.example/", {}, resolver, async (_url, target) => {
      expect(target.address).toBe("93.184.216.34");
      return new Response("ok");
    })).resolves.toBeInstanceOf(Response);
    expect(calls).toBe(1);
  });

  test("guardedFetch re-checks each redirect and enforces a hop limit", async () => {
    let calls = 0;
    const request = async (url: URL) => url.hostname === "first.example"
      ? new Response(null, { status: 302, headers: { location: "http://second.example/" } })
      : new Response("should not connect");
    await expect(guardedFetch("http://first.example/", { maxRedirects: 2 }, async (host) => {
      calls++;
      if (host === "first.example") return { address: "93.184.216.34", family: 4 };
      if (host === "second.example") return { address: "127.0.0.1", family: 4 };
      return { address: "93.184.216.34", family: 4 };
    }, async (url, target) => {
      expect(target.address).toBe("93.184.216.34");
      return request(url);
    })).rejects.toThrow(SsrfBlockedError);
    expect(calls).toBe(2);
  });

  test("blocks an IPv4-mapped IPv6 literal whose embedded address is private, loopback, or link-local", async () => {
    await expect(assertNotPrivateHost("::ffff:127.0.0.1")).rejects.toThrow(SsrfBlockedError);
    await expect(assertNotPrivateHost("::ffff:192.168.1.1")).rejects.toThrow(SsrfBlockedError);
    await expect(assertNotPrivateHost("::ffff:169.254.169.254")).rejects.toThrow(SsrfBlockedError); // the classic cloud metadata address
    await expect(assertNotPrivateHost("::ffff:7f00:1")).rejects.toThrow(SsrfBlockedError);
  });

  test("does not block an IPv4-mapped IPv6 literal whose embedded address is genuinely public", async () => {
    await expect(assertNotPrivateHost("::ffff:93.184.216.34")).resolves.toBeUndefined();
  });

  test("an IPv4-mapped address is also caught when it's what a hostname resolves to, not just a literal", async () => {
    const resolvesToMappedPrivate: DnsLookup = async () => ({ address: "::ffff:10.0.0.5", family: 6 });
    await expect(assertNotPrivateHost("sneaky.example", resolvesToMappedPrivate)).rejects.toThrow(SsrfBlockedError);
  });

  test("recognizes a bracketed IPv6 literal (the real form URL.hostname produces) as the literal it is", async () => {
    const neverCalled: DnsLookup = () => {
      throw new Error("should never reach DNS for a real IP literal");
    };
    await expect(assertNotPrivateHost("[::1]", neverCalled)).rejects.toThrow(SsrfBlockedError);
    await expect(assertNotPrivateHost("[fd00::1]", neverCalled)).rejects.toThrow(SsrfBlockedError);
  });

  test("a bracketed, genuinely public IPv6 literal is allowed, not misclassified as unreachable", async () => {
    const neverCalled: DnsLookup = () => {
      throw new Error("should never reach DNS for a real IP literal");
    };
    await expect(assertNotPrivateHost("[2001:4860:4860::8888]", neverCalled)).resolves.toBeUndefined();
  });
});

describe("guardedFetch against raw servers", () => {
  const publicLookup: DnsLookup = async () => ({ address: "93.184.216.34", family: 4 });
  // The pinned request connects to the checked address, so point it at the local server by lying in the target.
  const toLocal = (port: number) => async (url: URL, target: unknown, options: Parameters<typeof guardedFetch>[1] = {}) => {
    const { requestPinned } = await import("./ssrfGuard");
    return requestPinned(new URL(`http://127.0.0.1:${port}${url.pathname}`), { hostname: "127.0.0.1", address: "127.0.0.1", family: 4 }, options ?? {});
  };

  test("accepts a Shoutcast v1 'ICY 200 OK' reply and streams its body", async () => {
    const { createServer } = await import("node:net");
    const server = createServer((s) => { s.on("data", () => { s.end("ICY 200 OK\r\nicy-name: Test FM\r\ncontent-type: audio/mpeg\r\n\r\nabcdef"); }); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    try {
      const res = await guardedFetch("http://radio.example.com/live", {}, publicLookup, toLocal(port));
      expect(res.status).toBe(200);
      expect(res.headers.get("icy-name")).toBe("Test FM");
      expect(await res.text()).toBe("abcdef");
    } finally { server.close(); }
  });

  test("cancelling a streaming body while the server keeps sending does not throw", async () => {
    const { createServer } = await import("node:http");
    const server = createServer((_req, res) => { res.writeHead(200, { "content-type": "audio/mpeg" }); const t = setInterval(() => res.write("x".repeat(1024)), 5); res.on("close", () => clearInterval(t)); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    const errors: unknown[] = [];
    const onError = (e: unknown) => errors.push(e);
    process.on("uncaughtException", onError);
    try {
      const res = await guardedFetch("http://radio.example.com/live", {}, publicLookup, toLocal(port));
      const reader = res.body!.getReader();
      await reader.read();
      await reader.cancel();
      await new Promise((r) => setTimeout(r, 150));
      expect(errors).toEqual([]);
    } finally { process.off("uncaughtException", onError); server.close(); }
  });
});

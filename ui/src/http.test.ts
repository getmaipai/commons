import { afterEach, describe, expect, test } from "bun:test";
import { ApiError, request } from "./http";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(response: { status?: number; body?: unknown; ok?: boolean }) {
  globalThis.fetch = (async () =>
    ({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: "",
      json: async () => response.body ?? {},
    }) as Response) as unknown as typeof fetch;
}

describe("request", () => {
  test("resolves with the parsed JSON body on success", async () => {
    mockFetch({ body: { value: 42 } });
    const result = await request<{ value: number }>("/api/thing");
    expect(result).toEqual({ value: 42 });
  });

  test("sends credentials and a JSON content-type header", async () => {
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (_path: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return { ok: true, status: 200, statusText: "", json: async () => ({}) } as Response;
    }) as typeof fetch;
    await request("/api/thing");
    expect(capturedInit?.credentials).toBe("include");
    expect((capturedInit?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  test("throws ApiError with the response's own error message and status on a non-ok response", async () => {
    mockFetch({ ok: false, status: 404, body: { error: "not found", code: "missing" } });
    await expect(request("/api/missing")).rejects.toThrow(ApiError);
    try {
      await request("/api/missing");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe("not found");
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).code).toBe("missing");
    }
  });

  test("falls back to statusText when the error body has no error field", async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 500, statusText: "Internal Server Error", json: async () => ({}) }) as Response) as unknown as typeof fetch;
    await expect(request("/api/thing")).rejects.toThrow("Internal Server Error");
  });

  test("a request that aborts past its own timeoutMs rejects with a timeout ApiError", async () => {
    globalThis.fetch = ((_path: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    await expect(request("/api/slow", { timeoutMs: 10 })).rejects.toThrow(/Timed out/);
  });

  test("a caller's own signal aborting is never reported as a timeout, even when timeoutMs is also set", async () => {
    globalThis.fetch = ((_path: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    const controller = new AbortController();
    const promise = request("/api/slow", { timeoutMs: 10_000, signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.not.toThrow(/Timed out/);
  });

  test("a caller's own signal aborting with no timeoutMs configured is never reported as a timeout", async () => {
    globalThis.fetch = ((_path: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    const controller = new AbortController();
    const promise = request("/api/slow", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.not.toThrow(/Timed out/);
  });
});

import { describe, expect, test } from "bun:test";
import { createRoute, z } from "@hono/zod-openapi";
import { apiRouter, ErrorSchema, errorResponses, idParamSchema, paginatedResponseSchema, PaginationQuerySchema } from "./openapi";

function mountListRoute(router: ReturnType<typeof apiRouter>): void {
  router.openapi(
    createRoute({
      method: "get",
      path: "/things",
      request: { query: PaginationQuerySchema },
      responses: { 200: { description: "ok" } },
    }),
    (c) => c.json({}),
  );
}

describe("ErrorSchema", () => {
  test("accepts an error string and rejects an empty object", () => {
    expect(ErrorSchema.parse({ error: "x" })).toEqual({ error: "x" });
    expect(ErrorSchema.safeParse({}).success).toBe(false);
  });
});

describe("errorResponses", () => {
  test("maps a status to its description and ErrorSchema, preserving literal status keys", () => {
    const responses = errorResponses({ 404: "Not found", 409: "Conflict" });
    expect(responses[404].description).toBe("Not found");
    expect(responses[404].content["application/json"].schema).toBe(ErrorSchema);
    expect(responses[409].description).toBe("Conflict");
  });
});

describe("idParamSchema", () => {
  test("validates the named param as a string", () => {
    const schema = idParamSchema("id");
    expect(schema.parse({ id: "abc" })).toEqual({ id: "abc" });
    expect(schema.safeParse({}).success).toBe(false);
  });
});

describe("PaginationQuerySchema", () => {
  test("limit and cursor are both optional", () => {
    expect(PaginationQuerySchema.safeParse({}).success).toBe(true);
  });

  test("limit coerces from a query string and caps at 200", () => {
    expect(PaginationQuerySchema.parse({ limit: "50" }).limit).toBe(50);
    expect(PaginationQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
  });
});

describe("paginatedResponseSchema", () => {
  test("wraps an item schema with items and a nullable next_cursor", () => {
    const schema = paginatedResponseSchema(z.object({ id: z.string() }));
    expect(schema.parse({ items: [{ id: "a" }], next_cursor: null })).toEqual({ items: [{ id: "a" }], next_cursor: null });
    expect(schema.safeParse({ items: [], next_cursor: "abc" }).success).toBe(true);
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe("apiRouter", () => {
  test("formats a Zod validation failure as { error } at 400", async () => {
    const router = apiRouter();
    mountListRoute(router);
    // PaginationQuerySchema caps limit at 200; 9999 fails validation and
    // should hit apiRouter()'s own defaultHook rather than a raw 400.
    const response = await router.request("/things?limit=9999");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  test("a valid request passes through to the handler", async () => {
    const router = apiRouter();
    mountListRoute(router);
    const response = await router.request("/things?limit=10");
    expect(response.status).toBe(200);
  });

  test("a route the caller never satisfies falls through to Hono's own 404, not a thrown error", async () => {
    const router = apiRouter();
    const response = await router.request("/nowhere");
    expect(response.status).toBe(404);
  });
});

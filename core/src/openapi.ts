// The @hono/zod-openapi scaffolding every product's route files build on.
// One factory (`apiRouter()`), not each route file hand-rolling its own
// `new OpenAPIHono()` with its own error-formatting hook - "one
// definition, one place" applies to route setup too.
import { OpenAPIHono, z } from "@hono/zod-openapi";
import type { Env } from "hono";

/** The wire shape of every hand-written `{ error: "..." }` response a
 * route returns - named so a route's `responses` block can reference
 * one real schema instead of a copy of `z.object({ error: z.string() })`
 * per file. */
export const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

/** `createRoute`'s `responses` entries for this schema, at the given
 * status codes - saves every route definition repeating the identical
 * `{ content: { "application/json": { schema: ErrorSchema } }, description }`
 * shape for each of its error statuses.
 *
 * Generic over the literal status codes passed in (`<const T>`), not
 * annotated as the obvious-looking `Record<number, string>`:
 * @hono/zod-openapi derives a route's whole response union from the
 * LITERAL keys of its `responses` object, and a `Record<number, ...>`
 * return type erases them down to "some number," so a handler's
 * `c.json(body, 404)` would stop type-checking against a route that had
 * genuinely declared 404. */
export function errorResponses<const T extends Record<number, string>>(
  statuses: T,
): { [K in keyof T]: { content: { "application/json": { schema: typeof ErrorSchema } }; description: T[K] } } {
  const responses = {} as { [K in keyof T]: { content: { "application/json": { schema: typeof ErrorSchema } }; description: T[K] } };
  for (const key of Object.keys(statuses)) {
    const k = key as unknown as keyof T;
    responses[k] = { content: { "application/json": { schema: ErrorSchema } }, description: statuses[k] };
  }
  return responses;
}

/** A route's `request.params` schema for a single `{id}` path segment.
 * `example` is optional since a real id's shape (and worth showing one)
 * varies by route - pass it when the route has an obvious one
 * (`issue-a1b2c3`), omit it otherwise. Generic over the literal param
 * name (`<const Name>`), the identical reason `errorResponses()` above
 * is generic over its literal status keys: a plain `(paramName: string)`
 * signature would make the computed property key untypeable as anything
 * but `string`, so `c.req.valid("param").id` would come back as
 * `string | undefined` at every call site instead of the guaranteed
 * `string` a real path param always is. */
export function idParamSchema<const Name extends string>(paramName: Name, example?: string): z.ZodObject<{ [K in Name]: z.ZodString }> {
  const shape = { [paramName]: z.string().openapi({ param: { name: paramName, in: "path" }, ...(example ? { example } : {}) }) };
  return z.object(shape) as z.ZodObject<{ [K in Name]: z.ZodString }>;
}

/** `limit`/`cursor` query params for a route that lists a collection.
 * Optional on purpose: a route adopts pagination by adding this to its
 * `request.query`, not by every existing list route having to grow one
 * it doesn't need. */
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional().openapi({
    param: { name: "limit", in: "query" },
    example: 50,
  }),
  cursor: z.string().optional().openapi({
    param: { name: "cursor", in: "query" },
  }),
});

/** Wraps an item schema in the `{ items, next_cursor }` shape a
 * paginated list response uses once a route adopts
 * `PaginationQuerySchema` - `next_cursor` is `null` (not omitted) on the
 * last page, so a client's "is there more" check is one falsy test
 * rather than an `in` check. */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    next_cursor: z.string().nullable(),
  });
}

/** Every product's own `OpenAPIHono` instance goes through this, not a
 * bare `new OpenAPIHono()`: the `defaultHook` formats a Zod validation
 * failure as the org's own `{ error: "..." }` shape at 400, so a
 * converted route's error responses look identical everywhere. Generic
 * over the caller's own Hono `Env` (its own `Variables`/`Bindings`
 * shape) - core declares no product's env. */
export function apiRouter<E extends Env = Env>(): OpenAPIHono<E> {
  return new OpenAPIHono<E>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join("; ");
        return c.json({ error: message }, 400);
      }
    },
  });
}

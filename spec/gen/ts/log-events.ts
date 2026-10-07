// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/log-events.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LOG-PRIV-01a: the registry of typed log events (log/events.json). Owner principle: no log ever carries specifics that reveal what another user did. An event is a name, a component, and a fixed list of fields, and a field may only be one of seven types: enum (a member of a list declared right here, never free text), integer, duration (milliseconds), code (a stable error code from errors/errors.json), version, or trace (an opaque expiring short code). No type exists for free text, a title, a URL, a file name, an argument, a prompt, a reply, a query, a person id, a conversation id or a record id, and every object here is closed (additionalProperties false), so a producer cannot add one. Registry names must also be unique within the file and within an event; that is checked by the tests because JSON Schema cannot express it.*/
export const LogEvents = z
  .object({
    schema: z.literal(1),
    /**What a trace field is, for every event: a random opaque code of exactly six characters that names no person, turn or record and that expires, so it can only be matched to a report while the code is still live. How long a code lives is the hub's retention setting, not this registry's.*/
    trace_policy: z
      .object({ length: z.literal(6), expires: z.literal(true) })
      .strict()
      .describe(
        "What a trace field is, for every event: a random opaque code of exactly six characters that names no person, turn or record and that expires, so it can only be matched to a report while the code is still live. How long a code lives is the hub's retention setting, not this registry's.",
      ),
    events: z
      .array(
        z
          .object({
            name: z.string().regex(new RegExp("^[a-z][a-z0-9_]*$")),
            /**The part of the system that writes the event.*/
            component: z
              .enum([
                "hub",
                "engine",
                "turn",
                "tool",
                "safety",
                "search",
                "backup",
                "update",
                "log",
              ])
              .describe("The part of the system that writes the event."),
            /**What happened, written for the registry's readers. Never emitted in a log line.*/
            description: z
              .string()
              .min(1)
              .describe(
                "What happened, written for the registry's readers. Never emitted in a log line.",
              ),
            fields: z.array(
              z.any().superRefine((x, ctx) => {
                const schemas = [
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("enum"),
                      values: z
                        .array(
                          z.string().regex(new RegExp("^[a-z][a-z0-9_]*$")),
                        )
                        .min(1)
                        .refine(
                          (arr) =>
                            arr.every((item, i) => arr.indexOf(item) == i),
                          "All items must be unique!",
                        ),
                    })
                    .strict()
                    .describe(
                      "A string that may only be one of the declared values.",
                    ),
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("integer"),
                      minimum: z.number().int().optional(),
                      maximum: z.number().int().optional(),
                    })
                    .strict()
                    .describe("A whole number, such as a count."),
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("duration"),
                    })
                    .strict()
                    .describe("A length of time in milliseconds."),
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("code"),
                    })
                    .strict()
                    .describe(
                      "A stable error code, one of the codes in errors/errors.json.",
                    ),
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("version"),
                    })
                    .strict()
                    .describe("A software version string."),
                  z
                    .object({
                      /**A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.*/
                      name: z
                        .any()
                        .refine(
                          (value) =>
                            !z
                              .enum([
                                "title",
                                "url",
                                "uri",
                                "filename",
                                "path",
                                "argument",
                                "arguments",
                                "args",
                                "prompt",
                                "reply",
                                "query",
                                "text",
                                "message",
                                "content",
                                "body",
                                "name",
                                "id",
                                "person_id",
                                "conversation_id",
                                "record_id",
                                "turn_id",
                                "user_id",
                              ])
                              .safeParse(value).success,
                          "Invalid input: Should NOT be valid against schema",
                        )
                        .describe(
                          "A field name. The names of the things a log must never carry are refused outright, as a second guard behind the closed list of field types. The refusal is a JSON Schema not-enum rule: the TypeScript and Python models check the name pattern, and the schema itself enforces the refusal.",
                        ),
                      type: z.literal("trace"),
                    })
                    .strict()
                    .describe(
                      "An opaque expiring short code (see trace_policy).",
                    ),
                ];
                const { errors, failed } = schemas.reduce<{
                  errors: z.core.$ZodIssue[];
                  failed: number;
                }>(
                  ({ errors, failed }, schema) =>
                    ((result) =>
                      result.error
                        ? {
                            errors: [...errors, ...result.error.issues],
                            failed: failed + 1,
                          }
                        : { errors, failed })(schema.safeParse(x)),
                  { errors: [], failed: 0 },
                );
                const passed = schemas.length - failed;
                if (passed !== 1) {
                  ctx.addIssue(
                    errors.length
                      ? {
                          path: [],
                          code: "invalid_union",
                          errors: [errors],
                          message:
                            "Invalid input: Should pass single schema. Passed " +
                            passed,
                        }
                      : {
                          path: [],
                          code: "custom",
                          errors: [errors],
                          message:
                            "Invalid input: Should pass single schema. Passed " +
                            passed,
                        },
                  );
                }
              }),
            ),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "LOG-PRIV-01a: the registry of typed log events (log/events.json). Owner principle: no log ever carries specifics that reveal what another user did. An event is a name, a component, and a fixed list of fields, and a field may only be one of seven types: enum (a member of a list declared right here, never free text), integer, duration (milliseconds), code (a stable error code from errors/errors.json), version, or trace (an opaque expiring short code). No type exists for free text, a title, a URL, a file name, an argument, a prompt, a reply, a query, a person id, a conversation id or a record id, and every object here is closed (additionalProperties false), so a producer cannot add one. Registry names must also be unique within the file and within an event; that is checked by the tests because JSON Schema cannot express it.",
  );
export type LogEvents = z.infer<typeof LogEvents>;

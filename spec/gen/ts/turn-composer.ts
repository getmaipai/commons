// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/turn-composer.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**What the person chose in the chat composer's mode and chips, sent beside the words of one written chat turn. A hint the model reads, never a route: the hub checks it against the person's own band and offered tools, and ignores it on a spoken, robot, satellite or shared turn.*/
export const TurnComposer = z
  .object({
    /**The mode id from GET /api/composer/modes, for example `picture`, `video` or `song`. `ask` (plain chat) carries no hint.*/
    mode: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9_-]*$"))
      .min(1)
      .max(32)
      .describe(
        "The mode id from GET /api/composer/modes, for example `picture`, `video` or `song`. `ask` (plain chat) carries no hint.",
      ),
    /**The chip values the person picked, keyed by the chip's state id (`shape`, `count`, `quality`). The hub keeps only keys and values the mode offers this person; an unknown or out-of-range entry is dropped.*/
    settings: z
      .record(
        z.string(),
        z.any().superRefine((x, ctx) => {
          const schemas = [
            z.string().max(40),
            z.number().int().gte(-1000000).lte(1000000),
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
      )
      .describe(
        "The chip values the person picked, keyed by the chip's state id (`shape`, `count`, `quality`). The hub keeps only keys and values the mode offers this person; an unknown or out-of-range entry is dropped.",
      )
      .optional(),
    /**Cast ids the person added with @. The hub keeps only the ids this person may cast. Never logged.*/
    cast: z
      .array(z.string().min(1).max(128))
      .max(6)
      .describe(
        "Cast ids the person added with @. The hub keeps only the ids this person may cast. Never logged.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "What the person chose in the chat composer's mode and chips, sent beside the words of one written chat turn. A hint the model reads, never a route: the hub checks it against the person's own band and offered tools, and ignores it on a spoken, robot, satellite or shared turn.",
  );
export type TurnComposer = z.infer<typeof TurnComposer>;

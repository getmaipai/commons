// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/problem-report.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LOG-PRIV-01a: one problem report a person chose to send about something that went wrong. Owner principle: no log ever carries specifics that reveal what another user did. A report is built from parts, and what a part may carry depends on reporter_mode, the admin-set mode of the person sending it (child, teen or adult; a control the household sets, not a measure of anyone). In the child and teen modes a report may only carry codes and timings, so every part is kind code or timing and none has content. In the adult mode a part may also carry text (kind description or excerpt), but only when that part's consented flag is true, and a part with consented false carries none. The conditions are JSON Schema if/then rules: the generated models check the shapes, and the schema itself enforces the conditions.*/
export const ProblemReport = z
  .object({
    /**The report's stable id.*/
    id: z
      .string()
      .regex(new RegExp("^pr-[a-z0-9]{6,}$"))
      .describe("The report's stable id."),
    /**Where the report came from. It names a part of the system and an expiring trace, never a person, conversation or record.*/
    provenance: z
      .object({
        /**The component the report is about, from the same list as log/events.json.*/
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
          .describe(
            "The component the report is about, from the same list as log/events.json.",
          ),
        /**The opaque expiring six-character trace of the failing event, when there was one.*/
        trace: z
          .union([
            z
              .string()
              .regex(new RegExp("^[a-z0-9]{6}$"))
              .describe(
                "The opaque expiring six-character trace of the failing event, when there was one.",
              ),
            z
              .null()
              .describe(
                "The opaque expiring six-character trace of the failing event, when there was one.",
              ),
          ])
          .describe(
            "The opaque expiring six-character trace of the failing event, when there was one.",
          )
          .default(null),
      })
      .strict()
      .describe(
        "Where the report came from. It names a part of the system and an expiring trace, never a person, conversation or record.",
      ),
    /**When the report was written.*/
    created_at: z
      .string()
      .datetime({ offset: true })
      .describe("When the report was written."),
    /**Hybrid logical clock: wall_ms:counter:node (7.3), the clock stamp used by every synced record shape.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe(
        "Hybrid logical clock: wall_ms:counter:node (7.3), the clock stamp used by every synced record shape.",
      ),
    /**The stable error code the report is about, one of the codes in errors/errors.json.*/
    code: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9_]*$"))
      .describe(
        "The stable error code the report is about, one of the codes in errors/errors.json.",
      ),
    /**The admin-set mode of the person sending the report. It decides which parts are allowed (see the schema description).*/
    reporter_mode: z
      .enum(["child", "teen", "adult"])
      .describe(
        "The admin-set mode of the person sending the report. It decides which parts are allowed (see the schema description).",
      ),
    parts: z
      .array(
        z
          .object({
            kind: z.enum(["code", "timing", "description", "excerpt"]),
            /**True when the person agreed to send this part.*/
            consented: z
              .boolean()
              .describe("True when the person agreed to send this part."),
            /**An error code from errors/errors.json. Only on a code part.*/
            code: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9_]*$"))
              .describe(
                "An error code from errors/errors.json. Only on a code part.",
              )
              .optional(),
            /**A length of time in milliseconds. Only on a timing part.*/
            duration_ms: z
              .number()
              .int()
              .gte(0)
              .describe(
                "A length of time in milliseconds. Only on a timing part.",
              )
              .optional(),
            /**Text the person agreed to send. Present only when consented is true, only on a description or excerpt part, and only for the adult reporter mode.*/
            content: z
              .string()
              .min(1)
              .max(4000)
              .describe(
                "Text the person agreed to send. Present only when consented is true, only on a description or excerpt part, and only for the adult reporter mode.",
              )
              .optional(),
          })
          .strict()
          .and(z.intersection(z.any(), z.intersection(z.any(), z.any())))
          .describe(
            "One part of a report. A code part carries code, a timing part carries duration_ms, and a description or excerpt part carries content, which is present only when consented is true.",
          ),
      )
      .max(20),
  })
  .strict()
  .and(z.any())
  .describe(
    "LOG-PRIV-01a: one problem report a person chose to send about something that went wrong. Owner principle: no log ever carries specifics that reveal what another user did. A report is built from parts, and what a part may carry depends on reporter_mode, the admin-set mode of the person sending it (child, teen or adult; a control the household sets, not a measure of anyone). In the child and teen modes a report may only carry codes and timings, so every part is kind code or timing and none has content. In the adult mode a part may also carry text (kind description or excerpt), but only when that part's consented flag is true, and a part with consented false carries none. The conditions are JSON Schema if/then rules: the generated models check the shapes, and the schema itself enforces the conditions.",
  );
export type ProblemReport = z.infer<typeof ProblemReport>;

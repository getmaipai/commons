// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/lora.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**VIDEO-LORA-02 (home docs/design/video-loras-2026-11-02.md, section 4.1). One LoRA (a saved style, character or motion adapter) in the household library. Home owns this record: who may use it (audience, availability), what its prompt add-ins are, its preview and its trash state. The Stack owns the file bytes and the facts read from them (`file`: hash, size, rank, modules). `media` says what it is for: `video` now, `picture` when pictures move onto this record (VIDEO-LORA-12). Defaults are the safe side everywhere: availability is admins only, audience is adult-only until an admin says otherwise (a source can only raise it), and a base model that is `unknown` blocks use. A minor never sees or uses any LoRA: availability never names one (the writer refuses it, because the record holds no ages) and the access function reads the person's age, never this record alone. Rules JSON Schema cannot carry in the generators (audience all-ages needs an admin's choice, availability `people` only when availability.who is `people`, strength order and bounds, add-in length totals, compatible_with contains the base) are in spec/records/ts/validate.ts `validateLora`, and the audience rule is also an if/then below (the generated models drop it; Ajv enforces it).*/
export const Lora = z
  .object({
    /**Home's stable id, never reused. `file.sha256` is the file's identity; two records may not share a live sha256.*/
    id: z
      .string()
      .regex(new RegExp("^lora-[a-z0-9]{6,}$"))
      .describe(
        "Home's stable id, never reused. `file.sha256` is the file's identity; two records may not share a live sha256.",
      ),
    /**The person-facing name, admin editable.*/
    name: z
      .string()
      .min(1)
      .max(80)
      .describe("The person-facing name, admin editable."),
    /**Groups the picker ("Styles", "Characters"). At most one `character` per clip; the limit is Home's, not this record's.*/
    kind: z
      .enum(["style", "character", "motion", "other"])
      .describe(
        'Groups the picker ("Styles", "Characters"). At most one `character` per clip; the limit is Home\'s, not this record\'s.',
      ),
    /**One plain line, admin edited: shown on the card and, for an all-ages LoRA only, in the model's tool description. May be empty.*/
    description: z
      .string()
      .max(140)
      .describe(
        "One plain line, admin edited: shown on the card and, for an all-ages LoRA only, in the model's tool description. May be empty.",
      ),
    media: z.enum(["video", "picture"]),
    /**Where the file came from. Recorded once, never refreshed automatically.*/
    source: z
      .object({
        site: z.enum(["huggingface", "civitai", "file"]),
        /**The page or file URL the admin chose; null for a file the admin placed. Never carries a token.*/
        url: z
          .union([
            z
              .string()
              .max(2048)
              .describe(
                "The page or file URL the admin chose; null for a file the admin placed. Never carries a token.",
              ),
            z
              .null()
              .describe(
                "The page or file URL the admin chose; null for a file the admin placed. Never carries a token.",
              ),
          ])
          .describe(
            "The page or file URL the admin chose; null for a file the admin placed. Never carries a token.",
          ),
        /**The site's own id for the model (a Civitai model id, a Hugging Face repo id and file).*/
        remote_id: z
          .union([
            z
              .string()
              .describe(
                "The site's own id for the model (a Civitai model id, a Hugging Face repo id and file).",
              ),
            z
              .null()
              .describe(
                "The site's own id for the model (a Civitai model id, a Hugging Face repo id and file).",
              ),
          ])
          .describe(
            "The site's own id for the model (a Civitai model id, a Hugging Face repo id and file).",
          ),
        /**The site's own id for the version.*/
        version_id: z
          .union([
            z.string().describe("The site's own id for the version."),
            z.null().describe("The site's own id for the version."),
          ])
          .describe("The site's own id for the version."),
        /**Which stored source token the install used, by name only (the secret lives in Home's secrets store, CREDENTIALS.md). Never the token itself. Null when none was used.*/
        token_ref: z
          .union([
            z.literal("huggingface"),
            z.literal("civitai"),
            z.literal(null),
          ])
          .describe(
            "Which stored source token the install used, by name only (the secret lives in Home's secrets store, CREDENTIALS.md). Never the token itself. Null when none was used.",
          ),
      })
      .strict()
      .describe(
        "Where the file came from. Recorded once, never refreshed automatically.",
      ),
    /**Facts read from the downloaded bytes by the Stack.*/
    file: z
      .object({
        /**Lowercase SHA-256 of the file, recorded on download.*/
        sha256: z
          .string()
          .regex(new RegExp("^[a-f0-9]{64}$"))
          .describe("Lowercase SHA-256 of the file, recorded on download."),
        /**Exact byte length; at most 4 GB (design D11).*/
        bytes: z
          .number()
          .int()
          .gte(1)
          .lte(4294967296)
          .describe("Exact byte length; at most 4 GB (design D11)."),
        /**The LoRA rank read from the tensors; null when it could not be read.*/
        rank: z
          .union([
            z
              .number()
              .int()
              .gte(1)
              .describe(
                "The LoRA rank read from the tensors; null when it could not be read.",
              ),
            z
              .null()
              .describe(
                "The LoRA rank read from the tensors; null when it could not be read.",
              ),
          ])
          .describe(
            "The LoRA rank read from the tensors; null when it could not be read.",
          ),
        /**The module groups the file touches (for example attn, ffn), read from tensor names.*/
        modules: z
          .array(z.string().min(1))
          .describe(
            "The module groups the file touches (for example attn, ffn), read from tensor names.",
          ),
        format: z.literal("safetensors"),
      })
      .strict()
      .describe("Facts read from the downloaded bytes by the Stack."),
    /**Read from the tensors and the source's own base field. `unknown` blocks use until an admin sets it.*/
    base_model: z
      .enum(["ltx-2.3", "ltx-2.5", "wan2.2-ti2v-5b", "unknown"])
      .describe(
        "Read from the tensors and the source's own base field. `unknown` blocks use until an admin sets it.",
      ),
    /**Base ids this file may be used with. Defaults to [base_model] (empty while base_model is unknown); widened only by a bench result (design D12).*/
    compatible_with: z
      .array(z.enum(["ltx-2.3", "ltx-2.5", "wan2.2-ti2v-5b"]))
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        "Base ids this file may be used with. Defaults to [base_model] (empty while base_model is unknown); widened only by a bench result (design D12).",
      ),
    /**Sanitised at import: plain text, no control characters, no markup.*/
    trigger_words: z
      .array(z.string().min(1).max(80))
      .max(12)
      .describe(
        "Sanitised at import: plain text, no control characters, no markup.",
      ),
    /**Where Home puts the trigger words in the prompt. Default `start` for styles.*/
    trigger_position: z
      .enum(["start", "end"])
      .describe(
        "Where Home puts the trigger words in the prompt. Default `start` for styles.",
      ),
    /**Admin-written prompt additions; each at most 120 characters, 400 in total per LoRA (validateLora).*/
    positive_addins: z
      .array(z.string().min(1).max(120))
      .max(8)
      .describe(
        "Admin-written prompt additions; each at most 120 characters, 400 in total per LoRA (validateLora).",
      ),
    /**Admin-written negative text, sent only to an engine that reports a negative prompt it honours. Same limits as positive_addins.*/
    negative_addins: z
      .array(z.string().min(1).max(120))
      .max(8)
      .describe(
        "Admin-written negative text, sent only to an engine that reports a negative prompt it honours. Same limits as positive_addins.",
      ),
    /**The admin-written positive counterpart used when the engine has no negative prompt (design D9). Same limits.*/
    avoid_as_positive: z
      .array(z.string().min(1).max(120))
      .max(8)
      .describe(
        "The admin-written positive counterpart used when the engine has no negative prompt (design D9). Same limits.",
      ),
    /**LoRA strength, 0 to 2, with min <= default <= max (validateLora). Characters default to their min of 0.8.*/
    strength: z
      .object({
        default: z.number().gte(0).lte(2).default(1),
        min: z.number().gte(0).lte(2).default(0),
        max: z.number().gte(0).lte(2).default(1.5),
      })
      .strict()
      .describe(
        "LoRA strength, 0 to 2, with min <= default <= max (validateLora). Characters default to their min of 0.8.",
      ),
    /**Design D4. Uncertain is `adult-only`. A source (import metadata, tags) can only raise it to adult-only; `all-ages` is only ever an owner's or admin's explicit choice, so it needs audience_set_by.*/
    audience: z
      .enum(["all-ages", "adult-only"])
      .describe(
        "Design D4. Uncertain is `adult-only`. A source (import metadata, tags) can only raise it to adult-only; `all-ages` is only ever an owner's or admin's explicit choice, so it needs audience_set_by.",
      )
      .default("adult-only"),
    /**The owner or admin who last chose the audience. Null while it is still what import set (always adult-only then).*/
    audience_set_by: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe(
            "The owner or admin who last chose the audience. Null while it is still what import set (always adult-only then).",
          ),
        z
          .null()
          .describe(
            "The owner or admin who last chose the audience. Null while it is still what import set (always adult-only then).",
          ),
      ])
      .describe(
        "The owner or admin who last chose the audience. Null while it is still what import set (always adult-only then).",
      ),
    /**When audience was last set, by import or by an admin.*/
    audience_set_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe("When audience was last set, by import or by an admin."),
        z
          .null()
          .describe("When audience was last set, by import or by an admin."),
      ])
      .describe("When audience was last set, by import or by an admin."),
    /**Who besides admins may use it. Default `admins`. Never includes a minor (the writer refuses one) and never widens what the Adult lock and the household adult-adapters switch hide.*/
    availability: z
      .object({
        /**`admins`: owner and admins only (the default for every new LoRA). `adults`: every adult. `people`: the adults named in `people`.*/
        who: z
          .enum(["admins", "adults", "people"])
          .describe(
            "`admins`: owner and admins only (the default for every new LoRA). `adults`: every adult. `people`: the adults named in `people`.",
          )
          .default("admins"),
        /**The chosen adults; empty unless who is `people`, and non-empty when it is.*/
        people: z
          .array(z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")))
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          )
          .describe(
            "The chosen adults; empty unless who is `people`, and non-empty when it is.",
          )
          .default([]),
      })
      .strict()
      .describe(
        "Who besides admins may use it. Default `admins`. Never includes a minor (the writer refuses one) and never widens what the Adult lock and the household adult-adapters switch hide.",
      ),
    /**The owner or admin who added it.*/
    added_by: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe("The owner or admin who added it."),
    added_at: z.string().datetime({ offset: true }),
    /**A non-open or unknown licence needs the adder's acknowledgment (acknowledged_by set).*/
    licence: z
      .object({
        /**An SPDX-style id or the source's own licence name; null when unknown.*/
        id: z
          .union([
            z
              .string()
              .max(80)
              .describe(
                "An SPDX-style id or the source's own licence name; null when unknown.",
              ),
            z
              .null()
              .describe(
                "An SPDX-style id or the source's own licence name; null when unknown.",
              ),
          ])
          .describe(
            "An SPDX-style id or the source's own licence name; null when unknown.",
          ),
        /**The terms as the source states them; null when it states none.*/
        text: z
          .union([
            z
              .string()
              .max(2000)
              .describe(
                "The terms as the source states them; null when it states none.",
              ),
            z
              .null()
              .describe(
                "The terms as the source states them; null when it states none.",
              ),
          ])
          .describe(
            "The terms as the source states them; null when it states none.",
          ),
        commercial_use: z.enum(["yes", "no", "unknown"]).default("unknown"),
        acknowledged_by: z.union([
          z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
          z.null(),
        ]),
        acknowledged_at: z.union([
          z.string().datetime({ offset: true }),
          z.null(),
        ]),
      })
      .strict()
      .describe(
        "A non-open or unknown licence needs the adder's acknowledgment (acknowledged_by set).",
      ),
    /**The card image, or null for none.*/
    preview: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              /**A File record the admin picked, fetched once through the hub and stored locally, never hot-linked. An adult-only LoRA's preview follows the Adult lock.*/
              file_id: z
                .string()
                .regex(new RegExp("^file-[a-z0-9]{6,}$"))
                .describe(
                  "A File record the admin picked, fetched once through the hub and stored locally, never hot-linked. An adult-only LoRA's preview follows the Adult lock.",
                ),
            })
            .strict(),
          z.null(),
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
      })
      .describe("The card image, or null for none."),
    /**Restorable trash (design 4.3). Set when an admin removes it; null while live. A removed LoRA is unusable and hidden except from Recently removed.*/
    removed_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Restorable trash (design 4.3). Set when an admin removes it; null while live. A removed LoRA is unusable and hidden except from Recently removed.",
          ),
        z
          .null()
          .describe(
            "Restorable trash (design 4.3). Set when an admin removes it; null while live. A removed LoRA is unusable and hidden except from Recently removed.",
          ),
      ])
      .describe(
        "Restorable trash (design 4.3). Set when an admin removes it; null while live. A removed LoRA is unusable and hidden except from Recently removed.",
      ),
    /**30 days after removed_at; the file is deleted and the record dropped then. Set together with removed_at.*/
    trash_until: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "30 days after removed_at; the file is deleted and the record dropped then. Set together with removed_at.",
          ),
        z
          .null()
          .describe(
            "30 days after removed_at; the file is deleted and the record dropped then. Set together with removed_at.",
          ),
      ])
      .describe(
        "30 days after removed_at; the file is deleted and the record dropped then. Set together with removed_at.",
      ),
    /**The last time the file was re-hashed; null before the first check.*/
    last_check: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              at: z.string().datetime({ offset: true }),
              /**False when the file's hash no longer matches file.sha256.*/
              ok: z
                .boolean()
                .describe(
                  "False when the file's hash no longer matches file.sha256.",
                ),
            })
            .strict(),
          z.null(),
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
      })
      .describe(
        "The last time the file was re-hashed; null before the first check.",
      ),
    /**How this record came to exist (no data debt: set from the first write).*/
    provenance: z
      .object({
        /**`install`: the Stack video.lora.install job downloaded it. `file`: an admin placed a file. `migration`: VIDEO-LORA-03 made it from a pre-record Stack LoRA or a video_adapter_prefs row.*/
        origin: z
          .enum(["install", "file", "migration"])
          .describe(
            "`install`: the Stack video.lora.install job downloaded it. `file`: an admin placed a file. `migration`: VIDEO-LORA-03 made it from a pre-record Stack LoRA or a video_adapter_prefs row.",
          ),
        /**The Stack job that fetched or checked it; null for a migration.*/
        job_id: z
          .union([
            z
              .string()
              .min(1)
              .describe(
                "The Stack job that fetched or checked it; null for a migration.",
              ),
            z
              .null()
              .describe(
                "The Stack job that fetched or checked it; null for a migration.",
              ),
          ])
          .describe(
            "The Stack job that fetched or checked it; null for a migration.",
          ),
      })
      .strict()
      .describe(
        "How this record came to exist (no data debt: set from the first write).",
      ),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node. Advanced on every mutable field change.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe(
        "Hybrid logical clock: wall_ms:counter:node. Advanced on every mutable field change.",
      ),
  })
  .strict()
  .describe(
    "VIDEO-LORA-02 (home docs/design/video-loras-2026-11-02.md, section 4.1). One LoRA (a saved style, character or motion adapter) in the household library. Home owns this record: who may use it (audience, availability), what its prompt add-ins are, its preview and its trash state. The Stack owns the file bytes and the facts read from them (`file`: hash, size, rank, modules). `media` says what it is for: `video` now, `picture` when pictures move onto this record (VIDEO-LORA-12). Defaults are the safe side everywhere: availability is admins only, audience is adult-only until an admin says otherwise (a source can only raise it), and a base model that is `unknown` blocks use. A minor never sees or uses any LoRA: availability never names one (the writer refuses it, because the record holds no ages) and the access function reads the person's age, never this record alone. Rules JSON Schema cannot carry in the generators (audience all-ages needs an admin's choice, availability `people` only when availability.who is `people`, strength order and bounds, add-in length totals, compatible_with contains the base) are in spec/records/ts/validate.ts `validateLora`, and the audience rule is also an if/then below (the generated models drop it; Ajv enforces it).",
  );
export type Lora = z.infer<typeof Lora>;

// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/file.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One immutable record for a file a person made or sent: a chat attachment, a package's generated output, or an exported copy (STORE-SPEC-01, home docs/plans/household-storage-2026-09-23.md). The bytes live below the household data directory, content-addressed by sha256 so identical bytes are stored once; this record carries only its owner, kind, origin, provenance, integrity and retention policy. Supersedes attachment.schema.json, generalized to the same shape (no attachment rows existed in any household yet, so the rename cost nothing); also folds in the never-built media.schema.json (MEDIA-RECORD-01). Sharing is never a field here: a share is its own pointer record, share.schema.json, so one file has one owner and any number of share pointers without a second copy of the bytes or a second file record.*/
export const File = z
  .object({
    /**Stable file id, never reused. The id is also the basename used by the storage path.*/
    id: z
      .string()
      .regex(new RegExp("^file-[a-z0-9]{6,}$"))
      .describe(
        "Stable file id, never reused. The id is also the basename used by the storage path.",
      ),
    /**The one person who owns this file, always a person, never the household. Captured at write time and not inferred from a later profile change; a file's usage counts against this person's cap only, even once shared.*/
    owner_person_id: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "The one person who owns this file, always a person, never the household. Captured at write time and not inferred from a later profile change; a file's usage counts against this person's cap only, even once shared.",
      ),
    /**"sent": a file the person gave in chat (today's attachment). "made": a package or a job produced it on the person's behalf (a generated picture, video, audio clip or story). "exported": a copy the person asked for (a data export). "fetched" (MEDIA-SPEC-01): a copy the hub fetched for a person from a source they chose (a saved video, a podcast episode, a subtitle, a storyboard); owned by the person who asked, or by the adult who created a household source. Shapes which fields of provenance apply below.*/
    origin: z
      .enum(["sent", "made", "exported", "fetched"])
      .describe(
        '"sent": a file the person gave in chat (today\'s attachment). "made": a package or a job produced it on the person\'s behalf (a generated picture, video, audio clip or story). "exported": a copy the person asked for (a data export). "fetched" (MEDIA-SPEC-01): a copy the hub fetched for a person from a source they chose (a saved video, a podcast episode, a subtitle, a storyboard); owned by the person who asked, or by the adult who created a household source. Shapes which fields of provenance apply below.',
      ),
    /**The kind of content, read by the manifest lint's output check (docs/PACKAGES.md "Uninstall, and a person's files": a manifest declares its outputs as media kinds matching this enum).*/
    kind: z
      .enum(["image", "video", "audio", "document", "story", "other"])
      .describe(
        "The kind of content, read by the manifest lint's output check (docs/PACKAGES.md \"Uninstall, and a person's files\": a manifest declares its outputs as media kinds matching this enum).",
      ),
    /**Normalized MIME media type of the stored bytes, without parameters.*/
    media_type: z
      .string()
      .regex(
        new RegExp(
          "^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$",
        ),
      )
      .describe(
        "Normalized MIME media type of the stored bytes, without parameters.",
      ),
    /**Exact byte length of the stored file.*/
    size: z
      .number()
      .int()
      .gte(0)
      .describe("Exact byte length of the stored file."),
    /**Lowercase SHA-256 digest of the stored bytes. The blob store keys on this value: bytes are written once per digest, so a second person's identical bytes never create a second blob, only a second file record with its own owner is avoided too - see share.schema.json's "first in, owner" rule for what the second person gets instead.*/
    sha256: z
      .string()
      .regex(new RegExp("^[a-f0-9]{64}$"))
      .describe(
        "Lowercase SHA-256 digest of the stored bytes. The blob store keys on this value: bytes are written once per digest, so a second person's identical bytes never create a second blob, only a second file record with its own owner is avoided too - see share.schema.json's \"first in, owner\" rule for what the second person gets instead.",
      ),
    /**A normalized relative path below the household data directory. Implementations place it under people/{owner_person_id}/files/ and reject traversal or absolute paths.*/
    storage_path: z
      .string()
      .regex(new RegExp("^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$))[A-Za-z0-9._/-]+$"))
      .describe(
        "A normalized relative path below the household data directory. Implementations place it under people/{owner_person_id}/files/ and reject traversal or absolute paths.",
      ),
    /**"conversation": follows the owning conversation's household.conversation_retention_days setting (currently 7-365 days, 90-day default); deleted with the owning turn and immediately by host.data.forget(person). Used when origin is "sent". "kept": kept until the owner deletes it - the default for origin "made" and "exported", and for any "sent" file a person chooses to keep past its conversation.*/
    retention: z
      .enum(["conversation", "kept"])
      .describe(
        '"conversation": follows the owning conversation\'s household.conversation_retention_days setting (currently 7-365 days, 90-day default); deleted with the owning turn and immediately by host.data.forget(person). Used when origin is "sent". "kept": kept until the owner deletes it - the default for origin "made" and "exported", and for any "sent" file a person chooses to keep past its conversation.',
      ),
    /**How this file entered the household, shaped by origin: for "sent", the conversation and turn that carried it; for "made", the package, turn and job that produced it; for "exported", who asked for it and, when it ran inside a turn, that turn. Every field below is optional and nullable - only the ones that apply to this record's origin are set, the rest stay null - because JSON Schema in this repo describes cross-field shape in prose rather than an if/then keyed on origin (see spec/README.md on the stack schemas' own allOf/if/then codegen loss).*/
    provenance: z
      .object({
        /**Set when origin is "sent": the conversation that received the file.*/
        conversation_id: z
          .union([
            z
              .string()
              .regex(new RegExp("^conv-[a-z0-9]{6,}$"))
              .describe(
                'Set when origin is "sent": the conversation that received the file.',
              ),
            z
              .null()
              .describe(
                'Set when origin is "sent": the conversation that received the file.',
              ),
          ])
          .describe(
            'Set when origin is "sent": the conversation that received the file.',
          )
          .default(null),
        /**Set when origin is "sent" (the turn whose user message carried the file) or "made" (the turn that started the job); optionally set for "exported" when the export was requested inside a turn rather than from a settings page.*/
        turn_id: z
          .union([
            z
              .string()
              .regex(new RegExp("^turn-[a-z0-9]{6,}$"))
              .describe(
                'Set when origin is "sent" (the turn whose user message carried the file) or "made" (the turn that started the job); optionally set for "exported" when the export was requested inside a turn rather than from a settings page.',
              ),
            z
              .null()
              .describe(
                'Set when origin is "sent" (the turn whose user message carried the file) or "made" (the turn that started the job); optionally set for "exported" when the export was requested inside a turn rather than from a settings page.',
              ),
          ])
          .describe(
            'Set when origin is "sent" (the turn whose user message carried the file) or "made" (the turn that started the job); optionally set for "exported" when the export was requested inside a turn rather than from a settings page.',
          )
          .default(null),
        /**Set when origin is "made": the catalog package id whose job produced the file.*/
        package_id: z
          .union([
            z
              .string()
              .min(1)
              .describe(
                'Set when origin is "made": the catalog package id whose job produced the file.',
              ),
            z
              .null()
              .describe(
                'Set when origin is "made": the catalog package id whose job produced the file.',
              ),
          ])
          .describe(
            'Set when origin is "made": the catalog package id whose job produced the file.',
          )
          .default(null),
        /**Set when origin is "made": the id of the Stack job (stack-job.schema.json) that produced the file.*/
        job_id: z
          .union([
            z
              .string()
              .min(1)
              .describe(
                'Set when origin is "made": the id of the Stack job (stack-job.schema.json) that produced the file.',
              ),
            z
              .null()
              .describe(
                'Set when origin is "made": the id of the Stack job (stack-job.schema.json) that produced the file.',
              ),
          ])
          .describe(
            'Set when origin is "made": the id of the Stack job (stack-job.schema.json) that produced the file.',
          )
          .default(null),
        /**Set when origin is "exported" and the requester differs from owner_person_id (an admin exporting a child's files on the child's behalf).*/
        requested_by_person_id: z
          .union([
            z
              .string()
              .regex(new RegExp("^person-[a-z0-9]{6,}$"))
              .describe(
                "Set when origin is \"exported\" and the requester differs from owner_person_id (an admin exporting a child's files on the child's behalf).",
              ),
            z
              .null()
              .describe(
                "Set when origin is \"exported\" and the requester differs from owner_person_id (an admin exporting a child's files on the child's behalf).",
              ),
          ])
          .describe(
            "Set when origin is \"exported\" and the requester differs from owner_person_id (an admin exporting a child's files on the child's behalf).",
          )
          .default(null),
        /**Set when origin is "fetched": the media-source (a feed, a channel or a pasted link) the copy came from. job_id names the Stack media.fetch job.*/
        media_source_id: z
          .union([
            z
              .string()
              .regex(new RegExp("^msrc-[a-z0-9]{6,}$"))
              .describe(
                'Set when origin is "fetched": the media-source (a feed, a channel or a pasted link) the copy came from. job_id names the Stack media.fetch job.',
              ),
            z
              .null()
              .describe(
                'Set when origin is "fetched": the media-source (a feed, a channel or a pasted link) the copy came from. job_id names the Stack media.fetch job.',
              ),
          ])
          .describe(
            'Set when origin is "fetched": the media-source (a feed, a channel or a pasted link) the copy came from. job_id names the Stack media.fetch job.',
          )
          .default(null),
        /**Set when origin is "made" by a generator that records it (music today): model, task, seed, parent version and whether it may be used commercially.*/
        generation: z
          .any()
          .superRefine((x, ctx) => {
            const schemas = [
              z
                .object({
                  /**What was generated. Only music today; pictures and videos may adopt this record later.*/
                  kind: z
                    .literal("music")
                    .describe(
                      "What was generated. Only music today; pictures and videos may adopt this record later.",
                    ),
                  /**The Stack job (stack-job.schema.json) that produced the file.*/
                  job_id: z
                    .string()
                    .min(1)
                    .describe(
                      "The Stack job (stack-job.schema.json) that produced the file.",
                    ),
                  /**What the job did: a new song (text2music), or a change to an existing version (the rest).*/
                  task: z
                    .enum([
                      "text2music",
                      "cover",
                      "repaint",
                      "extend",
                      "remake",
                      "variation",
                      "trim",
                      "fade",
                      "loudness",
                    ])
                    .describe(
                      "What the job did: a new song (text2music), or a change to an existing version (the rest).",
                    ),
                  /**The weights that made the audio.*/
                  model: z
                    .object({
                      /**The model's catalog id.*/
                      id: z.string().min(1).describe("The model's catalog id."),
                      /**The exact revision of the weights, such as a commit hash.*/
                      revision: z
                        .string()
                        .describe(
                          "The exact revision of the weights, such as a commit hash.",
                        ),
                      /**SPDX id of the weights' licence, such as MIT.*/
                      licence: z
                        .string()
                        .describe(
                          "SPDX id of the weights' licence, such as MIT.",
                        ),
                    })
                    .strict()
                    .describe("The weights that made the audio."),
                  /**The Stack engine that ran the model.*/
                  engine: z
                    .object({
                      /**The engine id.*/
                      id: z.string().describe("The engine id."),
                      /**The engine version.*/
                      version: z.string().describe("The engine version."),
                    })
                    .strict()
                    .describe("The Stack engine that ran the model."),
                  /**The random seed, or null when the task has none (a trim, a fade, a loudness change).*/
                  seed: z
                    .union([
                      z
                        .number()
                        .int()
                        .describe(
                          "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                        ),
                      z
                        .null()
                        .describe(
                          "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                        ),
                    ])
                    .describe(
                      "The random seed, or null when the task has none (a trim, a fade, a loudness change).",
                    ),
                  /**Length of the result in seconds.*/
                  duration_s: z
                    .number()
                    .gte(0)
                    .describe("Length of the result in seconds."),
                  /**Tempo in beats per minute, or null when not set.*/
                  bpm: z
                    .union([
                      z
                        .number()
                        .int()
                        .gte(30)
                        .lte(300)
                        .describe(
                          "Tempo in beats per minute, or null when not set.",
                        ),
                      z
                        .null()
                        .describe(
                          "Tempo in beats per minute, or null when not set.",
                        ),
                    ])
                    .describe(
                      "Tempo in beats per minute, or null when not set.",
                    ),
                  /**Musical key, for example "C major", or null when not set.*/
                  key: z
                    .union([
                      z
                        .string()
                        .describe(
                          'Musical key, for example "C major", or null when not set.',
                        ),
                      z
                        .null()
                        .describe(
                          'Musical key, for example "C major", or null when not set.',
                        ),
                    ])
                    .describe(
                      'Musical key, for example "C major", or null when not set.',
                    ),
                  /**The version this one was made from; null for a new song.*/
                  parent_file_id: z
                    .union([
                      z
                        .string()
                        .regex(new RegExp("^file-[a-z0-9]{6,}$"))
                        .describe(
                          "The version this one was made from; null for a new song.",
                        ),
                      z
                        .null()
                        .describe(
                          "The version this one was made from; null for a new song.",
                        ),
                    ])
                    .describe(
                      "The version this one was made from; null for a new song.",
                    ),
                  /**Where any input audio came from. "none": no input audio. "made_here": a version made in this household. "upload": reserved and refused today (Home's music design section 9: no uploaded audio until the owner rules).*/
                  source_kind: z
                    .enum(["none", "made_here", "upload"])
                    .describe(
                      'Where any input audio came from. "none": no input audio. "made_here": a version made in this household. "upload": reserved and refused today (Home\'s music design section 9: no uploaded audio until the owner rules).',
                    ),
                  /**Whether the result may be used commercially, from the model's licence and training-data statement.*/
                  commercial_use: z
                    .enum(["cleared", "personal_only", "unknown"])
                    .describe(
                      "Whether the result may be used commercially, from the model's licence and training-data statement.",
                    ),
                  /**One sentence naming why commercial_use has the value it has.*/
                  commercial_basis: z
                    .string()
                    .min(1)
                    .describe(
                      "One sentence naming why commercial_use has the value it has.",
                    ),
                  /**When the job finished.*/
                  made_at: z
                    .string()
                    .datetime({ offset: true })
                    .describe("When the job finished."),
                })
                .strict()
                .describe(
                  "MUSIC-SPEC-01 (Home docs/design/music-generation-2026-10-17.md, sections 8 and 9). How a generated file was made: which Stack job, which task, which model and engine, the seed, the length, the parent version it was made from, and whether the result may be used commercially and why. Carried on file.provenance.generation. The person's own words (description, lyrics, title) are never in this record. Music is the first kind to use it; pictures and videos may adopt it later by adding to the kind enum.",
                ),
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
            'Set when origin is "made" by a generator that records it (music today): model, task, seed, parent version and whether it may be used commercially.',
          )
          .default(null),
        /**Freeform detail for a path the structured fields above don't name, matching the original attachment record's provenance string (such as composer:upload or storage-page:export). Optional; the structured fields are preferred once they apply.*/
        note: z
          .union([
            z
              .string()
              .min(1)
              .describe(
                "Freeform detail for a path the structured fields above don't name, matching the original attachment record's provenance string (such as composer:upload or storage-page:export). Optional; the structured fields are preferred once they apply.",
              ),
            z
              .null()
              .describe(
                "Freeform detail for a path the structured fields above don't name, matching the original attachment record's provenance string (such as composer:upload or storage-page:export). Optional; the structured fields are preferred once they apply.",
              ),
          ])
          .describe(
            "Freeform detail for a path the structured fields above don't name, matching the original attachment record's provenance string (such as composer:upload or storage-page:export). Optional; the structured fields are preferred once they apply.",
          )
          .default(null),
      })
      .strict()
      .describe(
        'How this file entered the household, shaped by origin: for "sent", the conversation and turn that carried it; for "made", the package, turn and job that produced it; for "exported", who asked for it and, when it ran inside a turn, that turn. Every field below is optional and nullable - only the ones that apply to this record\'s origin are set, the rest stay null - because JSON Schema in this repo describes cross-field shape in prose rather than an if/then keyed on origin (see spec/README.md on the stack schemas\' own allOf/if/then codegen loss).',
      ),
    /**LIBRARY-REVAMP-03. The file's display name, mutable: a person renames a file in the Library, and an upload saves the file's own name here. Optional; absent means no stored name, and a reader derives one (from the prompt or song title in the provenance, else the kind and date). Writing it advances hlc, the record's one clock, the way every mutable field in this repo is stamped.*/
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "LIBRARY-REVAMP-03. The file's display name, mutable: a person renames a file in the Library, and an upload saves the file's own name here. Optional; absent means no stored name, and a reader derives one (from the prompt or song title in the provenance, else the kind and date). Writing it advances hlc, the record's one clock, the way every mutable field in this repo is stamped.",
      )
      .optional(),
    /**LIBRARY-REVAMP-03. Who may see this file: "all-ages" or "adult-only" (children and teens never; the owner always). The literals match what Home already writes in a picture or video provenance note (audience: all-ages | adult-only), so no data migration is needed. Optional, never required: absent means unknown, and a reader falls back to the provenance note exactly as before.*/
    audience: z
      .enum(["all-ages", "adult-only"])
      .describe(
        'LIBRARY-REVAMP-03. Who may see this file: "all-ages" or "adult-only" (children and teens never; the owner always). The literals match what Home already writes in a picture or video provenance note (audience: all-ages | adult-only), so no data migration is needed. Optional, never required: absent means unknown, and a reader falls back to the provenance note exactly as before.',
      )
      .optional(),
    /**TRASH-01, as media-item. Set when a person moves the file to the household trash; null while live. A trashed file is hidden everywhere and restorable until trash_until. A restore clears both deleted_at and trash_until. No schema default (unlike media-item): an absent field stays absent, so every existing file record round-trips unchanged; absent reads as null.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "TRASH-01, as media-item. Set when a person moves the file to the household trash; null while live. A trashed file is hidden everywhere and restorable until trash_until. A restore clears both deleted_at and trash_until. No schema default (unlike media-item): an absent field stays absent, so every existing file record round-trips unchanged; absent reads as null.",
          ),
        z
          .null()
          .describe(
            "TRASH-01, as media-item. Set when a person moves the file to the household trash; null while live. A trashed file is hidden everywhere and restorable until trash_until. A restore clears both deleted_at and trash_until. No schema default (unlike media-item): an absent field stays absent, so every existing file record round-trips unchanged; absent reads as null.",
          ),
      ])
      .describe(
        "TRASH-01, as media-item. Set when a person moves the file to the household trash; null while live. A trashed file is hidden everywhere and restorable until trash_until. A restore clears both deleted_at and trash_until. No schema default (unlike media-item): an absent field stays absent, so every existing file record round-trips unchanged; absent reads as null.",
      )
      .optional(),
    /**TRASH-01, as media-item. When the trash purges the file for good (30 days after deleted_at); set together with deleted_at.*/
    trash_until: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "TRASH-01, as media-item. When the trash purges the file for good (30 days after deleted_at); set together with deleted_at.",
          ),
        z
          .null()
          .describe(
            "TRASH-01, as media-item. When the trash purges the file for good (30 days after deleted_at); set together with deleted_at.",
          ),
      ])
      .describe(
        "TRASH-01, as media-item. When the trash purges the file for good (30 days after deleted_at); set together with deleted_at.",
      )
      .optional(),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock, matching the shared record envelope. Set at creation and advanced when a mutable field (name, deleted_at, trash_until, retention) changes.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe(
        "Hybrid logical clock, matching the shared record envelope. Set at creation and advanced when a mutable field (name, deleted_at, trash_until, retention) changes.",
      ),
  })
  .strict()
  .describe(
    "One immutable record for a file a person made or sent: a chat attachment, a package's generated output, or an exported copy (STORE-SPEC-01, home docs/plans/household-storage-2026-09-23.md). The bytes live below the household data directory, content-addressed by sha256 so identical bytes are stored once; this record carries only its owner, kind, origin, provenance, integrity and retention policy. Supersedes attachment.schema.json, generalized to the same shape (no attachment rows existed in any household yet, so the rename cost nothing); also folds in the never-built media.schema.json (MEDIA-RECORD-01). Sharing is never a field here: a share is its own pointer record, share.schema.json, so one file has one owner and any number of share pointers without a second copy of the bytes or a second file record.",
  );
export type File = z.infer<typeof File>;

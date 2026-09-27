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
    /**"sent": a file the person gave in chat (today's attachment). "made": a package or a job produced it on the person's behalf (a generated picture, video, audio clip or story). "exported": a copy the person asked for (a data export). Shapes which fields of provenance apply below.*/
    origin: z
      .enum(["sent", "made", "exported"])
      .describe(
        '"sent": a file the person gave in chat (today\'s attachment). "made": a package or a job produced it on the person\'s behalf (a generated picture, video, audio clip or story). "exported": a copy the person asked for (a data export). Shapes which fields of provenance apply below.',
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
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock for the immutable record, matching the shared record envelope.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe(
        "Hybrid logical clock for the immutable record, matching the shared record envelope.",
      ),
  })
  .strict()
  .describe(
    "One immutable record for a file a person made or sent: a chat attachment, a package's generated output, or an exported copy (STORE-SPEC-01, home docs/plans/household-storage-2026-09-23.md). The bytes live below the household data directory, content-addressed by sha256 so identical bytes are stored once; this record carries only its owner, kind, origin, provenance, integrity and retention policy. Supersedes attachment.schema.json, generalized to the same shape (no attachment rows existed in any household yet, so the rename cost nothing); also folds in the never-built media.schema.json (MEDIA-RECORD-01). Sharing is never a field here: a share is its own pointer record, share.schema.json, so one file has one owner and any number of share pointers without a second copy of the bytes or a second file record.",
  );
export type File = z.infer<typeof File>;

// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/artifact.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One immutable version of a generated document (markdown, code, or html) an assistant turn created or updated for the chat's artifact-card/canvas-split experience. Distinct from TurnArtifact (turn-artifact.schema.json), COMP-01's evidence-grounded details document built from retained tool outcomes - this is the model's own authored content, versioned like a file. A later version is a new row with a new id, chained by parent_version; an existing version is never edited in place. Deliberately not TurnArtifact's own revision scheme (a bare incrementing integer, no id-based chain): this record follows conversation-turn.schema.json's parent_turn_id convention instead, because the chat wire needs a version's own id on the stream (the artifact-card/canvas-split tool call and the message metadata both name a specific version by id, the way parent_turn_id names a specific turn) and because id-chaining, unlike a bare counter, has somewhere to point if branching from a non-latest version is ever needed. validate.ts's/validate.py's validateArtifact() enforces the pairing (version 1 has no parent_version, every later version has one, and neither may equal its own id).*/
export const Artifact = z
  .object({
    /**Stable identity for this specific version. A later version of the same artifact has a new id; parent_version is how a client walks the chain back to version 1.*/
    id: z
      .string()
      .regex(new RegExp("^art-[a-z0-9]{6,}$"))
      .describe(
        "Stable identity for this specific version. A later version of the same artifact has a new id; parent_version is how a client walks the chain back to version 1.",
      ),
    /**The conversation this version belongs to. A conversation may hold more than one independent artifact; parent_version, not this field, is what identifies one artifact's own version chain.*/
    conversation_id: z
      .string()
      .regex(new RegExp("^conv-[a-z0-9]{6,}$"))
      .describe(
        "The conversation this version belongs to. A conversation may hold more than one independent artifact; parent_version, not this field, is what identifies one artifact's own version chain.",
      ),
    /**The assistant turn that produced this version, whether it created the artifact or edited a prior version into this one.*/
    turn_id: z
      .string()
      .regex(new RegExp("^turn-[a-z0-9]{6,}$"))
      .describe(
        "The assistant turn that produced this version, whether it created the artifact or edited a prior version into this one.",
      ),
    kind: z.enum(["markdown", "code", "html"]),
    title: z.string().min(1),
    /**The full content of this version, never a patch. A caller updating an existing artifact resolves any patch against the current version into a full body before this record is written, so any one version is independently renderable without replaying history.*/
    body: z
      .string()
      .min(1)
      .describe(
        "The full content of this version, never a patch. A caller updating an existing artifact resolves any patch against the current version into a full body before this record is written, so any one version is independently renderable without replaying history.",
      ),
    /**One-based sequence number within this artifact's version chain. Display-only; parent_version is the real pointer a client walks.*/
    version: z
      .number()
      .int()
      .gte(1)
      .describe(
        "One-based sequence number within this artifact's version chain. Display-only; parent_version is the real pointer a client walks.",
      ),
    /**The id of the version this one replaces, or null for an artifact's first version.*/
    parent_version: z
      .union([
        z
          .string()
          .regex(new RegExp("^art-[a-z0-9]{6,}$"))
          .describe(
            "The id of the version this one replaces, or null for an artifact's first version.",
          ),
        z
          .null()
          .describe(
            "The id of the version this one replaces, or null for an artifact's first version.",
          ),
      ])
      .describe(
        "The id of the version this one replaces, or null for an artifact's first version.",
      ),
    /**The household member present on the turn that produced this version.*/
    created_by: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "The household member present on the turn that produced this version.",
      ),
    /**Free-text provenance for the build, such as the turn-engine tool call that produced it.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Free-text provenance for the build, such as the turn-engine tool call that produced it.",
      ),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    "One immutable version of a generated document (markdown, code, or html) an assistant turn created or updated for the chat's artifact-card/canvas-split experience. Distinct from TurnArtifact (turn-artifact.schema.json), COMP-01's evidence-grounded details document built from retained tool outcomes - this is the model's own authored content, versioned like a file. A later version is a new row with a new id, chained by parent_version; an existing version is never edited in place. Deliberately not TurnArtifact's own revision scheme (a bare incrementing integer, no id-based chain): this record follows conversation-turn.schema.json's parent_turn_id convention instead, because the chat wire needs a version's own id on the stream (the artifact-card/canvas-split tool call and the message metadata both name a specific version by id, the way parent_turn_id names a specific turn) and because id-chaining, unlike a bare counter, has somewhere to point if branching from a non-latest version is ever needed. validate.ts's/validate.py's validateArtifact() enforces the pairing (version 1 has no parent_version, every later version has one, and neither may equal its own id).",
  );
export type Artifact = z.infer<typeof Artifact>;

// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/biometric-print.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One accepted enrollment sample's reference embedding - face or voice identity (docs/dev/face-voice-recognition-design-2026-09-28.md and docs/dev/design-face-recognition-models-2026-09-28.md in getmaipai/bot). Enrollment is always hub-owned, regardless of which device's camera or microphone captured the sample; a matching device (a robot, a browser) holds only prints synced down from here, never creates its own. One person's full print set is however many of these share person_id and modality - a coverage-grid enrollment (frontal, left, right, up, down, and so on) produces several, not one record with an array inside it, matching how the matcher already scores per-sample and takes each person's own best. A print whose model_id or model_sha256 doesn't match the model a device runs is refused by that device outright (ForeignModelPrint on the robot's own FaceGallery) rather than compared across two different embedding spaces.*/
export const BiometricPrint = z
  .object({
    /**Stable id, never reused, even after deleted_at is set.*/
    id: z
      .string()
      .regex(new RegExp("^print-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused, even after deleted_at is set."),
    /**Whose print this is - the person being recognized, not necessarily the person who consented (see consented_by_person_id).*/
    person_id: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "Whose print this is - the person being recognized, not necessarily the person who consented (see consented_by_person_id).",
      ),
    /**Which recognition pipeline this print belongs to. Face and voice prints for the same person are separate records, never fused into one - fusion happens once, in the household runtime's turn engine, from separate per-modality results.*/
    modality: z
      .enum(["face", "voice"])
      .describe(
        "Which recognition pipeline this print belongs to. Face and voice prints for the same person are separate records, never fused into one - fusion happens once, in the household runtime's turn engine, from separate per-modality results.",
      ),
    /**The embedding model that produced this vector, e.g. 'sface-2021dec' or 'campplus-sv-en-voxceleb'. One model per modality household-wide (design-face-recognition-models-2026-09-28.md section 5) - this field is what lets a matcher refuse a print made by a different model instead of silently comparing two incompatible embedding spaces.*/
    model_id: z
      .string()
      .min(1)
      .describe(
        "The embedding model that produced this vector, e.g. 'sface-2021dec' or 'campplus-sv-en-voxceleb'. One model per modality household-wide (design-face-recognition-models-2026-09-28.md section 5) - this field is what lets a matcher refuse a print made by a different model instead of silently comparing two incompatible embedding spaces.",
      ),
    /**The exact model artifact's checksum, not just its name - a model swap (even same model_id, re-exported or re-trained) is a new embedding space, and this is what makes that visible rather than a silent drift.*/
    model_sha256: z
      .string()
      .regex(new RegExp("^[a-f0-9]{64}$"))
      .describe(
        "The exact model artifact's checksum, not just its name - a model swap (even same model_id, re-exported or re-trained) is a new embedding space, and this is what makes that visible rather than a silent drift.",
      ),
    /**The embedding vector's length, checked against embedding's own length at write time (records/validate's own job - JSON Schema alone cannot cross-reference another field's array length).*/
    dim: z
      .number()
      .int()
      .gte(1)
      .describe(
        "The embedding vector's length, checked against embedding's own length at write time (records/validate's own job - JSON Schema alone cannot cross-reference another field's array length).",
      ),
    /**The raw reference vector for this one accepted sample. Never a score, never raw image or audio - dev.md section 6's own line, extended here to the print record: what's stored is the derived embedding a consented capture produced, nothing upstream of it.*/
    embedding: z
      .array(z.number())
      .min(1)
      .describe(
        "The raw reference vector for this one accepted sample. Never a score, never raw image or audio - dev.md section 6's own line, extended here to the print record: what's stored is the derived embedding a consented capture produced, nothing upstream of it.",
      ),
    /**Which surface captured the sample that produced this embedding, e.g. 'pwa' or 'bot:reachy-mini' - provenance, not an access control. Null when not recorded.*/
    captured_by: z
      .union([
        z
          .string()
          .describe(
            "Which surface captured the sample that produced this embedding, e.g. 'pwa' or 'bot:reachy-mini' - provenance, not an access control. Null when not recorded.",
          ),
        z
          .null()
          .describe(
            "Which surface captured the sample that produced this embedding, e.g. 'pwa' or 'bot:reachy-mini' - provenance, not an access control. Null when not recorded.",
          ),
      ])
      .describe(
        "Which surface captured the sample that produced this embedding, e.g. 'pwa' or 'bot:reachy-mini' - provenance, not an access control. Null when not recorded.",
      )
      .default(null),
    /**When the enrollment was consented to. Always set - enrollment is never automatic or passive (docs/PRIVACY.md, docs/SAFETY.md's architecture-not-a-setting rule extended to biometric enrollment).*/
    consent_at: z
      .string()
      .datetime({ offset: true })
      .describe(
        "When the enrollment was consented to. Always set - enrollment is never automatic or passive (docs/PRIVACY.md, docs/SAFETY.md's architecture-not-a-setting rule extended to biometric enrollment).",
      ),
    /**The adult who consented to this enrollment - the enrolling adult's own consent for a child's print, never the child's (face-voice-recognition-design-2026-09-28.md section 1). Equal to person_id for an adult enrolling themself.*/
    consented_by_person_id: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "The adult who consented to this enrollment - the enrolling adult's own consent for a child's print, never the child's (face-voice-recognition-design-2026-09-28.md section 1). Equal to person_id for an adult enrolling themself.",
      ),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Revocation: a tombstone, not a hard delete, so a replay cannot resurrect a deleted print on a device that was offline when the revocation happened (design-face-recognition-models-2026-09-28.md section 5). A device syncing prints skips any row with deleted_at set and removes its own local copy.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Revocation: a tombstone, not a hard delete, so a replay cannot resurrect a deleted print on a device that was offline when the revocation happened (design-face-recognition-models-2026-09-28.md section 5). A device syncing prints skips any row with deleted_at set and removes its own local copy.",
          ),
        z
          .null()
          .describe(
            "Revocation: a tombstone, not a hard delete, so a replay cannot resurrect a deleted print on a device that was offline when the revocation happened (design-face-recognition-models-2026-09-28.md section 5). A device syncing prints skips any row with deleted_at set and removes its own local copy.",
          ),
      ])
      .describe(
        "Revocation: a tombstone, not a hard delete, so a replay cannot resurrect a deleted print on a device that was offline when the revocation happened (design-face-recognition-models-2026-09-28.md section 5). A device syncing prints skips any row with deleted_at set and removes its own local copy.",
      )
      .default(null),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    "One accepted enrollment sample's reference embedding - face or voice identity (docs/dev/face-voice-recognition-design-2026-09-28.md and docs/dev/design-face-recognition-models-2026-09-28.md in getmaipai/bot). Enrollment is always hub-owned, regardless of which device's camera or microphone captured the sample; a matching device (a robot, a browser) holds only prints synced down from here, never creates its own. One person's full print set is however many of these share person_id and modality - a coverage-grid enrollment (frontal, left, right, up, down, and so on) produces several, not one record with an array inside it, matching how the matcher already scores per-sample and takes each person's own best. A print whose model_id or model_sha256 doesn't match the model a device runs is refused by that device outright (ForeignModelPrint on the robot's own FaceGallery) rather than compared across two different embedding spaces.",
  );
export type BiometricPrint = z.infer<typeof BiometricPrint>;

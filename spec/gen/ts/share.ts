// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/share.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One pointer record granting another person or the household read access to one file (STORE-SPEC-01, home docs/plans/household-storage-2026-09-23.md), never a copy of the bytes and never a second file record - the file's own owner_person_id keeps ownership and usage accounting no matter how many share pointers exist on it. Re-sharing (the recipient shares it onward) is another pointer on the same file, not a chain of files. Created when the owner shares a file; deleted outright when the owner unshares it - unsharing is a real delete, not a soft revoke, because nothing here needs a record of a past share (an external link's own audit trail is share-link-01's own view log, not this record). This shape intentionally stops at person/household sharing: share-link-01 (home docs/plans/external-sharing-2026-09-23.md) adds a kind (person, household, link) and, for kind "link" only, token, expires_at, download_limit, download_count and revoked_at, additive over this shape - nothing here should make that addition awkward, so no field is added ahead of that item that would need to change shape for it.*/
export const Share = z
  .object({
    /**Stable share id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^share-[a-z0-9]{6,}$"))
      .describe("Stable share id, never reused."),
    /**The file this pointer grants access to. The file's own owner_person_id is unaffected by this record.*/
    file_id: z
      .string()
      .regex(new RegExp("^file-[a-z0-9]{6,}$"))
      .describe(
        "The file this pointer grants access to. The file's own owner_person_id is unaffected by this record.",
      ),
    /**Who created this share. Ordinarily the file's owner; ruling 6 of the household storage record also lets anything shared with a person be re-shared within the household, so this may be a recipient of an earlier share re-sharing it onward, never someone with no share and not the owner.*/
    from_person_id: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "Who created this share. Ordinarily the file's owner; ruling 6 of the household storage record also lets anything shared with a person be re-shared within the household, so this may be a recipient of an earlier share re-sharing it onward, never someone with no share and not the owner.",
      ),
    /**Who the file is shared with: a specific person, or the literal "household" for everyone in it.*/
    to: z
      .string()
      .regex(new RegExp("^(household|person-[a-z0-9]{6,})$"))
      .describe(
        'Who the file is shared with: a specific person, or the literal "household" for everyone in it.',
      ),
    /**How the share was created, such as the turn or the page that made it. Freeform, matching the file record's own provenance.note convention.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "How the share was created, such as the turn or the page that made it. Freeform, matching the file record's own provenance.note convention.",
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
    "One pointer record granting another person or the household read access to one file (STORE-SPEC-01, home docs/plans/household-storage-2026-09-23.md), never a copy of the bytes and never a second file record - the file's own owner_person_id keeps ownership and usage accounting no matter how many share pointers exist on it. Re-sharing (the recipient shares it onward) is another pointer on the same file, not a chain of files. Created when the owner shares a file; deleted outright when the owner unshares it - unsharing is a real delete, not a soft revoke, because nothing here needs a record of a past share (an external link's own audit trail is share-link-01's own view log, not this record). This shape intentionally stops at person/household sharing: share-link-01 (home docs/plans/external-sharing-2026-09-23.md) adds a kind (person, household, link) and, for kind \"link\" only, token, expires_at, download_limit, download_count and revoked_at, additive over this shape - nothing here should make that addition awkward, so no field is added ahead of that item that would need to change shape for it.",
  );
export type Share = z.infer<typeof Share>;

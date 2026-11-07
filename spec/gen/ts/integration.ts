// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/integration.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**
 * SPEC-INSTANCES-01: one connected service instance, such as a Home Assistant server or an Uptime Kuma monitor. One record per instance, not one per type, so a household can connect two Uptime Kuma monitors. Design: Home docs/design/connector-instances-2026-11-06.md.
 *
 * UNIQUENESS: the pair (type, instance) is unique across all records, tombstoned ones included, so a slug is never reused for the same type. Schemas cannot express this; validateIntegrations in records/ts/validate.ts checks it. At most 8 live instances per type is a hub rule, not a schema rule.
 *
 * REMOVAL: removing an instance sets deleted_at (a tombstone). The record is kept so the slug stays taken.
 *
 * GRANT TARGETS: a grant target for an integration action may be `<instance>/<native target>`, split at the first `/` (the slug never contains `/` or `:`, and a native target may, as Gitea's `owner/repo` does). A target without an instance prefix means the `default` instance. The `by_parameter` device class is passed separately and is never parsed out of the target.
 *
 * SECRETS: this record never holds a secret. `credential_ref` is an opaque reference into the credentials center.
 */
export const Integration = z
  .object({
    /**Stable record id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^integ-[a-z0-9]{6,}$"))
      .describe("Stable record id, never reused."),
    /**Which kind of service this is.*/
    type: z
      .enum([
        "home_assistant",
        "uptime_kuma",
        "gitea",
        "immich",
        "unifi",
        "plex",
      ])
      .describe("Which kind of service this is."),
    /**Short slug, unique within the type, chosen once and never reused. Never contains `/` or `:`. The first instance of a type is `default`.*/
    instance: z
      .string()
      .regex(new RegExp("^[a-z0-9][a-z0-9-]{0,30}$"))
      .describe(
        "Short slug, unique within the type, chosen once and never reused. Never contains `/` or `:`. The first instance of a type is `default`.",
      ),
    /**What people call this instance, for example "Cabin".*/
    label: z
      .string()
      .min(1)
      .max(60)
      .describe('What people call this instance, for example "Cabin".'),
    /**The URL an admin set for this instance.*/
    address: z
      .string()
      .min(1)
      .describe("The URL an admin set for this instance."),
    /**Opaque reference into the credentials center. It names where the secret is kept and is never the secret itself.*/
    credential_ref: z
      .string()
      .min(1)
      .describe(
        "Opaque reference into the credentials center. It names where the secret is kept and is never the secret itself.",
      ),
    /**False keeps the instance configured but unused.*/
    enabled: z
      .boolean()
      .describe("False keeps the instance configured but unused.")
      .default(true),
    /**Non-secret per-instance settings a connector needs, for example Uptime Kuma's `status_page` slug. Keys are short lowercase names; values are strings of at most 200 characters; at most 8 keys. Never a credential: the key names token, password, secret and api_key are rejected, and secrets stay in the credentials center behind `credential_ref`. Absent when there are none.*/
    options: z
      .record(z.string(), z.union([z.string().max(200), z.never()]))
      .refine((value) => Object.keys(value).length <= 8, {
        message: "options allows at most 8 keys",
      })
      .superRefine((value, ctx) => {
        for (const key in value) {
          let evaluated = false;
          if (
            key.match(
              new RegExp(
                "^(?!(token|password|secret|api_key)$)[a-z][a-z0-9_]{0,30}$",
              ),
            )
          ) {
            evaluated = true;
            const result = z.string().max(200).safeParse(value[key]);
            if (!result.success) {
              ctx.addIssue({
                path: [key],
                code: "custom",
                message: `Invalid input: Key matching regex /${key}/ must match schema`,
                params: {
                  issues: result.error.issues,
                },
              });
            }
          }
          if (!evaluated) {
            const result = z.never().safeParse(value[key]);
            if (!result.success) {
              ctx.addIssue({
                path: [key],
                code: "custom",
                message: `Invalid input: must match catchall schema`,
                params: {
                  issues: result.error.issues,
                },
              });
            }
          }
        }
      })
      .describe(
        "Non-secret per-instance settings a connector needs, for example Uptime Kuma's `status_page` slug. Keys are short lowercase names; values are strings of at most 200 characters; at most 8 keys. Never a credential: the key names token, password, secret and api_key are rejected, and secrets stay in the credentials center behind `credential_ref`. Absent when there are none.",
      )
      .optional(),
    /**Tombstone. Set when an admin removes the instance; null while it exists. The record is kept so the slug is never reused.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Tombstone. Set when an admin removes the instance; null while it exists. The record is kept so the slug is never reused.",
          ),
        z
          .null()
          .describe(
            "Tombstone. Set when an admin removes the instance; null while it exists. The record is kept so the slug is never reused.",
          ),
      ])
      .describe(
        "Tombstone. Set when an admin removes the instance; null while it exists. The record is kept so the slug is never reused.",
      )
      .default(null),
    /**How this record came to exist, for example "admin" or "migrated:home.base_url".*/
    provenance: z
      .string()
      .min(1)
      .describe(
        'How this record came to exist, for example "admin" or "migrated:home.base_url".',
      ),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "SPEC-INSTANCES-01: one connected service instance, such as a Home Assistant server or an Uptime Kuma monitor. One record per instance, not one per type, so a household can connect two Uptime Kuma monitors. Design: Home docs/design/connector-instances-2026-11-06.md.\n\nUNIQUENESS: the pair (type, instance) is unique across all records, tombstoned ones included, so a slug is never reused for the same type. Schemas cannot express this; validateIntegrations in records/ts/validate.ts checks it. At most 8 live instances per type is a hub rule, not a schema rule.\n\nREMOVAL: removing an instance sets deleted_at (a tombstone). The record is kept so the slug stays taken.\n\nGRANT TARGETS: a grant target for an integration action may be `<instance>/<native target>`, split at the first `/` (the slug never contains `/` or `:`, and a native target may, as Gitea's `owner/repo` does). A target without an instance prefix means the `default` instance. The `by_parameter` device class is passed separately and is never parsed out of the target.\n\nSECRETS: this record never holds a secret. `credential_ref` is an opaque reference into the credentials center.",
  );
export type Integration = z.infer<typeof Integration>;

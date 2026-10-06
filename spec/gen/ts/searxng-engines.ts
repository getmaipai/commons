// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/searxng-engines.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The shared SearXNG engine groups, minimum engine counts, operator disclosures and recommended defaults used by Home and Stack. Engine names are pinned to the SearXNG version the Stack ships; no catalog engine requires an API key.*/
export const SearxngEngines = z
  .object({
    /**The SearXNG release family against which engine names are verified.*/
    version: z
      .string()
      .min(1)
      .describe(
        "The SearXNG release family against which engine names are verified.",
      ),
    minimums: z
      .object({
        jsonFormatRequired: z.boolean(),
        wikipediaRequired: z.boolean(),
        webEngines: z.number().int().gte(1),
        childWebEngines: z.number().int().gte(1),
        childImageEngines: z.number().int().gte(1),
        pictureEngines: z.number().int().gte(1),
      })
      .strict(),
    groups: z
      .array(
        z
          .object({
            id: z.string().regex(new RegExp("^[a-z][a-z0-9-]*$")),
            label: z.string().min(1),
            description: z.string().min(1),
            needed_by: z.array(z.string().min(1)).min(1),
            default_on: z.boolean(),
            locked: z.boolean(),
            engines: z
              .array(
                z
                  .object({
                    name: z.string().min(1),
                    operator: z.string().min(1),
                    country: z.string().min(1),
                    /**Whether the engine is expected to honor SearXNG's safe-search request.*/
                    safe_search: z
                      .boolean()
                      .describe(
                        "Whether the engine is expected to honor SearXNG's safe-search request.",
                      ),
                    /**True when enabling the engine requires a plain-language disclosure because of where the operator is based.*/
                    privacy_flag: z
                      .boolean()
                      .describe(
                        "True when enabling the engine requires a plain-language disclosure because of where the operator is based.",
                      ),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "The shared SearXNG engine groups, minimum engine counts, operator disclosures and recommended defaults used by Home and Stack. Engine names are pinned to the SearXNG version the Stack ships; no catalog engine requires an API key.",
  );
export type SearxngEngines = z.infer<typeof SearxngEngines>;

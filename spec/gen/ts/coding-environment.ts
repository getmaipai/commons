// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/coding-environment.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). The setup a Code session starts from: image, setup script, plain variables the agent can read, default network and resources. Person scope, or household when an admin shares it. No secret field in this version (CODE-NETSECRET-01); a variable here is visible to the agent.*/
export const CodingEnvironment = z
  .object({
    id: z.string().regex(new RegExp("^cenv-[a-z0-9]{6,}$")),
    /**Either a person or the household.*/
    owner: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [
          z
            .object({
              person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
            })
            .strict(),
          z.object({ household: z.literal(true) }).strict(),
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
      .describe("Either a person or the household."),
    name: z.string().min(1).max(60),
    /**The pinned sandbox image id.*/
    image: z.string().min(1).max(120).describe("The pinned sandbox image id."),
    setup_script: z.string().max(20000).optional(),
    /**Plain variables. Visible to the agent; never put a secret here.*/
    env: z
      .record(z.string(), z.string().max(2000))
      .describe(
        "Plain variables. Visible to the agent; never put a secret here.",
      ),
    network: z
      .object({
        /**none: the sandbox reaches only the gateway. hosts: it also reaches the listed hosts through the egress proxy.*/
        policy: z
          .enum(["none", "hosts"])
          .describe(
            "none: the sandbox reaches only the gateway. hosts: it also reaches the listed hosts through the egress proxy.",
          ),
        hosts: z
          .array(
            z
              .string()
              .regex(new RegExp("^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$"))
              .min(1)
              .max(253),
          )
          .refine(
            (arr) => arr.every((item, i) => arr.indexOf(item) == i),
            "All items must be unique!",
          ),
      })
      .strict(),
    resources: z
      .object({
        cpus: z.number().int().gte(1),
        memory_gb: z.number().int().gte(1),
      })
      .strict(),
    created_at: z.string().datetime({ offset: true }),
    provenance: z.string().min(1),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "CODE-SPEC-01 (Home docs/design/local-coding-2026-10-17.md section 4.2). The setup a Code session starts from: image, setup script, plain variables the agent can read, default network and resources. Person scope, or household when an admin shares it. No secret field in this version (CODE-NETSECRET-01); a variable here is visible to the agent.",
  );
export type CodingEnvironment = z.infer<typeof CodingEnvironment>;

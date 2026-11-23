// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/systems.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**maipai.systems/1: the inside of a robot. Every piece belongs to one system, every system sits in one layer, every system lists its components, and each component has one type, one owner, a status per body, a memory budget, interfaces in and out, tests and docs. Part ids come from vocab/robot-api.json and capability ids from vocab/capabilities.json; this file copies neither. The cross-field rules (no reaching up a layer, one owner per piece of state, ids resolve, every component has an owner) cannot be written in JSON Schema and live in scripts/check-systems.ts. A new body adds its id to `bodies`; every `status` object then carries that key.*/
export const Systems = z
  .object({
    schema: z.literal("maipai.systems/1"),
    note: z.string().optional(),
    /**The bodies a status can be given for: `stackchan`, `reachy`, and `none` (no body: a screen or voice-only bot).*/
    bodies: z
      .array(
        z
          .object({
            id: z.string().regex(new RegExp("^[a-z][a-z0-9_]{1,11}$")),
            title: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .describe(
        "The bodies a status can be given for: `stackchan`, `reachy`, and `none` (no body: a screen or voice-only bot).",
      ),
    /**Layer 0 is the base (stock seams, no systems of ours). A system's layer may call only systems in a lower layer.*/
    layers: z
      .array(
        z
          .object({
            n: z.number().int().gte(0).lte(9),
            id: z.string().regex(new RegExp("^[a-z][a-z0-9_]*$")),
            title: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .describe(
        "Layer 0 is the base (stock seams, no systems of ours). A system's layer may call only systems in a lower layer.",
      ),
    systems: z
      .array(
        z
          .object({
            /**The C++ namespace and folder name. Never changes.*/
            id: z
              .string()
              .regex(new RegExp("^[a-z][a-z0-9]{1,11}$"))
              .describe("The C++ namespace and folder name. Never changes."),
            title: z.string().min(1).max(40),
            purpose: z.string().max(200).optional(),
            layer: z.number().int().gte(1).lte(9),
            /**The track that answers for it.*/
            owner: z.string().min(1).describe("The track that answers for it."),
            /**Part ids from vocab/robot-api.json this system serves.*/
            parts: z
              .array(z.string().min(1))
              .describe(
                "Part ids from vocab/robot-api.json this system serves.",
              ),
            /**Capability ids from vocab/capabilities.json.*/
            capabilities: z
              .array(z.string().min(1))
              .describe("Capability ids from vocab/capabilities.json.")
              .optional(),
            /**One state per body id in `bodies`. The key set is checked against `bodies` by the rule check.*/
            status: z
              .record(
                z.string(),
                z
                  .enum([
                    "idea",
                    "designed",
                    "built",
                    "proven_virtual",
                    "proven_unit",
                    "reserved",
                    "absent",
                  ])
                  .describe(
                    "How far a piece is built on one body, in the feature ledger's words.",
                  ),
              )
              .describe(
                "One state per body id in `bodies`. The key set is checked against `bodies` by the rule check.",
              )
              .optional(),
            /**The build switch that compiles the piece in.*/
            switch: z
              .string()
              .regex(new RegExp("^CONFIG_MAIPAI_[A-Z0-9_]+$"))
              .describe("The build switch that compiles the piece in.")
              .optional(),
            /**When the piece takes its memory. `on_demand` and `setup_only` share the admit-then-stop life cycle.*/
            load: z
              .enum(["always", "on_demand", "setup_only"])
              .describe(
                "When the piece takes its memory. `on_demand` and `setup_only` share the admit-then-stop life cycle.",
              )
              .optional(),
            budget: z
              .object({
                internal_kb: z.union([z.number().gte(0), z.null()]),
                dma_kb: z.union([z.number().gte(0), z.null()]),
                psram_kb: z.union([z.number().gte(0), z.null()]),
                flash_kb: z.union([z.number().gte(0), z.null()]),
                cpu_pct: z.union([z.number().gte(0).lte(100), z.null()]),
                basis: z.enum(["unset", "cap", "estimate", "measured"]),
              })
              .strict()
              .optional(),
            /**Rules this system never breaks, one line each.*/
            never: z
              .array(z.string().min(1))
              .describe("Rules this system never breaks, one line each.")
              .optional(),
            docs: z.array(z.string().min(1)).optional(),
            components: z
              .array(
                z
                  .object({
                    /**`<system>.<name>`; the prefix is the owning system's id.*/
                    id: z
                      .string()
                      .regex(
                        new RegExp(
                          "^[a-z][a-z0-9]{1,11}\\.[a-z][a-z0-9_]{1,23}$",
                        ),
                      )
                      .describe(
                        "`<system>.<name>`; the prefix is the owning system's id.",
                      ),
                    /**driver: touches hardware or a stock seam. service: owns state and offers calls. behavior: decides when to act, owns no hardware. asset: loaded or installed data. adapter: the host or brain half of a system, reaches the unit only through tools.*/
                    type: z
                      .enum([
                        "driver",
                        "service",
                        "behavior",
                        "asset",
                        "adapter",
                      ])
                      .describe(
                        "driver: touches hardware or a stock seam. service: owns state and offers calls. behavior: decides when to act, owns no hardware. asset: loaded or installed data. adapter: the host or brain half of a system, reaches the unit only through tools.",
                      ),
                    title: z.string().min(1).max(60),
                    runs_on: z.enum(["unit", "host", "brain"]),
                    /**One state per body id in `bodies`. The key set is checked against `bodies` by the rule check.*/
                    status: z
                      .record(
                        z.string(),
                        z
                          .enum([
                            "idea",
                            "designed",
                            "built",
                            "proven_virtual",
                            "proven_unit",
                            "reserved",
                            "absent",
                          ])
                          .describe(
                            "How far a piece is built on one body, in the feature ledger's words.",
                          ),
                      )
                      .describe(
                        "One state per body id in `bodies`. The key set is checked against `bodies` by the rule check.",
                      ),
                    /**The build switch that compiles the piece in.*/
                    switch: z
                      .string()
                      .regex(new RegExp("^CONFIG_MAIPAI_[A-Z0-9_]+$"))
                      .describe("The build switch that compiles the piece in.")
                      .optional(),
                    /**When the piece takes its memory. `on_demand` and `setup_only` share the admit-then-stop life cycle.*/
                    load: z
                      .enum(["always", "on_demand", "setup_only"])
                      .describe(
                        "When the piece takes its memory. `on_demand` and `setup_only` share the admit-then-stop life cycle.",
                      )
                      .optional(),
                    budget: z
                      .object({
                        internal_kb: z.union([z.number().gte(0), z.null()]),
                        dma_kb: z.union([z.number().gte(0), z.null()]),
                        psram_kb: z.union([z.number().gte(0), z.null()]),
                        flash_kb: z.union([z.number().gte(0), z.null()]),
                        cpu_pct: z.union([
                          z.number().gte(0).lte(100),
                          z.null(),
                        ]),
                        basis: z.enum(["unset", "cap", "estimate", "measured"]),
                      })
                      .strict()
                      .optional(),
                    /**State only this component may write.*/
                    owns: z
                      .array(z.string().min(1))
                      .describe("State only this component may write.")
                      .optional(),
                    /**Calls offered, `<system>::<name>`.*/
                    provides: z
                      .array(z.string().min(1))
                      .describe("Calls offered, `<system>::<name>`.")
                      .optional(),
                    /**Calls made (`<system>::<name>`), or tool names for an adapter.*/
                    uses: z
                      .array(z.string().min(1))
                      .describe(
                        "Calls made (`<system>::<name>`), or tool names for an adapter.",
                      )
                      .optional(),
                    /**Events published, snake case.*/
                    events: z
                      .array(z.string().min(1))
                      .describe("Events published, snake case.")
                      .optional(),
                    /**Events subscribed to.*/
                    listens: z
                      .array(z.string().min(1))
                      .describe("Events subscribed to.")
                      .optional(),
                    /**Tool names this component owns.*/
                    tools: z
                      .array(z.string().min(1))
                      .describe("Tool names this component owns.")
                      .optional(),
                    /**Settings keys this component owns.*/
                    settings: z
                      .array(z.string().min(1))
                      .describe("Settings keys this component owns.")
                      .optional(),
                    /**Repo paths of the tests that prove it.*/
                    tests: z
                      .array(z.string().min(1))
                      .describe("Repo paths of the tests that prove it."),
                    docs: z.array(z.string().min(1)).optional(),
                    /**privacy: mics, camera, memory, anything that leaves the robot. physical: moves, heat, battery. trust: keys, passwords, pairing, updates.*/
                    safety: z
                      .enum(["none", "privacy", "physical", "trust"])
                      .describe(
                        "privacy: mics, camera, memory, anything that leaves the robot. physical: moves, heat, battery. trust: keys, passwords, pairing, updates.",
                      ),
                  })
                  .strict(),
              )
              .optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .describe(
    "maipai.systems/1: the inside of a robot. Every piece belongs to one system, every system sits in one layer, every system lists its components, and each component has one type, one owner, a status per body, a memory budget, interfaces in and out, tests and docs. Part ids come from vocab/robot-api.json and capability ids from vocab/capabilities.json; this file copies neither. The cross-field rules (no reaching up a layer, one owner per piece of state, ids resolve, every component has an owner) cannot be written in JSON Schema and live in scripts/check-systems.ts. A new body adds its id to `bodies`; every `status` object then carries that key.",
  );
export type Systems = z.infer<typeof Systems>;

// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/synth.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**An artificial being: one personality with a voice, a look, an audience and a life. A companion is a synth assigned to a person; a cast entry is a synth assigned to a part (talent-2026-11-07.md section 2).*/
export const Synth = z
  .object({
    /**The companion package or household companion id (hc-...).*/
    id: z
      .string()
      .regex(new RegExp("^[a-z0-9][a-z0-9-]{0,39}$"))
      .describe("The companion package or household companion id (hc-...)."),
    /**Required when kind is "companion" (session-a-intelligence.md step 8), unused otherwise. Composed by home/backend/src/lib/persona.ts into the turn engine's identity line and system-prompt fragment: display_name replaces the hardcoded "MaiPai" in "You are {display_name}, ...", the four style dials are the same ones lib/persona.ts already had before companions were packages, and examples is a short few-shot block (legacy's own finding: "the single biggest lever for small-model voice fidelity").*/
    persona: z
      .object({
        display_name: z.string().min(1).max(40),
        pronouns: z.string().min(1).max(20).optional(),
        tagline: z.string().min(1).max(80).optional(),
        /**Short by design: no authoring UI exists yet to keep a longer one consistent with itself turn to turn (docs/dev.md's persona research).*/
        backstory: z
          .string()
          .min(1)
          .max(400)
          .describe(
            "Short by design: no authoring UI exists yet to keep a longer one consistent with itself turn to turn (docs/dev.md's persona research).",
          )
          .optional(),
        interests: z.array(z.string().min(1)).max(8).optional(),
        /**DYNAMIC-COMPANION-01: who this companion is for. "all" is a dynamic companion: it adapts its words, topics and tone to the age band of whoever it speaks to, and may be used on any robot. "teen" and "adult" are explicit companions: their own style may be edgier, and a robot can use one only when its controls are at or above that level. A companion never loosens a filter: the band of a turn is the person's or robot's own, whatever the companion. Absent: read from the manifest's min_role (child or guest: all, teen: teen, anything higher: adult).*/
        audience: z
          .enum(["all", "teen", "adult"])
          .describe(
            'DYNAMIC-COMPANION-01: who this companion is for. "all" is a dynamic companion: it adapts its words, topics and tone to the age band of whoever it speaks to, and may be used on any robot. "teen" and "adult" are explicit companions: their own style may be edgier, and a robot can use one only when its controls are at or above that level. A companion never loosens a filter: the band of a turn is the person\'s or robot\'s own, whatever the companion. Absent: read from the manifest\'s min_role (child or guest: all, teen: teen, anything higher: adult).',
          )
          .optional(),
        /**DYNAMIC-COMPANION-01: short style rules in the character's own terms, composed after the style dials. Used for what the dials cannot say (for example: react before asking, never invent a memory).*/
        behavior: z
          .array(z.string().min(1).max(200))
          .max(6)
          .describe(
            "DYNAMIC-COMPANION-01: short style rules in the character's own terms, composed after the style dials. Used for what the dials cannot say (for example: react before asking, never invent a memory).",
          )
          .optional(),
        /**DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is child (simple words, gentle). Fewer than `examples`, then topped up from `examples`.*/
        examples_child: z
          .array(z.string().min(1))
          .min(2)
          .max(5)
          .describe(
            "DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is child (simple words, gentle). Fewer than `examples`, then topped up from `examples`.",
          )
          .optional(),
        /**DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is teen.*/
        examples_teen: z
          .array(z.string().min(1))
          .min(2)
          .max(5)
          .describe(
            "DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is teen.",
          )
          .optional(),
        /**DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is adult.*/
        examples_adult: z
          .array(z.string().min(1))
          .min(2)
          .max(5)
          .describe(
            "DYNAMIC-COMPANION-01: few-shot lines used first when the turn's age band is adult.",
          )
          .optional(),
        /**3 to 5 lines in the character's own voice, composed as a few-shot block.*/
        examples: z
          .array(z.string().min(1))
          .min(3)
          .max(5)
          .describe(
            "3 to 5 lines in the character's own voice, composed as a few-shot block.",
          )
          .optional(),
        voice_id: z.string().min(1).optional(),
        formality: z.enum(["casual", "neutral", "formal"]),
        complexity: z.enum(["simple", "standard", "advanced"]),
        engagement: z.enum(["brief", "balanced", "curious"]),
        filler_density: z.enum(["none", "light", "frequent"]),
        /**NAT-06: how this companion says a clock time aloud. formal keeps the part of day and says "four P M"; plain says "four o'clock"; loose is read by the prompt as "like four". Absent means plain on a spoken turn, today's behavior for a companion that sets nothing. The normalizer never rounds; loose maps to timeStyle plain.*/
        clock_style: z
          .enum(["formal", "plain", "loose"])
          .describe(
            'NAT-06: how this companion says a clock time aloud. formal keeps the part of day and says "four P M"; plain says "four o\'clock"; loose is read by the prompt as "like four". Absent means plain on a spoken turn, today\'s behavior for a companion that sets nothing. The normalizer never rounds; loose maps to timeStyle plain.',
          )
          .optional(),
        /**NAT-06: how often a hedge ("probably", "I think") appears when the evidence's certainty band is below sure. Absent means medium.*/
        hedging: z
          .enum(["low", "medium", "high"])
          .describe(
            'NAT-06: how often a hedge ("probably", "I think") appears when the evidence\'s certainty band is below sure. Absent means medium.',
          )
          .optional(),
        /**NAT-06: three baselines the turn's signal can override (a joke is dropped when the person is upset). Three steps, not percentages. Absent fields mean medium.*/
        social: z
          .object({
            humor: z.enum(["low", "medium", "high"]).optional(),
            warmth: z.enum(["low", "medium", "high"]).optional(),
            initiative: z.enum(["low", "medium", "high"]).optional(),
          })
          .strict()
          .describe(
            "NAT-06: three baselines the turn's signal can override (a joke is dropped when the person is upset). Three steps, not percentages. Absent fields mean medium.",
          )
          .optional(),
        /**STATUS-PHRASES-01: this companion's own waiting-line phrases, replacing status-phrases/default.json's set one moment at a time - a moment left out here falls back to the default set for that moment. `thinking` shows before the first token, `searching` while a lookup or tool runs (a tool's own real label, TOOL-EVENTS-01/02, wins over any of these), `checking` during the phrasing round after a tool. Written chat only; the spoken surface keeps its own thinking-cue mechanism unchanged. Each property inlines the identical array shape rather than a same-file $ref - gen-ts.ts's own header warns that $RefParser.dereference() has corrupted an internal oneOf here before (recipe.schema.json's own steps); not worth risking on three short arrays.*/
        status_phrases: z
          .object({
            thinking: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
            searching: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
            checking: z
              .array(z.string().regex(new RegExp("…$")).min(1).max(40))
              .min(1)
              .optional(),
          })
          .strict()
          .describe(
            "STATUS-PHRASES-01: this companion's own waiting-line phrases, replacing status-phrases/default.json's set one moment at a time - a moment left out here falls back to the default set for that moment. `thinking` shows before the first token, `searching` while a lookup or tool runs (a tool's own real label, TOOL-EVENTS-01/02, wins over any of these), `checking` during the phrasing round after a tool. Written chat only; the spoken surface keeps its own thinking-cue mechanism unchanged. Each property inlines the identical array shape rather than a same-file $ref - gen-ts.ts's own header warns that $RefParser.dereference() has corrupted an internal oneOf here before (recipe.schema.json's own steps); not worth risking on three short arrays.",
          )
          .optional(),
        /**Trained per-companion voice adapters by base model, as designed in the EVAL-03 design pass.*/
        style_adapters: z
          .array(
            z
              .object({
                base_model: z.string(),
                format: z.literal("gguf-lora"),
                url: z.string().regex(new RegExp("^https://")),
                sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
                approx_bytes: z.number().int().gte(1),
                corpus_sha256: z.string().regex(new RegExp("^[a-f0-9]{64}$")),
              })
              .strict(),
          )
          .max(8)
          .describe(
            "Trained per-companion voice adapters by base model, as designed in the EVAL-03 design pass.",
          )
          .optional(),
        /**The words the image and video tools start from for this character.*/
        look_prompt: z
          .string()
          .min(1)
          .max(600)
          .describe(
            "The words the image and video tools start from for this character.",
          )
          .optional(),
        /**Absent means ready.*/
        status: z
          .enum(["draft", "rendering", "needs_review", "ready"])
          .describe("Absent means ready.")
          .optional(),
        review: z
          .object({
            confirmed_by: z.string().min(1),
            confirmed_at: z.string().datetime({ offset: true }),
          })
          .strict()
          .optional(),
        animation: z
          .object({
            kind: z.literal("video"),
            spec_version: z.number().int().gte(1),
            key: z.string().regex(new RegExp("^#[0-9A-Fa-f]{6}$")),
            sheet: z
              .object({
                rest: z
                  .string()
                  .regex(
                    new RegExp("^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"),
                  ),
                card: z
                  .string()
                  .regex(
                    new RegExp("^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"),
                  ),
              })
              .strict()
              .optional(),
            states: z
              .object({
                idle: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict(),
                researching: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                writing: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                done: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                laughing: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                surprised: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                sad: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                confused: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                idle_look: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                listening: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                thinking: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                working: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                speaking: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                needs_you: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                greeting: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                happy: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                oops: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                celebrate: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
                sleeping: z
                  .object({
                    h264: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    av1: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.mp4$",
                        ),
                      )
                      .optional(),
                    still: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      ),
                    loop: z.boolean(),
                    keyframe: z
                      .string()
                      .regex(
                        new RegExp(
                          "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]{0,63}\\.png$",
                        ),
                      )
                      .optional(),
                  })
                  .strict()
                  .optional(),
              })
              .strict(),
            provenance: z
              .object({
                tool: z.string().optional(),
                model_sha256: z
                  .string()
                  .regex(new RegExp("^[0-9A-Fa-f]{64}$"))
                  .optional(),
                prompt_hash: z
                  .string()
                  .regex(new RegExp("^[0-9A-Fa-f]{64}$"))
                  .optional(),
                seed: z.number().int().optional(),
                approved_by: z.string().optional(),
                approved_at: z.string().datetime({ offset: true }).optional(),
              })
              .strict()
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .describe(
        'Required when kind is "companion" (session-a-intelligence.md step 8), unused otherwise. Composed by home/backend/src/lib/persona.ts into the turn engine\'s identity line and system-prompt fragment: display_name replaces the hardcoded "MaiPai" in "You are {display_name}, ...", the four style dials are the same ones lib/persona.ts already had before companions were packages, and examples is a short few-shot block (legacy\'s own finding: "the single biggest lever for small-model voice fidelity").',
      ),
    based_on: z
      .object({
        kind: z.enum(["none", "household_member", "real_person"]),
        /**Required when kind is household_member.*/
        person_id: z
          .union([
            z
              .string()
              .regex(new RegExp("^person-[a-z0-9]{6,}$"))
              .describe("Required when kind is household_member."),
            z.null().describe("Required when kind is household_member."),
          ])
          .describe("Required when kind is household_member.")
          .default(null),
        /**The real name when kind is real_person; always shown as Based on <name>. persona.display_name defaults to it and may differ (Donnie for a synth based on Donald Trump).*/
        name: z
          .union([
            z
              .string()
              .max(120)
              .describe(
                "The real name when kind is real_person; always shown as Based on <name>. persona.display_name defaults to it and may differ (Donnie for a synth based on Donald Trump).",
              ),
            z
              .null()
              .describe(
                "The real name when kind is real_person; always shown as Based on <name>. persona.display_name defaults to it and may differ (Donnie for a synth based on Donald Trump).",
              ),
          ])
          .describe(
            "The real name when kind is real_person; always shown as Based on <name>. persona.display_name defaults to it and may differ (Donnie for a synth based on Donald Trump).",
          )
          .default(null),
        /**How often the researcher refreshes a real person's history; null means never after the first run.*/
        refresh: z
          .union([z.literal("1d"), z.literal("7d"), z.literal(null)])
          .describe(
            "How often the researcher refreshes a real person's history; null means never after the first run.",
          )
          .default("7d"),
        /**Set by the researcher when a real person's dated birth fact makes them under 18; carried into the CSAM check (rule 10). Never set by hand.*/
        minor: z
          .boolean()
          .describe(
            "Set by the researcher when a real person's dated birth fact makes them under 18; carried into the CSAM check (rule 10). Never set by hand.",
          )
          .default(false),
      })
      .strict(),
    life: z
      .object({
        /**False keeps the synth static. Always false when based_on.kind is not none.*/
        enabled: z
          .boolean()
          .describe(
            "False keeps the synth static. Always false when based_on.kind is not none.",
          ),
        seed: z.string().max(200).default(""),
      })
      .strict(),
    owner_person_id: z.string().regex(new RegExp("^person-[a-z0-9]{6,}$")),
    /**The saved subject that is this synth's look for pictures and films; null until one is made.*/
    subject_id: z
      .union([
        z
          .string()
          .regex(new RegExp("^msub-[a-z0-9]{6,}$"))
          .describe(
            "The saved subject that is this synth's look for pictures and films; null until one is made.",
          ),
        z
          .null()
          .describe(
            "The saved subject that is this synth's look for pictures and films; null until one is made.",
          ),
      ])
      .describe(
        "The saved subject that is this synth's look for pictures and films; null until one is made.",
      ),
    /**What the researcher must not overwrite (TALENT-13, TALENT-14).*/
    pins: z
      .object({
        dials: z.array(z.string()).default([]),
        examples: z.array(z.string()).default([]),
      })
      .strict()
      .describe(
        "What the researcher must not overwrite (TALENT-13, TALENT-14).",
      )
      .default({ dials: [], examples: [] }),
    /**For a synth based on a real person: each known phrase in persona.examples to the page it came from (TALENT-14).*/
    phrase_sources: z
      .record(z.string(), z.string().url())
      .describe(
        "For a synth based on a real person: each known phrase in persona.examples to the page it came from (TALENT-14).",
      )
      .default({}),
    /**The base synth this one was copied from when a person made it their companion (design 2.3). Null for a base.*/
    forked_from: z
      .union([
        z
          .string()
          .regex(new RegExp("^[a-z0-9][a-z0-9-]{0,39}$"))
          .describe(
            "The base synth this one was copied from when a person made it their companion (design 2.3). Null for a base.",
          ),
        z
          .null()
          .describe(
            "The base synth this one was copied from when a person made it their companion (design 2.3). Null for a base.",
          ),
      ])
      .describe(
        "The base synth this one was copied from when a person made it their companion (design 2.3). Null for a base.",
      )
      .default(null),
    /**Set on a companion fork: only this person (and a parent or admin for a minor) may see or use it. Null means household-wide by audience.*/
    private_to: z
      .union([
        z
          .string()
          .regex(new RegExp("^person-[a-z0-9]{6,}$"))
          .describe(
            "Set on a companion fork: only this person (and a parent or admin for a minor) may see or use it. Null means household-wide by audience.",
          ),
        z
          .null()
          .describe(
            "Set on a companion fork: only this person (and a parent or admin for a minor) may see or use it. Null means household-wide by audience.",
          ),
      ])
      .describe(
        "Set on a companion fork: only this person (and a parent or admin for a minor) may see or use it. Null means household-wide by audience.",
      )
      .default(null),
    provenance: z.string(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    hlc: z.string().regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$")),
  })
  .strict()
  .describe(
    "An artificial being: one personality with a voice, a look, an audience and a life. A companion is a synth assigned to a person; a cast entry is a synth assigned to a part (talent-2026-11-07.md section 2).",
  );
export type Synth = z.infer<typeof Synth>;

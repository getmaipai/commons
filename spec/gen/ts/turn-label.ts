// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/turn-label.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**Spec version 1. One label on one turn, the training and bench record for the search-assist head (ROUTER-BUILD-01a). This is the one place the label spec lives; the trainer and every bench dataset cite its version. utterance_ref and prev_turn_ref are pointers to stored turn rows (or to a bench row id), never hashes of text, and are never shown on admin pages or in logs. Household rows keep their text only on the hub. memory_worthy is out: it belongs to the memory judge's own dataset.*/
export const TurnLabel = z
  .object({
    id: z.string().min(1).max(128),
    /**Pointer to the stored turn row (or bench row id) holding the utterance. Never a hash of the text.*/
    utterance_ref: z
      .string()
      .min(1)
      .max(128)
      .describe(
        "Pointer to the stored turn row (or bench row id) holding the utterance. Never a hash of the text.",
      ),
    /**Pointer to the previous turn row, or null when there is none. Never a hash of the text.*/
    prev_turn_ref: z
      .union([
        z
          .string()
          .min(1)
          .max(128)
          .describe(
            "Pointer to the previous turn row, or null when there is none. Never a hash of the text.",
          ),
        z
          .null()
          .describe(
            "Pointer to the previous turn row, or null when there is none. Never a hash of the text.",
          ),
      ])
      .describe(
        "Pointer to the previous turn row, or null when there is none. Never a hash of the text.",
      ),
    band: z.enum(["child", "teen", "adult"]),
    surface: z.enum(["written", "spoken", "robot"]),
    /**BCP 47 tag, e.g. en.*/
    language: z
      .string()
      .regex(new RegExp("^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$"))
      .describe("BCP 47 tag, e.g. en."),
    /**A set over the ten tools plus none. ["none"] means no tool; none never appears beside another name.*/
    tool_need: z
      .array(z.string().regex(new RegExp("^[a-z][a-z0-9_]*$")))
      .min(1)
      .refine(
        (arr) => arr.every((item, i) => arr.indexOf(item) == i),
        "All items must be unique!",
      )
      .describe(
        'A set over the ten tools plus none. ["none"] means no tool; none never appears beside another name.',
      ),
    freshness: z.enum(["recency", "stable", "none"]),
    /**The websearch scope argument the turn needs (KS-BENCH-01), or null when it needs no search.*/
    search_scope: z
      .union([
        z
          .string()
          .regex(new RegExp("^[a-z][a-z0-9_]*$"))
          .describe(
            "The websearch scope argument the turn needs (KS-BENCH-01), or null when it needs no search.",
          ),
        z
          .null()
          .describe(
            "The websearch scope argument the turn needs (KS-BENCH-01), or null when it needs no search.",
          ),
      ])
      .describe(
        "The websearch scope argument the turn needs (KS-BENCH-01), or null when it needs no search.",
      ),
    /**Whether the previous turn's topic carries into this one.*/
    follow_up_carry: z
      .boolean()
      .describe("Whether the previous turn's topic carries into this one."),
    /**True when the person asked outright, false when the need is implied.*/
    explicit: z
      .boolean()
      .describe(
        "True when the person asked outright, false when the need is implied.",
      ),
    /**Whether the turn changes state (timer, reminder creation, other state).*/
    side_effect: z
      .enum(["none", "timer", "remind_create", "state"])
      .describe(
        "Whether the turn changes state (timer, reminder creation, other state).",
      ),
    provenance: z
      .object({
        source: z.enum(["bench", "synthetic-frontier", "owner-labelled"]),
        /**Author or generator of the utterance.*/
        author: z
          .string()
          .min(1)
          .describe("Author or generator of the utterance."),
        labeller: z.string().min(1),
        dataset_version: z.string().min(1),
      })
      .strict(),
    /**Hybrid logical clock: wall_ms:counter:node.*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node."),
  })
  .strict()
  .describe(
    "Spec version 1. One label on one turn, the training and bench record for the search-assist head (ROUTER-BUILD-01a). This is the one place the label spec lives; the trainer and every bench dataset cite its version. utterance_ref and prev_turn_ref are pointers to stored turn rows (or to a bench row id), never hashes of text, and are never shown on admin pages or in logs. Household rows keep their text only on the hub. memory_worthy is out: it belongs to the memory judge's own dataset.",
  );
export type TurnLabel = z.infer<typeof TurnLabel>;

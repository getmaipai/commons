// Hand-written Zod mirror of ../schemas/stack-model-pack.schema.json.
// MODELPACK-SPEC-01: the Stack's knowledge of one model, as data. It never
// holds an age rule, a household's choice, a person's words or a download link.
import { z } from "zod";

import { StackPartId } from "./stack-part";

export const StackJobName = z.enum(["picture", "picture_edit", "clip", "clip_from_sheet", "restyle", "swap", "character_sheet", "contact_sheet", "song", "song_edit", "sound_effect", "stems", "vocal_swap", "lyric_timing"]);
export type StackJobName = z.infer<typeof StackJobName>;
export const StackJobShape = z.enum(["landscape", "portrait", "square"]);
export const StackJobLevel = z.enum(["standard", "boost", "max"]);
export const StackJobAudience = z.enum(["adult", "minor"]);

const text = z.string().min(1);
const perLevel = <T extends z.ZodType>(v: T) => z.object({ standard: v.optional(), boost: v.optional(), max: v.optional() }).strict();
const Pixels = z.object({ width: z.number().int().min(1), height: z.number().int().min(1) }).strict();
export const StackJobCapabilities = z.object({ text: z.boolean(), end_picture: z.boolean(), sound: z.boolean(), keeps_likeness: z.boolean() }).strict();
export const StackJobLimitsBase = {
  max_seconds: perLevel(z.number().positive()).optional(),
  max_references: z.number().int().min(0).optional(),
  shapes: z.object({ landscape: perLevel(Pixels).optional(), portrait: perLevel(Pixels).optional(), square: perLevel(Pixels).optional() }).strict().optional(),
  max_words: z.number().int().min(0).optional(),
};

const PackJob = z.object({
  job: StackJobName,
  limits: z.object({ ...StackJobLimitsBase, steps_fixed: z.boolean().optional() }).strict(),
  audiences: z.array(StackJobAudience).min(1).refine((v) => new Set(v).size === v.length),
  capabilities: StackJobCapabilities,
  recipe: text,
  adapter: text.optional(),
  peaks: z.array(z.object({ shape: StackJobShape.optional(), level: StackJobLevel.optional(), bytes: z.number().int().min(0), status: z.enum(["measured", "unverified"]), measured_on: text.optional() }).strict()),
}).strict();

export const StackModelPack = z.object({
  id: StackPartId,
  version: text,
  part: StackPartId,
  jobs: z.array(PackJob).min(1),
  style_bases: z.array(z.object({ id: StackPartId, label: text, browse: z.array(text), retired: z.object({ mark: text }).strict().optional() }).strict()).optional(),
  field_map: z.record(text, text).optional(),
  notes: z.array(text).optional(),
}).strict();
export type StackModelPack = z.infer<typeof StackModelPack>;

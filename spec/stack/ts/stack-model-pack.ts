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

// VF-CAPS-01: one row per video operation and level, built by the Stack from its validators and measured tables (one source). Home may
// filter on input combinations only; whether a job fits in memory or how long it takes is the Stack's `available` answer (rule E4).
export const StackVideoOperation = z.enum(["clip_text", "clip_start_picture", "clip_start_end_pictures", "clip_sheet", "clip_references", "extend", "retake", "swap", "enhance"]);
export type StackVideoOperation = z.infer<typeof StackVideoOperation>;
export const StackOperationRow = z.object({
  operation: StackVideoOperation,
  level: StackJobLevel,
  available: z.boolean(),
  unavailable_reason: text.optional(),
  inputs: z.object({ start_picture: z.boolean(), end_picture: z.boolean(), references: z.number().int().min(0), sheets: z.number().int().min(0), source_clip: z.boolean() }).strict(),
  seconds: z.object({ min: z.number().positive(), max: z.number().positive() }).strict(),
  sizes: z.array(z.object({ width: z.number().int().min(1), height: z.number().int().min(1), orientation: StackJobShape }).strict()),
  sound: z.object({ generated: z.boolean(), voice_reference: z.boolean(), keeps_source_audio: z.boolean() }).strict(),
  requires: z.array(text),
}).strict();
export type StackOperationRow = z.infer<typeof StackOperationRow>;

// VF-PROFILE-01: the real recipe of one level, as values the runner reads. `level` stays the only quality key on the wire; `profile`
// ("preview" or "quality") is only a name for a group of levels. A `size` names a native size other than the level's default shape size.
export const StackFinishOp = z.enum(["lanczos_scale", "unsharp", "model_upscale", "loudness"]);
export const StackFinishStep = z.object({ op: StackFinishOp, params: z.record(text, z.union([z.number(), text])).optional() }).strict();
export const StackLevelRecipe = z.object({
  level: StackJobLevel,
  profile: z.enum(["preview", "quality"]),
  size: Pixels.optional(),
  steps: z.number().int().min(1),
  checkpoint: text,
  schedule: text,
  prompt_format: text,
  adapter: z.object({ id: text, strength: z.number(), required: z.boolean() }).strict().optional(),
  finish: z.array(StackFinishStep).optional(),
}).strict();
export type StackLevelRecipe = z.infer<typeof StackLevelRecipe>;

const PackJob = z.object({
  job: StackJobName,
  limits: z.object({ ...StackJobLimitsBase, steps_fixed: z.boolean().optional() }).strict(),
  audiences: z.array(StackJobAudience).min(1).refine((v) => new Set(v).size === v.length),
  capabilities: StackJobCapabilities,
  recipe: text,
  adapter: text.optional(),
  profiles: z.array(StackLevelRecipe).optional(),
  peaks: z.array(z.object({ shape: StackJobShape.optional(), level: StackJobLevel.optional(), bytes: z.number().int().min(0), status: z.enum(["measured", "unverified"]), measured_on: text.optional() }).strict()),
}).strict();

// MODELPACK-SPEC-03: what a client needs to rank a source's result for this base. `civitai_labels` are the labels
// a Civitai result names, `text_patterns` match a title or a repo name, `browse` stays the browse values, and
// `generic_labels` are a family's labels that name no version. All new fields are optional so older packs stay valid.
// A retired base says which base it was judged on (`tested_on`) and what each bench mark means (`marks`).
export const StackStyleMedia = z.enum(["picture", "video"]);
export const StackStyleBase = z.object({
  id: StackPartId,
  label: text,
  short: text.optional(),
  media: StackStyleMedia.optional(),
  civitai_labels: z.array(text).optional(),
  text_patterns: z.array(text).optional(),
  browse: z.array(text),
  generic_labels: z.array(text).optional(),
  retired: z.object({ mark: text, tested_on: StackPartId.optional(), marks: z.object({ tested: text.optional(), no_effect: text.optional() }).strict().optional() }).strict().optional(),
}).strict();
export type StackStyleBase = z.infer<typeof StackStyleBase>;

export const StackModelPack = z.object({
  id: StackPartId,
  version: text,
  part: StackPartId,
  jobs: z.array(PackJob).min(1),
  style_bases: z.array(StackStyleBase).optional(),
  field_map: z.record(text, text).optional(),
  notes: z.array(text).optional(),
}).strict();
export type StackModelPack = z.infer<typeof StackModelPack>;

// Hand-written Zod mirror of ../schemas/stack-jobs-catalog.schema.json.
// MODELPACK-SPEC-01: `GET /stack/v1/jobs/catalog?audience=adult|minor`. The
// minor shape has no why_not, no alternatives and no adult label (rule C10):
// a job a minor may not have is absent, never explained.
import { z } from "zod";

import { StackPartId } from "./stack-part";
import { StackJobCapabilities, StackJobLevel, StackJobLimitsBase, StackJobName, StackStyleMedia } from "./stack-model-pack";

const text = z.string().min(1);
const Alt = z.object({ part: StackPartId, label: text }).strict();
// MODELPACK-SPEC-03: a base the serving pack lists, with what a client needs to rank a Civitai result for it.
// A retired base is not listed and `browse` stays the pack's own business. The new fields are optional so an older Stack's answer stays valid.
const CatalogBase = z.object({
  id: StackPartId,
  label: text,
  short: text.optional(),
  media: StackStyleMedia.optional(),
  civitai_labels: z.array(text).optional(),
  text_patterns: z.array(text).optional(),
  generic_labels: z.array(text).optional(),
}).strict();
const entry = z.object({
  job: StackJobName,
  label: text,
  available: z.boolean(),
  part: z.object({ id: StackPartId, label: text }).strict().nullable(),
  limits: z.object({ levels: z.array(StackJobLevel).refine((v) => new Set(v).size === v.length), ...StackJobLimitsBase }).strict(),
  capabilities: StackJobCapabilities,
  styles: z.object({ bases: z.array(CatalogBase), max: z.number().int().min(0) }).strict(),
  restyles: z.array(z.object({ name: text, label: text }).strict()),
  stems: z.array(z.object({ name: text, label: text }).strict()).optional(),
});
export const StackAdultJobEntry = entry.extend({ why_not: text.nullable(), alternatives: z.array(Alt) }).strict();
export const StackMinorJobEntry = entry.strict();
export const StackJobsCatalog = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("adult"), jobs: z.array(StackAdultJobEntry) }).strict(),
  z.object({ audience: z.literal("minor"), jobs: z.array(StackMinorJobEntry) }).strict(),
]);
export type StackJobsCatalog = z.infer<typeof StackJobsCatalog>;

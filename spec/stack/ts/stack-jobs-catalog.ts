// Hand-written Zod mirror of ../schemas/stack-jobs-catalog.schema.json.
// MODELPACK-SPEC-01: `GET /stack/v1/jobs/catalog?audience=adult|minor`. The
// minor shape has no why_not, no alternatives and no adult label (rule C10):
// a job a minor may not have is absent, never explained.
import { z } from "zod";

import { StackPartId } from "./stack-part";
import { StackJobCapabilities, StackJobLevel, StackJobLimitsBase, StackJobName, StackOperationRow, StackStyleMedia } from "./stack-model-pack";

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
  operations: z.array(StackOperationRow).optional(),
  // VF-CONTRACT-01: the optional request fields this Stack's `POST /stack/v1/jobs/make` accepts for this job (every key of the job's request shape, `job` and `audience` included), so a client sends only what is advertised and never pays a failed call to an older Stack.
  request_fields: z.array(text).optional(),
  // VF-MINOR-RECIPE-01: the ratings this Stack holds a minor recipe for on this job; absent means none, and a caller keeps its own wording for a minor's clip.
  minor_ratings: z.array(z.enum(["G", "PG-13"])).min(1).optional(),
  styles: z.object({ bases: z.array(CatalogBase), max: z.number().int().min(0) }).strict(),
  restyles: z.array(z.object({ name: text, label: text }).strict()),
  stems: z.array(z.object({ name: text, label: text }).strict()).optional(),
});
export const StackAdultJobEntry = entry.extend({ why_not: text.nullable(), alternatives: z.array(Alt) }).strict();
export const StackMinorJobEntry = entry.strict();
// `spec` (VF-CONTRACT-01): the version of `@maipai/spec` the Stack was built against, e.g. "0.1.449". Absent on an older Stack: a client then sends only the fields that Stack's own contract has always had.
export const StackJobsCatalog = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal("adult"), jobs: z.array(StackAdultJobEntry), spec: text.optional() }).strict(),
  z.object({ audience: z.literal("minor"), jobs: z.array(StackMinorJobEntry), spec: text.optional() }).strict(),
]);
export type StackJobsCatalog = z.infer<typeof StackJobsCatalog>;

import { z } from "zod";
import vocabJson from "../../vocab/content-ratings.json" with { type: "json" };

export const RatingLevel = z.enum(["G", "PG", "PG-13", "R", "X", "Prohibited", "Unrated"]);
export type RatingLevel = z.infer<typeof RatingLevel>;

export const RatingSource = z.enum(["given", "declared", "worked_out"]);
export type RatingSource = z.infer<typeof RatingSource>;

export const RatingReason = z.enum(["swearing", "drugs", "gambling", "gore", "sexual", "minor_line", "scary", "self_harm"]);
export type RatingReason = z.infer<typeof RatingReason>;

export const RatedContentKind = z.enum(["film", "show", "song", "podcast", "article", "web_page", "picture", "clip", "reply"]);
export type RatedContentKind = z.infer<typeof RatedContentKind>;

const labelSchema = z.object({ system: z.string().min(1), value: z.string().min(1) }).strict();

export const ContentRating = z
  .object({
    level: RatingLevel,
    source: RatingSource,
    rater: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
    rater_version: z.number().int().min(1),
    rated_at: z.string().datetime({ offset: true }),
    reasons: z.array(RatingReason).refine((reasons) => new Set(reasons).size === reasons.length).optional(),
    label: labelSchema.optional(),
  })
  .strict()
  .superRefine((rating, context) => {
    if (rating.source !== "given" && rating.label !== undefined) {
      context.addIssue({ code: "custom", path: ["label"], message: "label is only allowed for given ratings" });
    }
    if (rating.level === "Prohibited" && !rating.reasons?.includes("minor_line")) {
      context.addIssue({ code: "custom", path: ["reasons"], message: "Prohibited requires minor_line" });
    }
    if (rating.level === "Unrated" && (rating.reasons?.length ?? 0) > 0) {
      context.addIssue({ code: "custom", path: ["reasons"], message: "Unrated cannot carry reasons" });
    }
  });
export type ContentRating = z.infer<typeof ContentRating>;

export const ContentRater = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
    version: z.number().int().min(1),
    rates: z.array(RatedContentKind).min(1).refine((rates) => new Set(rates).size === rates.length),
    priority: z.number().int().min(1),
    source: RatingSource,
    reaches_internet: z.boolean(),
  })
  .strict();
export type ContentRater = z.infer<typeof ContentRater>;

export const RATING_RANK: Readonly<Record<Exclude<RatingLevel, "Unrated">, 0 | 1 | 2 | 3 | 4 | 5>> = {
  G: 0,
  PG: 1,
  "PG-13": 2,
  R: 3,
  X: 4,
  Prohibited: 5,
};

export function rankOf(level: RatingLevel): 0 | 1 | 2 | 3 | 4 | 5 | null {
  return level === "Unrated" ? null : RATING_RANK[level];
}

const vocabShape = z
  .object({
    $comment: z.string(),
    levels: z.array(z.object({ id: RatingLevel, rank: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.null()]), shown_as: z.string() }).strict()).length(7),
    reasons: z.array(z.object({ id: RatingReason, from: z.enum(["content-policy", "design-note"]) }).strict()),
    labels: z.array(z.object({ system: z.string().min(1), value: z.string().min(1), level: z.enum(["G", "PG", "PG-13", "R", "X"]), note: z.string().min(1) }).strict()),
  })
  .strict();

const parsedVocab = vocabShape.parse(vocabJson);
const expectedLevels: Array<{ id: RatingLevel; rank: 0 | 1 | 2 | 3 | 4 | 5 | null }> = [
  { id: "G", rank: 0 },
  { id: "PG", rank: 1 },
  { id: "PG-13", rank: 2 },
  { id: "R", rank: 3 },
  { id: "X", rank: 4 },
  { id: "Prohibited", rank: 5 },
  { id: "Unrated", rank: null },
];
if (parsedVocab.levels.some((row, index) => row.id !== expectedLevels[index]?.id || row.rank !== expectedLevels[index]?.rank || row.shown_as !== expectedLevels[index]?.id)) {
  throw new Error("content-ratings vocabulary levels must remain in the declared rank order");
}
const labelKeys = parsedVocab.labels.map((row) => `${row.system}\u0000${row.value.trim().toLocaleLowerCase("en-US")}`);
if (new Set(labelKeys).size !== labelKeys.length) throw new Error("content-ratings vocabulary has duplicate system/value labels");

export const CONTENT_RATINGS_VOCAB = parsedVocab;

export function levelFromLabel(system: string, value: string | number | boolean): RatingLevel | null {
  const normalized = String(value).trim().toLocaleLowerCase("en-US");
  const row = CONTENT_RATINGS_VOCAB.labels.find((candidate) => candidate.system === system && candidate.value.trim().toLocaleLowerCase("en-US") === normalized);
  return row?.level ?? null;
}

export function overCeiling(level: RatingLevel, ceiling: 0 | 1 | 2 | 3 | 4): boolean {
  if (level === "Prohibited") return true;
  if (level === "Unrated") return ceiling < 4;
  return RATING_RANK[level] > ceiling;
}

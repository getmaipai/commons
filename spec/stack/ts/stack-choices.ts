// Hand-written Zod mirror of ../schemas/stack-choices-*.schema.json: the wire shapes of the Stack's choices API (`GET /stack/v1/choices` and the
// routes beside it, `backend/src/lib/choicesSchema.ts` in getmaipai/stack, docs/dev/choices.md). The Stack holds every model choice; the shared
// "AI and models" page in `@maipai/ui` (ui/src/stack/) and Home's forwarder read and write them through these shapes (STACK-MODELS-PAGE-01).
// Answers are not strict (an additive Stack change must not break an older reader); request bodies are not strict either, the Stack answers an
// unknown key with a plain sentence. The JSON Schemas beside this file are generated from it once and kept by hand after that; the fixture test
// (`tests/ts/stack-fixtures.test.ts`) proves the two agree.
import { z } from "zod";

export const STACK_CHOICE_LEVELS = ["reduced", "standard", "boost", "max"] as const;
export const STACK_CHOICE_PROFILES = ["p16", "p32", "p64", "p128"] as const;
export const STACK_CHOICE_CATEGORIES = ["chat", "coding", "pictures", "video", "music", "voice", "stt", "embeddings", "vision", "wakeword", "stems"] as const;

export const StackChoiceLevel = z.enum(STACK_CHOICE_LEVELS);
export const StackChoiceProfile = z.enum(STACK_CHOICE_PROFILES);
export const StackChoiceCategoryId = z.enum(STACK_CHOICE_CATEGORIES);
export const StackChoiceOptions = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
export const StackChoiceState = z.enum(["installed", "installing", "notInstalled", "failed", "unsupported"]);
export type StackChoiceLevel = z.infer<typeof StackChoiceLevel>;
export type StackChoiceProfile = z.infer<typeof StackChoiceProfile>;
export type StackChoiceCategoryId = z.infer<typeof StackChoiceCategoryId>;
export type StackChoiceOptions = z.infer<typeof StackChoiceOptions>;
export type StackChoiceState = z.infer<typeof StackChoiceState>;
const id = z.string().min(1).max(200);

/** The Stack's refusal: a plain sentence and a stable code. */
export const StackChoicesError = z.object({ error: z.string().min(1), code: z.string().min(1) });
export type StackChoicesError = z.infer<typeof StackChoicesError>;

export const StackChoiceCandidate = z.object({
  id: z.string().min(1),
  label: z.string().min(1).describe("The model's plain name."),
  summary: z.string().min(1).describe("One plain sentence: what it is good for and its limits."),
  family: z.string().nullable(),
  version: z.string().nullable().describe("The model version as people say it (for example 3.8); null when its name carries none."),
  quantization: z.string().nullable().describe("The precision in plain words (for example `4-bit, compact`)."),
  quantization_raw: z.string().nullable().describe("The catalog's own tag (for example `UD-IQ4_XS`)."),
  license: z.string().nullable(),
  repo: z.string().nullable(),
  engine: z.string().nullable().describe("The engine that runs it."),
  role: z.string().nullable().describe("The role it serves."),
  min_profile: z.string().nullable().describe("The smallest computer it is offered on, in plain words."),
  min_profile_id: StackChoiceProfile.nullable(),
  search_text: z.string().describe("Lowercase text for searching: label, id, repo, family, version, quantization (plain and raw), licence, summary, engine and role joined by spaces."),
  kind: z.enum(["shipped", "added"]).describe("`added` is a chat model an admin added by link."),
  pickable: z.boolean().describe("False for a part that is ordered, switched off or removed here but never chosen for a level."),
  state: StackChoiceState,
  reason: z.string().nullable().describe("The plain sentence for the state, or null when it is installed and fine."),
  size_bytes: z.number().int().nonnegative().describe("On disk when installed, else what installing it downloads."),
  download_bytes: z.number().int().nonnegative().describe("What an install would still download; 0 when installed."),
  peak_bytes: z.number().int().nonnegative().nullable(),
  peak_verified: z.boolean().nullable(),
  percent: z.number().nullable(),
  can_install: z.boolean(),
  can_uninstall: z.boolean(),
  licence_needed: z.boolean(),
  enabled: z.boolean().describe("False when it is on the category's off list."),
  rank: z.number().int().min(1).describe("Position in the category's order (1 is tried first)."),
});
export type StackChoiceCandidate = z.infer<typeof StackChoiceCandidate>;

export const StackChoiceLevelOption = z.object({ model: z.string().min(1), fits: z.boolean(), refusal: z.string().nullable() });
export const StackChoiceLevelRow = z.object({
  tier: StackChoiceLevel,
  cap_bytes: z.number().nullable().describe("What this level may use on this computer, in bytes; null where no cap applies."),
  chosen: z.string().nullable().describe("The model this level uses: the household's pick, else the recommended one. Null when the level is off or nothing fits."),
  chosen_by: z.enum(["household", "recommended", "off", "none"]),
  chosen_state: StackChoiceState.nullable(),
  customization: StackChoiceOptions.nullable().describe("The options stored with the household's pick (for example `thinking`); null when none."),
  problem: z.string().nullable().describe("A plain sentence when the saved pick is not offered here any more or no longer fits; the recommended model runs meanwhile."),
  options: z.array(StackChoiceLevelOption).describe("Every model that may be offered at this level, with whether it fits and the plain reason when it does not."),
  recommended: z.object({ model: z.string().nullable(), why: z.string() }),
});
export type StackChoiceLevelRow = z.infer<typeof StackChoiceLevelRow>;

export const StackChoiceProfileAssignment = z.object({
  profile: StackChoiceProfile,
  memory_gb: z.number(),
  current: z.boolean().describe("True for this computer's own profile."),
  assignments: z.array(z.object({ tier: StackChoiceLevel, model: z.string().min(1), customization: StackChoiceOptions.nullable() })),
});
export type StackChoiceProfileAssignment = z.infer<typeof StackChoiceProfileAssignment>;

export const StackChoiceRolePlan = z.object({ state: z.string(), fit: z.string(), reason: z.string() });

export const StackChoiceCategory = z.object({
  id: StackChoiceCategoryId,
  label: z.string().min(1),
  icon: z.string().min(1).describe("The kit icon name for this feature."),
  description: z.string().min(1).describe("One plain sentence saying what the feature does."),
  role: z.string().nullable(),
  role_enabled: z.boolean().nullable(),
  role_priority: z.number().int().nullable(),
  role_plan: StackChoiceRolePlan.nullable().describe("What the profile planner says about this category's role on this computer (state, fit, reason)."),
  steps: z.array(z.object({ id: z.enum(["installed", "loaded", "ready"]), label: z.string(), status: z.enum(["done", "current", "waiting", "failed"]), reason: z.string().nullable() })).describe("Readiness of the feature in order; empty when it has no role."),
  requires: z.array(z.object({ id: z.string().min(1), kind: z.enum(["engine", "draft"]), label: z.string(), state: StackChoiceState, reason: z.string().nullable(), size_bytes: z.number().int().nonnegative(), can_install: z.boolean(), can_uninstall: z.boolean(), needed_by: z.array(z.string()) })).describe("The engines and drafts the feature's models need."),
  available: z.boolean(),
  unavailable_reason: z.string().nullable(),
  tiered: z.boolean().describe("False for single-model categories, which have only the `standard` level."),
  order: z.array(z.string()).describe("Every candidate id, tried first to last."),
  disabled: z.array(z.string()),
  candidates: z.array(StackChoiceCandidate),
  tiers: z.array(StackChoiceLevelRow),
  profiles: z.array(StackChoiceProfileAssignment),
});
export type StackChoiceCategory = z.infer<typeof StackChoiceCategory>;

export const StackChoicesView = z.object({
  profile: StackChoiceProfile.nullable().describe("This computer's profile; null when its memory is below 16 GB."),
  memory_gb: z.number(),
  room_bytes: z.number(),
  free_disk_bytes: z.number(),
  categories: z.array(StackChoiceCategory),
  unused: z.object({ count: z.number().int(), total_bytes: z.number().int() }),
  migration: z.object({ done: z.boolean(), done_at: z.string().nullable(), accepted: z.number().int(), refused: z.number().int() }),
});
export type StackChoicesView = z.infer<typeof StackChoicesView>;

export const StackChoicePickRequest = z.object({
  model: id.describe("A model id from the category's candidates, `recommended` (clear the pick), or `off` (switch the level off; not for Standard)."),
  options: StackChoiceOptions.optional().describe("Customization stored with the pick, for example `{ \"thinking\": true }`."),
  profile: StackChoiceProfile.optional().describe("The hardware profile this assignment is for; omitted means this computer's own profile."),
  install: z.boolean().optional().describe("Start the download when the model is not installed (this computer's profile only). Default true."),
});
export type StackChoicePickRequest = z.infer<typeof StackChoicePickRequest>;
export const StackChoicePickResult = z.object({
  ok: z.literal(true),
  category: StackChoiceCategoryId,
  tier: StackChoiceLevel,
  profile: StackChoiceProfile,
  model: z.string().nullable(),
  changed: z.boolean(),
  applied: z.boolean().describe("True when the Stack changed a setting so the pick takes effect (voice engine, chat model)."),
  pending_restart: z.boolean(),
  install_job: z.string().nullable(),
  note: z.string().nullable(),
});
export type StackChoicePickResult = z.infer<typeof StackChoicePickResult>;

export const StackChoiceOrderRequest = z.object({
  order: z.array(id).max(60).describe("Candidate ids, tried first to last. Candidates left out keep their default place after these."),
  off: z.array(id).max(60).optional().describe("The candidates switched off. Omitted leaves the off list as it is."),
});
export type StackChoiceOrderRequest = z.infer<typeof StackChoiceOrderRequest>;
export const StackChoiceOrderResult = z.object({ ok: z.literal(true), category: StackChoiceCategoryId, order: z.array(z.string()), disabled: z.array(z.string()) });
export type StackChoiceOrderResult = z.infer<typeof StackChoiceOrderResult>;

export const StackChoicesRecommendedRequest = z.object({ dry_run: z.boolean().optional().describe("Answer what would change and write nothing. Default false.") });
export type StackChoicesRecommendedRequest = z.infer<typeof StackChoicesRecommendedRequest>;
export const StackChoicesRecommendedResult = z.object({
  dry_run: z.boolean(),
  changed: z.array(z.object({ category: StackChoiceCategoryId, tier: StackChoiceLevel, from: z.string().nullable(), to: z.string().min(1) })),
  unchanged: z.number().int(),
  roles: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).describe("The role settings written (empty on a dry run)."),
  installs: z.array(z.object({ model: z.string().min(1), job: z.string() })),
  skipped: z.array(z.object({ model: z.string().min(1), reason: z.string() })),
  needs_licence: z.array(z.object({ id: z.string().min(1), label: z.string() })),
});
export type StackChoicesRecommendedResult = z.infer<typeof StackChoicesRecommendedResult>;

export const StackChoicesUnused = z.object({
  items: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), category: StackChoiceCategoryId, kind: z.enum(["shipped", "added"]), size_bytes: z.number().int().nonnegative(), reason: z.string() })),
  total_bytes: z.number().int().nonnegative(),
  tidy: z.object({
    reclaimable_bytes: z.number().int().nonnegative(),
    items: z.array(z.object({ id: z.string().min(1), kind: z.enum(["superseded", "orphan_folder", "partial_download"]), bytes: z.number().int().nonnegative(), reason: z.string(), blocked: z.string().nullable() })),
  }),
});
export type StackChoicesUnused = z.infer<typeof StackChoicesUnused>;
export const StackChoicesRemoveRequest = z.object({
  ids: z.array(id).max(20).optional().describe("The unused models to remove. Each is judged again on fresh state."),
  tidy: z.boolean().optional().describe("Also run the Stack's tidy of replaced and abandoned files."),
});
export type StackChoicesRemoveRequest = z.infer<typeof StackChoicesRemoveRequest>;
export const StackChoicesRemoveResult = z.object({
  results: z.array(z.object({ id: z.string().min(1), status: z.enum(["removed", "kept", "failed"]), freed_bytes: z.number().int().nonnegative(), message: z.string() })),
  tidy_removed: z.array(z.object({ id: z.string().min(1), bytes: z.number().int().nonnegative() })),
  freed_bytes: z.number().int().nonnegative(),
  kept: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type StackChoicesRemoveResult = z.infer<typeof StackChoicesRemoveResult>;

export const StackChoicesAddModelRequest = z.object({
  source: z.string().trim().min(1).max(500).describe("A huggingface.co link or `owner/repo`."),
  file: z.string().trim().min(1).max(300).optional().describe("The .gguf file when the repository has more than one."),
  category: z.literal("chat").optional(),
  tier: StackChoiceLevel.optional().describe("Default standard."),
  use: z.boolean().optional().describe("Select the model for the category and level now. Default true."),
});
export type StackChoicesAddModelRequest = z.infer<typeof StackChoicesAddModelRequest>;
export const StackChoicesAddModelResult = z.object({
  ok: z.literal(true),
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.literal("chat"),
  tier: StackChoiceLevel,
  chosen: z.boolean(),
  state: StackChoiceState,
  install_job: z.string().nullable(),
  size_bytes: z.number().int().nonnegative(),
  licence: z.string(),
});
export type StackChoicesAddModelResult = z.infer<typeof StackChoicesAddModelResult>;

const migratedKind = z.enum(["slot", "order", "feature", "added_model"]);
const migratedValue = z.object({ kind: migratedKind, key: z.string().min(1), status: z.enum(["accepted", "unchanged", "refused"]), reason: z.string().nullable() });
export const StackChoicesMigrateRequest = z.object({
  dry_run: z.boolean().optional(),
  slots: z.array(z.object({ role: z.string().min(1).max(40), tier: StackChoiceLevel, model: id, options: StackChoiceOptions.optional() })).max(80).optional().describe("Home's `engines.<role>.tier.<tier>.model`."),
  orders: z.array(z.object({ category: z.string().min(1).max(40), order: z.array(id).max(60) })).max(20).optional().describe("Home's `engines.<category>.order`."),
  features: z.array(z.object({ role: z.string().min(1).max(40), enabled: z.boolean() })).max(20).optional().describe("Home's feature switches, already as on or off."),
  added_models: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).max(120), label: z.string().min(1).max(200), repo: z.string().min(1).max(300), file: z.string().min(1).max(400), url: z.string().url().max(1000),
    revision: z.string().min(1).max(100), sha256: z.string().regex(/^[a-f0-9]{64}$/), size_bytes: z.number().int().positive(),
    licence: z.string().max(200).nullable().optional(), architecture: z.string().max(100).optional(), verified: z.boolean().optional(), ram_bytes: z.number().int().nonnegative().optional(),
  })).max(40).optional().describe("Home's added chat model records."),
});
export type StackChoicesMigrateRequest = z.infer<typeof StackChoicesMigrateRequest>;
export const StackChoicesMigrateResult = z.object({
  dry_run: z.boolean(),
  already_done: z.boolean().describe("True when the migration was done before: nothing was read or written."),
  results: z.array(migratedValue),
  accepted: z.number().int(),
  refused: z.array(migratedValue).describe("The values the Stack refused; Home keeps them and shows the reason."),
  done_at: z.string().nullable(),
});
export type StackChoicesMigrateResult = z.infer<typeof StackChoicesMigrateResult>;

/** The shapes by their JSON Schema file name (`schemas/<name>.schema.json`), for the fixture test and for a host that validates an answer. */
export const STACK_CHOICES_SHAPES = {
  "stack-choices-view": StackChoicesView,
  "stack-choices-error": StackChoicesError,
  "stack-choices-pick-request": StackChoicePickRequest,
  "stack-choices-pick-result": StackChoicePickResult,
  "stack-choices-order-request": StackChoiceOrderRequest,
  "stack-choices-order-result": StackChoiceOrderResult,
  "stack-choices-recommended-request": StackChoicesRecommendedRequest,
  "stack-choices-recommended-result": StackChoicesRecommendedResult,
  "stack-choices-unused": StackChoicesUnused,
  "stack-choices-remove-request": StackChoicesRemoveRequest,
  "stack-choices-remove-result": StackChoicesRemoveResult,
  "stack-choices-add-model-request": StackChoicesAddModelRequest,
  "stack-choices-add-model-result": StackChoicesAddModelResult,
  "stack-choices-migrate-request": StackChoicesMigrateRequest,
  "stack-choices-migrate-result": StackChoicesMigrateResult,
} as const;

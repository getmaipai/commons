// STACK-MODELS-PAGE-01. The one interface the shared AI and models page talks through. It never calls `fetch`: a host writes a thin adapter
// (the Stack admin page over `/stack/v1/*` with its session cookie and CSRF header; Home over its own `/api/ai/*`, which forwards each call
// to the Stack unchanged) and hands it to `StackModelsPage`. Every method maps to one Stack route, so an adapter holds no logic. Shapes come
// from `@maipai/spec` (`stack/ts/stack-choices`); types only, so a host does not have to ship Zod to render the page.
import type {
  StackChoiceCategory, StackChoiceCategoryId, StackChoiceLevel, StackChoiceOptions, StackChoiceOrderRequest, StackChoiceOrderResult, StackChoicePickRequest, StackChoicePickResult,
  StackChoicesAddModelRequest, StackChoicesAddModelResult, StackChoicesRecommendedResult, StackChoicesRemoveRequest, StackChoicesRemoveResult, StackChoicesUnused, StackChoicesView,
} from "@maipai/spec/stack/ts/stack-choices";

export type { StackChoiceCategory, StackChoicesView };
export type StackLevel = StackChoiceLevel;
export type StackCategoryId = StackChoiceCategoryId;
export type StackCandidate = StackChoiceCategory["candidates"][number];
export type StackLevelRow = StackChoiceCategory["tiers"][number];
export type StackProfileAssignment = StackChoiceCategory["profiles"][number];
export type StackPickBody = StackChoicePickRequest;
export type StackPickResult = StackChoicePickResult;
export type StackOrderBody = StackChoiceOrderRequest;
export type StackOrderResult = StackChoiceOrderResult;
export type StackRecommendedResult = StackChoicesRecommendedResult;
export type StackUnused = StackChoicesUnused;
export type StackRemoveBody = StackChoicesRemoveRequest;
export type StackRemoveResult = StackChoicesRemoveResult;
export type StackAddModelBody = StackChoicesAddModelRequest;
export type StackAddModelResult = StackChoicesAddModelResult;
export type StackOptions = StackChoiceOptions;

/** What a host adapter throws: the Stack's own plain sentence (`message`) and its stable code (`unknown_model`, `does_not_fit`, ...). The page shows `message` as it is. */
export class StackClientError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "StackClientError";
    this.code = code;
  }
}

export interface StackInstallStarted { job: string | null; part: string; already_installed?: true; joined?: boolean }
export interface StackRemoved { part: string; freed_bytes: number; removed: boolean }

export interface StackDrive { id: string; label: string; root_path: string; connected: boolean; free_bytes: number; total_bytes: number; removable: boolean }
export interface StackDriveFeatureLocation { id: string; label: string; connected: boolean }
export interface StackDriveFeature { feature_id: string; label: string; bytes: number; drive_ids: string[]; drives: StackDriveFeatureLocation[] }
export interface StackDriveMovePlan { model_ids: string[]; bytes: number; started: boolean }
export type StackDriveMoveState = "planned" | "copying" | "verifying" | "switching" | "cleaning" | "done" | "failed";
export interface StackDriveMove { id: string; model_id: string; feature_id: string | null; from_disk: string; to_disk: string; state: StackDriveMoveState; bytes_done: number; bytes_total: number; error: string | null; updated_at: string }
export interface StackDrivesClient {
  list(): Promise<{ disks: StackDrive[] }>;
  features(): Promise<{ features: StackDriveFeature[] }>;
  plan(featureId: string, toDiskId: string): Promise<StackDriveMovePlan>;
  move(featureId: string, toDiskId: string): Promise<StackDriveMovePlan>;
  moves(): Promise<{ moves: StackDriveMove[] }>;
  cancel(): Promise<{ cancelled: boolean }>;
  /** `POST /stack/v1/disks`: tell the Stack about a folder on another drive that may hold models. */
  add(body: { label: string; root_path: string; removable: boolean }): Promise<StackDrive>;
  /** `DELETE /stack/v1/disks/{id}`: forget a drive (refused while models are on it; no file is touched). */
  remove(id: string): Promise<{ ok: true }>;
}

/** One model licence the Stack can install: its plain name, where to read it, and the points the household has to weigh (`summary`, short sentences). */
export interface StackLicence { id: string; name: string; url: string; summary: readonly string[] }
/** `GET /stack/v1/licences`: whether the household has accepted the model licences, and what they cover. One acceptance covers every model. */
export interface StackLicences { terms_version: string; accepted: boolean; accepted_at: string | null; by: string | null; licences: readonly StackLicence[] }
export interface StackLicencesClient {
  /** `GET /stack/v1/licences`. Starts no work. */
  read(): Promise<StackLicences>;
  /** `POST /stack/v1/licences`: record that the person reading has accepted every licence shown. */
  accept(): Promise<StackLicences>;
}

export type StackLoraMedia = "picture" | "video";
export type StackLoraSite = "huggingface" | "civitai";
export type StackLoraClass = "all-ages" | "adult-only";
export type StackLoraStatus = "ready" | "drive_missing" | "installing" | "failed";
/** One style (LoRA) in the Stack's one library: `GET /stack/v1/loras`. */
export interface StackLora {
  id: string; media: StackLoraMedia; name: string; base_model: string; classification: StackLoraClass; sha256: string; bytes: number; strength_default: number; trigger_words: string[]; licence: string; source_url: string | null; added_by: string | null; added_at: string;
  /** The drive holding the file; null is the Stack's own data directory. */
  disk_id: string | null; disk_label: string; status: StackLoraStatus; status_note: string | null; removed_at: string | null; trash_until: string | null; preview: string | null; home?: Record<string, unknown> | null;
}
/** What a host sends in place of an adult-only style the person may not see: no name, no id, no count. The page shows one quiet locked tile for it. */
export interface StackLoraLocked { locked: true }
export interface StackLoraSource { site: StackLoraSite; label: string; has_key: boolean }
export interface StackLoraHit { site: StackLoraSite; remote_id: string; name: string; base_model: string | null; downloads: number; install_url: string; file_name: string | null; bytes: number | null; audience_hint: StackLoraClass; licence: string | null; page_url: string }
export interface StackLoraPatch { name?: string; classification?: StackLoraClass; strength_default?: number; trigger_words?: string[]; source_url?: string | null; /** Home's fresh single-use adult-lock ticket; only a change from adult-only to all-ages needs one. */ ticket?: string }
export interface StackLoraInstallBody { media: StackLoraMedia; source: StackLoraSite; url: string; name: string; licence?: string; audience?: StackLoraClass; strength_default?: number; trigger_words?: string[]; disk_id?: string | null; sha256?: string; source_url?: string; base_model?: string | null }
/** The part of a Stack job the page shows (`GET /stack/v1/jobs/{id}`). */
export interface StackLoraJob { id: string; state: "queued" | "running" | "waiting_for_you" | "paused" | "stalled" | "done" | "failed" | "cancelled"; percent: number; status: string; reason: string | null }
export interface StackLorasClient {
  /** `GET /stack/v1/loras`; `removed: true` lists the trash. A host that redacts may put one `{ locked: true }` tile in the list. */
  list(options?: { removed?: boolean }): Promise<{ loras: Array<StackLora | StackLoraLocked>; trash_days: number }>;
  /** `PATCH /stack/v1/loras/{id}`. */
  patch(id: string, body: StackLoraPatch): Promise<StackLora>;
  /** `DELETE /stack/v1/loras/{id}`: to the trash; `purge: true` deletes for good. */
  remove(id: string, purge?: boolean): Promise<{ ok: true; purged: boolean }>;
  /** `POST /stack/v1/loras/{id}/restore`. */
  restore(id: string): Promise<StackLora>;
  /** `POST /stack/v1/loras/{id}/move`: starts a `lora.move` job. */
  move(id: string, diskId: string): Promise<{ job: string }>;
  /** `POST /stack/v1/loras/install`: starts an install job. Refused with the Stack's own sentence (code `licence_not_accepted`) until the licences are accepted. */
  install(body: StackLoraInstallBody): Promise<{ job: string }>;
  /** `GET /stack/v1/loras/sources`: the two sites and whether a key is saved (never the key). */
  sources(): Promise<{ sources: StackLoraSource[] }>;
  /** `PUT /stack/v1/loras/sources/{site}/key`; `null` removes the key. */
  setKey(site: StackLoraSite, key: string | null): Promise<{ sources: StackLoraSource[] }>;
  /** `GET /stack/v1/loras/sources/{site}/search`. */
  search(site: StackLoraSite, query: string): Promise<{ hits: StackLoraHit[] }>;
  /** `GET /stack/v1/jobs/{id}`. Optional: without it the page shows "Working" and re-reads the list. */
  job?(id: string): Promise<StackLoraJob>;
  /** The address of a style's preview picture (`GET /stack/v1/loras/{id}/preview`), or null. Optional: without it the page shows an icon. */
  previewUrl?(id: string): string | null;
}

export interface StackClient {
  /** Optional drive management routes. Hosts without them keep the existing page unchanged. */
  drives?: StackDrivesClient;
  /** Optional model-licence card. Hosts without it keep the existing page unchanged. */
  licences?: StackLicencesClient;
  /** Optional style (LoRA) library for `StackLorasPage`. Hosts without it keep every other page unchanged. */
  loras?: StackLorasClient;
  /** `GET /stack/v1/choices`: everything the page shows, in one read. Starts no work. */
  readChoices(): Promise<StackChoicesView>;
  /** `PUT /stack/v1/settings` with `stack.roles.<role>.enabled`. */
  setRoleEnabled(role: string, enabled: boolean): Promise<void>;
  /** `PUT /stack/v1/settings` with `stack.roles.<role>.priority` for each role (lower is served first). */
  setRolePriorities(priorities: Readonly<Record<string, number>>): Promise<void>;
  /** `PUT /stack/v1/choices/{category}/{level}`: the model for a category and level, for this computer or (with `profile`) for a hardware profile. */
  chooseModel(category: StackCategoryId, level: StackLevel, body: StackPickBody): Promise<StackPickResult>;
  /** `PUT /stack/v1/choices/{category}/order`: the order models are tried in and which are switched off. */
  setOrder(category: StackCategoryId, body: StackOrderBody): Promise<StackOrderResult>;
  /** `POST /stack/v1/choices/recommended`; `dryRun: true` answers what would change and writes nothing. */
  recommended(dryRun: boolean): Promise<StackRecommendedResult>;
  /** `POST /stack/v1/parts/{id}/install`. Progress shows as `percent` on the candidate in `readChoices`. */
  installModel(id: string): Promise<StackInstallStarted>;
  /** `DELETE /stack/v1/parts/{id}`. */
  removeModel(id: string): Promise<StackRemoved>;
  /** `GET /stack/v1/choices/unused`. */
  readUnused(): Promise<StackUnused>;
  /** `POST /stack/v1/choices/unused/remove`. */
  removeUnused(body: StackRemoveBody): Promise<StackRemoveResult>;
  /** `POST /stack/v1/choices/add-model`. */
  addModel(body: StackAddModelBody): Promise<StackAddModelResult>;
  /** Optional: call `onChange` whenever the Stack's event feed says choices, roles or installs changed (a choice made in the other app shows at once). Returns the unsubscribe. */
  subscribe?(onChange: () => void): () => void;
}

/** The sentence to show for a failed call: the Stack's own plain sentence when it sent one, else `fallback`. */
export function sentenceOf(error: unknown, fallback: string): string {
  if (error instanceof StackClientError && error.message.trim()) return error.message;
  return fallback;
}

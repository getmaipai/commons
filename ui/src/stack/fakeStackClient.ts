// STACK-MODELS-PAGE-01. An in-memory `StackClient` for tests and screenshots, seeded with realistic data (fakeStackData.ts). It behaves the way the
// Stack does where the page depends on it: a pick is judged (unknown model, does not fit, Standard cannot be off), a missing model starts downloading
// and its percent climbs on every read, the recommended setup can be previewed and applied, unused models are removed with the Stack's own sentences, a
// refusal is a `StackClientError` with a plain sentence and a code. Nothing here is the Stack: it proves the page, not the engine.
import { StackClientError } from "./StackClient";
import type {
  StackAddModelBody, StackAddModelResult, StackCategoryId, StackCandidate, StackChoiceCategory, StackChoicesView, StackClient, StackInstallStarted, StackLevel, StackOrderBody, StackOrderResult,
  StackPickBody, StackPickResult, StackRecommendedResult, StackRemoveBody, StackRemoveResult, StackRemoved, StackUnused,
  StackDrive, StackDriveFeature, StackDriveMove, StackLicence, StackLicences, StackLora, StackLoraHit, StackLoraJob, StackLoraSource,
} from "./StackClient";
import { seedChoicesView, seedUnused } from "./fakeStackData";

const GB = 1024 ** 3;

export interface FakeStackOptions {
  /** Pretend each call takes this long (default 0). */
  latencyMs?: number;
  /** How many percent a download climbs on every `readChoices` (default 25). */
  downloadStep?: number;
  /** Start from this view instead of the seed. */
  view?: StackChoicesView;
}

export type FakeCall = { method: string; args: unknown[] };

export interface FakeStackClient extends StackClient {
  /** Every call the page made, in order. */
  readonly calls: FakeCall[];
  /** Make the next call to `method` fail with this sentence and code. */
  failNext(method: keyof StackClient | "drives.plan" | "drives.move" | "licences.read" | "licences.accept" | `loras.${string}`, message: string, code?: string): void;
  /** The current state, for assertions. */
  snapshot(): StackChoicesView;
  /** Call every subscriber, as the Stack's event feed would. */
  emitChange(): void;
  drives: NonNullable<StackClient["drives"]> & { failMoveWith(sentence: string): void };
  /** The licence state, for assertions (`accepted`, `accepted_at`). */
  licences: NonNullable<StackClient["licences"]> & { snapshot(): StackLicences };
  /** The style library, for assertions. A job it starts is over on the third read of `job`. */
  loras: NonNullable<StackClient["loras"]> & { snapshot(): StackLora[]; hasKey(site: "huggingface" | "civitai"): boolean };
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/** A sentence the fake Stack says. It is a sample of the Stack's own words, not kit text, so it is not translated. */
const said = (sentence: string): string => sentence;

export function createFakeStackClient(options: FakeStackOptions = {}): FakeStackClient {
  const view: StackChoicesView = clone(options.view ?? seedChoicesView());
  let unused = seedUnused();
  const calls: FakeCall[] = [];
  const failures = new Map<string, StackClientError>();
  const listeners = new Set<() => void>();
  const step = options.downloadStep ?? 25;
  let jobs = 0;
  const disks: StackDrive[] = [
    { id: "main", label: "This computer", root_path: "/", connected: true, free_bytes: 412 * GB, total_bytes: 1000 * GB, removable: false },
    { id: "backup", label: "Backup drive", root_path: "/media/backup", connected: true, free_bytes: 900 * GB, total_bytes: 2000 * GB, removable: true },
    { id: "offline", label: "Offline drive", root_path: "/media/offline", connected: false, free_bytes: 30 * GB, total_bytes: 500 * GB, removable: true },
  ];
  const driveFeatures: StackDriveFeature[] = [
    { feature_id: "chat", label: "Chat", bytes: 12.04 * GB, drive_ids: ["main"], drives: [{ id: "main", label: "This computer", connected: true }] },
    { feature_id: "pictures", label: "Pictures", bytes: Math.round(6 * GB), drive_ids: ["offline"], drives: [{ id: "offline", label: "Backup drive", connected: false }] },
    { feature_id: "music", label: "Music", bytes: Math.round(9 * GB), drive_ids: ["main", "backup"], drives: [{ id: "main", label: "This computer", connected: true }, { id: "backup", label: "Backup drive", connected: true }] },
  ];
  let moveJobs: StackDriveMove[] = [];
  let moveFailure: string | null = null;
  let moveTicks = 0;
  // One acceptance covers every model, so it starts unanswered and flips once (STACK-LICENCE-01).
  const licenceItems: StackLicence[] = [
    { id: "qwen-research", name: "Qwen research licence", url: "https://example.com/qwen-licence", summary: ["Free to use, copy and share.", "Says who made the model whenever results are shown."] },
    { id: "image-maker", name: "Image maker licence", url: "https://example.com/flux-licence", summary: ["Free while your business stays small.", "Pictures you make belong to you."] },
  ];
  let licenceState: StackLicences = { terms_version: "2026-05", accepted: false, accepted_at: null, by: null, licences: licenceItems };
  const driveApi = {
    async list() { await gate("drives.list", []); return { disks: clone(disks) }; },
    async features() { await gate("drives.features", []); return { features: clone(driveFeatures) }; },
    async plan(featureId: string, toDiskId: string) { await gate("drives.plan", [featureId, toDiskId]); const f = driveFeatures.find((x) => x.feature_id === featureId); if (!f) throw new StackClientError("The Stack does not know that feature."); return { model_ids: [`${featureId}-model`], bytes: f.bytes, started: false }; },
    async move(featureId: string, toDiskId: string) { await gate("drives.move", [featureId, toDiskId]); const f = driveFeatures.find((x) => x.feature_id === featureId); if (!f) throw new StackClientError("The Stack does not know that feature."); const j: StackDriveMove = { id: "move-1", model_id: `${featureId}-weights-7b`, feature_id: featureId, from_disk: f.drive_ids[0] ?? "main", to_disk: toDiskId, state: "copying", bytes_done: 3.1 * GB, bytes_total: 8.4 * GB, error: null, updated_at: new Date().toISOString() }; moveJobs = [j]; moveTicks = 0; return { model_ids: [j.model_id], bytes: f.bytes, started: true }; },
    async moves() { await gate("drives.moves", []); if (moveJobs.length) { moveTicks += 1; const j = moveJobs[0]!; if (moveFailure) { j.state = "failed"; j.error = moveFailure; moveFailure = null; } else if (moveTicks <= 1) j.state = "copying"; else if (moveTicks === 2) j.state = "verifying"; else if (moveTicks >= 3) { j.state = "done"; const feature = driveFeatures.find((f) => f.feature_id === j.feature_id); if (feature) { feature.drive_ids = [j.to_disk]; feature.drives = [{ id: j.to_disk, label: disks.find((d) => d.id === j.to_disk)?.label ?? j.to_disk, connected: true }]; } } } return { moves: clone(moveJobs) }; },
    async cancel() { await gate("drives.cancel", []); moveJobs = []; return { cancelled: true }; },
    async add(body: { label: string; root_path: string; removable: boolean }) { await gate("drives.add", [body]); const drive: StackDrive = { id: body.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: body.label, root_path: body.root_path, connected: true, free_bytes: 500 * GB, total_bytes: 1000 * GB, removable: body.removable }; disks.push(drive); return clone(drive); },
    async remove(id: string) { await gate("drives.remove", [id]); const used = driveFeatures.find((x) => x.drive_ids.includes(id)); if (used) throw new StackClientError(`${used.label} still has files on that drive. Move them first.`); const at = disks.findIndex((d) => d.id === id); if (at >= 0) disks.splice(at, 1); return { ok: true as const }; },
    failMoveWith(sentence: string) { moveFailure = sentence; },
  };

  const emit = () => { for (const listener of listeners) listener(); };
  const gate = async (method: string, args: unknown[]) => {
    calls.push({ method, args });
    if (options.latencyMs) await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    const failure = failures.get(method);
    if (failure) { failures.delete(method); throw failure; }
  };
  const categoryOf = (id: string): StackChoiceCategory => {
    const found = view.categories.find((c) => c.id === id);
    if (!found) throw new StackClientError("The Stack does not know that feature. Reload the page and try again.", "unknown_category");
    return found;
  };
  const find = (id: string): { category: StackChoiceCategory; candidate: StackCandidate } | null => {
    for (const category of view.categories) {
      const candidate = category.candidates.find((c) => c.id === id);
      if (candidate) return { category, candidate };
    }
    return null;
  };
  const startDownload = (candidate: StackCandidate): string => {
    candidate.state = "installing"; candidate.percent = 0; candidate.can_install = false; candidate.reason = "Downloading.";
    return `job-${++jobs}`;
  };
  const tick = () => {
    for (const category of view.categories) for (const c of category.candidates) {
      if (c.state !== "installing") continue;
      c.percent = Math.min(100, (c.percent ?? 0) + step);
      if (c.percent >= 100) { c.state = "installed"; c.percent = null; c.download_bytes = 0; c.can_uninstall = true; c.reason = null; }
    }
    for (const category of view.categories) for (const row of category.tiers) row.chosen_state = category.candidates.find((c) => c.id === row.chosen)?.state ?? null;
  };

  const licenceApi = {
    async read() { await gate("licences.read", []); return clone(licenceState); },
    async accept() {
      await gate("licences.accept", []);
      licenceState = { ...licenceState, accepted: true, accepted_at: new Date().toISOString(), by: "sage" };
      // The Stack's own behaviour: with the one acceptance recorded, no model is waiting on a licence any more.
      for (const category of view.categories) for (const candidate of category.candidates) candidate.licence_needed = false;
      emit();
      return clone(licenceState);
    },
    snapshot: () => clone(licenceState),
  };

  const MB = 1024 ** 2;
  const lora = (id: string, name: string, patch: Partial<StackLora> = {}): StackLora => ({
    id, media: "picture", name, base_model: "SDXL 1.0", classification: "all-ages", sha256: `${id}`.padEnd(64, "0"), bytes: 144 * MB, strength_default: 0.8, trigger_words: [], licence: "creativeml-openrail-m", source_url: null, added_by: "sage", added_at: "2026-11-20T10:00:00.000Z",
    disk_id: null, disk_label: "This computer", status: "ready", status_note: null, removed_at: null, trash_until: null, preview: null, home: null, ...patch,
  });
  const library: StackLora[] = [
    lora("watercolor", "Soft watercolor", { trigger_words: ["watercolor style"], preview: "watercolor.png" }),
    lora("clay", "Clay animation", { media: "video", base_model: "Wan 2.1", bytes: 310 * MB, trigger_words: ["claymation"] }),
    lora("night", "Night market", { classification: "adult-only", trigger_words: [] }),
    lora("archived", "Ink sketch", { disk_id: "offline", disk_label: "Offline drive", status: "drive_missing" }),
    lora("old", "Retro poster", { removed_at: "2026-11-10T10:00:00.000Z", trash_until: "2026-12-10T10:00:00.000Z" }),
  ];
  const loraSources: StackLoraSource[] = [{ site: "huggingface", label: said("Hugging Face"), has_key: false }, { site: "civitai", label: said("Civitai"), has_key: true }];
  const loraHits: StackLoraHit[] = [
    { site: "huggingface", remote_id: "acme/paper-cut", name: "Paper cut", base_model: "SDXL 1.0", downloads: 12400, install_url: "https://huggingface.co/acme/paper-cut/resolve/main/paper.safetensors", file_name: "paper.safetensors", bytes: 170 * MB, audience_hint: "all-ages", licence: "apache-2.0", page_url: "https://huggingface.co/acme/paper-cut" },
    { site: "huggingface", remote_id: "acme/neon-night", name: "Neon night", base_model: "Wan 2.1", downloads: 980, install_url: "https://huggingface.co/acme/neon-night/resolve/main/neon.safetensors", file_name: "neon.safetensors", bytes: 300 * MB, audience_hint: "adult-only", licence: null, page_url: "https://huggingface.co/acme/neon-night" },
  ];
  const loraJobs = new Map<string, { reads: number; after: () => void; failure: string | null }>();
  const loraTicks = 2;
  const loraApi: NonNullable<StackClient["loras"]> & { snapshot(): StackLora[]; hasKey(site: "huggingface" | "civitai"): boolean } = {
    async list(options) { await gate("loras.list", [options]); const removed = options?.removed === true; return { loras: clone(library.filter((l) => (l.removed_at !== null) === removed)), trash_days: 30 }; },
    async patch(id, body) {
      await gate("loras.patch", [id, body]);
      const found = library.find((l) => l.id === id); if (!found) throw new StackClientError("The Stack does not have that style. Reload the page.", "unknown_lora");
      if (body.classification === "all-ages" && found.classification === "adult-only" && !body.ticket) throw new StackClientError("Marking an adults only style as all ages needs the adult lock. Ask in Home.", "ticket_required");
      if (body.name !== undefined) found.name = body.name; if (body.classification) found.classification = body.classification; if (body.strength_default !== undefined) found.strength_default = body.strength_default; if (body.trigger_words) found.trigger_words = body.trigger_words;
      return clone(found);
    },
    async remove(id, purge) {
      await gate("loras.remove", [id, purge]);
      const at = library.findIndex((l) => l.id === id); if (at < 0) throw new StackClientError("The Stack does not have that style. Reload the page.", "unknown_lora");
      if (purge) { library.splice(at, 1); return { ok: true as const, purged: true }; }
      library[at]!.removed_at = "2026-11-26T10:00:00.000Z"; library[at]!.trash_until = "2026-12-26T10:00:00.000Z"; return { ok: true as const, purged: false };
    },
    async restore(id) { await gate("loras.restore", [id]); const found = library.find((l) => l.id === id); if (!found) throw new StackClientError("The Stack does not have that style. Reload the page.", "unknown_lora"); found.removed_at = null; found.trash_until = null; return clone(found); },
    async move(id, diskId) {
      await gate("loras.move", [id, diskId]);
      const found = library.find((l) => l.id === id); const disk = disks.find((d) => d.id === diskId);
      if (!found || !disk) throw new StackClientError("The Stack does not know that style or drive.", "unknown_lora");
      if (!disk.connected) throw new StackClientError(`${disk.label} is not connected. Plug it back in or choose another drive.`, "drive_missing");
      const job = `lora-job-${++jobs}`; loraJobs.set(job, { reads: 0, failure: null, after: () => { found.disk_id = diskId === "main" ? null : diskId; found.disk_label = disk.label; } }); return { job };
    },
    async install(body) {
      await gate("loras.install", [body]);
      if (!licenceState.accepted) throw new StackClientError("Accept the licences in the Stack admin first (the Licences card on the AI and models page), then add the style again.", "licence_not_accepted");
      const job = `lora-job-${++jobs}`; const id = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      loraJobs.set(job, { reads: 0, failure: null, after: () => { library.push(lora(id, body.name, { media: body.media, base_model: body.base_model ?? "", classification: body.audience ?? "all-ages", disk_id: body.disk_id ?? null, disk_label: disks.find((d) => d.id === (body.disk_id ?? "main"))?.label ?? "This computer" })); } });
      return { job };
    },
    async sources() { await gate("loras.sources", []); return { sources: clone(loraSources) }; },
    async setKey(site, key) { await gate("loras.setKey", [site, key]); const found = loraSources.find((x) => x.site === site)!; found.has_key = key !== null; return { sources: clone(loraSources) }; },
    async search(site, query) { await gate("loras.search", [site, query]); return { hits: clone(loraHits.filter((h) => h.site === site && `${h.name} ${h.base_model}`.toLowerCase().includes(query.toLowerCase().split(" ")[0] ?? ""))) }; },
    async job(id): Promise<StackLoraJob> {
      await gate("loras.job", [id]);
      const entry = loraJobs.get(id); if (!entry) throw new StackClientError("No such job.", "unknown_job");
      entry.reads += 1;
      if (entry.reads > loraTicks) { entry.after(); loraJobs.delete(id); return { id, state: "done", percent: 100, status: "Done", reason: null }; }
      return { id, state: "running", percent: Math.round(entry.reads / (loraTicks + 1) * 100), status: "Downloading", reason: null };
    },
    previewUrl: (id) => `/stack/v1/loras/${id}/preview`,
    snapshot: () => clone(library),
    hasKey: (site) => loraSources.find((x) => x.site === site)!.has_key,
  };

  const client: FakeStackClient = {
    calls,
    drives: driveApi,
    licences: licenceApi,
    loras: loraApi,
    failNext(method, message, code = "refused") { failures.set(method, new StackClientError(message, code)); },
    snapshot: () => clone(view),
    emitChange: emit,
    subscribe(onChange) { listeners.add(onChange); return () => { listeners.delete(onChange); }; },

    async readChoices() { await gate("readChoices", []); tick(); return clone(view); },

    async setRoleEnabled(role, enabled) {
      await gate("setRoleEnabled", [role, enabled]);
      const category = view.categories.find((c) => c.role === role);
      if (!category) throw new StackClientError("The Stack does not know that feature.", "unknown_role");
      category.role_enabled = enabled; emit();
    },

    async setRolePriorities(priorities) {
      await gate("setRolePriorities", [priorities]);
      for (const [role, priority] of Object.entries(priorities)) {
        const category = view.categories.find((c) => c.role === role);
        if (category) category.role_priority = priority;
      }
      emit();
    },

    async chooseModel(categoryId: StackCategoryId, level: StackLevel, body: StackPickBody): Promise<StackPickResult> {
      await gate("chooseModel", [categoryId, level, body]);
      const category = categoryOf(categoryId);
      const row = category.tiers.find((t) => t.tier === level);
      if (!row) throw new StackClientError(`${category.label} has no ${level} level.`, "no_such_level");
      const profile = body.profile ?? view.profile ?? "p64";
      const result = { ok: true as const, category: categoryId, tier: level, profile, changed: true, applied: false, pending_restart: false, note: null as string | null };
      if (body.model === "off") {
        if (level === "standard") throw new StackClientError("The Standard level cannot be switched off. Pick a model for it instead.", "standard_cannot_be_off");
        if (!body.profile) { row.chosen = null; row.chosen_by = "off"; row.chosen_state = null; row.problem = null; emit(); }
        return { ...result, model: null, install_job: null };
      }
      if (body.model === "recommended") {
        if (!body.profile) { row.chosen = row.recommended.model; row.chosen_by = "recommended"; row.problem = null; row.chosen_state = category.candidates.find((c) => c.id === row.chosen)?.state ?? null; emit(); }
        else { const p = category.profiles.find((x) => x.profile === body.profile); if (p) p.assignments = p.assignments.filter((a) => a.tier !== level); emit(); }
        return { ...result, model: row.recommended.model, install_job: null };
      }
      const candidate = category.candidates.find((c) => c.id === body.model);
      if (!candidate) throw new StackClientError("The Stack does not offer that model for this feature. Reload the page and pick another.", "unknown_model");
      const option = row.options.find((o) => o.model === body.model);
      if (!option && !body.profile) throw new StackClientError(`${candidate.label} is not offered at this level on this computer.`, "not_offered_here");
      if (option && !option.fits && !body.profile) throw new StackClientError(option.refusal ?? `${candidate.label} does not fit this level on this computer.`, "does_not_fit");
      if (candidate.state === "unsupported") throw new StackClientError(`${candidate.label} cannot run on this computer yet.`, "unsupported");
      if (body.profile && body.profile !== view.profile) {
        const p = category.profiles.find((x) => x.profile === body.profile);
        if (p) { p.assignments = [...p.assignments.filter((a) => a.tier !== level), { tier: level, model: candidate.id, customization: null }]; emit(); }
        return { ...result, model: candidate.id, install_job: null };
      }
      let job: string | null = null;
      if (candidate.state === "notInstalled" && body.install !== false) job = startDownload(candidate);
      row.chosen = candidate.id; row.chosen_by = "household"; row.problem = null; row.chosen_state = candidate.state;
      emit();
      return { ...result, model: candidate.id, install_job: job, note: job ? "It is downloading first; the pick applies when it is ready." : null };
    },

    async setOrder(categoryId, body: StackOrderBody): Promise<StackOrderResult> {
      await gate("setOrder", [categoryId, body]);
      const category = categoryOf(categoryId);
      const known = new Set(category.candidates.map((c) => c.id));
      const unknown = body.order.find((id) => !known.has(id));
      if (unknown) throw new StackClientError("The order names a model this feature does not have. Reload the page and try again.", "unknown_model");
      const rest = category.order.filter((id) => !body.order.includes(id));
      category.order = [...body.order, ...rest];
      if (body.off) category.disabled = body.off.filter((id) => known.has(id));
      const standard = category.tiers.find((t) => t.tier === "standard");
      const lastOn = category.order.filter((id) => !category.disabled.includes(id));
      if (standard?.chosen && category.disabled.includes(standard.chosen) && lastOn.length === 0) throw new StackClientError("At least one model has to stay on.", "required_by");
      category.candidates.forEach((c) => { c.rank = category.order.indexOf(c.id) + 1; c.enabled = !category.disabled.includes(c.id); });
      emit();
      return { ok: true, category: categoryId, order: [...category.order], disabled: [...category.disabled] };
    },

    async recommended(dryRun: boolean): Promise<StackRecommendedResult> {
      await gate("recommended", [dryRun]);
      const changed: StackRecommendedResult["changed"] = [];
      const installs: StackRecommendedResult["installs"] = [];
      const needs: StackRecommendedResult["needs_licence"] = [];
      let unchanged = 0;
      for (const category of view.categories) for (const row of category.tiers) {
        const target = row.recommended.model;
        if (row.chosen_by === "off" || !target) { unchanged += 1; continue; }
        const candidate = category.candidates.find((c) => c.id === target)!;
        if (row.chosen !== target) changed.push({ category: category.id, tier: row.tier, from: row.chosen, to: target });
        else unchanged += 1;
        if (candidate.licence_needed) { if (!needs.some((n) => n.id === target)) needs.push({ id: target, label: candidate.label }); continue; }
        // The Stack starts the missing downloads of the Reduced and Standard picks only.
        if (candidate.state === "notInstalled" && (row.tier === "reduced" || row.tier === "standard") && !installs.some((i) => i.model === target)) installs.push({ model: target, job: dryRun ? "" : `job-${jobs + 1 + installs.length}` });
      }
      const result: StackRecommendedResult = { dry_run: dryRun, changed, unchanged, roles: dryRun ? {} : { "stack.roles.chat.enabled": true }, installs: installs.map((i) => ({ model: i.model, job: dryRun ? "dry-run" : i.job })), skipped: [], needs_licence: needs };
      if (!dryRun) {
        for (const change of changed) {
          const category = categoryOf(change.category);
          const row = category.tiers.find((t) => t.tier === change.tier)!;
          row.chosen = change.to; row.chosen_by = "recommended"; row.problem = null;
        }
        for (const install of installs) { const found = find(install.model); if (found) startDownload(found.candidate); }
        for (const category of view.categories) for (const row of category.tiers) row.chosen_state = category.candidates.find((c) => c.id === row.chosen)?.state ?? null;
        emit();
      }
      return result;
    },

    async installModel(id): Promise<StackInstallStarted> {
      await gate("installModel", [id]);
      const found = find(id);
      if (!found) throw new StackClientError("The Stack does not know that model.", "unknown_component");
      if (found.candidate.state === "installed") return { job: null, part: id, already_installed: true };
      if (found.candidate.licence_needed) throw new StackClientError(`${found.candidate.label} comes with a licence you have to accept first.`, "licence_required");
      if (found.candidate.size_bytes > view.free_disk_bytes) throw new StackClientError("There is not enough free disk space for that download.", "not_enough_space");
      const job = startDownload(found.candidate);
      emit();
      return { job, part: id, joined: false };
    },

    async removeModel(id): Promise<StackRemoved> {
      await gate("removeModel", [id]);
      const found = find(id);
      if (!found) throw new StackClientError("The Stack does not know that model.", "unknown_component");
      const inUse = found.category.tiers.some((t) => t.chosen === id && t.chosen_by !== "off");
      if (inUse) throw new StackClientError(`${found.candidate.label} is in use by a level. Choose another model for that level first.`, "in_use");
      const freed = found.candidate.size_bytes;
      found.candidate.state = "notInstalled"; found.candidate.can_install = true; found.candidate.can_uninstall = false; found.candidate.download_bytes = freed; found.candidate.reason = "Not downloaded yet.";
      view.free_disk_bytes += freed; emit();
      return { part: id, freed_bytes: freed, removed: true };
    },

    async readUnused(): Promise<StackUnused> { await gate("readUnused", []); return clone(unused); },

    async removeUnused(body: StackRemoveBody): Promise<StackRemoveResult> {
      await gate("removeUnused", [body]);
      const results: StackRemoveResult["results"] = [];
      let freed = 0;
      for (const id of body.ids ?? []) {
        const item = unused.items.find((i) => i.id === id);
        if (!item) { results.push({ id, status: "kept", freed_bytes: 0, message: said("That model is in use now, so it was kept.") }); continue; }
        results.push({ id, status: "removed", freed_bytes: item.size_bytes, message: said("Removed.") });
        freed += item.size_bytes;
      }
      const tidyRemoved = body.tidy ? unused.tidy.items.filter((i) => !i.blocked).map((i) => ({ id: i.id, bytes: i.bytes })) : [];
      freed += tidyRemoved.reduce((sum, i) => sum + i.bytes, 0);
      unused = { ...unused, items: unused.items.filter((i) => !(body.ids ?? []).includes(i.id)), tidy: body.tidy ? { reclaimable_bytes: 0, items: [] } : unused.tidy };
      unused.total_bytes = unused.items.reduce((sum, i) => sum + i.size_bytes, 0);
      view.unused = { count: unused.items.length, total_bytes: unused.total_bytes };
      view.free_disk_bytes += freed; emit();
      return { results, tidy_removed: tidyRemoved, freed_bytes: freed, kept: results.filter((r) => r.status === "kept").length, failed: 0 };
    },

    async addModel(body: StackAddModelBody): Promise<StackAddModelResult> {
      await gate("addModel", [body]);
      const source = body.source.trim().replace(/^https?:\/\/(www\.)?huggingface\.co\//, "").replace(/\/+$/, "");
      if (!/^[\w.-]+\/[\w.-]+/.test(source)) throw new StackClientError("That does not look like a Hugging Face link. Paste the address of the model page, or type owner/name.", "bad_source");
      const chat = categoryOf("chat");
      const name = source.split("/").pop()!.replace(/-GGUF$/i, "");
      const id = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      if (chat.candidates.some((c) => c.id === id)) throw new StackClientError("That model is already in the list.", "already_added");
      const level = body.tier ?? "standard";
      const candidate: StackCandidate = {
        id, label: name.replace(/[-_]+/g, " "), summary: "A chat model you added.", family: null, version: null, quantization: "4-bit, compact", quantization_raw: "Q4_K_M", license: "Apache-2.0", repo: source, engine: "llama.cpp", role: "chat", min_profile: null, min_profile_id: null,
        search_text: `${name} ${id} ${source} 4-bit, compact q4_k_m apache-2.0 a chat model you added llama.cpp chat`.toLowerCase(), kind: "added", pickable: true, state: "installing", reason: "Downloading.", size_bytes: Math.round(4.9 * GB), download_bytes: Math.round(4.9 * GB),
        peak_bytes: null, peak_verified: null, percent: 0, can_install: false, can_uninstall: false, licence_needed: false, enabled: true, rank: chat.candidates.length + 1,
      };
      chat.candidates.push(candidate); chat.order.push(id);
      const row = chat.tiers.find((t) => t.tier === level);
      row?.options.push({ model: id, fits: true, refusal: null });
      const use = body.use !== false && Boolean(row);
      if (use && row) { row.chosen = id; row.chosen_by = "household"; row.chosen_state = "installing"; row.problem = null; }
      emit();
      return { ok: true, id, label: candidate.label, category: "chat", tier: level, chosen: use, state: "installing", install_job: `job-${++jobs}`, size_bytes: candidate.size_bytes, licence: "Apache-2.0" };
    },
  };
  return client;
}

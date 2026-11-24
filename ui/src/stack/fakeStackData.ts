// STACK-MODELS-PAGE-01. Realistic seed data for the fake client (tests and screenshots): the shape the Stack's `GET /stack/v1/choices` answers on a
// 64 GB computer, with a little of everything a real page meets (a downloading model, a saved pick that stopped fitting, a switched-off feature, a model that
// needs a licence, one that is too big, unused models). Model names are public products; there is no household data here.
import type { StackCandidate, StackChoiceCategory, StackChoicesView, StackLevel, StackLevelRow, StackUnused } from "./StackClient";

const GB = 1024 ** 3;
const bytes = (gb: number) => Math.round(gb * GB);

interface ModelSpec {
  id: string; name: string; summary: string; family?: string; version?: string; quant?: [string, string]; license?: string; repo?: string; engine?: string; sizeGb: number;
  state?: StackCandidate["state"]; percent?: number; minProfile?: [string, "p16" | "p32" | "p64" | "p128"]; licenceNeeded?: boolean; peakGb?: number; kind?: "shipped" | "added"; reason?: string;
}

function candidate(role: string, spec: ModelSpec, rank: number): StackCandidate {
  const state = spec.state ?? "installed";
  const installed = state === "installed";
  const base = {
    id: spec.id, label: spec.name, summary: spec.summary, family: spec.family ?? null, version: spec.version ?? null,
    quantization: spec.quant?.[0] ?? null, quantization_raw: spec.quant?.[1] ?? null, license: spec.license ?? null, repo: spec.repo ?? null, engine: spec.engine ?? null, role,
    min_profile: spec.minProfile?.[0] ?? null, min_profile_id: spec.minProfile?.[1] ?? null,
  };
  return {
    ...base,
    search_text: [spec.name, spec.id, spec.repo, spec.family, spec.version, spec.quant?.[0], spec.quant?.[1], spec.license, spec.summary, spec.engine, role].filter(Boolean).join(" ").toLowerCase(),
    kind: spec.kind ?? "shipped", pickable: true, state,
    reason: spec.reason ?? (state === "notInstalled" ? "Not downloaded yet." : state === "installing" ? "Downloading." : state === "unsupported" ? "Not supported on this computer yet." : null),
    size_bytes: bytes(spec.sizeGb), download_bytes: installed ? 0 : bytes(spec.sizeGb), peak_bytes: spec.peakGb !== undefined ? bytes(spec.peakGb) : null, peak_verified: spec.peakGb !== undefined ? true : null,
    percent: state === "installing" ? spec.percent ?? 0 : null, can_install: state === "notInstalled" || state === "failed", can_uninstall: installed, licence_needed: spec.licenceNeeded ?? false, enabled: true, rank,
  };
}

interface LevelSpec { tier: StackLevel; chosen: string | null; by: "household" | "recommended" | "off" | "none"; options: Array<string | [string, string]>; recommended: [string | null, string]; problem?: string; cap?: number | null }

function level(spec: LevelSpec, candidates: StackCandidate[]): StackLevelRow {
  const state = candidates.find((c) => c.id === spec.chosen)?.state ?? null;
  return {
    tier: spec.tier, cap_bytes: spec.cap === undefined ? (spec.tier === "reduced" ? null : bytes(48)) : spec.cap === null ? null : bytes(spec.cap), chosen: spec.chosen, chosen_by: spec.by, chosen_state: state, customization: null, problem: spec.problem ?? null,
    options: spec.options.map((o) => (typeof o === "string" ? { model: o, fits: true, refusal: null } : { model: o[0], fits: false, refusal: o[1] })),
    recommended: { model: spec.recommended[0], why: spec.recommended[1] },
  };
}

interface CategorySpec { id: StackChoiceCategory["id"]; feature: string; icon: string; description: string; role: string | null; enabled?: boolean | null; priority?: number | null; plan?: StackChoiceCategory["role_plan"]; available?: boolean; why?: string | null; tiered: boolean; models: ModelSpec[]; levels: LevelSpec[]; profileAssignments?: Record<string, Array<[StackLevel, string]>> }

const PROFILES = [["p16", 16], ["p32", 32], ["p64", 64], ["p128", 128]] as const;

function category(spec: CategorySpec): StackChoiceCategory {
  const candidates = spec.models.map((m, i) => candidate(spec.role ?? spec.id, m, i + 1));
  return {
    id: spec.id, label: spec.feature, icon: spec.icon, description: spec.description, role: spec.role, role_enabled: spec.enabled === undefined ? (spec.role ? true : null) : spec.enabled, role_priority: spec.role ? spec.priority ?? 100 : null, role_plan: spec.plan ?? null, steps: [], requires: [],
    available: spec.available ?? true, unavailable_reason: spec.why ?? null, tiered: spec.tiered, order: candidates.map((c) => c.id), disabled: [], candidates,
    tiers: spec.levels.map((l) => level(l, candidates)),
    profiles: PROFILES.map(([profile, memory]) => ({ profile, memory_gb: memory, current: profile === "p64", assignments: (spec.profileAssignments?.[profile] ?? []).map(([tier, model]) => ({ tier, model, customization: null })) })),
  };
}

export function seedChoicesView(): StackChoicesView {
  const categories: StackChoiceCategory[] = [
    category({
      id: "chat", feature: "Chat", icon: "sparkles", description: "Talks, writes and answers questions.", role: "chat", priority: 10, tiered: true, plan: { state: "resident", fit: "fits", reason: "Stays loaded so replies start at once." },
      models: [
        { id: "qwen3-4b-q4", name: "Qwen3 4B", summary: "Very quick, short answers. Good when the computer is busy.", family: "Qwen3", version: "3", quant: ["4-bit, compact", "Q4_K_M"], license: "Apache-2.0", repo: "Qwen/Qwen3-4B-GGUF", engine: "llama.cpp", sizeGb: 2.4, state: "notInstalled", minProfile: ["16 GB", "p16"], peakGb: 3.4 },
        { id: "qwen3-8b-q4", name: "Qwen3 8B", summary: "Fast everyday chat with clear answers. Weaker on very long documents.", family: "Qwen3", version: "3", quant: ["4-bit, compact", "Q4_K_M"], license: "Apache-2.0", repo: "Qwen/Qwen3-8B-GGUF", engine: "llama.cpp", sizeGb: 4.7, minProfile: ["16 GB", "p16"], peakGb: 6.1 },
        { id: "qwen3-30b-a3b-q4", name: "Qwen3 30B (3B active)", summary: "Quick for its size and good at reasoning, because only part of it runs at a time.", family: "Qwen3", version: "3", quant: ["4-bit, compact", "UD-Q4_K_XL"], license: "Apache-2.0", repo: "unsloth/Qwen3-30B-A3B-GGUF", engine: "llama.cpp", sizeGb: 17.3, minProfile: ["32 GB", "p32"], peakGb: 21 },
        { id: "gemma-3-27b-q4", name: "Gemma 3 27B", summary: "Careful writing and good with several languages. Slower than the Qwen models.", family: "Gemma", version: "3", quant: ["4-bit, compact", "Q4_K_M"], license: "Gemma Terms of Use", repo: "google/gemma-3-27b-it-qat-q4_0-gguf", engine: "llama.cpp", sizeGb: 15.6, state: "notInstalled", minProfile: ["32 GB", "p32"], licenceNeeded: true },
        { id: "llama-33-70b-q4", name: "Llama 3.3 70B", summary: "Thorough, careful answers. Needs a lot of memory and is slower to start.", family: "Llama", version: "3.3", quant: ["4-bit, compact", "Q4_K_M"], license: "Llama 3.3 Community", repo: "bartowski/Llama-3.3-70B-Instruct-GGUF", engine: "llama.cpp", sizeGb: 39.6, state: "notInstalled", minProfile: ["64 GB", "p64"] },
        { id: "qwen38-flash-next-177b", name: "Qwen3.8 Flash Next 177B", summary: "The strongest chat model here. Needs the largest computers.", family: "Qwen", version: "3.8", quant: ["3-bit, very compact", "UD-IQ3_XXS"], license: "Apache-2.0", repo: "huihui-ai/Huihui-Qwen3.8-Flash-Next-177B-abliterated-GGUF", engine: "llama.cpp", sizeGb: 71.8, state: "notInstalled", minProfile: ["128 GB", "p128"] },
      ],
      levels: [
        { tier: "reduced", chosen: "qwen3-4b-q4", by: "recommended", options: ["qwen3-4b-q4", "qwen3-8b-q4"], recommended: ["qwen3-4b-q4", "The smallest model that still answers well, so it is quick when the computer is busy."] },
        { tier: "standard", chosen: "qwen3-8b-q4", by: "household", options: ["qwen3-8b-q4", "qwen3-30b-a3b-q4", "gemma-3-27b-q4"], recommended: ["qwen3-30b-a3b-q4", "The best fit for 64 GB of memory: quick, and good at reasoning."] },
        { tier: "boost", chosen: "qwen3-30b-a3b-q4", by: "recommended", options: ["qwen3-30b-a3b-q4", "gemma-3-27b-q4", "llama-33-70b-q4"], recommended: ["qwen3-30b-a3b-q4", "Better results than Standard and it still leaves room for the other features."] },
        { tier: "max", chosen: null, by: "off", options: ["llama-33-70b-q4", ["qwen38-flash-next-177b", "It needs 72 GB and this level has 48 GB. Pick a smaller model."]], recommended: ["llama-33-70b-q4", "The largest model that fits this computer."] },
      ],
      profileAssignments: { p64: [["standard", "qwen3-8b-q4"]], p128: [["standard", "qwen3-30b-a3b-q4"], ["max", "qwen38-flash-next-177b"]] },
    }),
    category({
      id: "coding", feature: "Coding", icon: "code", description: "Helps write and fix code.", role: "coding", priority: 30, tiered: true,
      models: [
        { id: "qwen3-coder-30b-q4", name: "Qwen3 Coder 30B", summary: "Writes, explains and fixes code in most languages.", family: "Qwen3", version: "3", quant: ["4-bit, compact", "Q4_K_M"], license: "Apache-2.0", repo: "Qwen/Qwen3-Coder-30B-A3B-Instruct-GGUF", engine: "llama.cpp", sizeGb: 17.3, minProfile: ["32 GB", "p32"] },
        { id: "qwen25-coder-7b-q4", name: "Qwen2.5 Coder 7B", summary: "A lighter coding helper for small tasks.", family: "Qwen2.5", version: "2.5", quant: ["4-bit, compact", "Q4_K_M"], license: "Apache-2.0", repo: "Qwen/Qwen2.5-Coder-7B-Instruct-GGUF", engine: "llama.cpp", sizeGb: 4.4, minProfile: ["16 GB", "p16"] },
      ],
      levels: [
        { tier: "standard", chosen: "qwen3-coder-30b-q4", by: "recommended", options: ["qwen3-coder-30b-q4", "qwen25-coder-7b-q4"], recommended: ["qwen3-coder-30b-q4", "The strongest coding model that fits this computer."] },
        { tier: "boost", chosen: null, by: "off", options: ["qwen3-coder-30b-q4"], recommended: ["qwen3-coder-30b-q4", "Same model as Standard until a larger one is tested."] },
      ],
    }),
    category({
      id: "pictures", feature: "Pictures", icon: "image", description: "Makes and edits pictures.", role: "image", priority: 20, tiered: true, plan: { state: "on_demand", fit: "queues", reason: "Loads when asked and waits its turn when memory is tight." },
      models: [
        { id: "flux1-schnell-q8", name: "FLUX.1 schnell", summary: "Makes a picture in a few seconds. Good for quick ideas.", family: "FLUX.1", version: "1", quant: ["8-bit, high quality", "Q8_0"], license: "Apache-2.0", repo: "black-forest-labs/FLUX.1-schnell", engine: "stable-diffusion.cpp", sizeGb: 12.7, minProfile: ["32 GB", "p32"], peakGb: 15 },
        { id: "flux1-dev-q8", name: "FLUX.1 dev", summary: "More detail and better hands and text, but slower.", family: "FLUX.1", version: "1", quant: ["8-bit, high quality", "Q8_0"], license: "FLUX.1 dev Non-Commercial", repo: "black-forest-labs/FLUX.1-dev", engine: "stable-diffusion.cpp", sizeGb: 12.7, state: "notInstalled", minProfile: ["32 GB", "p32"], licenceNeeded: true },
      ],
      levels: [
        { tier: "standard", chosen: "flux1-schnell-q8", by: "recommended", options: ["flux1-schnell-q8", "flux1-dev-q8"], recommended: ["flux1-schnell-q8", "Quick, and it leaves room for chat."] },
        { tier: "boost", chosen: "flux1-schnell-q8", by: "household", options: ["flux1-schnell-q8", "flux1-dev-q8"], recommended: ["flux1-dev-q8", "The most detailed model that fits."], problem: "Your saved pick, FLUX.1 dev, is not downloaded, so FLUX.1 schnell runs for now." },
      ],
    }),
    category({
      id: "video", feature: "Video", icon: "film", description: "Makes short videos.", role: "video", priority: 50, enabled: false, tiered: false,
      models: [
        { id: "wan22-ti2v-5b-q8", name: "Wan 2.2 5B", summary: "Turns a picture or a sentence into a short clip.", family: "Wan", version: "2.2", quant: ["8-bit, high quality", "Q8_0"], license: "Apache-2.0", repo: "Wan-AI/Wan2.2-TI2V-5B", engine: "stable-diffusion.cpp", sizeGb: 9.6, minProfile: ["32 GB", "p32"] },
        { id: "ltx-video-098-q8", name: "LTX-Video 0.9.8", summary: "Faster clips with simpler motion.", family: "LTX-Video", version: "0.9.8", quant: ["8-bit, high quality", "Q8_0"], license: "LTX Video Open Weights", repo: "Lightricks/LTX-Video", engine: "stable-diffusion.cpp", sizeGb: 8.2, state: "notInstalled", minProfile: ["32 GB", "p32"] },
      ],
      levels: [{ tier: "standard", chosen: "wan22-ti2v-5b-q8", by: "recommended", options: ["wan22-ti2v-5b-q8", "ltx-video-098-q8"], recommended: ["wan22-ti2v-5b-q8", "The only video model tested to run alongside chat on this computer."] }],
    }),
    category({
      id: "music", feature: "Music", icon: "music", description: "Makes songs and music.", role: "music", priority: 60, tiered: false,
      models: [{ id: "ace-step-15", name: "ACE-Step 1.5", summary: "Makes a full song with singing from a description.", family: "ACE-Step", version: "1.5", quant: ["16-bit, full quality", "bf16"], license: "Apache-2.0", repo: "ACE-Step/ACE-Step-v1.5", engine: "torch", sizeGb: 7.2, minProfile: ["32 GB", "p32"] }],
      levels: [{ tier: "standard", chosen: "ace-step-15", by: "recommended", options: ["ace-step-15"], recommended: ["ace-step-15", "The only music model for this feature."] }],
    }),
    category({
      id: "voice", feature: "Voice", icon: "mic-vocal", description: "Speaks out loud, in the voices you choose.", role: "tts", priority: 15, tiered: true, plan: { state: "resident", fit: "fits", reason: "Stays loaded so spoken replies start at once." },
      models: [
        { id: "kokoro-82m", name: "Kokoro 82M", summary: "A small, quick voice with several clear speakers.", family: "Kokoro", version: "1", quant: ["16-bit, full quality", "fp16"], license: "Apache-2.0", repo: "hexgrad/Kokoro-82M", engine: "mlx-audio", sizeGb: 0.3, minProfile: ["16 GB", "p16"] },
        { id: "chatterbox-turbo", name: "Chatterbox Turbo", summary: "Natural speech, and it can copy a voice from a short clip.", family: "Chatterbox", version: "1", quant: ["8-bit, high quality", "q8"], license: "MIT", repo: "ResembleAI/chatterbox-turbo", engine: "mlx-audio", sizeGb: 1.9, minProfile: ["16 GB", "p16"] },
        { id: "voxcpm2", name: "VoxCPM2", summary: "The most natural voice here, and it copies a voice from a clip and its words.", family: "VoxCPM", version: "2", quant: ["16-bit, full quality", "bf16"], license: "Apache-2.0", repo: "openbmb/VoxCPM2", engine: "torch", sizeGb: 4.6, state: "installing", percent: 42, minProfile: ["32 GB", "p32"] },
      ],
      levels: [
        { tier: "standard", chosen: "chatterbox-turbo", by: "recommended", options: ["kokoro-82m", "chatterbox-turbo", "voxcpm2"], recommended: ["chatterbox-turbo", "Natural speech that starts quickly."] },
        { tier: "boost", chosen: "voxcpm2", by: "household", options: ["chatterbox-turbo", "voxcpm2"], recommended: ["voxcpm2", "The most natural voice that fits."] },
      ],
    }),
    category({
      id: "stt", feature: "Speech to text", icon: "mic", description: "Turns what you say into text.", role: "stt", priority: 40, tiered: false,
      models: [
        { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo", summary: "Turns speech into text in most languages. Quick and accurate.", family: "Whisper", version: "3", quant: ["8-bit, high quality", "q8_0"], license: "MIT", repo: "openai/whisper-large-v3-turbo", engine: "whisper.cpp", sizeGb: 1.5, minProfile: ["16 GB", "p16"] },
        { id: "whisper-small-en", name: "Whisper Small (English)", summary: "Smaller and quicker, English only.", family: "Whisper", version: "2", quant: ["8-bit, high quality", "q8_0"], license: "MIT", repo: "openai/whisper-small.en", engine: "whisper.cpp", sizeGb: 0.3, minProfile: ["16 GB", "p16"] },
      ],
      levels: [{ tier: "standard", chosen: "whisper-large-v3-turbo", by: "recommended", options: ["whisper-large-v3-turbo", "whisper-small-en"], recommended: ["whisper-large-v3-turbo", "The most accurate model that fits."] }],
    }),
    category({
      id: "embeddings", feature: "Search by meaning", icon: "layers", description: "Helps search by meaning, not just by words.", role: "embed", priority: 70, tiered: false,
      models: [{ id: "nomic-embed-text-v15", name: "Nomic Embed Text v1.5", summary: "Lets the Stack find notes and documents by meaning.", family: "Nomic Embed", version: "1.5", quant: ["16-bit, full quality", "f16"], license: "Apache-2.0", repo: "nomic-ai/nomic-embed-text-v1.5-GGUF", engine: "llama.cpp", sizeGb: 0.26, minProfile: ["16 GB", "p16"] }],
      levels: [{ tier: "standard", chosen: "nomic-embed-text-v15", by: "recommended", options: ["nomic-embed-text-v15"], recommended: ["nomic-embed-text-v15", "The only model for this feature."] }],
    }),
    category({
      id: "vision", feature: "Looking at pictures", icon: "eye", description: "Looks at pictures and describes them.", role: "vision", priority: 45, tiered: false,
      models: [{ id: "qwen25-vl-7b-q4", name: "Qwen2.5-VL 7B", summary: "Describes pictures and reads text in them.", family: "Qwen2.5-VL", version: "2.5", quant: ["4-bit, compact", "Q4_K_M"], license: "Apache-2.0", repo: "Qwen/Qwen2.5-VL-7B-Instruct-GGUF", engine: "llama.cpp", sizeGb: 5.4, minProfile: ["16 GB", "p16"] }],
      levels: [{ tier: "standard", chosen: "qwen25-vl-7b-q4", by: "recommended", options: ["qwen25-vl-7b-q4"], recommended: ["qwen25-vl-7b-q4", "The only model for this feature."] }],
    }),
    category({
      id: "wakeword", feature: "Wake word", icon: "ear", description: "Listens for the wake word.", role: "wakeword", priority: 5, tiered: false,
      models: [{ id: "openwakeword", name: "openWakeWord", summary: "Listens for your wake word, all day, using almost no memory.", family: "openWakeWord", version: "0.6", license: "Apache-2.0", repo: "dscripka/openWakeWord", engine: "onnx", sizeGb: 0.05, minProfile: ["16 GB", "p16"] }],
      levels: [{ tier: "standard", chosen: "openwakeword", by: "recommended", options: ["openwakeword"], recommended: ["openwakeword", "The only model for this feature."] }],
    }),
    category({
      id: "stems", feature: "Song splitter", icon: "scissors", description: "Splits a song into voice, drums and the rest.", role: null, enabled: null, tiered: false,
      models: [{ id: "demucs-htdemucs", name: "Demucs", summary: "Splits a song into voice, drums, bass and the rest.", family: "Demucs", version: "4", quant: ["16-bit, full quality", "fp16"], license: "MIT", repo: "facebookresearch/demucs", engine: "torch", sizeGb: 0.3, state: "notInstalled", minProfile: ["16 GB", "p16"] }],
      levels: [{ tier: "standard", chosen: "demucs-htdemucs", by: "recommended", options: ["demucs-htdemucs"], recommended: ["demucs-htdemucs", "The only model for this feature."] }],
    }),
  ];
  return {
    profile: "p64", memory_gb: 64, room_bytes: bytes(48), free_disk_bytes: bytes(412),
    categories, unused: { count: 2, total_bytes: bytes(21.7) }, migration: { done: true, done_at: "2026-11-21T12:00:00.000Z", accepted: 9, refused: 0 },
  };
}

export function seedUnused(): StackUnused {
  const named = [
    { id: "qwen25-14b-q4", name: "Qwen2.5 14B", category: "chat" as const, kind: "shipped" as const, size_bytes: bytes(8.4), reason: "No level uses it and it is not in the order." },
    { id: "flux1-krea-q8", name: "FLUX.1 Krea", category: "pictures" as const, kind: "shipped" as const, size_bytes: bytes(13.3), reason: "No level uses it and it is not in the order." },
  ];
  const items = named.map(({ name, ...rest }) => ({ ...rest, label: name }));
  return { items, total_bytes: items.reduce((sum, item) => sum + item.size_bytes, 0), tidy: { reclaimable_bytes: bytes(1.2), items: [{ id: "voxcpm2.partial", kind: "partial_download", bytes: bytes(1.2), reason: "A download that stopped part way.", blocked: null }] } };
}

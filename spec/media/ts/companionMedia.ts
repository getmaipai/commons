// CMEDIA-SPEC-01: the typed TypeScript reader for the one shared media
// vocabulary. Keep measurements and state defaults in vocab/companion-media.json.
import spec from "../../vocab/companion-media.json" with { type: "json" };

export type CompanionMediaState = string;
export type CompanionMediaStateSpec = CompanionMediaSpec["states"][number];

export interface CompanionMediaSpec {
  version: number;
  fallback: Partial<Record<CompanionMediaState, CompanionMediaState[]>>;
  emotion_clips: Record<string, { state: CompanionMediaState; child_band: string }>;
  picture_fallback: ("keyframe" | "still" | "portrait")[];
  image: { size: number; margin_percent: number; format: string; min_upload_short_side: number; max_upload_bytes: number };
  key: { default: string; alternate: string };
  generate: { width: number; height: number; fps: number; frames: number; seconds: number };
  ship: {
    colour_width: number; colour_height: number; stacked_width: number; stacked_height: number; fps: number;
    loop_seconds: { min: number; max: number }; oneshot_seconds: { min: number; max: number };
    max_bytes_per_clip: number; max_bytes_per_character: number;
    codecs: { required: string; optional: string[] }; audio: boolean;
  };
  upload_video: { max_bytes: number; max_seconds: number; types: string[] };
  states: Array<{ id: CompanionMediaState; kind: "loop" | "oneshot"; required: boolean; creator?: boolean; legacy?: boolean; min_seconds: number; max_seconds: number; motion: string; driven_by: string }>;
}

export const COMPANION_MEDIA = spec as unknown as CompanionMediaSpec;
export const COMPANION_MEDIA_STATES = COMPANION_MEDIA.states.map((state) => state.id);

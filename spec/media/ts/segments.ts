// MEDIA-SEGMENTS-01: pure readers and the Stack job wire contract.
import { z } from "zod";
import { MediaSegments } from "../../gen/ts/media-segments";
import type { z as Zod } from "zod";

export const SEGMENT_KINDS = ["ad", "sponsor", "selfpromo", "intro", "outro", "recap", "filler"] as const;
// Sections cold-open, theme, main, interview, pretape, credits and plugs are reserved for a future additive extension.
export const SEGMENT_SOURCES = ["fingerprint", "text-pattern", "llm", "alignment", "person", "chapter"] as const;
export const SEGMENT_STATUSES = ["auto", "held", "confirmed", "rejected"] as const;
export const MediaSegmentsSchema = MediaSegments.extend({
  segments: z.array(MediaSegments.shape.segments.element.refine(s => s.endSec > s.startSec, { message: "endSec must be greater than startSec" })),
});
export type MediaSegmentsRecord = Zod.infer<typeof MediaSegmentsSchema>;
export type MediaSegment = MediaSegmentsRecord["segments"][number];
export interface Range { startSec: number; endSec: number }

export const MediaSegmentsRequest = z.object({
  url: z.string().url().optional(), path: z.string().min(1).optional(),
  referenceUrl: z.string().url().optional(), referencePath: z.string().min(1).optional(),
  kinds: z.array(z.enum(SEGMENT_KINDS)).optional(),
  fetch: z.object({ userAgent: z.string().min(1).max(256).optional() }).default({}),
  keepCopy: z.boolean().default(true), expectedDurationSec: z.number().positive().optional(),
}).strict().refine(v => Boolean(v.url || v.path), "url or path is required")
  .refine(v => !(v.url && v.path), "send url or path, not both")
  .refine(v => !(v.referenceUrl && v.referencePath), "send referenceUrl or referencePath, not both");
export type MediaSegmentsRequest = z.infer<typeof MediaSegmentsRequest>;
export const MediaSegmentsResult = MediaSegmentsSchema;

/** Sort, clamp to duration, drop under 1 s, merge same-kind overlaps and gaps under 2 s. */
export function normalizeSegments(segments: readonly MediaSegment[], durationSec: number): MediaSegment[] {
  const clamped: MediaSegment[] = [];
  for (const s of segments) {
    const startSec = Math.max(0, s.startSec), endSec = Math.min(durationSec, s.endSec);
    if (endSec - startSec < 1) continue;
    clamped.push({ ...s, startSec, endSec, sources: [...(s.sources ?? [s.source])] });
  }
  clamped.sort((a,b) => a.startSec-b.startSec || a.endSec-b.endSec);
  const out: MediaSegment[] = [], lastOfKind = new Map<string, number>();
  for (const s of clamped) {
    const idx = lastOfKind.get(s.kind), prev = idx === undefined ? undefined : out[idx];
    if (prev && s.startSec - prev.endSec < 2) {
      const sources = [...new Set([...(prev.sources ?? []), ...(s.sources ?? [])])];
      const best = s.confidence > prev.confidence ? s : prev;
      const merged: MediaSegment = { ...prev, endSec: Math.max(prev.endSec,s.endSec), confidence: best.confidence, source: best.source, sources,
        status: prev.status === "confirmed" || s.status === "confirmed" ? "confirmed" : best.status };
      const label = prev.label ?? s.label; if (label !== undefined) merged.label = label;
      out[idx!] = merged;
    } else { lastOfKind.set(s.kind,out.length); out.push(s); }
  }
  return out.sort((a,b) => a.startSec-b.startSec || a.endSec-b.endSec);
}

/** Sorted player jump ranges; rejected segments are excluded and confirmed segments bypass confidence. */
export function skipPlan(record: MediaSegmentsRecord, opts: { kinds: readonly MediaSegment["kind"][]; minConfidence?: number; includeHeld?: boolean }): Range[] {
  const min = opts.minConfidence ?? 0, ranges: Range[] = [];
  for (const s of record.segments) {
    if (!opts.kinds.includes(s.kind) || s.status === "rejected" || (s.status === "held" && !opts.includeHeld)) continue;
    if (s.status !== "confirmed" && s.confidence < min) continue;
    const startSec=Math.max(0,s.startSec), endSec=Math.min(record.durationSec,s.endSec);
    if (endSec>startSec) ranges.push({startSec,endSec});
  }
  ranges.sort((a,b)=>a.startSec-b.startSec || a.endSec-b.endSec);
  const out: Range[]=[];
  for (const r of ranges) { const last=out.at(-1); if(last && r.startSec-last.endSec<1) last.endSec=Math.max(last.endSec,r.endSec); else out.push({...r}); }
  return out;
}

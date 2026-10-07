import { TraceWaterfall } from "./trace-waterfall";

const spans = [
  { id: "request", name: "User request", depth: 0, startMs: 0, durationMs: 128, status: "completed" as const },
  { id: "retrieval", name: "Search the library", depth: 1, startMs: 12, durationMs: 76, status: "completed" as const },
  { id: "answer", name: "Compose response", depth: 1, startMs: 88, durationMs: 40, status: "running" as const },
];

export function TraceWaterfallShowcase() {
  return (
    <div className="w-[22rem]">
      <TraceWaterfall spans={spans} totalMs={128} visibleCount={spans.length} />
    </div>
  );
}

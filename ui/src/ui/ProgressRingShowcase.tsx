import { ProgressRing } from "./progress-ring";

export function ProgressRingShowcase() {
  return <div className="flex flex-wrap items-center gap-6"><ProgressRing value={0.68} label="Session progress"><div className="text-center"><strong className="block text-3xl">68%</strong><span className="text-muted-foreground text-sm">Complete</span></div></ProgressRing><ProgressRing value={0.32} size={120} strokeWidth={8} label="Muted progress" tone="muted">32%</ProgressRing></div>;
}

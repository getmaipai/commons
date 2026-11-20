"use client";

// K7 story: JobProgress with a per-shot list in every state (rendering, waiting on another job, a failed shot,
// finished) and a time-unknown case. Pictures are made-up inline drawings; the names are made-up people.
import { useState } from "react";
import { JobProgress, type JobProgressAction, type JobProgressShot } from "./job-progress";

const picture = (sky: string, wall: string, person: string, x: number) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="${sky}"/><rect y="110" width="320" height="70" fill="${wall}"/><circle cx="${x}" cy="72" r="20" fill="${person}"/><rect x="${x - 26}" y="94" width="52" height="86" rx="22" fill="${person}"/></svg>`);

const PICS = {
  juniper: picture("#f3e3c8", "#c79a63", "#7a4b3a", 110),
  atlas: picture("#cfe0ee", "#6d86a1", "#33445a", 210),
  willow: picture("#dfeadb", "#7f9f78", "#3f5a3a", 160),
  sage: picture("#e8dcef", "#8f78a3", "#4a3a5e", 90),
};

const STAGES = [{ name: "Draw", weight: 1 }, { name: "Film", weight: 4 }, { name: "Check", weight: 1 }] as const;
const NOTE = "Fixed on its own: a small noise at the very start was trimmed. Her line is heard once.";

function shots(variant: "running" | "held" | "failed" | "done" | "unknown", act: (name: string) => JobProgressAction[]): JobProgressShot[] {
  const ready = (id: string, label: string, thumb: string, extra: Partial<JobProgressShot> = {}): JobProgressShot => ({ id, label, state: "done", thumb, ...extra });
  const waiting = (id: string, label: string, thumb: string, etaSeconds: number): JobProgressShot => ({ id, label, state: variant === "held" ? "held" : "queued", thumb, etaSeconds, heldReason: variant === "held" ? "Your picture job goes first, about 6 minutes. Then the film starts by itself." : undefined });
  const first = ready("s1", "1 · Juniper in the kitchen, wide", PICS.juniper);
  const second = ready("s2", "2 · Juniper in the kitchen, medium", PICS.juniper, { note: NOTE });
  if (variant === "held") return [waiting("s1", "1 · Juniper in the kitchen, wide", PICS.juniper, 480), waiting("s2", "2 · Juniper in the kitchen, medium", PICS.juniper, 960), waiting("s3", "3 · Atlas on the porch, close", PICS.atlas, 1440)];
  if (variant === "done") return [first, second, ready("s3", "3 · Atlas on the porch, close", PICS.atlas), ready("s4", "4 · Willow in the garden, medium", PICS.willow), ready("s5", "5 · Sage at the window, close", PICS.sage)];
  const third: JobProgressShot = variant === "failed"
    ? { id: "s3", label: "3 · Atlas on the porch, close", state: "done", thumb: PICS.atlas }
    : { id: "s3", label: "3 · Atlas on the porch, close", state: "running", thumb: PICS.atlas, progress: 0.62, etaSeconds: variant === "unknown" ? undefined : 180 };
  const fourth: JobProgressShot = variant === "failed"
    ? { id: "s4", label: "4 · Willow in the garden, medium", state: "failed", thumb: PICS.willow, failure: { message: "The first take did not match her face, and the one automatic retry did not either. Try again, or keep the best take.", actions: act("s4") } }
    : { id: "s4", label: "4 · Willow in the garden, medium", state: "queued", thumb: PICS.willow, etaSeconds: variant === "unknown" ? undefined : 480 };
  return [first, second, third, fourth, { id: "s5", label: "5 · Sage at the window, close", state: "queued", thumb: PICS.sage, etaSeconds: variant === "unknown" ? undefined : 540 }];
}

function Heading({ children }: { children: string }) {
  return <h2 className="text-muted-foreground mt-6 mb-2 text-sm font-medium first:mt-0">{children}</h2>;
}

export function JobProgressShotsShowcase() {
  const [last, setLast] = useState("nothing pressed yet");
  const act = (shot: string): JobProgressAction[] => [
    { id: "retry", label: "Try again", primary: true, onSelect: () => setLast(`Try again on ${shot}`) },
    { id: "best", label: "Use the best take anyway", onSelect: () => setLast(`Use the best take on ${shot}`) },
    { id: "open", label: "Open the shot", onSelect: () => setLast(`Open ${shot}`) },
  ];
  return (
    <div className="flex flex-col p-4" data-testid="showcase">
      <p role="status" className="text-muted-foreground mb-4 text-sm">Last action: {last}</p>
      <Heading>Rendering, 2 of 5 shots done</Heading>
      <JobProgress title="Rendering The Blue Mug" stages={STAGES} stageIndex={1} stageProgress={0.4} overallEtaSeconds={1320} shots={shots("running", act)} onCancel={() => setLast("Cancel the job")} />
      <Heading>Rendering, time left unknown</Heading>
      <JobProgress title="Rendering The Blue Mug" stages={STAGES} stageIndex={1} stageProgress={0.4} shots={shots("unknown", act)} onCancel={() => setLast("Cancel the job")} />
      <Heading>Waiting for another job</Heading>
      <JobProgress title="Rendering The Blue Mug" stages={STAGES} stageIndex={0} stageProgress={0} overallEtaSeconds={1800} shots={shots("held", act)} onCancel={() => setLast("Cancel the job")} />
      <Heading>A shot failed</Heading>
      <JobProgress title="Rendering The Blue Mug" stages={STAGES} stageIndex={1} stageProgress={0.7} overallEtaSeconds={1020} shots={shots("failed", act)} onCancel={() => setLast("Cancel the job")} />
      <Heading>Finished</Heading>
      <JobProgress title="Rendering The Blue Mug" stages={STAGES} stageIndex={3} stageProgress={1} outcome={{ status: "success", summary: "All 5 shots are ready to review." }} shots={shots("done", act)} />
    </div>
  );
}

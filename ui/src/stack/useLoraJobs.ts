// STACK-LORAS-01. Follows the jobs the page started (an install or a move): asks `GET /stack/v1/jobs/{id}` until each is over, then tells the page to
// read the library again. A job that finished well disappears; a failed one stays, with the Stack's reason, until the person dismisses it.
import { useCallback, useEffect, useRef, useState } from "react";
import type { StackLoraJob, StackLorasClient } from "./StackClient";

export interface TrackedLoraJob { id: string; label: string; kind: "install" | "move"; job: StackLoraJob | null; /** Set when the Stack no longer knows the job. */ lost?: boolean }
const OVER = new Set<string>(["done", "failed", "cancelled"]);
export const isOver = (job: TrackedLoraJob): boolean => job.lost === true || (job.job !== null && OVER.has(job.job.state));

export function useLoraJobs(client: StackLorasClient, onSettled: (done: TrackedLoraJob[]) => void, pollMs: number) {
  const [jobs, setJobs] = useState<TrackedLoraJob[]>([]);
  const latest = useRef(jobs); latest.current = jobs;
  const settled = useRef(onSettled); settled.current = onSettled;

  const track = useCallback((id: string, label: string, kind: TrackedLoraJob["kind"]) => {
    if (!client.job) { settled.current([{ id, label, kind, job: null }]); return; }
    setJobs((current) => [...current.filter((job) => job.id !== id), { id, label, kind, job: null }]);
  }, [client]);
  const dismiss = useCallback((id: string) => setJobs((current) => current.filter((job) => job.id !== id)), []);

  const running = jobs.some((job) => !isOver(job));
  useEffect(() => {
    if (!running || pollMs <= 0 || !client.job) return;
    let stopped = false;
    const tick = async () => {
      const open = latest.current.filter((job) => !isOver(job));
      const reads = await Promise.all(open.map(async (job) => { try { return await client.job!(job.id); } catch { return null; } }));
      if (stopped) return;
      const updated = new Map<string, TrackedLoraJob>();
      const finished: TrackedLoraJob[] = [];
      open.forEach((job, at) => {
        const read = reads[at] ?? null;
        const next: TrackedLoraJob = read ? { ...job, job: read } : { ...job, lost: true };
        updated.set(job.id, next);
        if (isOver(next)) finished.push(next);
      });
      setJobs((current) => current.flatMap((job) => {
        const next = updated.get(job.id) ?? job;
        return next.lost || next.job?.state === "done" ? [] : [next];
      }));
      if (finished.length > 0) settled.current(finished);
    };
    void tick();
    const timer = window.setInterval(() => { void tick(); }, pollMs);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [running, pollMs, client]);

  return { jobs, track, dismiss };
}

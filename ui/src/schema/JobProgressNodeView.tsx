import { JobProgress } from "@/kit/elements/job-progress";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import { localPicture } from "@/kit/schema/mediaPath";
import type { JobProgressNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
const str = (v: unknown) => typeof v === "string" ? v : undefined;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : undefined;

export function JobProgressNodeView({ node, state }: { node: JobProgressNode; state: Row }) {
  const query = useBinding<Row[]>(node.bind, state);
  const { dispatch } = useDispatchAction();
  const fields = node.item_fields;
  const rows = Array.isArray(query.data) ? query.data : [];
  const shots = rows.flatMap((row) => {
    const id = readField(row, fields.shot_id);
    if ((typeof id !== "string" || !id) && typeof id !== "number") return [];
    const raw = readField(row, fields.state);
    const shotState = ["queued", "running", "done", "held", "failed"].includes(String(raw)) ? raw as "queued" | "running" | "done" | "held" | "failed" : "queued";
    const actionsRaw = readField(row, fields.failure_actions);
    const failureActions = Array.isArray(actionsRaw) ? actionsRaw.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const a = item as Row;
      return typeof a.label === "string" && a.action && typeof a.action === "object" ? [{ id: String(index), label: a.label, onSelect: () => dispatch(a.action as import("@/kit/schema/types").Action, [row]) }] : [];
    }) : undefined;
    const progressValue = num(readField(row, fields.progress));
    return [{ id: String(id), label: String(readField(row, fields.label) ?? ""), state: shotState,
      progress: progressValue === undefined ? undefined : Math.max(0, Math.min(1, progressValue > 1 ? progressValue / 100 : progressValue)), etaSeconds: num(readField(row, fields.eta_seconds)),
      thumb: localPicture(readField(row, fields.thumb)) ?? undefined, note: str(readField(row, fields.note)),
      heldReason: str(readField(row, fields.held_reason)), failure: str(readField(row, fields.failure_message)) ? { message: str(readField(row, fields.failure_message))!, actions: failureActions } : undefined }];
  });
  const eta = rows[0] && node.overall_eta_seconds ? num(readField(rows[0], node.overall_eta_seconds)) : undefined;
  return <JobProgress title={node.title ?? ""} stages={[]} stageIndex={0} stageProgress={0} shots={shots} overallEtaSeconds={eta} cancelable={Boolean(node.cancel)} onCancel={node.cancel ? () => dispatch(node.cancel!, rows) : undefined} />;
}

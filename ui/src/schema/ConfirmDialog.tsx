import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/kit/ui/alert-dialog";
import { Button } from "@/kit/ui/button";
import type { PendingConfirm } from "@/kit/schema/actions";
import { StatusCard, type StatusCardKind } from "@/kit/elements/status-card";
import { useBinding } from "@/kit/schema/binding";
import type { Binding } from "@/kit/schema/types";
import { i18n } from "@/kit/i18n"

const STATUS_KINDS: readonly StatusCardKind[] = ["progress", "waiting", "done", "attention", "problem", "info"];
const STATUS_ALIASES: Record<string, StatusCardKind> = {
  ok: "done", success: "done", ready: "done", error: "problem", failed: "problem", failure: "problem", down: "problem",
  warn: "attention", warning: "attention", running: "progress", busy: "progress", working: "progress", idle: "waiting",
};

/** MEDIA-PARITY-02: the status-card row (`{state, title, detail}`) as a card, or null when the row has no title. Accepts one row,
 * a one-row list, or `{rows: [row]}`; an unknown state reads as `info`. */
export function statusCardFromRow(answer: unknown): { kind: StatusCardKind; title: string; line?: string } | null {
  const first = Array.isArray(answer) ? answer[0] : (answer as { rows?: unknown } | null)?.rows !== undefined ? (answer as { rows: unknown[] }).rows[0] : answer;
  if (!first || typeof first !== "object") return null;
  const row = first as Record<string, unknown>;
  const rawState = String(row.state ?? row.kind ?? "").toLowerCase();
  const kind = (STATUS_KINDS as readonly string[]).includes(rawState) ? (rawState as StatusCardKind) : (STATUS_ALIASES[rawState] ?? "info");
  const title = typeof row.title === "string" ? row.title : typeof row.text === "string" ? row.text : "";
  if (title === "") return null;
  const detail = typeof row.detail === "string" ? row.detail : typeof row.line === "string" ? row.line : undefined;
  return { kind, title, line: detail && detail !== "" ? detail : undefined };
}

/** The dialog's status slot: reads the bound row and draws it as a StatusCard. Mounted only while the dialog is open. */
function ConfirmStatus({ binding }: { binding: Binding }) {
  const query = useBinding<unknown>(binding);
  const card = statusCardFromRow(query.data);
  return card ? <div data-slot="confirm-status"><StatusCard kind={card.kind} title={card.title} line={card.line} textStyle="status" /></div> : null;
}

/** Renders `useDispatchAction()`'s own pending-confirm state as a real
 * dialog (docs/UI.md > Dialog: "AlertDialog... for destructive confirms,
 * no outside-click close"). One instance per SchemaPage, not per node -
 * only one confirm can ever be pending at a time.
 *
 * The confirm button is a plain `Button`, not `AlertDialogAction`: Radix's
 * own `AlertDialogPrimitive.Action` closes the dialog itself the instant
 * it's clicked, before this component's `confirm()` (an async call) ever
 * settles - a real bug a code review's own regression test caught live
 * (2026-09-05): a batch action that failed partway through showed no
 * error at all, because the dialog had already closed on click, out from
 * under the still-running request. `pendingConfirm`'s own `busy`/`error`
 * state is the only thing allowed to decide when this dialog closes now. */
export function ConfirmDialog({ pendingConfirm }: { pendingConfirm: PendingConfirm | null }) {
  return (
    <AlertDialog open={pendingConfirm !== null} onOpenChange={(open) => !open && pendingConfirm?.cancel()}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          // Radix closes an AlertDialog on Escape by default, same as any
          // other dismissal - but while `busy` the confirmed action is
          // still running, and cancelling here only hides the dialog
          // (`onOpenChange`'s own cancel() above), it can't actually stop
          // that in-flight request. A code review (2026-09-05) found this
          // meant Escape mid-confirm let the household member believe
          // they'd backed out, while the action's own onSettled callback
          // (e.g. a batch action's exitSelectMode) still fired once it
          // resolved - a side effect landing after they thought they'd
          // cancelled it. Blocked the same way the Cancel/Confirm buttons
          // are already disabled for the same state.
          if (pendingConfirm?.busy) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{pendingConfirm?.prompt}</AlertDialogTitle>
          {pendingConfirm?.error ? <AlertDialogDescription>{pendingConfirm.error}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {pendingConfirm?.status ? <ConfirmStatus binding={pendingConfirm.status} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => pendingConfirm?.cancel()} disabled={pendingConfirm?.busy}>
            {i18n._({ id: "ui.Cancel", message: "Cancel" })}
          </AlertDialogCancel>
          <Button onClick={() => pendingConfirm?.confirm()} disabled={pendingConfirm?.busy}>
            {pendingConfirm?.busy ? i18n._({ id: "ui.Working…", message: "Working…" }) : i18n._({ id: "ui.Confirm", message: "Confirm" })}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

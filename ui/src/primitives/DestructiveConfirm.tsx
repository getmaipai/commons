import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/kit/ui/alert-dialog";
import { Button } from "@/kit/ui/button";

interface DestructiveConfirmProps {
  /** The bold question line, e.g. "Remove 3 people from your household?" */
  message: string;
  /** A second, explanatory line - what's actually lost, if anything
   * beyond the obvious. Optional: a few callers' own question already
   * says everything worth saying. */
  detail?: string;
  confirmLabel: string;
  busyLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}

// The kit's one destructive-confirmation: a modal. Every delete, remove or discard in every app asks the same way, centred over a dimmed
// page, so nobody learns a second shape (owner, 2026-11-02: an inline bordered block on some pages and a dialog on others was
// inconsistent). A caller mounts it while the question is open and unmounts it on confirm or cancel; Escape and a click outside
// cancel. The buttons are plain Buttons, not AlertDialogAction, so a confirm that is still working keeps the dialog open.
export function DestructiveConfirm({
  message,
  detail,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
  cancelLabel = "Keep it",
}: DestructiveConfirmProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <AlertDialogContent data-testid="destructive-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{message}</AlertDialogTitle>
          <AlertDialogDescription className={detail ? undefined : "sr-only"}>{detail ?? message}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

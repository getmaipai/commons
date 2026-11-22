// STACK-MODELS-PAGE-01. "Free up space": the models no level, order or fallback uses, largest first, each with a checkbox, and what removing them
// frees in GB. Nothing is removed until the person confirms the list; the Stack judges every id again at removal time and answers kept or failed
// with a sentence, which this dialog shows line by line.
import { useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Checkbox } from "@/kit/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Skeleton } from "@/kit/ui/skeleton";
import { DestructiveConfirm } from "@/kit/primitives/DestructiveConfirm";
import { i18n } from "@/kit/i18n";
import type { StackChoicesView, StackRemoveResult, StackUnused } from "./StackClient";
import { NoticeLine, Pill } from "./StackParts";
import type { Notice } from "./StackParts";
import { categoryLabelIndex } from "./stackLogic";
import { gb } from "./stackWords";
import type { StackChoicesState } from "./useStackChoices";

export function StackFreeSpaceDialog({ open, state, view, onClose }: { open: boolean; state: StackChoicesState; view: StackChoicesView; onClose: () => void }) {
  const [unused, setUnused] = useState<StackUnused | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [tidy, setTidy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<StackRemoveResult | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const { loadUnused } = state;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setUnused(null); setResult(null); setNotice(null); setConfirm(false); setLoading(true);
    void loadUnused().then((outcome) => {
      if (cancelled) return;
      setLoading(false);
      if (outcome.ok) {
        setUnused(outcome.value);
        setPicked(new Set(outcome.value.items.map((item) => item.id)));
        setTidy(false);
      } else setNotice({ kind: "error", text: outcome.message });
    });
    return () => { cancelled = true; };
  }, [open, loadUnused]);

  const features = categoryLabelIndex(view.categories);
  const items = unused?.items ?? [];
  const chosen = items.filter((item) => picked.has(item.id));
  const chosenBytes = chosen.reduce((sum, item) => sum + item.size_bytes, 0) + (tidy ? unused?.tidy.reclaimable_bytes ?? 0 : 0);
  const removable = chosen.length > 0 || (tidy && (unused?.tidy.reclaimable_bytes ?? 0) > 0);
  const busy = state.busy.has("unused:remove");
  const toggle = (id: string, on: boolean) => setPicked((current) => { const next = new Set(current); if (on) next.add(id); else next.delete(id); return next; });

  async function remove() {
    const outcome = await state.removeUnused(chosen.map((c) => c.id), tidy);
    setConfirm(false);
    if (outcome.ok) {
      setResult(outcome.value);
      setNotice({ kind: "ok", text: i18n._({ id: "ui.Freed {size}.", message: "Freed {size}.", values: { size: gb(outcome.value.freed_bytes) } }) });
    } else setNotice({ kind: "error", text: outcome.message });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent scroll="viewport" className="sm:max-w-xl" aria-describedby="free-space-description">
        <DialogHeader>
          <DialogTitle>{i18n._({ id: "ui.Free up space", message: "Free up space" })}</DialogTitle>
          <DialogDescription id="free-space-description">{i18n._({ id: "ui.These models are downloaded but nothing uses them. Pick what to remove. You can download any of them again later.", message: "These models are downloaded but nothing uses them. Pick what to remove. You can download any of them again later." })}</DialogDescription>
        </DialogHeader>
        <NoticeLine notice={notice} />
        {loading && <div className="flex flex-col gap-2" aria-busy="true"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div>}
        {result ? (
          <ul className="flex flex-col gap-1.5" aria-label={i18n._({ id: "ui.What happened to each model", message: "What happened to each model" })}>
            {result.results.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border">
                <Pill tone={line.status === "removed" ? "ok" : line.status === "kept" ? "warn" : "bad"}>{line.status === "removed" ? i18n._({ id: "ui.Removed", message: "Removed" }) : line.status === "kept" ? i18n._({ id: "ui.Kept", message: "Kept" }) : i18n._({ id: "ui.Not removed", message: "Not removed" })}</Pill>
                <span className="min-w-0 flex-1 break-words">{items.find((i) => i.id === line.id)?.label ?? line.id}</span>
                <span className="w-full text-muted-foreground">{line.message}</span>
              </li>
            ))}
            {result.tidy_removed.length > 0 && <li className="text-sm text-muted-foreground">{i18n._({ id: "ui.Also cleared {count, plural, one {# leftover file} other {# leftover files}}.", message: "Also cleared {count, plural, one {# leftover file} other {# leftover files}}.", values: { count: result.tidy_removed.length } })}</li>}
          </ul>
        ) : unused && items.length === 0 && (unused.tidy.reclaimable_bytes === 0) ? (
          <p>{i18n._({ id: "ui.Nothing to clear. Every downloaded model is in use.", message: "Nothing to clear. Every downloaded model is in use." })}</p>
        ) : unused ? (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5" aria-label={i18n._({ id: "ui.Unused models", message: "Unused models" })}>
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-xl px-3 py-2 ring-1 ring-inset ring-border">
                  <Checkbox id={`unused-${item.id}`} className="mt-1" checked={picked.has(item.id)} onCheckedChange={(v) => toggle(item.id, v === true)} aria-label={i18n._({ id: "ui.Remove {model}", message: "Remove {model}", values: { model: item.label } })} />
                  <label htmlFor={`unused-${item.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium break-words">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{features.get(item.category) ?? item.category} · {gb(item.size_bytes)}</span>
                    <span className="text-sm text-muted-foreground">{item.reason}</span>
                  </label>
                </li>
              ))}
            </ul>
            {unused.tidy.reclaimable_bytes > 0 && (
              <div className="flex items-start gap-3 rounded-xl px-3 py-2 ring-1 ring-inset ring-border">
                <Checkbox id="unused-tidy" className="mt-1" checked={tidy} onCheckedChange={(v) => setTidy(v === true)} aria-label={i18n._({ id: "ui.Also clear leftovers", message: "Also clear leftovers" })} />
                <label htmlFor="unused-tidy" className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{i18n._({ id: "ui.Also clear leftovers", message: "Also clear leftovers" })}</span>
                  <span className="text-sm text-muted-foreground">{i18n._({ id: "ui.Replaced versions and downloads that stopped part way, {size} in all.", message: "Replaced versions and downloads that stopped part way, {size} in all.", values: { size: gb(unused.tidy.reclaimable_bytes) } })}</span>
                </label>
              </div>
            )}
          </div>
        ) : null}
        <DialogFooter>
          {result ? <Button onClick={onClose}>{i18n._({ id: "ui.Done", message: "Done" })}</Button> : (
            <>
              <Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button>
              <Button variant="destructive" disabled={!removable || busy || loading} onClick={() => setConfirm(true)}>{removable ? i18n._({ id: "ui.Remove and free {size}", message: "Remove and free {size}", values: { size: gb(chosenBytes) } }) : i18n._({ id: "ui.Remove", message: "Remove" })}</Button>
            </>
          )}
        </DialogFooter>
        {confirm && (
          <DestructiveConfirm
            message={i18n._({ id: "ui.Remove {count, plural, one {# model} other {# models}} and free {size}?", message: "Remove {count, plural, one {# model} other {# models}} and free {size}?", values: { count: chosen.length, size: gb(chosenBytes) } })}
            detail={chosen.length > 0 ? chosen.map((c) => c.label).join(", ") : i18n._({ id: "ui.Only leftover files will be cleared.", message: "Only leftover files will be cleared." })}
            confirmLabel={i18n._({ id: "ui.Remove", message: "Remove" })}
            busyLabel={i18n._({ id: "ui.Removing", message: "Removing" })}
            busy={busy}
            onCancel={() => setConfirm(false)}
            onConfirm={() => { void remove(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

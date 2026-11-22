// STACK-MODELS-PAGE-01. "Use the recommended setup": the Stack works out the best model for every level that fits this computer, and which
// features to switch on. The sheet opens with a preview (a dry run: nothing is written), says what would change in plain words, and only
// then applies it. It never removes anything.
import { useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/kit/ui/sheet";
import { Skeleton } from "@/kit/ui/skeleton";
import { i18n } from "@/kit/i18n";
import type { StackChoicesView, StackRecommendedResult } from "./StackClient";
import { NoticeLine, Pill } from "./StackParts";
import type { Notice } from "./StackParts";
import { labelIndex } from "./stackLogic";
import { gb, levelName } from "./stackWords";
import type { StackChoicesState } from "./useStackChoices";
import { useIsPhone } from "./StackCategorySheet";

function sizeOf(view: StackChoicesView, id: string): number | null {
  for (const category of view.categories) {
    const found = category.candidates.find((c) => c.id === id);
    if (found) return found.download_bytes || found.size_bytes;
  }
  return null;
}

export function StackRecommendedSheet({ open, state, view, onClose }: { open: boolean; state: StackChoicesState; view: StackChoicesView; onClose: () => void }) {
  const phone = useIsPhone();
  const [preview, setPreview] = useState<StackRecommendedResult | null>(null);
  const [applied, setApplied] = useState<StackRecommendedResult | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const { previewRecommended } = state;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreview(null); setApplied(null); setNotice(null); setLoading(true);
    void previewRecommended().then((outcome) => {
      if (cancelled) return;
      setLoading(false);
      if (outcome.ok) setPreview(outcome.value);
      else setNotice({ kind: "error", text: outcome.message });
    });
    return () => { cancelled = true; };
  }, [open, previewRecommended]);

  const labels = labelIndex(view.categories);
  const labelOf = (id: string) => labels.get(id) ?? id;
  const featureOf = (id: string) => view.categories.find((c) => c.id === id)?.label ?? id;
  const shown = applied ?? preview;
  const nothing = shown !== null && shown.changed.length === 0 && shown.installs.length === 0;
  const busy = state.busy.has("recommended");

  async function apply() {
    const outcome = await state.applyRecommended();
    if (outcome.ok) {
      setApplied(outcome.value);
      setNotice({ kind: "ok", text: outcome.value.installs.length > 0
        ? i18n._({ id: "ui.The recommended setup is saved. {count, plural, one {# download has} other {# downloads have}} started.", message: "The recommended setup is saved. {count, plural, one {# download has} other {# downloads have}} started.", values: { count: outcome.value.installs.length } })
        : i18n._({ id: "ui.The recommended setup is saved.", message: "The recommended setup is saved." }) });
    } else setNotice({ kind: "error", text: outcome.message });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side={phone ? "bottom" : "right"} className="gap-0 overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
        <SheetHeader className="gap-2">
          <SheetTitle>{i18n._({ id: "ui.Recommended setup", message: "Recommended setup" })}</SheetTitle>
          <SheetDescription>{i18n._({ id: "ui.The best model for every level that fits this computer, with features switched on or off to match. Nothing is removed. This is what would change.", message: "The best model for every level that fits this computer, with features switched on or off to match. Nothing is removed. This is what would change." })}</SheetDescription>
          <NoticeLine notice={notice} />
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-4">
          {loading && <div className="flex flex-col gap-2" aria-busy="true"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /></div>}
          {shown && (
            <>
              {nothing && <p>{i18n._({ id: "ui.Nothing would change. Your setup already matches the recommendation.", message: "Nothing would change. Your setup already matches the recommendation." })}</p>}
              {shown.changed.length > 0 && (
                <section aria-labelledby="rec-changes" className="flex flex-col gap-2">
                  <h3 id="rec-changes" className="text-base font-semibold">{applied ? i18n._({ id: "ui.What changed", message: "What changed" }) : i18n._({ id: "ui.What would change", message: "What would change" })}</h3>
                  <ul className="flex flex-col gap-1.5">
                    {shown.changed.map((change) => {
                      const category = view.categories.find((c) => c.id === change.category);
                      const level = category && !category.tiered ? "" : ` ${levelName(change.tier)}`;
                      return (
                        <li key={`${change.category}:${change.tier}`} className="rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border">
                          <span className="font-medium">{featureOf(change.category)}{level}</span>
                          <span className="block text-muted-foreground">{change.from ? i18n._({ id: "ui.{from} becomes {to}", message: "{from} becomes {to}", values: { from: labelOf(change.from), to: labelOf(change.to) } }) : i18n._({ id: "ui.Will use {to}", message: "Will use {to}", values: { to: labelOf(change.to) } })}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {shown.unchanged > 0 && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.{count, plural, one {# level stays} other {# levels stay}} as it is.", message: "{count, plural, one {# level stays} other {# levels stay}} as it is.", values: { count: shown.unchanged } })}</p>}
              {shown.installs.length > 0 && (
                <section aria-labelledby="rec-downloads" className="flex flex-col gap-2">
                  <h3 id="rec-downloads" className="text-base font-semibold">{applied ? i18n._({ id: "ui.Downloads started", message: "Downloads started" }) : i18n._({ id: "ui.Downloads that would start", message: "Downloads that would start" })}</h3>
                  <ul className="flex flex-col gap-1.5">
                    {shown.installs.map((install) => {
                      const size = sizeOf(view, install.model);
                      return <li key={install.model} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border"><span className="min-w-0 break-words">{labelOf(install.model)}</span>{size !== null && <Pill>{gb(size)}</Pill>}</li>;
                    })}
                  </ul>
                </section>
              )}
              {shown.needs_licence.length > 0 && (
                <section aria-labelledby="rec-licence" className="flex flex-col gap-1">
                  <h3 id="rec-licence" className="text-base font-semibold">{i18n._({ id: "ui.Needs your OK first", message: "Needs your OK first" })}</h3>
                  <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.These models come with a licence you have to accept before they can be downloaded: {models}.", message: "These models come with a licence you have to accept before they can be downloaded: {models}.", values: { models: shown.needs_licence.map((m) => m.label || labelOf(m.id)).join(", ") } })}</p>
                </section>
              )}
              {shown.skipped.length > 0 && (
                <section aria-labelledby="rec-skipped" className="flex flex-col gap-1">
                  <h3 id="rec-skipped" className="text-base font-semibold">{i18n._({ id: "ui.Left out", message: "Left out" })}</h3>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">{shown.skipped.map((s) => <li key={s.model}>{labelOf(s.model)}: {s.reason}</li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>
        <SheetFooter className="flex-row flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{applied ? i18n._({ id: "ui.Done", message: "Done" }) : i18n._({ id: "ui.Not now", message: "Not now" })}</Button>
          {!applied && <Button disabled={busy || loading || !preview || nothing} onClick={() => { void apply(); }}>{busy ? i18n._({ id: "ui.Applying", message: "Applying" }) : i18n._({ id: "ui.Use the recommended setup", message: "Use the recommended setup" })}</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// STACK-MODELS-PAGE-01. "Add a chat model": a Hugging Face link (or owner/repo), optionally the one file when the repository has several, and the
// level to use it for. The Stack reads the repository without downloading it, refuses what it cannot size or license (with a sentence this dialog
// shows as sent), stores the record and starts the checked download.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/kit/ui/button";
import { Checkbox } from "@/kit/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { i18n } from "@/kit/i18n";
import type { StackAddModelResult, StackLevel } from "./StackClient";
import { NoticeLine, Pill } from "./StackParts";
import type { Notice } from "./StackParts";
import { LEVEL_ORDER } from "./stackLogic";
import { gb, levelName, stateWord } from "./stackWords";
import type { StackChoicesState } from "./useStackChoices";

export function StackAddModelDialog({ open, state, onClose }: { open: boolean; state: StackChoicesState; onClose: () => void }) {
  const [source, setSource] = useState("");
  const [file, setFile] = useState("");
  const [level, setLevel] = useState<StackLevel>("standard");
  const [use, setUse] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [added, setAdded] = useState<StackAddModelResult | null>(null);
  useEffect(() => { if (open) { setSource(""); setFile(""); setLevel("standard"); setUse(true); setNotice(null); setAdded(null); } }, [open]);
  const busy = state.busy.has("add-model");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!source.trim()) { setNotice({ kind: "error", text: i18n._({ id: "ui.Paste a Hugging Face link, or type owner/name, first.", message: "Paste a Hugging Face link, or type owner/name, first." }) }); return; }
    const outcome = await state.addModel({ source: source.trim(), ...(file.trim() ? { file: file.trim() } : {}), tier: level, use });
    if (outcome.ok) { setAdded(outcome.value); setNotice(null); } else setNotice({ kind: "error", text: outcome.message });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg" aria-describedby="add-model-description">
        <DialogHeader>
          <DialogTitle>{i18n._({ id: "ui.Add a chat model", message: "Add a chat model" })}</DialogTitle>
          <DialogDescription id="add-model-description">{i18n._({ id: "ui.Paste a link to a model on Hugging Face. The Stack checks its size and licence, downloads it and checks the file before it is used.", message: "Paste a link to a model on Hugging Face. The Stack checks its size and licence, downloads it and checks the file before it is used." })}</DialogDescription>
        </DialogHeader>
        {added ? (
          <div className="flex flex-col gap-3">
            <NoticeLine notice={{ kind: "ok", text: added.chosen ? i18n._({ id: "ui.{model} is added and chosen for {level}.", message: "{model} is added and chosen for {level}.", values: { model: added.label, level: levelName(added.tier) } }) : i18n._({ id: "ui.{model} is added. It is not chosen for any level yet.", message: "{model} is added. It is not chosen for any level yet.", values: { model: added.label } }) }} />
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Pill tone={added.state === "installed" ? "ok" : "primary"}>{stateWord(added.state, null)}</Pill><span>{gb(added.size_bytes)}</span><span>{added.licence}</span></p>
            <DialogFooter><Button onClick={onClose}>{i18n._({ id: "ui.Done", message: "Done" })}</Button></DialogFooter>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { void submit(e); }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-model-source">{i18n._({ id: "ui.Link or owner/name", message: "Link or owner/name" })}</Label>
              <Input id="add-model-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder={i18n._({ id: "ui.huggingface.co/owner/name", message: "huggingface.co/owner/name" })} autoComplete="off" spellCheck={false} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-model-file">{i18n._({ id: "ui.File (only if the page has several)", message: "File (only if the page has several)" })}</Label>
              <Input id="add-model-file" value={file} onChange={(e) => setFile(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-sm font-medium">{i18n._({ id: "ui.Use it for", message: "Use it for" })}</legend>
              <div role="radiogroup" aria-label={i18n._({ id: "ui.Level to use it for", message: "Level to use it for" })} className="flex flex-wrap gap-2">
                {LEVEL_ORDER.map((option) => (
                  <Button key={option} type="button" role="radio" aria-checked={level === option} variant={level === option ? "default" : "outline"} size="sm" onClick={() => setLevel(option)}>{levelName(option)}</Button>
                ))}
              </div>
            </fieldset>
            <div className="flex items-center gap-3">
              <Checkbox id="add-model-use" checked={use} onCheckedChange={(v) => setUse(v === true)} />
              <Label htmlFor="add-model-use">{i18n._({ id: "ui.Start using it as soon as it is ready", message: "Start using it as soon as it is ready" })}</Label>
            </div>
            <NoticeLine notice={notice} />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button>
              <Button type="submit" disabled={busy}>{busy ? i18n._({ id: "ui.Checking the model", message: "Checking the model" }) : i18n._({ id: "ui.Add model", message: "Add model" })}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// STACK-LORAS-01. The small dialogs of the styles page: edit, move to a drive, delete for good, and a site key. Each shows the Stack's own sentence on a refusal.
import { useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { Switch } from "@/kit/ui/switch";
import { i18n } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import type { StackDrive, StackLora, StackLoraPatch, StackLoraSource } from "./StackClient";

const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });

export function EditLoraDialog({ lora, redacted, askTicket, onSave, onClose }: { lora: StackLora | null; redacted: boolean; askTicket?: () => Promise<string | null>; onSave: (id: string, patch: StackLoraPatch) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState("");
  const [words, setWords] = useState("");
  const [strength, setStrength] = useState("1");
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!lora) return;
    setName(lora.name); setWords(lora.trigger_words.join(", ")); setStrength(String(lora.strength_default)); setAdult(lora.classification === "adult-only"); setError("");
  }, [lora]);
  // Marking a style adults only needs nothing. Letting it back to all ages needs Home's fresh ticket, which only a host that can ask for one offers.
  const canLower = Boolean(askTicket);
  const strengthNumber = Number(strength);
  const valid = name.trim().length > 0 && Number.isFinite(strengthNumber) && strengthNumber >= 0 && strengthNumber <= 2;
  async function save() {
    if (!lora) return;
    setBusy(true); setError("");
    try {
      const patch: StackLoraPatch = { name: name.trim(), strength_default: strengthNumber, trigger_words: words.split(",").map((word) => word.trim()).filter(Boolean) };
      if (!redacted && adult !== (lora.classification === "adult-only")) {
        patch.classification = adult ? "adult-only" : "all-ages";
        if (!adult) { const ticket = await askTicket?.(); if (!ticket) { setBusy(false); return; } patch.ticket = ticket; }
      }
      await onSave(lora.id, patch); onClose();
    } catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(lora)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent scroll="viewport" aria-describedby="lora-edit-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.Edit style", message: "Edit style" })}</DialogTitle><DialogDescription id="lora-edit-description">{i18n._({ id: "ui.Change how this style is named and used.", message: "Change how this style is named and used." })}</DialogDescription></DialogHeader>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-edit-name">{i18n._({ id: "ui.Name", message: "Name" })}</Label><Input id="lora-edit-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-edit-words">{i18n._({ id: "ui.Trigger words, separated by commas", message: "Trigger words, separated by commas" })}</Label><Input id="lora-edit-words" value={words} onChange={(e) => setWords(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-edit-strength">{i18n._({ id: "ui.Strength (0 to 2)", message: "Strength (0 to 2)" })}</Label><Input id="lora-edit-strength" inputMode="decimal" value={strength} onChange={(e) => setStrength(e.target.value)} /></div>
        {!redacted && <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><Switch id="lora-edit-adult" checked={adult} disabled={lora?.classification === "adult-only" && !canLower} onCheckedChange={setAdult} /><Label htmlFor="lora-edit-adult">{i18n._({ id: "ui.Adults only", message: "Adults only" })}</Label></div>
          {lora?.classification === "adult-only" && !canLower && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Only Home can mark an adults only style as all ages, because it asks for the adult lock first.", message: "Only Home can mark an adults only style as all ages, because it asks for the adult lock first." })}</p>}
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={busy || !valid} onClick={() => { void save(); }}>{i18n._({ id: "ui.Save", message: "Save" })}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

/** The drive choice shared by the move dialog and the add dialog: connected drives only. `main` is the Stack's own data directory. */
export function DrivePicker({ id, drives, value, onChange, exclude }: { id: string; drives: StackDrive[]; value: string; onChange: (value: string) => void; exclude?: string }) {
  const choices = drives.filter((drive) => drive.connected && drive.id !== exclude);
  return <Select value={value} onValueChange={onChange}><SelectTrigger id={id} aria-label={i18n._({ id: "ui.Drive", message: "Drive" })}><SelectValue placeholder={i18n._({ id: "ui.Choose a drive", message: "Choose a drive" })} /></SelectTrigger><SelectContent>{choices.map((drive) => <SelectItem key={drive.id} value={drive.id}>{drive.label}</SelectItem>)}</SelectContent></Select>;
}

export function MoveLoraDialog({ lora, drives, onMove, onClose }: { lora: StackLora | null; drives: StackDrive[]; onMove: (lora: StackLora, diskId: string) => Promise<void>; onClose: () => void }) {
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTarget(""); setError(""); }, [lora]);
  const current = lora?.disk_id ?? "main";
  async function go() {
    if (!lora || !target) return;
    setBusy(true); setError("");
    try { await onMove(lora, target); onClose(); } catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(lora)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent scroll="viewport" aria-describedby="lora-move-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.Move {style}", message: "Move {style}", values: { style: lora?.name ?? "" } })}</DialogTitle><DialogDescription id="lora-move-description">{i18n._({ id: "ui.Choose a connected drive for this style. It stays usable and is checked after the copy.", message: "Choose a connected drive for this style. It stays usable and is checked after the copy." })}</DialogDescription></DialogHeader>
      <div className="flex min-w-0 flex-col gap-3">
        <DrivePicker id="lora-move-drive" drives={drives} value={target} onChange={setTarget} exclude={current} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={!target || busy} onClick={() => { void go(); }}>{i18n._({ id: "ui.Move", message: "Move" })}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function PurgeLoraDialog({ lora, onPurge, onClose }: { lora: StackLora | null; onPurge: (lora: StackLora) => Promise<void>; onClose: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setError(""); }, [lora]);
  async function go() {
    if (!lora) return;
    setBusy(true); setError("");
    try { await onPurge(lora); onClose(); } catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(lora)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent aria-describedby="lora-purge-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.Delete {style} for good?", message: "Delete {style} for good?", values: { style: lora?.name ?? "" } })}</DialogTitle><DialogDescription id="lora-purge-description">{i18n._({ id: "ui.The file is deleted and cannot be brought back. You can add the style again from its source.", message: "The file is deleted and cannot be brought back. You can add the style again from its source." })}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button variant="destructive" disabled={busy} onClick={() => { void go(); }}>{i18n._({ id: "ui.Delete for good", message: "Delete for good" })}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function KeyDialog({ source, onSave, onClose }: { source: StackLoraSource | null; onSave: (site: StackLoraSource["site"], key: string | null) => Promise<void>; onClose: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setKey(""); setError(""); }, [source]);
  async function save(value: string | null) {
    if (!source) return;
    setBusy(true); setError("");
    try { await onSave(source.site, value); onClose(); } catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(source)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent aria-describedby="lora-key-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.{site} key", message: "{site} key", values: { site: source?.label ?? "" } })}</DialogTitle><DialogDescription id="lora-key-description">{i18n._({ id: "ui.Some styles only download with your own key from the site. It is stored on this computer and never shown again.", message: "Some styles only download with your own key from the site. It is stored on this computer and never shown again." })}</DialogDescription></DialogHeader>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-key-input">{i18n._({ id: "ui.Key", message: "Key" })}</Label><Input id="lora-key-input" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        {source?.has_key && <Button variant="ghost" disabled={busy} onClick={() => { void save(null); }}>{i18n._({ id: "ui.Remove key", message: "Remove key" })}</Button>}
        <Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button>
        <Button disabled={busy || !key.trim()} onClick={() => { void save(key.trim()); }}>{i18n._({ id: "ui.Save", message: "Save" })}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

// STACK-LORAS-01. "Add a style": search Hugging Face or Civitai, pick a hit, choose the drive, and the Stack downloads it. The licence refusal is shown as the
// Stack words it, with one button that accepts the licences when the host offers that. Site keys are set here too. Kit primitives and tokens only.
import { useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { StackClientError, sentenceOf } from "./StackClient";
import type { StackDrive, StackLicencesClient, StackLoraHit, StackLoraMedia, StackLoraSite, StackLoraSource, StackLorasClient } from "./StackClient";
import { DrivePicker, KeyDialog } from "./StackLoraDialogs";
import { sizeWord } from "./StackLoraRow";
import { Pill } from "./StackParts";

const SearchIcon = getIcon("search");
const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });
const looksLikeVideo = (base: string | null): boolean => /wan|ltx|hunyuan|video|svd|cogvideo|mochi/i.test(base ?? "");

function AddDialog({ hit, drives, licences, locked, client, onStarted, onClose }: { hit: StackLoraHit | null; drives: StackDrive[]; licences?: StackLicencesClient; locked: boolean; client: StackLorasClient; onStarted: (job: string, label: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [media, setMedia] = useState<StackLoraMedia>("picture");
  const [drive, setDrive] = useState("main");
  const [error, setError] = useState("");
  const [needsLicence, setNeedsLicence] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!hit) return;
    setName(hit.name); setMedia(looksLikeVideo(hit.base_model) ? "video" : "picture"); setDrive("main"); setError(""); setNeedsLicence(false);
  }, [hit]);
  async function add() {
    if (!hit) return;
    setBusy(true); setError(""); setNeedsLicence(false);
    try {
      const started = await client.install({ media, source: hit.site, url: hit.install_url, name: name.trim(), licence: hit.licence ?? undefined, audience: hit.audience_hint, disk_id: drive === "main" ? null : drive, source_url: hit.page_url, base_model: hit.base_model });
      onStarted(started.job, name.trim()); onClose();
    } catch (cause) {
      setError(sentenceOf(cause, fallback()));
      setNeedsLicence(cause instanceof StackClientError && cause.code === "licence_not_accepted" && Boolean(licences));
    } finally { setBusy(false); }
  }
  async function accept() {
    if (!licences) return;
    setBusy(true);
    try { await licences.accept(); setError(""); setNeedsLicence(false); } catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  return <Dialog open={Boolean(hit)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent scroll="viewport" aria-describedby="lora-add-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.Add this style", message: "Add this style" })}</DialogTitle><DialogDescription id="lora-add-description">{i18n._({ id: "ui.The Stack downloads it, checks it and keeps it on the drive you choose.", message: "The Stack downloads it, checks it and keeps it on the drive you choose." })}</DialogDescription></DialogHeader>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-add-name">{i18n._({ id: "ui.Name", message: "Name" })}</Label><Input id="lora-add-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-add-media">{i18n._({ id: "ui.Used for", message: "Used for" })}</Label>
          <Select value={media} onValueChange={(value) => setMedia(value as StackLoraMedia)}><SelectTrigger id="lora-add-media"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="picture">{i18n._({ id: "ui.Pictures", message: "Pictures" })}</SelectItem><SelectItem value="video">{i18n._({ id: "ui.Video", message: "Video" })}</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="lora-add-drive">{i18n._({ id: "ui.Keep it on", message: "Keep it on" })}</Label><DrivePicker id="lora-add-drive" drives={drives} value={drive} onChange={setDrive} /></div>
        {hit?.licence && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Licence from the site: {licence}", message: "Licence from the site: {licence}", values: { licence: hit.licence } })}</p>}
        {hit?.audience_hint === "adult-only" && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.This style looks like it is for adults, so it is added as adults only.", message: "This style looks like it is for adults, so it is added as adults only." })}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {needsLicence && <Button size="sm" variant="outline" className="w-fit" disabled={busy} onClick={() => { void accept(); }}>{i18n._({ id: "ui.Accept the licences", message: "Accept the licences" })}</Button>}
      </div>
      <DialogFooter><Button variant="secondary" onClick={onClose}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={busy || locked || !name.trim()} onClick={() => { void add(); }}>{i18n._({ id: "ui.Add style", message: "Add style" })}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function StackLoraAdd({ client, drives, licences, locked, onStarted }: { client: StackLorasClient; drives: StackDrive[]; licences?: StackLicencesClient; locked: string | null; onStarted: (job: string, label: string) => void }) {
  const [sources, setSources] = useState<StackLoraSource[]>([]);
  const [site, setSite] = useState<StackLoraSite>("huggingface");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StackLoraHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<StackLoraHit | null>(null);
  const [keyFor, setKeyFor] = useState<StackLoraSource | null>(null);
  useEffect(() => { void client.sources().then((result) => setSources(result.sources)).catch(() => undefined); }, [client]);
  async function search() {
    if (!query.trim()) return;
    setSearching(true); setError("");
    try { setHits((await client.search(site, query.trim())).hits); } catch (cause) { setHits(null); setError(sentenceOf(cause, i18n._({ id: "ui.The search did not work. Try again in a moment.", message: "The search did not work. Try again in a moment." }))); }
    finally { setSearching(false); }
  }
  const current = sources.find((source) => source.site === site);
  return <section aria-labelledby="lora-add-heading" className="flex min-w-0 flex-col gap-3">
    <h3 id="lora-add-heading" className="text-base font-semibold">{i18n._({ id: "ui.Add a style", message: "Add a style" })}</h3>
    <form className="flex min-w-0 flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <div className="flex flex-col gap-1.5"><Label htmlFor="lora-site">{i18n._({ id: "ui.Search on", message: "Search on" })}</Label>
        <Select value={site} onValueChange={(value) => { setSite(value as StackLoraSite); setHits(null); }}><SelectTrigger id="lora-site" className="min-w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="huggingface">Hugging Face</SelectItem><SelectItem value="civitai">Civitai</SelectItem></SelectContent></Select></div>
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5"><Label htmlFor="lora-query">{i18n._({ id: "ui.Style name or look", message: "Style name or look" })}</Label><Input id="lora-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={i18n._({ id: "ui.watercolor", message: "watercolor" })} /></div>
      <Button type="submit" variant="outline" disabled={searching || !query.trim()}><SearchIcon aria-hidden="true" className="size-4" />{i18n._({ id: "ui.Search", message: "Search" })}</Button>
    </form>
    {current && <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{current.has_key ? i18n._({ id: "ui.A {site} key is saved.", message: "A {site} key is saved.", values: { site: current.label } }) : i18n._({ id: "ui.No {site} key is saved. Most styles do not need one.", message: "No {site} key is saved. Most styles do not need one." , values: { site: current.label } })}</span>
      <Button size="sm" variant="ghost" disabled={Boolean(locked)} onClick={() => setKeyFor(current)}>{current.has_key ? i18n._({ id: "ui.Change key", message: "Change key" }) : i18n._({ id: "ui.Add a key", message: "Add a key" })}</Button>
    </p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {searching && <p role="status" className="text-sm text-muted-foreground">{i18n._({ id: "ui.Searching", message: "Searching" })}</p>}
    {hits && hits.length === 0 && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Nothing found. Try another word.", message: "Nothing found. Try another word." })}</p>}
    {hits && hits.length > 0 && <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Search results", message: "Search results" })}>
      {hits.map((hit) => <li key={`${hit.site}:${hit.remote_id}`}><Card className="gap-0 py-0"><div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
        <span className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <span className="font-medium break-words">{hit.name}</span>
          <span className="text-sm text-muted-foreground break-words">{[hit.base_model, hit.bytes ? sizeWord(hit.bytes) : null, i18n._({ id: "ui.{count} downloads", message: "{count} downloads", values: { count: new Intl.NumberFormat().format(hit.downloads) } })].filter(Boolean).join(" · ")}</span>
          {hit.audience_hint === "adult-only" && <span><Pill tone="warn">{i18n._({ id: "ui.Looks like adults only", message: "Looks like adults only" })}</Pill></span>}
        </span>
        <Button size="sm" variant="outline" disabled={Boolean(locked)} aria-label={i18n._({ id: "ui.Add {style}", message: "Add {style}", values: { style: hit.name } })} onClick={() => setPicked(hit)}>{i18n._({ id: "ui.Add", message: "Add" })}</Button>
      </div></Card></li>)}
    </ul>}
    <AddDialog hit={picked} drives={drives} licences={licences} locked={Boolean(locked)} client={client} onStarted={onStarted} onClose={() => setPicked(null)} />
    <KeyDialog source={keyFor} onClose={() => setKeyFor(null)} onSave={async (siteId, key) => { setSources((await client.setKey(siteId, key)).sources); }} />
  </section>;
}

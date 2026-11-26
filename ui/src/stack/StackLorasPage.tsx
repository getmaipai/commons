// STACK-LORAS-01. The one "Styles" page: the Stack's LoRA library (pictures and video) for the Stack admin page and, later, Home's Styles tab. It takes a
// `StackClient` (its optional `loras`, `drives` and `licences`), never `fetch`. It browses and installs from Hugging Face and Civitai, edits, moves a
// style to another drive, trashes and restores, and says in plain words when a drive is not connected. `redacted` tells the page the host has already
// removed what this person may not see (adult-only styles become one `{ locked: true }` tile), so it offers no audience controls. Kit primitives and tokens only.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/kit/ui/card";
import { Button } from "@/kit/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Progress } from "@/kit/ui/progress";
import { Skeleton } from "@/kit/ui/skeleton";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import type { StackClient, StackDrive, StackLora, StackLoraLocked, StackLoraPatch } from "./StackClient";
import { StackLoraAdd } from "./StackLoraAdd";
import { EditLoraDialog, MoveLoraDialog, PurgeLoraDialog } from "./StackLoraDialogs";
import { LoraThumb, StackLoraRow, dateWord } from "./StackLoraRow";
import { NoticeLine } from "./StackParts";
import type { Notice } from "./StackParts";
import { useLoraJobs } from "./useLoraJobs";

const LockIcon = getIcon("lock");
const ChevronIcon = getIcon("chevron-down");
const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });
const isLocked = (item: StackLora | StackLoraLocked): item is StackLoraLocked => "locked" in item && item.locked === true;

export interface StackLorasPageProps {
  client: StackClient;
  /** How often to ask again while a style is being added or moved (default 2000; 0 turns it off). */
  pollMs?: number;
  /** True when the host already removed what this person may not see. The page then offers no audience controls and shows a locked tile for each `{ locked: true }` item. */
  redacted?: boolean;
  /** A sentence from a gate that forbids changes; every control is disabled and the sentence shown. */
  locked?: string | null;
  /** Hosts that can prove the adult lock return a fresh single-use ticket here; without it the page cannot lower an adults only style. */
  askTicket?: () => Promise<string | null>;
}

export function StackLorasPage({ client, pollMs = 2000, redacted = false, locked = null, askTicket }: StackLorasPageProps) {
  const loras = client.loras;
  const [items, setItems] = useState<Array<StackLora | StackLoraLocked> | null>(null);
  const [trash, setTrash] = useState<StackLora[]>([]);
  const [trashDays, setTrashDays] = useState(30);
  const [drives, setDrives] = useState<StackDrive[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<StackLora | null>(null);
  const [moving, setMoving] = useState<StackLora | null>(null);
  const [purging, setPurging] = useState<StackLora | null>(null);

  const refresh = useCallback(async () => {
    if (!loras) return;
    const [library, bin, driveResult] = await Promise.all([loras.list(), loras.list({ removed: true }), client.drives ? client.drives.list() : Promise.resolve({ disks: [] as StackDrive[] })]);
    setItems(library.loras); setTrash(bin.loras.filter((item): item is StackLora => !isLocked(item))); setTrashDays(library.trash_days); setDrives(driveResult.disks); setLoadError("");
  }, [client, loras]);
  useEffect(() => { void refresh().catch((cause) => setLoadError(sentenceOf(cause, i18n._({ id: "ui.The styles could not be read. Reload the page.", message: "The styles could not be read. Reload the page." })))); }, [refresh]);

  const fail = (cause: unknown) => setNotice({ kind: "error", text: sentenceOf(cause, fallback()) });
  const jobs = useLoraJobs(loras ?? NO_LORAS, (finished) => {
    const bad = finished.find((job) => job.job?.state === "failed" || job.job?.state === "cancelled");
    if (!bad) setNotice({ kind: "ok", text: finished[0]?.kind === "move" ? i18n._({ id: "ui.Moved {style}.", message: "Moved {style}.", values: { style: finished[0].label } }) : i18n._({ id: "ui.Added {style}.", message: "Added {style}.", values: { style: finished[0]?.label ?? "" } }) });
    void refresh().catch(() => undefined);
  }, pollMs);
  // A style still being added is not in the job list after a reload; keep reading the library until it settles.
  const installing = Boolean(items?.some((item) => !isLocked(item) && item.status === "installing"));
  useEffect(() => {
    if (!installing || pollMs <= 0) return;
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, pollMs);
    return () => window.clearInterval(timer);
  }, [installing, pollMs, refresh]);

  const lockedTiles = useMemo(() => (items ?? []).filter(isLocked).length, [items]);
  const styles = useMemo(() => (items ?? []).filter((item): item is StackLora => !isLocked(item)), [items]);
  if (!loras) return <section className="flex min-w-0 flex-col gap-2"><h2 className="text-lg font-semibold">{i18n._({ id: "ui.Styles", message: "Styles" })}</h2><p className="text-sm text-muted-foreground">{i18n._({ id: "ui.This Stack does not manage styles yet. Update the Stack to use this page.", message: "This Stack does not manage styles yet. Update the Stack to use this page." })}</p></section>;

  const url = (lora: StackLora) => (lora.preview ? loras.previewUrl?.(lora.id) ?? null : null);
  const off = Boolean(locked);

  return <section aria-labelledby="styles-heading" className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-col gap-1">
      <h2 id="styles-heading" className="text-lg font-semibold">{i18n._({ id: "ui.Styles", message: "Styles" })}</h2>
      <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Looks you add to pictures and video. The Stack keeps every file, on the drive you choose.", message: "Looks you add to pictures and video. The Stack keeps every file, on the drive you choose." })}</p>
    </div>
    {locked && <p className="text-sm text-muted-foreground">{locked}</p>}
    <NoticeLine notice={notice} onDismiss={() => setNotice(null)} />
    {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}

    {jobs.jobs.length > 0 && <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Work in progress", message: "Work in progress" })}>
      {jobs.jobs.map((tracked) => <li key={tracked.id}><Card className="gap-0 py-0"><div className="flex min-w-0 flex-col gap-2 p-3">
        {tracked.job?.state === "failed" || tracked.job?.state === "cancelled"
          ? <><p role="alert" className="text-sm text-destructive">{i18n._({ id: "ui.{style} did not finish. {reason}", message: "{style} did not finish. {reason}", values: { style: tracked.label, reason: tracked.job.reason ?? "" } })}</p><Button size="sm" variant="ghost" className="w-fit" onClick={() => jobs.dismiss(tracked.id)}>{i18n._({ id: "ui.Dismiss", message: "Dismiss" })}</Button></>
          : <><p role="status" className="text-sm">{tracked.kind === "move" ? i18n._({ id: "ui.Moving {style}", message: "Moving {style}", values: { style: tracked.label } }) : i18n._({ id: "ui.Adding {style}", message: "Adding {style}", values: { style: tracked.label } })}{tracked.job ? ` · ${tracked.job.percent}%` : ""}</p><Progress value={tracked.job?.percent ?? 0} aria-label={i18n._({ id: "ui.Progress", message: "Progress" })} /></>}
      </div></Card></li>)}
    </ul>}

    <section aria-labelledby="styles-library" className="flex min-w-0 flex-col gap-2">
      <h3 id="styles-library" className="text-base font-semibold">{i18n._({ id: "ui.Your styles", message: "Your styles" })}</h3>
      {items === null && !loadError && <Skeleton className="h-20 w-full rounded-xl" />}
      {items !== null && styles.length === 0 && lockedTiles === 0 && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.No styles yet. Add one below.", message: "No styles yet. Add one below." })}</p>}
      <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Styles list", message: "Styles list" })}>
        {styles.map((lora) => <li key={lora.id}><StackLoraRow lora={lora} url={url(lora)} locked={off} redacted={redacted} actions={{
          onEdit: setEditing, onMove: setMoving,
          onRemove: (target) => { setNotice(null); void loras.remove(target.id).then(() => { setNotice({ kind: "ok", text: i18n._({ id: "ui.{style} is in the trash. You can bring it back for {days} days.", message: "{style} is in the trash. You can bring it back for {days} days.", values: { style: target.name, days: trashDays } }) }); return refresh(); }).catch(fail); },
        }} /></li>)}
        {lockedTiles > 0 && <li><Card className="gap-0 py-0"><div className="flex items-center gap-3 p-3 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4 shrink-0" />{i18n._({ id: "ui.Some styles are locked. Open the adult lock to see them.", message: "Some styles are locked. Open the adult lock to see them." })}</div></Card></li>}
      </ul>
    </section>

    <StackLoraAdd client={loras} drives={drives} licences={client.licences} locked={locked} onStarted={(job, label) => { setNotice(null); jobs.track(job, label, "install"); void refresh().catch(() => undefined); }} />

    {trash.length > 0 && <Collapsible>
      <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-fit"><ChevronIcon aria-hidden="true" className="size-4" />{i18n._({ id: "ui.Trash ({count})", message: "Trash ({count})", values: { count: trash.length } })}</Button></CollapsibleTrigger>
      <CollapsibleContent><ul className="mt-2 flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Trash", message: "Trash" })}>
        {trash.map((lora) => <li key={lora.id}><Card className="gap-0 py-0"><div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
          <LoraThumb lora={lora} url={url(lora)} />
          <span className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5"><span className="font-medium break-words">{lora.name}</span><span className="text-sm text-muted-foreground">{i18n._({ id: "ui.Kept until {date}", message: "Kept until {date}", values: { date: dateWord(lora.trash_until) } })}</span></span>
          <Button size="sm" variant="outline" disabled={off} aria-label={i18n._({ id: "ui.Restore {style}", message: "Restore {style}", values: { style: lora.name } })} onClick={() => { setNotice(null); void loras.restore(lora.id).then(() => refresh()).catch(fail); }}>{i18n._({ id: "ui.Restore", message: "Restore" })}</Button>
          <Button size="sm" variant="ghost" disabled={off} aria-label={i18n._({ id: "ui.Delete {style} for good", message: "Delete {style} for good", values: { style: lora.name } })} onClick={() => setPurging(lora)}>{i18n._({ id: "ui.Delete for good", message: "Delete for good" })}</Button>
        </div></Card></li>)}
      </ul></CollapsibleContent>
    </Collapsible>}

    <EditLoraDialog lora={editing} redacted={redacted} askTicket={askTicket} onClose={() => setEditing(null)} onSave={async (id, patch: StackLoraPatch) => { await loras.patch(id, patch); await refresh(); }} />
    <MoveLoraDialog lora={moving} drives={drives} onClose={() => setMoving(null)} onMove={async (lora, diskId) => { const started = await loras.move(lora.id, diskId); jobs.track(started.job, lora.name, "move"); }} />
    <PurgeLoraDialog lora={purging} onClose={() => setPurging(null)} onPurge={async (lora) => { await loras.remove(lora.id, true); await refresh(); }} />
  </section>;
}

/** The hook needs a client before the page knows the host has one; this one is never called because the page returns early without `loras`. */
const NO_LORAS = {} as NonNullable<StackClient["loras"]>;

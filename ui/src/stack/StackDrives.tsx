import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Progress } from "@/kit/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import type { StackDrive, StackDriveFeature, StackDriveMove, StackDrivesClient } from "./StackClient";
import { gb } from "./stackWords";

const DiskIcon = getIcon("hard-drive");
const driveGb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;
const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });

export function StackDrives({ client, locked, pollMs = 2000 }: { client: StackDrivesClient; locked: string | null; pollMs?: number }) {
  const [disks, setDisks] = useState<StackDrive[]>([]);
  const [features, setFeatures] = useState<StackDriveFeature[]>([]);
  const [moves, setMoves] = useState<StackDriveMove[]>([]);
  const [active, setActive] = useState<StackDriveFeature | null>(null);
  const [target, setTarget] = useState("");
  const [planBytes, setPlanBytes] = useState<number | null>(null);
  const [planError, setPlanError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [driveResult, featureResult, moveResult] = await Promise.all([client.list(), client.features(), client.moves()]);
    setDisks(driveResult.disks); setFeatures(featureResult.features); setMoves(moveResult.moves);
    return moveResult.moves;
  }, [client]);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    if (pollMs <= 0) return;
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  const diskById = useMemo(() => new Map(disks.map((disk) => [disk.id, disk])), [disks]);
  const activeMove = active ? moves.find((move) => move.feature_id === active.feature_id) ?? null : null;
  const connectedTargets = disks.filter((disk) => disk.connected && !active?.drive_ids.includes(disk.id));
  const running = activeMove && ["copying", "verifying"].includes(activeMove.state);

  async function chooseTarget(id: string) {
    setTarget(id); setPlanBytes(null); setPlanError(""); setError("");
    if (!active || !id) return;
    try { const result = await client.plan(active.feature_id, id); setPlanBytes(result.bytes); }
    catch (cause) { setPlanError(sentenceOf(cause, fallback())); }
  }
  async function startMove() {
    if (!active || !target) return;
    setBusy(true); setError("");
    try { await client.move(active.feature_id, target); const result = await client.moves(); setMoves(result.moves); if (pollMs > 0) { window.setTimeout(() => { void refresh(); }, pollMs); window.setTimeout(() => { void refresh(); }, pollMs * 2); } }
    catch (cause) { setError(sentenceOf(cause, fallback())); }
    finally { setBusy(false); }
  }
  async function cancelMove() { try { await client.cancel(); setMoves([]); setActive(null); } catch (cause) { setError(sentenceOf(cause, fallback())); } }

  return <section aria-labelledby="drives-heading" aria-label={i18n._({ id: "ui.Drives", message: "Drives" })} className="flex min-w-0 flex-col gap-3">
    <h3 id="drives-heading" className="text-base font-semibold">{i18n._({ id: "ui.Drives", message: "Drives" })}</h3>
    <ul className="flex min-w-0 flex-col gap-1.5" aria-label={i18n._({ id: "ui.Drive space", message: "Drive space" })}>
      {disks.map((disk) => <li key={disk.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border">
        <DiskIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 break-words">{disk.label}</span>
        {disk.connected ? <span className="text-muted-foreground">{i18n._({ id: "ui.{free} free of {total}", message: "{free} free of {total}", values: { free: gb(disk.free_bytes), total: disk.total_bytes >= 1024 ** 4 ? `${Math.round(disk.total_bytes / 1024 ** 4)} TB` : gb(disk.total_bytes) } })}</span> : <span className="text-muted-foreground">{i18n._({ id: "ui.Not connected", message: "Not connected" })}</span>}
      </li>)}
    </ul>
    <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Features on drives", message: "Features on drives" })}>
      {features.map((feature) => {
        const names = [...new Set(feature.drives.map((drive) => drive.label))];
        const offline = feature.drives.find((drive) => !drive.connected);
        const relatedMove = moves.find((move) => move.feature_id === feature.feature_id);
        return <li key={feature.feature_id}><Card className="gap-0 py-0"><div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
          <DiskIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="font-medium break-words">{feature.label}</span><span className="text-sm text-muted-foreground">{names.length > 1 ? i18n._({ id: "ui.Several drives", message: "Several drives" }) : names[0]} · {driveGb(feature.bytes)}</span>{offline && <span className="text-sm text-status-warning">{i18n._({ id: "ui.Drive not connected. Plug in {drive}.", message: "Drive not connected. Plug in {drive}.", values: { drive: offline.label } })}</span>}{relatedMove && ["copying", "verifying"].includes(relatedMove.state) && <span className="text-sm text-muted-foreground">{relatedMove.state === "copying" ? i18n._({ id: "ui.Copying {done} of {total}", message: "Copying {done} of {total}", values: { done: driveGb(relatedMove.bytes_done), total: driveGb(relatedMove.bytes_total) } }) : i18n._({ id: "ui.Checking the copy", message: "Checking the copy" })}</span>}</span>
          <Button size="sm" variant="outline" disabled={Boolean(locked) || Boolean(offline) || Boolean(relatedMove && ["copying", "verifying", "switching", "cleaning"].includes(relatedMove.state))} aria-label={i18n._({ id: "ui.Move {feature}", message: "Move {feature}", values: { feature: feature.label } })} onClick={() => { setActive(feature); setTarget(""); setPlanBytes(null); setPlanError(""); setError(""); }}>{i18n._({ id: "ui.Move", message: "Move" })}</Button>
        </div>{relatedMove?.state === "failed" && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{relatedMove.error} {i18n._({ id: "ui.Your files are still where they were.", message: "Your files are still where they were." })}</p>}{relatedMove?.state === "done" && <p className="px-3 pb-3 text-sm text-muted-foreground">{i18n._({ id: "ui.Moved to {drive}", message: "Moved to {drive}", values: { drive: diskById.get(relatedMove.to_disk)?.label ?? relatedMove.to_disk } })}</p>}</Card></li>;
      })}
    </ul>
    {locked && <p className="text-sm text-muted-foreground">{locked}</p>}
    <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open && !running) setActive(null); }}>
      <DialogContent scroll="viewport" aria-describedby="drive-move-description">
        <DialogHeader><DialogTitle>{i18n._({ id: "ui.Move {feature}", message: "Move {feature}", values: { feature: active?.label ?? "" } })}</DialogTitle><DialogDescription id="drive-move-description">{i18n._({ id: "ui.Choose a connected drive for these files.", message: "Choose a connected drive for these files." })}</DialogDescription></DialogHeader>
        {active && !activeMove && <div className="flex min-w-0 flex-col gap-3"><Select value={target} onValueChange={(value) => { void chooseTarget(value); }}><SelectTrigger aria-label={i18n._({ id: "ui.Move to", message: "Move to" })}><SelectValue placeholder={i18n._({ id: "ui.Choose a drive", message: "Choose a drive" })} /></SelectTrigger><SelectContent>{connectedTargets.map((disk) => <SelectItem key={disk.id} value={disk.id}>{disk.label}</SelectItem>)}</SelectContent></Select>{planBytes !== null && <p className="text-sm">{i18n._({ id: "ui.Moves {size} to {drive}. {feature} stops while it moves and starts again by itself.", message: "Moves {size} to {drive}. {feature} stops while it moves and starts again by itself.", values: { size: driveGb(planBytes), drive: diskById.get(target)?.label ?? target, feature: active.label } })}</p>}{planError && <p role="alert" className="text-sm text-destructive">{planError}</p>}</div>}
        {activeMove && <div className="flex flex-col gap-2">{activeMove.state === "copying" ? <><p role="status">{i18n._({ id: "ui.Copying {done} of {total}", message: "Copying {done} of {total}", values: { done: driveGb(activeMove.bytes_done), total: driveGb(activeMove.bytes_total) } })}</p><Progress value={activeMove.bytes_total ? activeMove.bytes_done / activeMove.bytes_total * 100 : 0} aria-label={i18n._({ id: "ui.Move progress", message: "Move progress" })} /></> : activeMove.state === "verifying" ? <p role="status">{i18n._({ id: "ui.Checking the copy", message: "Checking the copy" })}</p> : activeMove.state === "failed" ? <><p role="alert" className="text-destructive">{activeMove.error}</p><p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Your files are still where they were.", message: "Your files are still where they were." })}</p></> : activeMove.state === "done" ? <p role="status">{i18n._({ id: "ui.Moved to {drive}", message: "Moved to {drive}", values: { drive: diskById.get(activeMove.to_disk)?.label ?? activeMove.to_disk } })}</p> : <p role="status">{i18n._({ id: "ui.Moving files", message: "Moving files" })}</p>}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>{running ? <Button variant="secondary" onClick={() => { void cancelMove(); }}>{i18n._({ id: "ui.Cancel move", message: "Cancel move" })}</Button> : activeMove ? <Button onClick={() => setActive(null)}>{i18n._({ id: "ui.Done", message: "Done" })}</Button> : <><Button variant="secondary" onClick={() => setActive(null)}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={planBytes === null || Boolean(planError) || busy} onClick={() => { void startMove(); }}>{i18n._({ id: "ui.Move", message: "Move" })}</Button></>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

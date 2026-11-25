import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Checkbox } from "@/kit/ui/checkbox";
import { Input } from "@/kit/ui/input";
import { Label } from "@/kit/ui/label";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import { StackMoveDialog } from "./StackMoveDialog";
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
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addPath, setAddPath] = useState("");
  const [addRemovable, setAddRemovable] = useState(true);
  const [addError, setAddError] = useState("");
  const [driveError, setDriveError] = useState("");

  const refresh = useCallback(async () => {
    const [driveResult, featureResult, moveResult] = await Promise.all([client.list(), client.features(), client.moves()]);
    setDisks(driveResult.disks); setFeatures(featureResult.features); setMoves(moveResult.moves);
    return moveResult.moves;
  }, [client]);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    if (pollMs <= 0 || active) return;
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollMs, active]);

  const diskById = useMemo(() => new Map(disks.map((disk) => [disk.id, disk])), [disks]);
  async function addDrive() {
    setBusy(true); setAddError("");
    try { await client.add({ label: addLabel.trim(), root_path: addPath.trim(), removable: addRemovable }); setAddOpen(false); setAddLabel(""); setAddPath(""); await refresh(); }
    catch (cause) { setAddError(sentenceOf(cause, fallback())); }
    finally { setBusy(false); }
  }
  async function removeDrive(id: string) {
    setDriveError("");
    try { await client.remove(id); await refresh(); } catch (cause) { setDriveError(sentenceOf(cause, fallback())); }
  }

  return <section aria-labelledby="drives-heading" aria-label={i18n._({ id: "ui.Drives", message: "Drives" })} className="flex min-w-0 flex-col gap-3">
    <h3 id="drives-heading" className="text-base font-semibold">{i18n._({ id: "ui.Drives", message: "Drives" })}</h3>
    <ul className="flex min-w-0 flex-col gap-1.5" aria-label={i18n._({ id: "ui.Drive space", message: "Drive space" })}>
      {disks.map((disk) => <li key={disk.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border">
        <DiskIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 break-words">{disk.label}</span>
        {disk.connected ? <span className="text-muted-foreground">{i18n._({ id: "ui.{free} free of {total}", message: "{free} free of {total}", values: { free: gb(disk.free_bytes), total: disk.total_bytes >= 1024 ** 4 ? `${Math.round(disk.total_bytes / 1024 ** 4)} TB` : gb(disk.total_bytes) } })}</span> : <span className="text-muted-foreground">{i18n._({ id: "ui.Not connected", message: "Not connected" })}</span>}
        {disk.id !== "main" && <Button size="sm" variant="ghost" disabled={Boolean(locked)} aria-label={i18n._({ id: "ui.Remove {drive}", message: "Remove {drive}", values: { drive: disk.label } })} onClick={() => { void removeDrive(disk.id); }}>{i18n._({ id: "ui.Remove", message: "Remove" })}</Button>}
      </li>)}
    </ul>
    {driveError && <p role="alert" className="text-sm text-destructive">{driveError}</p>}
    <Button size="sm" variant="outline" className="w-fit" disabled={Boolean(locked)} onClick={() => { setAddError(""); setAddOpen(true); }}>{i18n._({ id: "ui.Add a drive", message: "Add a drive" })}</Button>
    <ul className="flex min-w-0 flex-col gap-2" aria-label={i18n._({ id: "ui.Features on drives", message: "Features on drives" })}>
      {features.map((feature) => {
        const names = [...new Set(feature.drives.map((drive) => drive.label))];
        const offline = feature.drives.find((drive) => !drive.connected);
        const relatedMove = moves.find((move) => move.feature_id === feature.feature_id);
        return <li key={feature.feature_id}><Card className="gap-0 py-0"><div className="flex min-w-0 flex-wrap items-center gap-3 p-3">
          <DiskIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="font-medium break-words">{feature.label}</span><span className="text-sm text-muted-foreground">{names.length > 1 ? i18n._({ id: "ui.Several drives", message: "Several drives" }) : names[0]} · {driveGb(feature.bytes)}</span>{offline && <span className="text-sm text-status-warning">{i18n._({ id: "ui.Drive not connected. Plug in {drive}.", message: "Drive not connected. Plug in {drive}.", values: { drive: offline.label } })}</span>}{relatedMove && ["copying", "verifying"].includes(relatedMove.state) && <span className="text-sm text-muted-foreground">{relatedMove.state === "copying" ? i18n._({ id: "ui.Copying {done} of {total}", message: "Copying {done} of {total}", values: { done: driveGb(relatedMove.bytes_done), total: driveGb(relatedMove.bytes_total) } }) : i18n._({ id: "ui.Checking the copy", message: "Checking the copy" })}</span>}</span>
          <Button size="sm" variant="outline" disabled={Boolean(locked) || Boolean(offline) || Boolean(relatedMove && ["copying", "verifying", "switching", "cleaning"].includes(relatedMove.state))} aria-label={i18n._({ id: "ui.Move {feature}", message: "Move {feature}", values: { feature: feature.label } })} onClick={() => { setActive(feature); }}>{i18n._({ id: "ui.Move", message: "Move" })}</Button>
        </div>{relatedMove?.state === "failed" && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{relatedMove.error} {i18n._({ id: "ui.Your files are still where they were.", message: "Your files are still where they were." })}</p>}{relatedMove?.state === "done" && <p className="px-3 pb-3 text-sm text-muted-foreground">{i18n._({ id: "ui.Moved to {drive}", message: "Moved to {drive}", values: { drive: diskById.get(relatedMove.to_disk)?.label ?? relatedMove.to_disk } })}</p>}</Card></li>;
      })}
    </ul>
    {locked && <p className="text-sm text-muted-foreground">{locked}</p>}
    <StackMoveDialog client={client} feature={active} open={Boolean(active)} onOpenChange={(open) => { if (!open) setActive(null); }} pollMs={pollMs} />
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent scroll="viewport" aria-describedby="drive-add-description">
        <DialogHeader><DialogTitle>{i18n._({ id: "ui.Add a drive", message: "Add a drive" })}</DialogTitle><DialogDescription id="drive-add-description">{i18n._({ id: "ui.Pick a folder on the drive. Models you move there are kept in a maipai-models folder inside it.", message: "Pick a folder on the drive. Models you move there are kept in a maipai-models folder inside it." })}</DialogDescription></DialogHeader>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label htmlFor="drive-add-name">{i18n._({ id: "ui.Name", message: "Name" })}</Label><Input id="drive-add-name" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder={i18n._({ id: "ui.Backup drive", message: "Backup drive" })} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="drive-add-path">{i18n._({ id: "ui.Folder on this computer", message: "Folder on this computer" })}</Label><Input id="drive-add-path" value={addPath} onChange={(e) => setAddPath(e.target.value)} placeholder="/Volumes/Backup" /></div>
          <div className="flex items-center gap-2"><Checkbox id="drive-add-removable" checked={addRemovable} onCheckedChange={(value) => setAddRemovable(value === true)} /><Label htmlFor="drive-add-removable">{i18n._({ id: "ui.This drive can be unplugged", message: "This drive can be unplugged" })}</Label></div>
          {addError && <p role="alert" className="text-sm text-destructive">{addError}</p>}
        </div>
        <DialogFooter><Button variant="secondary" onClick={() => setAddOpen(false)}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={busy || !addLabel.trim() || !addPath.trim()} onClick={() => { void addDrive(); }}>{i18n._({ id: "ui.Add", message: "Add" })}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/kit/ui/dialog";
import { Progress } from "@/kit/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { i18n } from "@/kit/i18n";
import { sentenceOf } from "./StackClient";
import type { StackDrive, StackDriveFeature, StackDriveMove, StackDrivesClient } from "./StackClient";

const driveGb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;
const fallback = () => i18n._({ id: "ui.That could not be saved. Try again.", message: "That could not be saved. Try again." });

export function StackMoveDialog({ client, feature, open, onOpenChange, pollMs = 2000 }: { client: StackDrivesClient; feature: StackDriveFeature | null; open: boolean; onOpenChange: (open: boolean) => void; pollMs?: number }) {
  const [disks, setDisks] = useState<StackDrive[]>([]);
  const [moves, setMoves] = useState<StackDriveMove[]>([]);
  const [target, setTarget] = useState("");
  const [planBytes, setPlanBytes] = useState<number | null>(null);
  const [planError, setPlanError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [driveResult, moveResult] = await Promise.all([client.list(), client.moves()]);
    setDisks(driveResult.disks); setMoves(moveResult.moves);
  }, [client]);
  useEffect(() => { if (open) void refresh().catch(() => undefined); }, [open, refresh]);
  useEffect(() => {
    if (!open || pollMs <= 0) return;
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, pollMs);
    return () => window.clearInterval(timer);
  }, [open, pollMs, refresh]);
  useEffect(() => { if (open) { setTarget(""); setPlanBytes(null); setPlanError(""); setError(""); } }, [open, feature?.feature_id]);
  const diskById = useMemo(() => new Map(disks.map((disk) => [disk.id, disk])), [disks]);
  const activeMove = feature ? moves.find((move) => move.feature_id === feature.feature_id) ?? null : null;
  const connectedTargets = disks.filter((disk) => disk.connected && !feature?.drive_ids.includes(disk.id));
  const running = Boolean(activeMove && ["copying", "verifying", "switching", "cleaning"].includes(activeMove.state));
  async function chooseTarget(id: string) {
    setTarget(id); setPlanBytes(null); setPlanError(""); setError("");
    if (!feature || !id) return;
    try { setPlanBytes((await client.plan(feature.feature_id, id)).bytes); } catch (cause) { setPlanError(sentenceOf(cause, fallback())); }
  }
  async function startMove() {
    if (!feature || !target) return;
    setBusy(true); setError("");
    try { await client.move(feature.feature_id, target); await refresh(); if (pollMs > 0) { window.setTimeout(() => { void refresh(); }, pollMs); window.setTimeout(() => { void refresh(); }, pollMs * 2); } }
    catch (cause) { setError(sentenceOf(cause, fallback())); } finally { setBusy(false); }
  }
  async function cancelMove() {
    try { await client.cancel(); setMoves([]); onOpenChange(false); }
    catch (cause) { setError(sentenceOf(cause, fallback())); }
  }
  return <Dialog open={open} onOpenChange={(next) => { if (next || !running) onOpenChange(next); }}>
    <DialogContent scroll="viewport" aria-describedby="drive-move-description">
      <DialogHeader><DialogTitle>{i18n._({ id: "ui.Move {feature}", message: "Move {feature}", values: { feature: feature?.label ?? "" } })}</DialogTitle><DialogDescription id="drive-move-description">{i18n._({ id: "ui.Choose a connected drive for these files.", message: "Choose a connected drive for these files." })}</DialogDescription></DialogHeader>
      {feature && !activeMove && <div className="flex min-w-0 flex-col gap-3"><Select value={target} onValueChange={(value) => { void chooseTarget(value); }}><SelectTrigger aria-label={i18n._({ id: "ui.Move to", message: "Move to" })}><SelectValue placeholder={i18n._({ id: "ui.Choose a drive", message: "Choose a drive" })} /></SelectTrigger><SelectContent>{connectedTargets.map((disk) => <SelectItem key={disk.id} value={disk.id}>{disk.label}</SelectItem>)}</SelectContent></Select>{planBytes !== null && <p className="text-sm">{i18n._({ id: "ui.Moves {size} to {drive}. {feature} stops while it moves and starts again by itself.", message: "Moves {size} to {drive}. {feature} stops while it moves and starts again by itself.", values: { size: driveGb(planBytes), drive: diskById.get(target)?.label ?? target, feature: feature.label } })}</p>}{planError && <p role="alert" className="text-sm text-destructive">{planError}</p>}</div>}
      {activeMove && <div className="flex flex-col gap-2">{activeMove.state === "copying" ? <><p role="status">{i18n._({ id: "ui.Copying {done} of {total}", message: "Copying {done} of {total}", values: { done: driveGb(activeMove.bytes_done), total: driveGb(activeMove.bytes_total) } })}</p><Progress value={activeMove.bytes_total ? activeMove.bytes_done / activeMove.bytes_total * 100 : 0} aria-label={i18n._({ id: "ui.Move progress", message: "Move progress" })} /></> : activeMove.state === "verifying" ? <p role="status">{i18n._({ id: "ui.Checking the copy", message: "Checking the copy" })}</p> : activeMove.state === "failed" ? <><p role="alert" className="text-destructive">{activeMove.error}</p><p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Your files are still where they were.", message: "Your files are still where they were." })}</p></> : activeMove.state === "done" ? <p role="status">{i18n._({ id: "ui.Moved to {drive}", message: "Moved to {drive}", values: { drive: diskById.get(activeMove.to_disk)?.label ?? activeMove.to_disk } })}</p> : <p role="status">{i18n._({ id: "ui.Moving files", message: "Moving files" })}</p>}</div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>{running ? <Button variant="secondary" onClick={() => { void cancelMove(); }}>{i18n._({ id: "ui.Cancel move", message: "Cancel move" })}</Button> : activeMove ? <Button onClick={() => onOpenChange(false)}>{i18n._({ id: "ui.Done", message: "Done" })}</Button> : <><Button variant="secondary" onClick={() => onOpenChange(false)}>{i18n._({ id: "ui.Cancel", message: "Cancel" })}</Button><Button disabled={planBytes === null || Boolean(planError) || busy} onClick={() => { void startMove(); }}>{i18n._({ id: "ui.Move", message: "Move" })}</Button></>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}

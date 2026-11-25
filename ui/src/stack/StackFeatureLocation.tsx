import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/kit/ui/button";
import { i18n } from "@/kit/i18n";
import type { StackCategoryId, StackDrive, StackDriveFeature, StackDriveMove, StackDrivesClient } from "./StackClient";
import { StackMoveDialog } from "./StackMoveDialog";
import { gb } from "./stackWords";

const moveStates = ["copying", "verifying", "switching", "cleaning"];
const driveGb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

export function StackFeatureLocation({ featureId, client, pollMs = 2000 }: { featureId: StackCategoryId; client: StackDrivesClient; pollMs?: number }) {
  const [disks, setDisks] = useState<StackDrive[]>([]);
  const [features, setFeatures] = useState<StackDriveFeature[]>([]);
  const [moves, setMoves] = useState<StackDriveMove[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const refresh = useCallback(async () => {
    const [driveResult, featureResult, moveResult] = await Promise.all([client.list(), client.features(), client.moves()]);
    setDisks(driveResult.disks); setFeatures(featureResult.features); setMoves(moveResult.moves);
  }, [client]);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    if (pollMs <= 0) return;
    const timer = window.setInterval(() => { void refresh().catch(() => undefined); }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);
  const driveById = useMemo(() => new Map(disks.map((drive) => [drive.id, drive])), [disks]);
  const feature = features.find((item) => item.feature_id === featureId) ?? null;
  const relatedMove = moves.find((move) => move.feature_id === featureId) ?? null;
  const offline = feature?.drives.some((drive) => !drive.connected) ?? false;
  const running = Boolean(relatedMove && moveStates.includes(relatedMove.state));
  const names = [...new Set(feature?.drives.map((drive) => drive.label) ?? [])];
  const freeLine = feature?.drives.map((drive) => {
    const disk = driveById.get(drive.id);
    return drive.connected && disk ? i18n._({ id: "ui.{drive}: {free} free of {total}", message: "{drive}: {free} free of {total}", values: { drive: drive.label, free: gb(disk.free_bytes), total: disk.total_bytes >= 1024 ** 4 ? `${Math.round(disk.total_bytes / 1024 ** 4)} TB` : gb(disk.total_bytes) } }) : null;
  }).filter(Boolean);
  return <section className="flex flex-col gap-3" aria-label={i18n._({ id: "ui.Location", message: "Location" })}>
    {feature ? <>
      <p className="text-sm">{i18n._({ id: "ui.Total size: {size}", message: "Total size: {size}", values: { size: driveGb(feature.bytes) } })}</p>
      <ul className="flex flex-col gap-2" aria-label={i18n._({ id: "ui.Drives", message: "Drives" })}>
        {feature.drives.map((drive) => <li key={drive.id} className="flex flex-col gap-1 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ring-border">
          <span className="font-medium">{drive.label}</span>
          {drive.connected ? <span className="text-muted-foreground">{i18n._({ id: "ui.Connected", message: "Connected" })}</span> : <span className="text-muted-foreground">{i18n._({ id: "ui.Not connected", message: "Not connected" })}</span>}
          {freeLine?.find((line) => line?.startsWith(`${drive.label}:`))}
        </li>)}
      </ul>
      {names.length > 1 && <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.Several drives", message: "Several drives" })}</p>}
      {offline && <p className="text-sm text-status-warning">{i18n._({ id: "ui.Drive not connected. Plug in {drive}.", message: "Drive not connected. Plug in {drive}.", values: { drive: feature.drives.find((drive) => !drive.connected)?.label ?? "" } })}</p>}
      {relatedMove && moveStates.includes(relatedMove.state) && <p role="status" className="text-sm text-muted-foreground">{relatedMove.state === "copying" ? i18n._({ id: "ui.Copying {done} of {total}", message: "Copying {done} of {total}", values: { done: driveGb(relatedMove.bytes_done), total: driveGb(relatedMove.bytes_total) } }) : relatedMove.state === "verifying" ? i18n._({ id: "ui.Checking the copy", message: "Checking the copy" }) : i18n._({ id: "ui.Moving files", message: "Moving files" })}</p>}
      {relatedMove?.state === "failed" && <p role="alert" className="text-sm text-destructive">{relatedMove.error} {i18n._({ id: "ui.Your files are still where they were.", message: "Your files are still where they were." })}</p>}
      {relatedMove?.state === "done" && <p role="status" className="text-sm text-muted-foreground">{i18n._({ id: "ui.Moved to {drive}", message: "Moved to {drive}", values: { drive: driveById.get(relatedMove.to_disk)?.label ?? relatedMove.to_disk } })}</p>}
      <div><Button size="sm" variant="outline" disabled={offline || running} aria-label={i18n._({ id: "ui.Move {feature}", message: "Move {feature}", values: { feature: feature.label } })} onClick={() => setDialogOpen(true)}>{i18n._({ id: "ui.Move", message: "Move" })}</Button></div>
      <StackMoveDialog client={client} feature={feature} open={dialogOpen} onOpenChange={setDialogOpen} pollMs={pollMs} />
    </> : <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.No drive location is available for this feature.", message: "No drive location is available for this feature." })}</p>}
  </section>;
}

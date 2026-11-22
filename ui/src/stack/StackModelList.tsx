// STACK-MODELS-PAGE-01. The models of one feature: each with its plain name and summary, its size in GB, its state in words, download and
// remove (removing asks first), progress while it downloads, and a Details line that holds the technical facts and the copyable id. Also the
// order they are tried in, with each one's on and off switch.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Switch } from "@/kit/ui/switch";
import { DestructiveConfirm } from "@/kit/primitives/DestructiveConfirm";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { cn } from "@/kit/utils";
import type { StackCandidate, StackChoiceCategory } from "./StackClient";
import { DownloadBar, ModelDetails, Pill } from "./StackParts";
import type { Tone } from "./stackLogic";
import { moveId } from "./stackLogic";
import { gb, modelStateWord, percentWord } from "./stackWords";
import type { Outcome } from "./useStackChoices";
import type { StackInstallStarted, StackOrderResult, StackRemoved } from "./StackClient";

const DownloadIcon = getIcon("download");
const TrashIcon = getIcon("trash");
const UpIcon = getIcon("arrow-up");
const DownIcon = getIcon("arrow-down");
const ChevronIcon = getIcon("chevron-down");

/** The Stack sends a sentence for every state; when it only repeats the state pill ("Not downloaded yet.") it is not shown twice. */
function sameWords(a: string, b: string): boolean {
  const clean = (text: string) => text.toLowerCase().replace(/[.\s]+$/g, "").trim();
  return clean(a) === clean(b);
}

function stateTone(candidate: StackCandidate): Tone {
  switch (candidate.state) {
    case "installed": return "ok";
    case "installing": return "primary";
    case "failed": return "bad";
    case "notInstalled": return "warn";
    default: return "muted";
  }
}

function ModelRow({ candidate, highlight, busy, installBusy, onInstall, onRemove }: { candidate: StackCandidate; highlight: boolean; busy: boolean; installBusy: boolean; onInstall: () => void; onRemove: () => void }) {
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => { if (highlight) ref.current?.scrollIntoView?.({ block: "center" }); }, [highlight]);
  const canDownload = candidate.can_install && (candidate.state === "notInstalled" || candidate.state === "failed");
  return (
    <li ref={ref} data-highlight={highlight ? "true" : undefined} className={cn("flex flex-col gap-2 rounded-xl px-3 py-3 ring-1 ring-inset", highlight ? "bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] ring-primary" : "ring-border")}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-2 font-medium break-words">{candidate.label}{candidate.version && <Pill>{i18n._({ id: "ui.Version {version}", message: "Version {version}", values: { version: candidate.version } })}</Pill>}</p>
          <p className="text-sm text-muted-foreground">{candidate.summary}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Pill tone={stateTone(candidate)}>{modelStateWord(candidate)}</Pill>
            <span>{gb(candidate.size_bytes)}</span>
            {candidate.quantization && <span>{candidate.quantization}</span>}
            {candidate.license && <span>{candidate.license}</span>}
          </p>
          {candidate.reason && !sameWords(candidate.reason, modelStateWord(candidate)) && <p className="text-sm text-foreground">{candidate.reason}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canDownload && (
            <Button variant="outline" size="sm" disabled={installBusy} onClick={onInstall} aria-label={i18n._({ id: "ui.Download {model} ({size})", message: "Download {model} ({size})", values: { model: candidate.label, size: gb(candidate.download_bytes || candidate.size_bytes) } })}>
              <DownloadIcon aria-hidden="true" />{i18n._({ id: "ui.Download", message: "Download" })}
            </Button>
          )}
          {candidate.state === "installed" && candidate.can_uninstall && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(true)} aria-label={i18n._({ id: "ui.Remove {model}", message: "Remove {model}", values: { model: candidate.label } })}>
              <TrashIcon aria-hidden="true" />{i18n._({ id: "ui.Remove", message: "Remove" })}
            </Button>
          )}
        </div>
      </div>
      {candidate.state === "installing" && (
        <div className="flex items-center gap-3">
          <div className="flex-1"><DownloadBar percent={candidate.percent} label={i18n._({ id: "ui.Download progress for {model}", message: "Download progress for {model}", values: { model: candidate.label } })} /></div>
          <span className="text-xs text-muted-foreground tabular-nums">{percentWord(candidate.percent)}</span>
        </div>
      )}
      <Collapsible open={details} onOpenChange={setDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="-ms-2 w-fit text-muted-foreground" aria-label={i18n._({ id: "ui.Details of {model}", message: "Details of {model}", values: { model: candidate.label } })}>
            {i18n._({ id: "ui.Details", message: "Details" })}<ChevronIcon aria-hidden="true" className={cn("transition-transform", details && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2"><ModelDetails candidate={candidate} /></CollapsibleContent>
      </Collapsible>
      {confirm && (
        <DestructiveConfirm
          message={i18n._({ id: "ui.Remove {model}?", message: "Remove {model}?", values: { model: candidate.label } })}
          detail={i18n._({ id: "ui.It is deleted from this computer and frees {size}. You can download it again later.", message: "It is deleted from this computer and frees {size}. You can download it again later.", values: { size: gb(candidate.size_bytes) } })}
          confirmLabel={i18n._({ id: "ui.Remove", message: "Remove" })}
          busyLabel={i18n._({ id: "ui.Removing", message: "Removing" })}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => { onRemove(); setConfirm(false); }}
        />
      )}
    </li>
  );
}

export function ModelList({ category, highlightId, busyKeys, onInstall, onRemove }: {
  category: StackChoiceCategory; highlightId: string | null; busyKeys: ReadonlySet<string>;
  onInstall: (id: string) => Promise<Outcome<StackInstallStarted>>; onRemove: (id: string) => Promise<Outcome<StackRemoved>>;
}) {
  const ranked = [...category.candidates].sort((a, b) => a.rank - b.rank);
  if (ranked.length === 0) return <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.No models are listed for this feature yet.", message: "No models are listed for this feature yet." })}</p>;
  return (
    <ul className="flex flex-col gap-2" aria-label={i18n._({ id: "ui.Models", message: "Models" })}>
      {ranked.map((candidate) => (
        <ModelRow key={candidate.id} candidate={candidate} highlight={candidate.id === highlightId} busy={busyKeys.has(`uninstall:${candidate.id}`)} installBusy={busyKeys.has(`install:${candidate.id}`)} onInstall={() => { void onInstall(candidate.id); }} onRemove={() => { void onRemove(candidate.id); }} />
      ))}
    </ul>
  );
}

/** The order a feature tries its models in, with each one's on and off switch. */
export function OrderList({ category, busy, onSave }: { category: StackChoiceCategory; busy: boolean; onSave: (order: string[], off: string[]) => Promise<Outcome<StackOrderResult>> }) {
  const byId = new Map(category.candidates.map((c) => [c.id, c]));
  const ids = category.order.filter((id) => byId.has(id));
  return (
    <ol className="flex flex-col gap-1" aria-label={i18n._({ id: "ui.Order models are tried in", message: "Order models are tried in" })}>
      {ids.map((id, index) => {
        const candidate = byId.get(id)!;
        const off = category.disabled.includes(id);
        return (
          <li key={id} className="flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ring-inset ring-border">
            <span className="w-5 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
            <span className={cn("min-w-0 flex-1 break-words text-sm", off && "text-muted-foreground line-through")}>{candidate.label}</span>
            <Button size="icon-sm" variant="ghost" disabled={busy || index === 0} onClick={() => { void onSave(moveId(ids, id, -1), category.disabled); }} aria-label={i18n._({ id: "ui.Move {model} up", message: "Move {model} up", values: { model: candidate.label } })}><UpIcon aria-hidden="true" /></Button>
            <Button size="icon-sm" variant="ghost" disabled={busy || index === ids.length - 1} onClick={() => { void onSave(moveId(ids, id, 1), category.disabled); }} aria-label={i18n._({ id: "ui.Move {model} down", message: "Move {model} down", values: { model: candidate.label } })}><DownIcon aria-hidden="true" /></Button>
            <Switch checked={!off} disabled={busy} onCheckedChange={(on) => { void onSave(ids, on ? category.disabled.filter((x) => x !== id) : [...category.disabled, id]); }} aria-label={i18n._({ id: "ui.Use {model}", message: "Use {model}", values: { model: candidate.label } })} />
          </li>
        );
      })}
    </ol>
  );
}

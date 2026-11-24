// STACK-MODELS-PAGE-01. The small pieces the shared AI and models page is built from: an icon chip, a toned pill, a plain notice and the model
// details line. Kit primitives and tokens only (the same look the Stack admin page has had: tinted chips, hairline pills), no raw colors.
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/kit/ui/button";
import { Progress } from "@/kit/ui/progress";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { cn } from "@/kit/utils";
import type { StackCandidate } from "./StackClient";
import type { Tone } from "./stackLogic";
import { gb } from "./stackWords";

const CheckIcon = getIcon("check");
const CopyIcon = getIcon("copy");
const AlertIcon = getIcon("circle-alert");

const TONE_VAR: Record<Tone, string> = { primary: "var(--primary)", ok: "var(--status-ok)", warn: "var(--status-warning)", bad: "var(--status-error)", muted: "var(--muted-foreground)" };

const CHIP_TONE: Record<Tone, string> = {
  primary: "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[color:var(--primary)]",
  ok: "bg-[color-mix(in_oklab,var(--status-ok)_16%,transparent)] text-[color:var(--status-ok)]",
  warn: "bg-[color-mix(in_oklab,var(--status-warning)_16%,transparent)] text-[color:var(--status-warning)]",
  bad: "bg-[color-mix(in_oklab,var(--status-error)_16%,transparent)] text-[color:var(--status-error)]",
  muted: "bg-[color-mix(in_oklab,var(--muted-foreground)_16%,transparent)] text-[color:var(--muted-foreground)]",
};
const PILL_TONE: Record<Tone, string> = {
  primary: "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[color-mix(in_oklab,var(--primary)_60%,var(--foreground))] ring-[color:color-mix(in_oklab,var(--primary)_36%,transparent)]",
  ok: "bg-[color-mix(in_oklab,var(--status-ok)_12%,transparent)] text-[color-mix(in_oklab,var(--status-ok)_60%,var(--foreground))] ring-[color:color-mix(in_oklab,var(--status-ok)_36%,transparent)]",
  warn: "bg-[color-mix(in_oklab,var(--status-warning)_12%,transparent)] text-[color-mix(in_oklab,var(--status-warning)_60%,var(--foreground))] ring-[color:color-mix(in_oklab,var(--status-warning)_36%,transparent)]",
  bad: "bg-[color-mix(in_oklab,var(--status-error)_12%,transparent)] text-[color-mix(in_oklab,var(--status-error)_60%,var(--foreground))] ring-[color:color-mix(in_oklab,var(--status-error)_36%,transparent)]",
  muted: "bg-[color-mix(in_oklab,var(--muted-foreground)_12%,transparent)] text-[color-mix(in_oklab,var(--muted-foreground)_60%,var(--foreground))] ring-[color:color-mix(in_oklab,var(--muted-foreground)_36%,transparent)]",
};
export { TONE_VAR };

/** A rounded square holding an icon, tinted by tone. Decorative: the label beside it carries the meaning. */
export function IconChip({ icon, tone = "primary", size = "md" }: { icon: string; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const Icon = getIcon(icon);
  const box = size === "lg" ? "size-12 rounded-2xl" : size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-xl";
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center", box, CHIP_TONE[tone])}>
      <Icon className={size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}

/** A small tinted label with a hairline. The word always says what the color means. */
export function Pill({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-[1.375rem] items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset", PILL_TONE[tone], className)}>{children}</span>;
}

export interface Notice { kind: "ok" | "error"; text: string }

/** One plain sentence about what just happened: said politely for a success, assertively for a failure. */
export function NoticeLine({ notice, onDismiss }: { notice: Notice | null; onDismiss?: () => void }) {
  if (!notice) return null;
  const Icon = notice.kind === "ok" ? CheckIcon : AlertIcon;
  return (
    <div role={notice.kind === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-inset", notice.kind === "error" ? PILL_TONE.bad : PILL_TONE.ok)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 flex-1 break-words text-foreground">{notice.text}</span>
      {onDismiss && <Button variant="ghost" size="sm" onClick={onDismiss}>{i18n._({ id: "ui.Dismiss", message: "Dismiss" })}</Button>}
    </div>
  );
}

/** How far a download is: a thin bar with a name for assistive tech. */
export function DownloadBar({ percent, label }: { percent: number | null; label: string }) {
  return <Progress className="h-1.5" value={percent ?? 0} aria-label={label} />;
}

/** The raw id, shown only here (a details line) and copyable. */
export function CopyId({ value, name }: { value: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void Promise.resolve(globalThis.navigator?.clipboard?.writeText(value)).then(() => setCopied(true)).catch(() => setCopied(false));
  };
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <code className="min-w-0 break-all text-xs">{value}</code>
      <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={i18n._({ id: "ui.Copy the ID of {name}", message: "Copy the ID of {name}", values: { name } })}>
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </Button>
    </span>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"><dt className="shrink-0 text-muted-foreground sm:w-36">{term}</dt><dd className="min-w-0 break-words">{children}</dd></div>;
}

/** Everything technical about one model, for the people who want it: id (copyable), repo, engine, licence, precision, smallest computer. */
export function ModelDetails({ candidate }: { candidate: StackCandidate }) {
  return (
    <dl className="flex flex-col gap-1.5 text-sm" data-testid={`details-${candidate.id}`}>
      <Fact term={i18n._({ id: "ui.ID", message: "ID" })}><CopyId value={candidate.id} name={candidate.label} /></Fact>
      {candidate.repo && <Fact term={i18n._({ id: "ui.Source", message: "Source" })}>{candidate.repo}</Fact>}
      {candidate.engine && <Fact term={i18n._({ id: "ui.Runs on", message: "Runs on" })}>{candidate.engine}</Fact>}
      {candidate.family && <Fact term={i18n._({ id: "ui.Family", message: "Family" })}>{candidate.family}{candidate.version ? ` ${candidate.version}` : ""}</Fact>}
      {candidate.license && <Fact term={i18n._({ id: "ui.Licence", message: "Licence" })}>{candidate.license}</Fact>}
      {candidate.quantization && <Fact term={i18n._({ id: "ui.Precision", message: "Precision" })}>{candidate.quantization}{candidate.quantization_raw ? ` (${candidate.quantization_raw})` : ""}</Fact>}
      {candidate.min_profile && <Fact term={i18n._({ id: "ui.Smallest computer", message: "Smallest computer" })}>{candidate.min_profile}</Fact>}
      <Fact term={i18n._({ id: "ui.Size", message: "Size" })}>{gb(candidate.size_bytes)}</Fact>
      {candidate.peak_bytes !== null && <Fact term={i18n._({ id: "ui.Memory when running", message: "Memory when running" })}>{gb(candidate.peak_bytes)}</Fact>}
    </dl>
  );
}

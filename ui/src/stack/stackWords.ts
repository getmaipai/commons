// STACK-MODELS-PAGE-01. Every sentence of the shared AI and models page that is not the Stack's own (the Stack's labels, summaries and reasons arrive
// translated or plain and are shown as sent). Functions, never module-level constants: they call `i18n._` while rendering so the language follows
// the person (I18N-K1). Plain words for a household: no ids, no jargon.
import { i18n, kitLocaleTag } from "@/kit/i18n";
import type { StackCandidate, StackLevel } from "./StackClient";
import type { CardState } from "./stackLogic";

export function levelName(level: StackLevel): string {
  switch (level) {
    case "reduced": return i18n._({ id: "ui.Reduced", message: "Reduced" });
    case "standard": return i18n._({ id: "ui.Standard", message: "Standard" });
    case "boost": return i18n._({ id: "ui.Boost", message: "Boost" });
    case "max": return i18n._({ id: "ui.Max", message: "Max" });
  }
}

export function levelBlurb(level: StackLevel): string {
  switch (level) {
    case "reduced": return i18n._({ id: "ui.Lighter and quicker, for when the computer is busy.", message: "Lighter and quicker, for when the computer is busy." });
    case "standard": return i18n._({ id: "ui.The everyday choice.", message: "The everyday choice." });
    case "boost": return i18n._({ id: "ui.Better results, and it uses more memory.", message: "Better results, and it uses more memory." });
    case "max": return i18n._({ id: "ui.The best this computer can do.", message: "The best this computer can do." });
  }
}

/** A size in gigabytes: "5.0 GB", "42 GB", "0.4 GB". Always GB, as the owner asked. */
export function gb(bytes: number): string {
  const value = bytes / 1024 ** 3;
  if (value > 0 && value < 0.1) return i18n._({ id: "ui.Under 0.1 GB", message: "Under 0.1 GB" });
  const size = new Intl.NumberFormat(kitLocaleTag(), { minimumFractionDigits: value < 10 ? 1 : 0, maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
  return i18n._({ id: "ui.{size} GB", message: "{size} GB", values: { size } });
}

export function percentWord(percent: number | null): string {
  return percent === null ? "" : `${Math.round(Math.min(100, Math.max(0, percent)))}%`;
}

export function cardStateWord(state: CardState, percent: number | null): string {
  switch (state) {
    case "ready": return i18n._({ id: "ui.Ready", message: "Ready" });
    case "downloading": return percent === null ? i18n._({ id: "ui.Downloading", message: "Downloading" }) : i18n._({ id: "ui.Downloading {percent}", message: "Downloading {percent}", values: { percent: percentWord(percent) } });
    case "missing": return i18n._({ id: "ui.Not downloaded yet", message: "Not downloaded yet" });
    case "failed": return i18n._({ id: "ui.Download stopped", message: "Download stopped" });
    case "problem": return i18n._({ id: "ui.Needs a look", message: "Needs a look" });
    case "off": return i18n._({ id: "ui.Off", message: "Off" });
    case "unavailable": return i18n._({ id: "ui.Not available here", message: "Not available here" });
    case "unset": return i18n._({ id: "ui.Nothing chosen yet", message: "Nothing chosen yet" });
  }
}

export function stateWord(state: StackCandidate["state"], percent: number | null): string {
  switch (state) {
    case "installed": return i18n._({ id: "ui.Ready", message: "Ready" });
    case "installing": return percent === null ? i18n._({ id: "ui.Downloading", message: "Downloading" }) : i18n._({ id: "ui.Downloading {percent}", message: "Downloading {percent}", values: { percent: percentWord(percent) } });
    case "notInstalled": return i18n._({ id: "ui.Not downloaded yet", message: "Not downloaded yet" });
    case "failed": return i18n._({ id: "ui.Download stopped", message: "Download stopped" });
    case "unsupported": return i18n._({ id: "ui.Not available yet", message: "Not available yet" });
  }
}

export function modelStateWord(candidate: StackCandidate): string {
  return stateWord(candidate.state, candidate.percent);
}

export function chosenByWord(by: "household" | "recommended" | "off" | "none"): string {
  switch (by) {
    case "household": return i18n._({ id: "ui.Your choice", message: "Your choice" });
    case "recommended": return i18n._({ id: "ui.Recommended", message: "Recommended" });
    case "off": return i18n._({ id: "ui.Off", message: "Off" });
    case "none": return i18n._({ id: "ui.Nothing fits", message: "Nothing fits" });
  }
}

export function profileName(memoryGb: number): string {
  return i18n._({ id: "ui.{memory} GB computers", message: "{memory} GB computers", values: { memory: memoryGb } });
}

/** The plain sentence for a failed write when the Stack sent none of its own. */
export function failedToSave(): string {
  return i18n._({ id: "ui.That could not be saved. Nothing was changed. Try again.", message: "That could not be saved. Nothing was changed. Try again." });
}
export function failedToRead(): string {
  return i18n._({ id: "ui.The model list could not be read. Try again in a moment.", message: "The model list could not be read. Try again in a moment." });
}

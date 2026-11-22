// STACK-MODELS-PAGE-01. One feature's levels (Reduced, Standard, Boost, Max; one plain "model in use" row for a feature with a single level):
// the model each uses, who chose it, the Stack's note when a saved pick stopped working, and a Change button that opens the list of models
// offered at that level with whether each fits. The page decides nothing: the options, the fit and the refusals are the Stack's.
import { useState } from "react";
import { Button } from "@/kit/ui/button";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import type { StackCandidate, StackChoiceCategory, StackLevel, StackLevelRow } from "./StackClient";
import { ChoiceList } from "./StackChoiceList";
import type { ChoiceOption } from "./StackChoiceList";
import { Pill } from "./StackParts";
import type { Outcome } from "./useStackChoices";
import type { StackPickResult } from "./StackClient";
import { candidateById, levelsOf } from "./stackLogic";
import { chosenByWord, gb, levelBlurb, levelName, modelStateWord } from "./stackWords";

const LockIcon = getIcon("lock");

/** The options for one level: the recommended model first (it clears the saved pick), then every model offered with its fit, then Off where a level may be off. */
export function levelOptions(category: StackChoiceCategory, row: StackLevelRow, labelOf: (id: string) => string): ChoiceOption[] {
  const options: ChoiceOption[] = [];
  const recommended = candidateById(category, row.recommended.model);
  options.push({
    value: "recommended",
    label: recommended ? i18n._({ id: "ui.Recommended: {model}", message: "Recommended: {model}", values: { model: recommended.label } }) : i18n._({ id: "ui.Recommended", message: "Recommended" }),
    summary: row.recommended.why,
  });
  for (const option of row.options) {
    const candidate = candidateById(category, option.model);
    options.push({
      value: option.model,
      label: candidate?.label ?? labelOf(option.model),
      summary: candidate?.summary ?? null,
      facts: candidate ? [gb(candidate.size_bytes), modelStateWord(candidate)].join(" · ") : null,
      refusal: option.fits ? null : option.refusal ?? i18n._({ id: "ui.It does not fit this level on this computer.", message: "It does not fit this level on this computer." }),
    });
  }
  if (row.tier !== "standard") options.push({ value: "off", label: i18n._({ id: "ui.Off", message: "Off" }), summary: i18n._({ id: "ui.This level is not used.", message: "This level is not used." }) });
  return options;
}

function selectedValue(row: StackLevelRow): string | null {
  if (row.chosen_by === "off") return "off";
  if (row.chosen_by === "household") return row.chosen;
  return "recommended";
}

function LevelRow({ category, row, labelOf, lock, busy, onChoose }: { category: StackChoiceCategory; row: StackLevelRow; labelOf: (id: string) => string; lock: string | null; busy: boolean; onChoose: (level: StackLevel, value: string) => Promise<Outcome<StackPickResult>> }) {
  const [open, setOpen] = useState(false);
  const model: StackCandidate | null = candidateById(category, row.chosen);
  const title = category.tiered ? levelName(row.tier) : i18n._({ id: "ui.Model in use", message: "Model in use" });
  const headingId = `level-${category.id}-${row.tier}`;
  const customization = row.customization ? Object.entries(row.customization) : [];
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-2 font-medium"><span id={headingId}>{title}</span><Pill tone={row.chosen_by === "household" ? "primary" : "muted"}>{chosenByWord(row.chosen_by)}</Pill></p>
          {category.tiered && <p className="text-sm text-muted-foreground">{levelBlurb(row.tier)}</p>}
          <p className="break-words">{row.chosen_by === "off" ? i18n._({ id: "ui.Not in use", message: "Not in use" }) : model ? model.label : row.chosen ? labelOf(row.chosen) : i18n._({ id: "ui.Nothing fits this level yet.", message: "Nothing fits this level yet." })}</p>
          {model && row.chosen_by !== "off" && <p className="text-sm text-muted-foreground">{[gb(model.size_bytes), modelStateWord(model)].join(" · ")}</p>}
          {customization.length > 0 && <p className="flex flex-wrap gap-1">{customization.map(([key, value]) => <Pill key={key}>{`${key}: ${String(value)}`}</Pill>)}</p>}
          {row.problem && <p className="text-sm text-foreground" role="note">{row.problem}</p>}
        </div>
        {lock ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lock}</p>
        ) : (
          <Button variant="outline" size="sm" aria-expanded={open} aria-controls={`${headingId}-list`} onClick={() => setOpen((v) => !v)}>
            {open ? i18n._({ id: "ui.Close", message: "Close" }) : i18n._({ id: "ui.Change {level}", message: "Change {level}", values: { level: title } })}
          </Button>
        )}
      </div>
      {open && !lock && (
        <div id={`${headingId}-list`}>
          <ChoiceList
            name={i18n._({ id: "ui.Models for {level}", message: "Models for {level}", values: { level: title } })}
            options={levelOptions(category, row, labelOf)}
            selected={selectedValue(row)}
            busy={busy}
            onPick={(value) => { void onChoose(row.tier, value).then((outcome) => { if (outcome.ok) setOpen(false); }); }}
          />
        </div>
      )}
    </li>
  );
}

export function LevelList({ category, labelOf, lockOf, busy, onChoose }: { category: StackChoiceCategory; labelOf: (id: string) => string; lockOf: (level: StackLevel) => string | null; busy: boolean; onChoose: (level: StackLevel, value: string) => Promise<Outcome<StackPickResult>> }) {
  return (
    <ul className="flex flex-col divide-y divide-border" aria-label={category.tiered ? i18n._({ id: "ui.Levels", message: "Levels" }) : i18n._({ id: "ui.Model", message: "Model" })}>
      {levelsOf(category).map((row) => <LevelRow key={row.tier} category={category} row={row} labelOf={labelOf} lock={lockOf(row.tier)} busy={busy} onChoose={onChoose} />)}
    </ul>
  );
}

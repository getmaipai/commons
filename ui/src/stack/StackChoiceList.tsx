// STACK-MODELS-PAGE-01. A pick-one list of models: a radio group of rows, each with the model's plain name, its one-line summary, a few plain
// facts and, when it cannot be chosen, the Stack's sentence for why. Used for a level's model and for another computer size's model.
import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";

const CheckIcon = getIcon("check");

export interface ChoiceOption {
  value: string;
  label: string;
  summary?: string | null;
  /** Plain facts under the summary: size, state. */
  facts?: string | null;
  /** Why it cannot be chosen, in the Stack's own words; disables the row. */
  refusal?: string | null;
}

export function ChoiceList({ name, options, selected, onPick, busy }: { name: string; options: readonly ChoiceOption[]; selected: string | null; onPick: (value: string) => void; busy: boolean }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-1.5">
      {options.map((option) => {
        const checked = option.value === selected;
        const blocked = Boolean(option.refusal);
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={busy || blocked}
            onClick={() => { if (!checked) onPick(option.value); }}
            className={cn(
              "flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2 text-start ring-1 ring-inset outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
              checked ? "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] ring-primary" : "ring-border hover:bg-accent",
            )}
          >
            <span aria-hidden="true" className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset", checked ? "bg-primary text-primary-foreground ring-primary" : "ring-border")}>
              {checked ? <CheckIcon className="size-3" /> : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium break-words">{option.label}</span>
              {option.summary && <span className="text-sm text-muted-foreground">{option.summary}</span>}
              {option.facts && <span className="text-xs text-muted-foreground">{option.facts}</span>}
              {option.refusal && <span className="text-sm text-foreground">{option.refusal}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

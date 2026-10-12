import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from "../dashboard/components/ui/combobox";
import { titleCaseOption } from "./optionLabels";

interface OptionMultiSelectProps {
  value: readonly string[];
  options: readonly string[];
  /** The spec's `copy.option_labels`; an option without one is title-cased. */
  labels?: Record<string, string>;
  onValueChange: (ids: string[]) => void;
  disabled?: boolean;
  ariaLabel: string;
}

/** The settings renderer's multi-select for a `select` selector with
 * `range.multiple`. Composed from the shipped chips Combobox only. */
export function OptionMultiSelect({ value, options, labels, onValueChange, disabled, ariaLabel }: OptionMultiSelectProps) {
  const getLabel = (id: string) => labels?.[id] ?? titleCaseOption(id);
  return (
    <Combobox items={[...options]} multiple value={[...value]} onValueChange={onValueChange} itemToStringLabel={getLabel} disabled={disabled}>
      <ComboboxChips aria-label={ariaLabel} className="w-64">
        {value.map((id) => (
          <ComboboxChip key={id}>{getLabel(id)}</ComboboxChip>
        ))}
        <ComboboxChipsInput />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxList>{(id: string) => <ComboboxItem key={id} value={id}>{getLabel(id)}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

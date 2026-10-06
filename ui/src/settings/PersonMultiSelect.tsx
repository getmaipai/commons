import { useQuery } from "@tanstack/react-query";
import { request } from "@/kit/http";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "../dashboard/components/ui/combobox";

export interface PersonOption {
  id: string;
  display_name: string;
}

interface PersonMultiSelectProps {
  value: readonly string[];
  onValueChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Dropped from the option list, never from a value already stored: a
   * person's own settings never offer that person to themselves. */
  excludePersonId?: string;
  ariaLabel: string;
  /** The roster, when the host already has it. Omitted: the control reads
   * `GET /api/people` itself (query key ["people"], shared with Home's own
   * roster query). */
  people?: readonly PersonOption[];
  placeholder?: string;
  emptyText?: string;
}

/** The settings renderer's person multi-select (a `person` selector with
 * `range.multiple`), moved from Home's PersonMultiSelect (NOTIFY-SHARE-02)
 * into the kit. Composed from the shipped chips Combobox only. */
export function PersonMultiSelect(props: PersonMultiSelectProps) {
  // The query hook lives in its own component so a host that passes the
  // roster needs no QueryClient at all.
  return props.people ? <Chips {...props} roster={props.people} loading={false} /> : <FromApi {...props} />;
}

function FromApi(props: PersonMultiSelectProps) {
  const peopleQuery = useQuery<PersonOption[]>({
    queryKey: ["people"],
    queryFn: () => request<PersonOption[]>("/api/people"),
  });
  return <Chips {...props} roster={peopleQuery.data ?? []} loading={peopleQuery.isLoading} />;
}

function Chips({ value, onValueChange, disabled, excludePersonId, ariaLabel, roster, loading, placeholder, emptyText }: PersonMultiSelectProps & { roster: readonly PersonOption[]; loading: boolean }) {
  const people = roster.filter((p) => p.id !== excludePersonId);
  const items = people.map((p) => p.id);
  const getLabel = (id: string) => roster.find((p) => p.id === id)?.display_name ?? id;

  return (
    <Combobox
      items={items}
      multiple
      value={[...value]}
      onValueChange={onValueChange}
      itemToStringLabel={getLabel}
      disabled={disabled || loading}
    >
      <ComboboxChips aria-label={ariaLabel} className="w-64">
        {value.map((id) => (
          <ComboboxChip key={id}>{getLabel(id)}</ComboboxChip>
        ))}
        <ComboboxChipsInput placeholder={value.length === 0 ? (placeholder ?? "Add a person\u2026") : undefined} />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{emptyText ?? "No one else in the household."}</ComboboxEmpty>
        <ComboboxList>{(id: string) => <ComboboxItem key={id} value={id}>{getLabel(id)}</ComboboxItem>}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

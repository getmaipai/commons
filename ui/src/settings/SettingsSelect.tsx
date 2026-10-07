import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kit/ui/select";
import { cn } from "@/kit/utils";

export interface SettingsSelectOption {
  value: string;
  label: string;
}

export interface SettingsSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SettingsSelectOption[];
  disabled?: boolean;
  className?: string;
  "aria-label": string;
}

/** The compact trailing control of a settings row: the current value and a
 * chevron, opening a menu of options. Never pass "" as a value (see
 * primitives/Select). */
export function SettingsSelect({ value, onValueChange, options, disabled, className, ...rest }: SettingsSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        data-slot="settings-select"
        className={cn("w-fit gap-1.5 border-transparent bg-transparent px-2 text-muted-foreground shadow-none dark:bg-transparent", className)}
        {...rest}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

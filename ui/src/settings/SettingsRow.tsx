import { useId, type ReactNode } from "react";
import { cn } from "@/kit/utils";

export interface SettingsRowProps {
  label: string;
  /** One line saying what the setting does for the reader. Never why it is unavailable. */
  description?: string;
  /** The trailing control: a switch, a SettingsSelect, a button. */
  control?: ReactNode;
  /** Dims the label and shows `disabledNote`. The control is the caller's own and gets its own `disabled`. */
  disabled?: boolean;
  /** A muted second line such as "Disabled for the home" or "Disabled by Dad". Shown only when `disabled` is true. */
  disabledNote?: string;
  className?: string;
}

/** One row of a settings page: label, a one-line description and a trailing
 * control slot, with a separate muted line that says who disabled it. There
 * is deliberately no reset action. */
export function SettingsRow({ label, description, control, disabled = false, disabledNote, className }: SettingsRowProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div
      data-slot="settings-row"
      data-disabled={disabled ? "" : undefined}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("flex min-h-12 items-center justify-between gap-4 py-3", className)}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className={cn("text-base text-foreground", disabled && "text-muted-foreground")}>
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
        {disabled && disabledNote ? (
          <span data-slot="settings-row-disabled-note" className="text-sm text-muted-foreground">
            {disabledNote}
          </span>
        ) : null}
      </div>
      {control ? <div className="flex shrink-0 items-center">{control}</div> : null}
    </div>
  );
}

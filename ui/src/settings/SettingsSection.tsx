import { useId, type ReactNode } from "react";
import { cn } from "@/kit/utils";

export interface SettingsSectionProps {
  title: string;
  /** SettingsRow children. A 1 px divider is drawn between neighbours. */
  children: ReactNode;
  className?: string;
}

/** A titled list of settings rows separated by 1 px dividers. No card, no shadow. */
export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  const titleId = useId();
  return (
    <section data-slot="settings-section" aria-labelledby={titleId} className={cn("flex flex-col", className)}>
      <h2 id={titleId} className="pb-2 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </section>
  );
}

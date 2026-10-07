import type { ReactNode } from "react";
import { cn } from "@/kit/utils";

export interface SettingsPageSection {
  id: string;
  title: string;
}

export interface SettingsPageProps {
  sections: readonly SettingsPageSection[];
  activeId: string;
  onNavigate: (id: string) => void;
  /** The open section's SettingsSection blocks. */
  children: ReactNode;
  /** Accessible name of the section list. */
  navLabel?: string;
  className?: string;
}

/** The settings page layout: a left list of sections and a content column
 * about 720 px wide. On a narrow screen the list sits above the content. */
export function SettingsPage({ sections, activeId, onNavigate, children, navLabel = "Settings sections", className }: SettingsPageProps) {
  return (
    <div data-slot="settings-page" className={cn("flex w-full flex-col gap-6 md:flex-row md:gap-10", className)}>
      <nav aria-label={navLabel} className="md:w-56 md:shrink-0">
        <ul className="flex flex-col gap-1">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(section.id)}
                  className={cn(
                    "flex min-h-12 w-full items-center rounded-md px-3 text-start text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {section.title}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div data-slot="settings-page-content" className="flex min-w-0 max-w-[720px] flex-1 flex-col gap-8">
        {children}
      </div>
    </div>
  );
}

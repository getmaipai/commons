import type { ReactNode } from "react";

export interface CompanionProfileHeaderProps {
  name: string;
  eyebrow?: string;
  line?: ReactNode;
  media?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}

export function CompanionProfileHeader({ name, eyebrow, line, media, chips, actions, back }: CompanionProfileHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {back ? <div>{back}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          {media ? <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full md:size-28">{media}</div> : null}
          <div className="min-w-0">
            {eyebrow ? <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</div> : null}
            <h1 className="text-2xl font-semibold">{name}</h1>
            {line ? <div className="mt-1 text-sm text-muted-foreground">{line}</div> : null}
            {chips ? <div className="mt-3 flex flex-wrap items-center gap-2">{chips}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div> : null}
      </div>
    </header>
  );
}

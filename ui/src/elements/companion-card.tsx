import { useId, type ReactNode } from "react";
import { Badge } from "@/kit/ui/badge";

export interface CompanionCardProps {
  name: string;
  line?: ReactNode;
  media?: ReactNode;
  status?: ReactNode;
  menu?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
}

export function CompanionCard({ name, line, media, status, menu, meta, actions, headingLevel = 2 }: CompanionCardProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        {media ? <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full md:size-18">{media}</div> : null}
        {(status || menu) ? <div className="flex min-w-0 items-center gap-2">{status ? <Badge variant="secondary">{status}</Badge> : null}{menu}</div> : null}
      </div>
      <Heading id={headingId} className="mt-3 text-xl font-semibold">{name}</Heading>
      {line ? <div className="line-clamp-2 text-sm text-muted-foreground">{line}</div> : null}
      {meta ? <div className="mt-2 text-xs text-muted-foreground">{meta}</div> : null}
      {actions ? <div className="mt-auto flex items-center gap-2 pt-4">{actions}</div> : null}
    </section>
  );
}

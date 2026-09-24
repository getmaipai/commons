import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";

export interface SourceItem {
  id: string;
  title: string;
  host: string;
  href: string;
  /** A favicon URL; falls back to a generic link glyph when absent. */
  iconUrl?: string;
}

export interface SourcesCardProps {
  sources: SourceItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const ExternalLinkIcon = getIcon("external-link");
const ChevronDownIcon = getIcon("chevron-down");

/** A compact card under a reply that used a lookup (spec.md "Inside a
 * turn"), collapsed to one "Sources (N)" line by default. `open`/
 * `onOpenChange` are optional - a caller wanting a citation click to
 * scroll this open and highlight a row controls it; otherwise it's a
 * plain uncontrolled disclosure. Every row link carries
 * `rel="noopener noreferrer"` plus an explicit `referrerPolicy` (org
 * privacy architecture: a cited site learns nothing from the click but
 * the click itself). */
export function SourcesCard({ sources, open, onOpenChange, className }: SourcesCardProps) {
  if (sources.length === 0) return null;
  return (
    <Collapsible data-slot="chat-sources-card" open={open} onOpenChange={onOpenChange} className={cn("rounded-lg border bg-card", className)}>
      <CollapsibleTrigger className="flex min-h-12 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground [&[data-state=open]_svg:last-child]:rotate-180">
        <span>Sources ({sources.length})</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up data-closed:fill-mode-forwards data-closed:pointer-events-none motion-reduce:animate-none">
        <ul className="border-t">
          {sources.map((source) => (
            <li key={source.id}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                data-slot="chat-source-row"
                data-source-id={source.id}
                className="flex min-h-12 items-center gap-2 px-3 py-2 hover:bg-accent"
              >
                {source.iconUrl ? (
                  <img src={source.iconUrl} alt="" className="size-4 shrink-0 rounded-sm" />
                ) : (
                  <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{source.title}</span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">{source.host}</span>
              </a>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
